import { celmiraDesignReferences, getCategoryById } from "../booking-options.ts";
import {
  createDefaultAdminPaymentConfig,
  createHistoryEvent,
  evaluateDpOverdueForReview,
  generateTrackingAccessCode,
  normalizeSubmittedOrder,
} from "../order-tracking.ts";
import type {
  AdminPaymentConfig,
  OrderDraft,
  ReferenceAttachment,
  SubmittedOrder,
} from "@/lib/types/tailor";
import {
  buildSetCookieHeader,
  generateOpaqueToken,
  getCookieFromRequest,
  isSecureRequest,
  sha256Hex,
} from "./auth.ts";
import { ensureOrderSchema } from "./order-schema.ts";

export const TRACKING_SESSION_COOKIE = "celmira_track_session";
const TRACKING_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TRACKING_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

type OrderRow = {
  id: string;
  order_code: string;
  tracking_access_code: string;
  customer_session_id: string | null;
  payload_json: string;
};

function parseOrderRow(row: OrderRow): {
  order: SubmittedOrder;
  customerSessionId: string | null;
} {
  const parsed = JSON.parse(row.payload_json) as SubmittedOrder;
  return {
    order: normalizeSubmittedOrder({
      ...parsed,
      persistenceMode: "cloudflare-d1",
    }),
    customerSessionId: row.customer_session_id,
  };
}

function generateServerOrderCode(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = generateOpaqueToken(2).toUpperCase();
  return `CT-${yyyy}${mm}${dd}-${suffix}`;
}

export async function grantTrackingAccessCookie(
  request: Request,
  db: D1Database,
  orderCode: string
): Promise<string | null> {
  await ensureOrderSchema(db);
  const normalizedCode = orderCode.trim().toUpperCase();
  const existingRaw = getCookieFromRequest(request, TRACKING_SESSION_COOKIE);
  const rawToken = existingRaw && existingRaw.length >= 32 ? existingRaw : generateOpaqueToken(32);
  const tokenHash = await sha256Hex(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRACKING_SESSION_TTL_MS).toISOString();

  await db
    .prepare(
      `INSERT INTO order_tracking_sessions (id, token_hash, order_code, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(token_hash, order_code) DO UPDATE SET expires_at = excluded.expires_at`
    )
    .bind(`tsess-${crypto.randomUUID()}`, tokenHash, normalizedCode, now.toISOString(), expiresAt)
    .run();

  if (existingRaw && existingRaw.length >= 32) {
    return null;
  }

  return buildSetCookieHeader(TRACKING_SESSION_COOKIE, rawToken, {
    maxAge: TRACKING_COOKIE_MAX_AGE,
    secure: isSecureRequest(request),
  });
}

export async function hasTrackingSessionAccess(
  request: Request,
  db: D1Database,
  orderCode: string
): Promise<boolean> {
  await ensureOrderSchema(db);
  const rawToken = getCookieFromRequest(request, TRACKING_SESSION_COOKIE);
  if (!rawToken || rawToken.length < 32) return false;

  const tokenHash = await sha256Hex(rawToken);
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `SELECT id FROM order_tracking_sessions
       WHERE token_hash = ? AND order_code = ? AND expires_at > ?`
    )
    .bind(tokenHash, orderCode.trim().toUpperCase(), now)
    .first<{ id: string }>();

  return Boolean(row);
}

export async function hasAnyValidTrackingSession(
  request: Request,
  db: D1Database
): Promise<boolean> {
  await ensureOrderSchema(db);
  const rawToken = getCookieFromRequest(request, TRACKING_SESSION_COOKIE);
  if (!rawToken || rawToken.length < 32) return false;

  const tokenHash = await sha256Hex(rawToken);
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `SELECT id FROM order_tracking_sessions
       WHERE token_hash = ? AND expires_at > ? LIMIT 1`
    )
    .bind(tokenHash, now)
    .first<{ id: string }>();

  return Boolean(row);
}

