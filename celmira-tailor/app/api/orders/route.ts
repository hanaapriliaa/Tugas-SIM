import { validateStep5 } from "@/lib/booking-validation";
import { getOrCreateCustomerSession } from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import {
  createOrderInDb,
  grantTrackingAccessCookie,
  saveOrderInDb,
} from "@/lib/server/order-repo";
import { deleteOrderFile, storeOrderFile } from "@/lib/server/order-storage";
import type { OrderDraft, ReferenceAttachment } from "@/lib/types/tailor";

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

  // Buat record order terlebih dahulu untuk mendapatkan order.id
  let order = await createOrderInDb(env.DB, {
    draft,
    customerSessionId: session.id,
    studioDesignTitle,
    storedAttachments: [],
  });

  const storedAttachments: ReferenceAttachment[] = [];
  const uploadedFileIds: string[] = [];

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

    // 2. Jika tidak ada multipart file, konversi lampiran previewDataUrl (jika ada) ke R2
    if (multipartFiles.length === 0 && Array.isArray(draft.attachments)) {
      for (const att of draft.attachments.slice(0, 6)) {
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
