import { validateStep5 } from "@/lib/booking-validation";
import {
  getCustomerSession,
  getOrCreateCustomerSession,
  updateCustomerSessionIdentity,
} from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import {
  createOrderInDb,
  grantTrackingAccessCookie,
  listOrdersByCustomerSessionInDb,
  saveOrderInDb,
} from "@/lib/server/order-repo";
import { deleteOrderFile, storeOrderFile } from "@/lib/server/order-storage";
import {
  getDesignByIdInDb,
  getMeasurementProfileByIdInDb,
} from "@/lib/server/studio-repo";
import { extractStudioFileIdFromUrl, getStudioFileById } from "@/lib/server/studio-storage";
import type { OrderDraft, ReferenceAttachment } from "@/lib/types/tailor";

export async function GET(request: Request) {
  const env = getChatEnv();
  const session = await getCustomerSession(request, env.DB);
  if (!session) {
    return Response.json(
      {
        orders: [],
        customerContact: null,
        serverTime: new Date().toISOString(),
      },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  }

  const orders = await listOrdersByCustomerSessionInDb(env.DB, session.id);
  const latestOrder = orders[0];
  const customerContact =
    session.customerName || session.customerWhatsappNorm || latestOrder
      ? {
          fullName: session.customerName ?? latestOrder?.customer.fullName ?? "",
          whatsapp: session.customerWhatsappNorm ?? latestOrder?.customer.whatsapp ?? "",
          email: session.customerEmail ?? latestOrder?.customer.email ?? "",
        }
      : null;

  return Response.json(
    {
      orders,
      customerContact,
      serverTime: new Date().toISOString(),
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

function decodeDataUrlToBytes(dataUrl: string): Uint8Array | null {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx <= 0) return null;
  const meta = dataUrl.slice(0, commaIdx);
  if (!meta.includes(";base64")) return null;
  try {
    const binary = atob(dataUrl.slice(commaIdx + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader: customerCookie } = await getOrCreateCustomerSession(
    request,
    env.DB
  );

  const contentType = request.headers.get("content-type") ?? "";
  let draft: OrderDraft | null = null;
  let studioDesignTitle: string | undefined;
  const multipartFiles: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: "Form data pengajuan pesanan tidak valid." }, { status: 400 });
    }
    const rawPayload = formData.get("payload");
    if (typeof rawPayload !== "string") {
      return Response.json({ error: "Payload pesanan wajib disertakan." }, { status: 400 });
    }
    try {
      const parsed = JSON.parse(rawPayload) as {
        draft?: OrderDraft;
        studioDesignTitle?: string;
      };
      draft = parsed.draft ?? null;
      studioDesignTitle = parsed.studioDesignTitle;
    } catch {
      return Response.json({ error: "Format JSON payload pesanan tidak valid." }, { status: 400 });
    }
    for (const entry of formData.getAll("files")) {
      if (entry instanceof File && entry.size > 0) {
        multipartFiles.push(entry);
      }
    }
  } else {
    try {
      const body = (await request.json()) as {
        draft?: OrderDraft;
        studioDesignTitle?: string;
      };
      draft = body.draft ?? null;
      studioDesignTitle = body.studioDesignTitle;
    } catch {
      return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
    }
  }

  if (!draft) {
    return Response.json({ error: "Data draft pesanan tidak ditemukan." }, { status: 400 });
  }

  const validation = validateStep5(draft);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] ?? "Data pesanan belum lengkap.";
    return Response.json(
      { error: firstError, errors: validation.errors },
      { status: 400 }
    );
  }

  // Resolusi & validasi kepemilikan data Design Studio serta Measurement Profile dari D1
  let resolvedDraft: OrderDraft = draft;
  let resolvedStudioTitle = studioDesignTitle;
  let resolvedStudioModelName: string | undefined;
  let linkedStudioAttachments: ReferenceAttachment[] = [];

  if (draft.designSource === "design-studio" && draft.selectedStudioDesignId) {
    const foundDesign = await getDesignByIdInDb(env.DB, draft.selectedStudioDesignId);
    if (foundDesign) {
      if (foundDesign.customerSessionId !== session.id) {
        return Response.json(
          { error: "Desain yang dipilih tidak dimiliki oleh sesi pelanggan Anda." },
          { status: 403 }
        );
      }
      resolvedStudioTitle = resolvedStudioTitle || foundDesign.design.title;
      resolvedStudioModelName = foundDesign.design.modelName;
      linkedStudioAttachments = foundDesign.design.attachments;
      resolvedDraft = {
        ...resolvedDraft,
        specifications: {
          ...foundDesign.design.specifications,
          ...resolvedDraft.specifications,
        },
      };
    }
  }

  if (draft.measurements.mode === "profile" && draft.measurements.profileId) {
    const foundProfile = await getMeasurementProfileByIdInDb(env.DB, draft.measurements.profileId);
    if (foundProfile) {
      if (foundProfile.customerSessionId !== session.id) {
        return Response.json(
          { error: "Profil ukuran yang dipilih tidak dimiliki oleh sesi pelanggan Anda." },
          { status: 403 }
        );
      }
      resolvedDraft = {
        ...resolvedDraft,
        measurements: {
          ...resolvedDraft.measurements,
          profileId: foundProfile.profile.id,
          profileName: resolvedDraft.measurements.profileName?.trim() || foundProfile.profile.label,
          templateId: resolvedDraft.measurements.templateId || foundProfile.profile.templateId,
          values: {
            ...foundProfile.profile.values,
            ...resolvedDraft.measurements.values,
          },
          extraValues:
            resolvedDraft.measurements.extraValues ?? foundProfile.profile.extraValues
              ? {
                  ...(foundProfile.profile.extraValues ?? {}),
                  ...(resolvedDraft.measurements.extraValues ?? {}),
                }
              : undefined,
          fitPreferenceNote:
            resolvedDraft.measurements.fitPreferenceNote || foundProfile.profile.notes || "",
        },
      };
    }
  }

  // Buat record order terlebih dahulu untuk mendapatkan order.id
  let order = await createOrderInDb(env.DB, {
    draft: resolvedDraft,
    customerSessionId: session.id,
    studioDesignTitle: resolvedStudioTitle,
    studioDesignModelName: resolvedStudioModelName,
    storedAttachments: [],
  });

  const storedAttachments: ReferenceAttachment[] = [];
  const uploadedFileIds: string[] = [];

  async function copyStudioFileToOrder(att: ReferenceAttachment): Promise<ReferenceAttachment | null> {
    const studioFileId = extractStudioFileIdFromUrl(att.url);
    if (!studioFileId) return null;
    const studioFile = await getStudioFileById(env.DB, studioFileId);
    if (!studioFile || studioFile.customerSessionId !== session.id) return null;
    const r2Obj = await env.CHAT_ATTACHMENTS.get(studioFile.r2Key);
    if (!r2Obj) return null;
    const bytes = new Uint8Array(await r2Obj.arrayBuffer());
    const copied = await storeOrderFile(env.DB, env.CHAT_ATTACHMENTS, {
      orderId: order.id,
      kind: "order_reference",
      fileName: studioFile.fileName,
      bytes,
    });
    if (!copied.ok) return null;
    uploadedFileIds.push(copied.file.id);
    return {
      id: copied.file.id,
      name: copied.file.fileName,
      size: copied.file.sizeBytes,
      mimeType: copied.file.mimeType,
      kind: copied.file.mimeType === "application/pdf" ? "pdf" : "image",
      url: copied.file.url,
      note: att.note,
    };
  }

  try {
    // 1. Jika ada file biner dari multipart/form-data
    for (const file of multipartFiles.slice(0, 6)) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const stored = await storeOrderFile(env.DB, env.CHAT_ATTACHMENTS, {
        orderId: order.id,
        kind: "order_reference",
        fileName: file.name,
        bytes,
      });
      if (!stored.ok) {
        for (const fid of uploadedFileIds) {
          await deleteOrderFile(env.DB, env.CHAT_ATTACHMENTS, fid);
        }
        await env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(order.id).run();
        return Response.json({ error: stored.error }, { status: 400 });
      }
      uploadedFileIds.push(stored.file.id);
      storedAttachments.push({
        id: stored.file.id,
        name: stored.file.fileName,
        size: stored.file.sizeBytes,
        mimeType: stored.file.mimeType,
        kind: stored.file.mimeType === "application/pdf" ? "pdf" : "image",
        url: stored.file.url,
      });
    }

    // 2. Gabungkan lampiran dari draft + Design Studio (hindari duplikat URL studio)
    const combinedDraftAttachments: ReferenceAttachment[] = Array.isArray(draft.attachments)
      ? [...draft.attachments]
      : [];
    const seenUrls = new Set(
      combinedDraftAttachments.map((item) => item.url).filter((u): u is string => Boolean(u))
    );
    for (const studioAtt of linkedStudioAttachments) {
      if (!studioAtt.url || !seenUrls.has(studioAtt.url)) {
        combinedDraftAttachments.push(studioAtt);
        if (studioAtt.url) seenUrls.add(studioAtt.url);
      }
    }

    // 3. Salin file Design Studio (R2 -> order_files privat) atau konversi previewDataUrl ke R2
    if (multipartFiles.length === 0 && combinedDraftAttachments.length > 0) {
      for (const att of combinedDraftAttachments.slice(0, 6)) {
        const copiedFromStudio = await copyStudioFileToOrder(att);
        if (copiedFromStudio) {
          storedAttachments.push(copiedFromStudio);
          continue;
        }
        if (att.previewDataUrl) {
          const bytes = decodeDataUrlToBytes(att.previewDataUrl);
          if (bytes && bytes.byteLength > 0) {
            const stored = await storeOrderFile(env.DB, env.CHAT_ATTACHMENTS, {
              orderId: order.id,
              kind: "order_reference",
              fileName: att.name,
              bytes,
            });
            if (stored.ok) {
              uploadedFileIds.push(stored.file.id);
              storedAttachments.push({
                id: stored.file.id,
                name: stored.file.fileName,
                size: stored.file.sizeBytes,
                mimeType: stored.file.mimeType,
                kind: stored.file.mimeType === "application/pdf" ? "pdf" : "image",
                url: stored.file.url,
                note: att.note,
              });
              continue;
            }
          }
        }
        // Fallback metadata saja (tanpa dataUrl besar)
        storedAttachments.push({
          id: att.id,
          name: att.name,
          size: att.size,
          mimeType: att.mimeType,
          kind: att.kind,
          url: att.url,
          note: att.note,
        });
      }
    }

    if (storedAttachments.length > 0) {
      order = await saveOrderInDb(env.DB, {
        ...order,
        attachments: storedAttachments,
      });
    }
  } catch (err) {
    for (const fid of uploadedFileIds) {
      await deleteOrderFile(env.DB, env.CHAT_ATTACHMENTS, fid);
    }
    await env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(order.id).run();
    const message = err instanceof Error ? err.message : "Gagal menyimpan lampiran pesanan.";
    return Response.json({ error: message }, { status: 500 });
  }

  // Hubungkan identitas kontak pelanggan ke guest session & thread chat tanpa nama
  await updateCustomerSessionIdentity(env.DB, session.id, {
    fullName: order.customer.fullName,
    whatsapp: order.customer.whatsapp,
    email: order.customer.email,
  });

  const trackingCookie = await grantTrackingAccessCookie(request, env.DB, order.orderCode);

  await broadcastChatEvent(env.CHAT_HUB, ["role:admin", `customer:${session.id}`], {
    type: "order:updated",
    orderId: order.id,
    orderCode: order.orderCode,
    status: order.status,
    updatedAt: order.updatedAt,
  });

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (customerCookie) headers.append("set-cookie", customerCookie);
  if (trackingCookie) headers.append("set-cookie", trackingCookie);

  return new Response(JSON.stringify({ order }), { status: 201, headers });
}