export async function createOrderInDb(
  db: D1Database,
  params: {
    draft: OrderDraft;
    customerSessionId: string | null;
    studioDesignTitle?: string;
    studioDesignModelName?: string;
    storedAttachments?: ReferenceAttachment[];
    now?: Date;
  }
): Promise<SubmittedOrder> {
  await ensureOrderSchema(db);
  const { draft, customerSessionId } = params;
  if (!draft.categoryId) {
    throw new Error("Kategori busana wajib dipilih sebelum membuat pesanan.");
  }

  const now = params.now ?? new Date();
  const timestamp = now.toISOString();
  const id = `ord-${crypto.randomUUID()}`;
  const orderCode = generateServerOrderCode(now);
  const trackingAccessCode = generateTrackingAccessCode();
  const category = getCategoryById(draft.categoryId);
  const categoryName = category?.name ?? draft.categoryId;

  const celmiraRef = celmiraDesignReferences.find(
    (item) => item.id === draft.selectedCelmiraDesignId
  );

  const designTitle =
    draft.designSource === "celmira"
      ? celmiraRef?.title ?? `Desain Celmira (${categoryName})`
      : draft.designSource === "design-studio"
        ? params.studioDesignTitle?.trim() || `Desain Studio (${categoryName})`
        : draft.customDesignTitle.trim() || `Desain Custom (${categoryName})`;

  // Jangan simpan base64 besar di D1; gunakan metadata + URL R2
  const cleanAttachments: ReferenceAttachment[] = (params.storedAttachments ?? draft.attachments).map(
    (file) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      kind: file.kind,
      url: file.url,
      note: file.note,
    })
  );

  const designModelName =
    draft.designSource === "design-studio"
      ? params.studioDesignModelName?.trim() || undefined
      : draft.designSource === "celmira"
        ? celmiraRef?.subtitle || undefined
        : undefined;

  const order: SubmittedOrder = {
    id,
    orderCode,
    trackingAccessCode,
    createdAt: timestamp,
    updatedAt: timestamp,
    persistenceMode: "cloudflare-d1",
    status: "menunggu_penawaran",
    productionStage: "menunggu_produksi",
    categoryId: draft.categoryId,
    categoryName,
    designSource: draft.designSource,
    designTitle,
    designModelName,
    selectedCelmiraDesignId:
      draft.designSource === "celmira" ? draft.selectedCelmiraDesignId : undefined,
    selectedStudioDesignId:
      draft.designSource === "design-studio" ? draft.selectedStudioDesignId : undefined,
    attachments: cleanAttachments,
    specifications: { ...draft.specifications },
    measurements: {
      ...draft.measurements,
      values: { ...draft.measurements.values },
      extraValues: draft.measurements.extraValues
        ? { ...draft.measurements.extraValues }
        : undefined,
      snapshotTakenAt: timestamp,
    },
    customer: {
      fullName: draft.customer.fullName.trim(),
      whatsapp: draft.customer.whatsapp.trim(),
      email: draft.customer.email.trim(),
    },
    delivery: {
      ...draft.delivery,
      addressLine: draft.delivery.addressLine.trim(),
      city: draft.delivery.city.trim(),
      postalCode: draft.delivery.postalCode.trim(),
      courierNote: draft.delivery.courierNote.trim(),
    },
    targetDate: draft.targetDate,
    invoice: {
      quoteStatus: "belum_dikirim",
      tailoringFee: null,
      shippingFee: draft.delivery.method === "pickup" ? 0 : null,
      dpAmount: null,
      dpDueAt: null,
      settlementTailoringAmount: null,
      settlementTotalAmount: null,
    },
    payments: [],
    history: [
      createHistoryEvent(
        {
          actor: "customer",
          category: "pesanan",
          title: "Pengajuan pesanan dikirim",
          description: `Pesanan ${categoryName} (${designTitle}) diajukan dan menunggu peninjauan harga akhir oleh admin.`,
          orderStatus: "menunggu_penawaran",
          productionStage: "menunggu_produksi",
        },
        now
      ),
    ],
  };

  await db
    .prepare(
      `INSERT INTO orders (
        id, order_code, tracking_access_code, customer_session_id,
        design_id, measurement_profile_id, status,
        production_stage, category_id, customer_name, customer_whatsapp,
        target_date, payload_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      order.id,
      order.orderCode,
      order.trackingAccessCode,
      customerSessionId,
      order.selectedStudioDesignId ?? null,
      order.measurements.mode === "profile" ? (order.measurements.profileId ?? null) : null,
      order.status,
      order.productionStage,
      order.categoryId,
      order.customer.fullName,
      order.customer.whatsapp,
      order.targetDate,
      JSON.stringify(order),
      order.createdAt,
      order.updatedAt
    )
    .run();

  return order;
}

export async function saveOrderInDb(
  db: D1Database,
  order: SubmittedOrder
): Promise<SubmittedOrder> {
  await ensureOrderSchema(db);
  const normalized: SubmittedOrder = normalizeSubmittedOrder({
    ...order,
    persistenceMode: "cloudflare-d1",
  });

  await db
    .prepare(
      `UPDATE orders
       SET status = ?,
           production_stage = ?,
           customer_name = ?,
           customer_whatsapp = ?,
           target_date = ?,
           payload_json = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .bind(
      normalized.status,
      normalized.productionStage,
      normalized.customer.fullName,
      normalized.customer.whatsapp,
      normalized.targetDate,
      JSON.stringify(normalized),
      normalized.updatedAt,
      normalized.id
    )
    .run();

  return normalized;
}

export async function getOrderById(
  db: D1Database,
  orderId: string
): Promise<{ order: SubmittedOrder; customerSessionId: string | null } | null> {
  await ensureOrderSchema(db);
  const row = await db
    .prepare(
      `SELECT id, order_code, tracking_access_code, customer_session_id, payload_json
       FROM orders WHERE id = ?`
    )
    .bind(orderId)
    .first<OrderRow>();
  if (!row) return null;
  return parseOrderRow(row);
}

export async function getOrderByCode(
  db: D1Database,
  orderCode: string
): Promise<{ order: SubmittedOrder; customerSessionId: string | null } | null> {
  await ensureOrderSchema(db);
  const row = await db
    .prepare(
      `SELECT id, order_code, tracking_access_code, customer_session_id, payload_json
       FROM orders WHERE order_code = ?`
    )
    .bind(orderCode.trim().toUpperCase())
    .first<OrderRow>();
  if (!row) return null;
  return parseOrderRow(row);
}

export async function listOrdersByCustomerSessionInDb(
  db: D1Database,
  customerSessionId: string
): Promise<SubmittedOrder[]> {
  await ensureOrderSchema(db);
  const res = await db
    .prepare(
      `SELECT id, order_code, tracking_access_code, customer_session_id, payload_json
       FROM orders
       WHERE customer_session_id = ?
       ORDER BY updated_at DESC
       LIMIT 50`
    )
    .bind(customerSessionId)
    .all<OrderRow>();

  const now = new Date();
  const orders: SubmittedOrder[] = [];
  for (const row of res.results ?? []) {
    const parsed = parseOrderRow(row);
    const evaluated = evaluateDpOverdueForReview(parsed.order, now);
    if (evaluated.ok && evaluated.order.status !== parsed.order.status) {
      await saveOrderInDb(db, evaluated.order);
      orders.push(evaluated.order);
    } else {
      orders.push(parsed.order);
    }
  }
  return orders;
}

export type AdminOrderIntegratedContext = {
  orderId: string;
  orderCode: string;
  customerSummary: {
    sessionId: string | null;
    fullName: string;
    whatsapp: string;
    email: string;
    totalOrders: number;
    totalDesigns: number;
    totalMeasurementProfiles: number;
  };
  relatedOrders: Array<{
    id: string;
    orderCode: string;
    designTitle: string;
    categoryName: string;
    status: SubmittedOrder["status"];
    createdAt: string;
    tailoringFee: number | null;
  }>;
  linkedThreads: Array<{
    id: string;
    title: string;
    source: string;
    orderCode: string | null;
    unreadByAdmin: number;
    messageCount: number;
    lastMessagePreview: string | null;
    updatedAt: string;
    recentMessages: Array<{
      id: string;
      sender: string;
      senderName: string;
      body: string;
      createdAt: string;
      attachmentCount: number;
    }>;
  }>;
};

export async function getAdminOrderContextInDb(
  db: D1Database,
  orderId: string
): Promise<AdminOrderIntegratedContext | null> {
  const found = await getOrderById(db, orderId);
  if (!found) return null;

  const { order, customerSessionId } = found;
  let totalOrders = 1;
  let totalDesigns = 0;
  let totalMeasurementProfiles = 0;
  let relatedOrders: AdminOrderIntegratedContext["relatedOrders"] = [];

  if (customerSessionId) {
    const sessionOrders = await listOrdersByCustomerSessionInDb(db, customerSessionId);
    totalOrders = Math.max(1, sessionOrders.length);
    relatedOrders = sessionOrders
      .filter((item) => item.id !== order.id)
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        orderCode: item.orderCode,
        designTitle: item.designTitle,
        categoryName: item.categoryName,
        status: item.status,
        createdAt: item.createdAt,
        tailoringFee: item.invoice.tailoringFee,
      }));

    try {
      const [designCountRow, profileCountRow] = await Promise.all([
        db
          .prepare(`SELECT COUNT(*) AS total FROM design_configs WHERE customer_session_id = ?`)
          .bind(customerSessionId)
          .first<{ total: number }>(),
        db
          .prepare(`SELECT COUNT(*) AS total FROM measurement_profiles WHERE customer_session_id = ?`)
          .bind(customerSessionId)
          .first<{ total: number }>(),
      ]);
      totalDesigns = Number(designCountRow?.total ?? 0);
      totalMeasurementProfiles = Number(profileCountRow?.total ?? 0);
    } catch {
      // Tabel studio mungkin belum diinisialisasi pada lingkungan test minimal.
    }
  }

  const linkedThreads: AdminOrderIntegratedContext["linkedThreads"] = [];
  try {
    type LinkedThreadRow = {
      id: string;
      title: string;
      source: string;
      order_code: string | null;
      unread_by_admin: number;
      last_message_preview: string | null;
      updated_at: string;
    };

    const threadRes = customerSessionId
      ? await db
          .prepare(
            `SELECT id, title, source, order_code, unread_by_admin, last_message_preview, updated_at
             FROM chat_threads
             WHERE order_code = ? OR customer_session_id = ?
             ORDER BY CASE WHEN order_code = ? THEN 0 ELSE 1 END, updated_at DESC
             LIMIT 10`
          )
          .bind(order.orderCode, customerSessionId, order.orderCode)
          .all<LinkedThreadRow>()
      : await db
          .prepare(
            `SELECT id, title, source, order_code, unread_by_admin, last_message_preview, updated_at
             FROM chat_threads
             WHERE order_code = ?
             ORDER BY updated_at DESC
             LIMIT 10`
          )
          .bind(order.orderCode)
          .all<LinkedThreadRow>();

    const rows = threadRes.results ?? [];
    for (const row of rows) {
      const [countRow, msgRes] = await Promise.all([
        db
          .prepare(`SELECT COUNT(*) AS total FROM chat_messages WHERE thread_id = ?`)
          .bind(row.id)
          .first<{ total: number }>(),
        db
          .prepare(
            `SELECT m.id, m.sender, m.sender_name, m.body, m.created_at,
                    (SELECT COUNT(*) FROM chat_attachments a WHERE a.message_id = m.id) AS attachment_count
             FROM chat_messages m
             WHERE m.thread_id = ?
             ORDER BY m.created_at DESC
             LIMIT 3`
          )
          .bind(row.id)
          .all<{
            id: string;
            sender: string;
            sender_name: string;
            body: string;
            created_at: string;
            attachment_count: number;
          }>(),
      ]);

      linkedThreads.push({
        id: row.id,
        title: row.title,
        source: row.source,
        orderCode: row.order_code,
        unreadByAdmin: Number(row.unread_by_admin ?? 0),
        messageCount: Number(countRow?.total ?? 0),
        lastMessagePreview: row.last_message_preview,
        updatedAt: row.updated_at,
        recentMessages: (msgRes.results ?? []).reverse().map((m) => ({
          id: m.id,
          sender: m.sender,
          senderName: m.sender_name,
          body: m.body,
          createdAt: m.created_at,
          attachmentCount: Number(m.attachment_count ?? 0),
        })),
      });
    }
  } catch {
    // Tabel chat mungkin belum ada pada lingkungan test minimal.
  }

  return {
    orderId: order.id,
    orderCode: order.orderCode,
    customerSummary: {
      sessionId: customerSessionId,
      fullName: order.customer.fullName,
      whatsapp: order.customer.whatsapp,
      email: order.customer.email,
      totalOrders,
      totalDesigns,
      totalMeasurementProfiles,
    },
    relatedOrders,
    linkedThreads,
  };
}

export async function listAllOrdersInDb(db: D1Database): Promise<SubmittedOrder[]> {
  await ensureOrderSchema(db);
  const res = await db
    .prepare(
      `SELECT id, order_code, tracking_access_code, customer_session_id, payload_json
       FROM orders ORDER BY updated_at DESC LIMIT 200`
    )
    .all<OrderRow>();

  const now = new Date();
  const orders: SubmittedOrder[] = [];
  for (const row of res.results ?? []) {
    const parsed = parseOrderRow(row);
    const evaluated = evaluateDpOverdueForReview(parsed.order, now);
    if (evaluated.ok && evaluated.order.status !== parsed.order.status) {
      await saveOrderInDb(db, evaluated.order);
      orders.push(evaluated.order);
    } else {
      orders.push(parsed.order);
    }
  }
  return orders;
}

export async function getOrInitPaymentConfigInDb(db: D1Database): Promise<AdminPaymentConfig> {
  await ensureOrderSchema(db);
  const row = await db
    .prepare(
      `SELECT qris_file_id, qris_file_name, qris_merchant_name, qris_updated_at,
              payment_instructions, dp_window_hours, updated_at
       FROM admin_payment_config WHERE id = 'default'`
    )
    .first<{
      qris_file_id: string | null;
      qris_file_name: string | null;
      qris_merchant_name: string | null;
      qris_updated_at: string | null;
      payment_instructions: string;
      dp_window_hours: number;
      updated_at: string;
    }>();

  if (row) {
    const qrisUrl = row.qris_file_id
      ? `/api/orders/files/${encodeURIComponent(row.qris_file_id)}`
      : undefined;
    return {
      qrisFileId: row.qris_file_id ?? undefined,
      qrisImageUrl: qrisUrl,
      qrisImageDataUrl: qrisUrl,
      qrisFileName: row.qris_file_name ?? undefined,
      qrisMerchantName: row.qris_merchant_name ?? undefined,
      qrisUpdatedAt: row.qris_updated_at ?? undefined,
      paymentInstructions: row.payment_instructions,
      dpWindowHours: row.dp_window_hours,
      updatedAt: row.updated_at,
    };
  }

  const defaults = createDefaultAdminPaymentConfig();
  await db
    .prepare(
      `INSERT OR IGNORE INTO admin_payment_config
       (id, qris_file_id, qris_file_name, qris_merchant_name, qris_updated_at, payment_instructions, dp_window_hours, updated_at)
       VALUES ('default', NULL, NULL, NULL, NULL, ?, ?, ?)`
    )
    .bind(defaults.paymentInstructions, defaults.dpWindowHours, defaults.updatedAt)
    .run();

  return defaults;
}

export async function updatePaymentConfigInDb(
  db: D1Database,
  patch: Partial<{
    qrisFileId: string | null;
    qrisFileName: string | null;
    qrisMerchantName: string | null;
    qrisUpdatedAt: string | null;
    paymentInstructions: string;
    dpWindowHours: number;
  }>
): Promise<AdminPaymentConfig> {
  const current = await getOrInitPaymentConfigInDb(db);
  const now = new Date().toISOString();

  const nextQrisFileId =
    patch.qrisFileId !== undefined ? patch.qrisFileId : (current.qrisFileId ?? null);
  const nextQrisFileName =
    patch.qrisFileName !== undefined ? patch.qrisFileName : (current.qrisFileName ?? null);
  const nextMerchant =
    patch.qrisMerchantName !== undefined
      ? patch.qrisMerchantName
      : (current.qrisMerchantName ?? null);
  const nextQrisUpdatedAt =
    patch.qrisUpdatedAt !== undefined ? patch.qrisUpdatedAt : (current.qrisUpdatedAt ?? null);
  const nextInstructions =
    patch.paymentInstructions !== undefined
      ? patch.paymentInstructions.trim()
      : current.paymentInstructions;
  const nextDpHours =
    typeof patch.dpWindowHours === "number" && patch.dpWindowHours >= 1
      ? Math.min(168, Math.round(patch.dpWindowHours))
      : current.dpWindowHours;

  await db
    .prepare(
      `INSERT INTO admin_payment_config
       (id, qris_file_id, qris_file_name, qris_merchant_name, qris_updated_at, payment_instructions, dp_window_hours, updated_at)
       VALUES ('default', ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         qris_file_id = excluded.qris_file_id,
         qris_file_name = excluded.qris_file_name,
         qris_merchant_name = excluded.qris_merchant_name,
         qris_updated_at = excluded.qris_updated_at,
         payment_instructions = excluded.payment_instructions,
         dp_window_hours = excluded.dp_window_hours,
         updated_at = excluded.updated_at`
    )
    .bind(
      nextQrisFileId,
      nextQrisFileName,
      nextMerchant,
      nextQrisUpdatedAt,
      nextInstructions,
      nextDpHours,
      now
    )
    .run();

  return getOrInitPaymentConfigInDb(db);
}
