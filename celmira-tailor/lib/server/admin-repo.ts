import {
  MAX_ADMIN_CUSTOMER_NOTE_LENGTH,
  computeProductionScheduleSummary,
  createDefaultProductionCapacityConfig,
  isActiveProductionOrder,
  normalizeProductionCapacityConfig,
  validateMeasurementTemplateUpdate,
  validateProductionCapacityInput,
} from "../admin-modules.ts";
import {
  DEFAULT_MEASUREMENT_TEMPLATES,
  normalizeMeasurementTemplates,
  summarizeMeasurementProfile,
} from "../measurement-studio.ts";
import type {
  AdminCustomerDetail,
  AdminCustomerRecord,
  AdminProductionCapacityConfig,
  ChatThreadSource,
  GarmentCategoryId,
  MeasurementExtraValues,
  MeasurementTemplateConfig,
  MeasurementTemplateId,
  MeasurementValues,
  OrderStatus,
  ProductionScheduleSummary,
} from "@/lib/types/tailor";
import { ensureAdminModuleSchema } from "./admin-schema.ts";
import { normalizeWhatsappForSession } from "./auth.ts";
import { listAllOrdersInDb } from "./order-repo.ts";

// ============================================================================
// 1. TEMPLATE UKURAN & KATEGORI (D1)
// ============================================================================

export async function listMeasurementTemplatesInDb(
  db: D1Database
): Promise<MeasurementTemplateConfig[]> {
  await ensureAdminModuleSchema(db);
  const res = await db
    .prepare(`SELECT template_id, config_json, updated_at FROM admin_measurement_templates`)
    .all<{ template_id: string; config_json: string; updated_at: string }>();

  const rows = res.results ?? [];
  if (rows.length === 0) {
    return normalizeMeasurementTemplates(DEFAULT_MEASUREMENT_TEMPLATES);
  }

  const stored: MeasurementTemplateConfig[] = [];
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.config_json) as MeasurementTemplateConfig;
      stored.push({ ...parsed, updatedAt: row.updated_at || parsed.updatedAt });
    } catch {
      // Abaikan JSON rusak, fallback ke default via normalizeMeasurementTemplates
    }
  }

  return normalizeMeasurementTemplates(stored);
}

export async function saveMeasurementTemplateInDb(
  db: D1Database,
  candidate: MeasurementTemplateConfig
): Promise<
  | { ok: true; template: MeasurementTemplateConfig; templates: MeasurementTemplateConfig[] }
  | { ok: false; error: string; status: number }
> {
  await ensureAdminModuleSchema(db);
  const currentTemplates = await listMeasurementTemplatesInDb(db);
  const validation = validateMeasurementTemplateUpdate(candidate, currentTemplates);
  if (!validation.valid || !validation.template) {
    return {
      ok: false,
      error: validation.error ?? "Data template ukuran tidak valid.",
      status: 400,
    };
  }

  const template = validation.template;
  await db
    .prepare(
      `INSERT INTO admin_measurement_templates (template_id, config_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(template_id) DO UPDATE SET
         config_json = excluded.config_json,
         updated_at = excluded.updated_at`
    )
    .bind(template.id, JSON.stringify(template), template.updatedAt)
    .run();

  const templates = await listMeasurementTemplatesInDb(db);
  return { ok: true, template, templates };
}

export async function resetMeasurementTemplatesInDb(
  db: D1Database
): Promise<MeasurementTemplateConfig[]> {
  await ensureAdminModuleSchema(db);
  await db.prepare(`DELETE FROM admin_measurement_templates`).run();
  return normalizeMeasurementTemplates(DEFAULT_MEASUREMENT_TEMPLATES);
}

// ============================================================================
// 2. KAPASITAS & JADWAL PRODUKSI (D1)
// ============================================================================

export async function getOrInitProductionCapacityInDb(
  db: D1Database
): Promise<AdminProductionCapacityConfig> {
  await ensureAdminModuleSchema(db);
  const row = await db
    .prepare(
      `SELECT weekly_order_limit, daily_target_limit, standard_lead_days,
              blocked_dates_json, category_lead_days_json, operational_note, updated_at
       FROM admin_production_capacity
       WHERE id = 'default'`
    )
    .first<{
      weekly_order_limit: number;
      daily_target_limit: number;
      standard_lead_days: number;
      blocked_dates_json: string;
      category_lead_days_json: string;
      operational_note: string;
      updated_at: string;
    }>();

  if (row) {
    let blockedDates = [];
    let categoryLeadDays = {};
    try {
      blockedDates = JSON.parse(row.blocked_dates_json || "[]");
    } catch {
      blockedDates = [];
    }
    try {
      categoryLeadDays = JSON.parse(row.category_lead_days_json || "{}");
    } catch {
      categoryLeadDays = {};
    }

    return normalizeProductionCapacityConfig({
      weeklyOrderLimit: Number(row.weekly_order_limit),
      dailyTargetLimit: Number(row.daily_target_limit),
      standardLeadDays: Number(row.standard_lead_days),
      blockedDates,
      categoryLeadDays,
      operationalNote: row.operational_note ?? "",
      updatedAt: row.updated_at,
    });
  }

  const defaults = createDefaultProductionCapacityConfig();
  await db
    .prepare(
      `INSERT OR IGNORE INTO admin_production_capacity
       (id, weekly_order_limit, daily_target_limit, standard_lead_days,
        blocked_dates_json, category_lead_days_json, operational_note, updated_at)
       VALUES ('default', ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      defaults.weeklyOrderLimit,
      defaults.dailyTargetLimit,
      defaults.standardLeadDays,
      JSON.stringify(defaults.blockedDates),
      JSON.stringify(defaults.categoryLeadDays),
      defaults.operationalNote,
      defaults.updatedAt
    )
    .run();

  return defaults;
}

export async function updateProductionCapacityInDb(
  db: D1Database,
  patch: Partial<AdminProductionCapacityConfig>
): Promise<
  | { ok: true; capacity: AdminProductionCapacityConfig }
  | { ok: false; error: string; status: number }
> {
  await ensureAdminModuleSchema(db);
  const current = await getOrInitProductionCapacityInDb(db);
  const merged: Partial<AdminProductionCapacityConfig> = {
    weeklyOrderLimit: patch.weeklyOrderLimit ?? current.weeklyOrderLimit,
    dailyTargetLimit: patch.dailyTargetLimit ?? current.dailyTargetLimit,
    standardLeadDays: patch.standardLeadDays ?? current.standardLeadDays,
    blockedDates: patch.blockedDates !== undefined ? patch.blockedDates : current.blockedDates,
    categoryLeadDays:
      patch.categoryLeadDays !== undefined
        ? { ...current.categoryLeadDays, ...patch.categoryLeadDays }
        : current.categoryLeadDays,
    operationalNote:
      patch.operationalNote !== undefined ? patch.operationalNote : current.operationalNote,
    updatedAt: new Date().toISOString(),
  };

  const validation = validateProductionCapacityInput(merged);
  if (!validation.valid || !validation.normalized) {
    return {
      ok: false,
      error: validation.error ?? "Pengaturan kapasitas produksi tidak valid.",
      status: 400,
    };
  }

  const next = { ...validation.normalized, updatedAt: new Date().toISOString() };
  await db
    .prepare(
      `INSERT INTO admin_production_capacity
       (id, weekly_order_limit, daily_target_limit, standard_lead_days,
        blocked_dates_json, category_lead_days_json, operational_note, updated_at)
       VALUES ('default', ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         weekly_order_limit = excluded.weekly_order_limit,
         daily_target_limit = excluded.daily_target_limit,
         standard_lead_days = excluded.standard_lead_days,
         blocked_dates_json = excluded.blocked_dates_json,
         category_lead_days_json = excluded.category_lead_days_json,
         operational_note = excluded.operational_note,
         updated_at = excluded.updated_at`
    )
    .bind(
      next.weeklyOrderLimit,
      next.dailyTargetLimit,
      next.standardLeadDays,
      JSON.stringify(next.blockedDates),
      JSON.stringify(next.categoryLeadDays),
      next.operationalNote,
      next.updatedAt
    )
    .run();

  return { ok: true, capacity: next };
}

export async function getAdminProductionScheduleInDb(
  db: D1Database,
  referenceDate: Date = new Date()
): Promise<ProductionScheduleSummary> {
  await ensureAdminModuleSchema(db);
  const [capacity, orders] = await Promise.all([
    getOrInitProductionCapacityInDb(db),
    listAllOrdersInDb(db),
  ]);
  return computeProductionScheduleSummary(orders, capacity, referenceDate);
}

// ============================================================================
// 3. MANAJEMEN PELANGGAN (D1)
// ============================================================================

type SessionRow = {
  id: string;
  customer_name: string | null;
  customer_whatsapp_norm: string | null;
  customer_email: string | null;
  created_at: string;
  last_seen_at: string;
};

type OrderMetaRow = {
  id: string;
  order_code: string;
  customer_session_id: string | null;
  status: string;
  production_stage: string;
  category_id: string;
  customer_name: string;
  customer_whatsapp: string;
  target_date: string;
  payload_json: string;
  created_at: string;
  updated_at: string;
};

function resolveOrderCustomerKey(row: Pick<OrderMetaRow, "customer_session_id" | "customer_whatsapp" | "id">): string {
  if (row.customer_session_id && row.customer_session_id.trim()) {
    return row.customer_session_id.trim();
  }
  const wa = normalizeWhatsappForSession(row.customer_whatsapp);
  if (wa) return `wa:${wa}`;
  return `ord:${row.id}`;
}

function maxIso(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

function minIso(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

export async function listAdminCustomersInDb(db: D1Database): Promise<AdminCustomerRecord[]> {
  await ensureAdminModuleSchema(db);

  const [sessionsRes, ordersRes, designCountsRes, profileCountsRes, threadCountsRes, notesRes] =
    await Promise.all([
      db
        .prepare(
          `SELECT id, customer_name, customer_whatsapp_norm, customer_email, created_at, last_seen_at
           FROM chat_customer_sessions
           ORDER BY last_seen_at DESC
           LIMIT 300`
        )
        .all<SessionRow>(),
      db
        .prepare(
          `SELECT id, order_code, customer_session_id, status, production_stage,
                  category_id, customer_name, customer_whatsapp, target_date,
                  payload_json, created_at, updated_at
           FROM orders
           ORDER BY updated_at DESC
           LIMIT 500`
        )
        .all<OrderMetaRow>(),
      db
        .prepare(
          `SELECT customer_session_id, COUNT(*) AS total, MAX(updated_at) AS latest_at
           FROM design_configs
           GROUP BY customer_session_id`
        )
        .all<{ customer_session_id: string; total: number; latest_at: string }>(),
      db
        .prepare(
          `SELECT customer_session_id, COUNT(*) AS total, MAX(updated_at) AS latest_at
           FROM measurement_profiles
           GROUP BY customer_session_id`
        )
        .all<{ customer_session_id: string; total: number; latest_at: string }>(),
      db
        .prepare(
          `SELECT customer_session_id,
                  COUNT(*) AS total,
                  SUM(unread_by_admin) AS unread_total,
                  MAX(updated_at) AS latest_at,
                  MAX(customer_name) AS thread_customer_name
           FROM chat_threads
           GROUP BY customer_session_id`
        )
        .all<{
          customer_session_id: string;
          total: number;
          unread_total: number;
          latest_at: string;
          thread_customer_name: string | null;
        }>(),
      db
        .prepare(`SELECT customer_key, internal_note FROM admin_customer_notes`)
        .all<{ customer_key: string; internal_note: string }>(),
    ]);

  const designCountMap = new Map<string, { total: number; latestAt: string }>();
  for (const row of designCountsRes.results ?? []) {
    designCountMap.set(row.customer_session_id, {
      total: Number(row.total ?? 0),
      latestAt: row.latest_at ?? "",
    });
  }

  const profileCountMap = new Map<string, { total: number; latestAt: string }>();
  for (const row of profileCountsRes.results ?? []) {
    profileCountMap.set(row.customer_session_id, {
      total: Number(row.total ?? 0),
      latestAt: row.latest_at ?? "",
    });
  }

  const threadCountMap = new Map<
    string,
    { total: number; unreadTotal: number; latestAt: string; customerName: string }
  >();
  for (const row of threadCountsRes.results ?? []) {
    threadCountMap.set(row.customer_session_id, {
      total: Number(row.total ?? 0),
      unreadTotal: Number(row.unread_total ?? 0),
      latestAt: row.latest_at ?? "",
      customerName: row.thread_customer_name?.trim() ?? "",
    });
  }

  const noteMap = new Map<string, string>();
  for (const row of notesRes.results ?? []) {
    noteMap.set(row.customer_key, row.internal_note ?? "");
  }

  const customerMap = new Map<string, AdminCustomerRecord>();

  // 1. Seed dari chat_customer_sessions yang memang punya interaksi nyata (identitas, desain, ukuran, chat, atau order)
  for (const session of sessionsRes.results ?? []) {
    const dInfo = designCountMap.get(session.id);
    const pInfo = profileCountMap.get(session.id);
    const tInfo = threadCountMap.get(session.id);
    const hasProfileData =
      Boolean(session.customer_name?.trim()) ||
      Boolean(session.customer_whatsapp_norm?.trim()) ||
      Boolean(session.customer_email?.trim()) ||
      (dInfo?.total ?? 0) > 0 ||
      (pInfo?.total ?? 0) > 0 ||
      (tInfo?.total ?? 0) > 0;

    if (!hasProfileData) continue;

    let lastActivityAt = session.last_seen_at || session.created_at;
    if (dInfo?.latestAt) lastActivityAt = maxIso(lastActivityAt, dInfo.latestAt);
    if (pInfo?.latestAt) lastActivityAt = maxIso(lastActivityAt, pInfo.latestAt);
    if (tInfo?.latestAt) lastActivityAt = maxIso(lastActivityAt, tInfo.latestAt);

    customerMap.set(session.id, {
      customerKey: session.id,
      sessionId: session.id,
      fullName: session.customer_name?.trim() || tInfo?.customerName || "Pelanggan Guest",
      whatsapp: session.customer_whatsapp_norm?.trim() || "",
      email: session.customer_email?.trim() || "",
      totalOrders: 0,
      activeOrders: 0,
      completedOrders: 0,
      totalQuotedValue: 0,
      totalDesigns: dInfo?.total ?? 0,
      totalMeasurementProfiles: pInfo?.total ?? 0,
      totalChatThreads: tInfo?.total ?? 0,
      unreadChatByAdmin: tInfo?.unreadTotal ?? 0,
      internalNote: noteMap.get(session.id) ?? "",
      createdAt: session.created_at,
      lastActivityAt,
    });
  }

  // 2. Gabungkan seluruh pesanan dari tabel orders
  for (const row of ordersRes.results ?? []) {
    const key = resolveOrderCustomerKey(row);
    let email = "";
    let tailoringFee = 0;
    try {
      const payload = JSON.parse(row.payload_json) as {
        customer?: { email?: string; fullName?: string; whatsapp?: string };
        invoice?: { tailoringFee?: number | null };
      };
      email = payload.customer?.email?.trim() ?? "";
      if (typeof payload.invoice?.tailoringFee === "number" && payload.invoice.tailoringFee > 0) {
        tailoringFee = payload.invoice.tailoringFee;
      }
    } catch {
      // Abaikan
    }

    const existing = customerMap.get(key);
    const status = row.status as OrderStatus;
    const isActive = isActiveProductionOrder(status);
    const isCompleted = status === "selesai";

    if (existing) {
      if (
        (!existing.fullName || existing.fullName === "Pelanggan Guest") &&
        row.customer_name.trim()
      ) {
        existing.fullName = row.customer_name.trim();
      }
      if (!existing.whatsapp && row.customer_whatsapp.trim()) {
        existing.whatsapp = row.customer_whatsapp.trim();
      }
      if (!existing.email && email) {
        existing.email = email;
      }
      existing.totalOrders += 1;
      if (isActive) existing.activeOrders += 1;
      if (isCompleted) existing.completedOrders += 1;
      if (status !== "dibatalkan") {
        existing.totalQuotedValue += tailoringFee;
      }
      if (!existing.latestOrderCode) {
        existing.latestOrderCode = row.order_code;
        existing.latestOrderStatus = status;
      }
      existing.createdAt = minIso(existing.createdAt, row.created_at);
      existing.lastActivityAt = maxIso(existing.lastActivityAt, row.updated_at);
    } else {
      const dInfo = row.customer_session_id ? designCountMap.get(row.customer_session_id) : undefined;
      const pInfo = row.customer_session_id ? profileCountMap.get(row.customer_session_id) : undefined;
      const tInfo = row.customer_session_id ? threadCountMap.get(row.customer_session_id) : undefined;

      customerMap.set(key, {
        customerKey: key,
        sessionId: row.customer_session_id ?? null,
        fullName: row.customer_name.trim() || "Pelanggan Guest",
        whatsapp: row.customer_whatsapp.trim(),
        email,
        totalOrders: 1,
        activeOrders: isActive ? 1 : 0,
        completedOrders: isCompleted ? 1 : 0,
        totalQuotedValue: status !== "dibatalkan" ? tailoringFee : 0,
        totalDesigns: dInfo?.total ?? 0,
        totalMeasurementProfiles: pInfo?.total ?? 0,
        totalChatThreads: tInfo?.total ?? 0,
        unreadChatByAdmin: tInfo?.unreadTotal ?? 0,
        latestOrderCode: row.order_code,
        latestOrderStatus: status,
        internalNote: noteMap.get(key) ?? "",
        createdAt: row.created_at,
        lastActivityAt: row.updated_at,
      });
    }
  }

  return Array.from(customerMap.values()).sort((a, b) =>
    b.lastActivityAt.localeCompare(a.lastActivityAt)
  );
}

export async function getAdminCustomerDetailInDb(
  db: D1Database,
  customerKey: string
): Promise<AdminCustomerDetail | null> {
  await ensureAdminModuleSchema(db);
  const allCustomers = await listAdminCustomersInDb(db);
  const customer = allCustomers.find((c) => c.customerKey === customerKey);
  if (!customer) return null;

  const templates = await listMeasurementTemplatesInDb(db);

  // Ambil pesanan pelanggan
  const orderRowsRes = customer.sessionId
    ? await db
        .prepare(
          `SELECT id, order_code, customer_session_id, status, production_stage,
                  category_id, customer_name, customer_whatsapp, target_date,
                  payload_json, created_at, updated_at
           FROM orders
           WHERE customer_session_id = ?
           ORDER BY updated_at DESC
           LIMIT 50`
        )
        .bind(customer.sessionId)
        .all<OrderMetaRow>()
    : await db
        .prepare(
          `SELECT id, order_code, customer_session_id, status, production_stage,
                  category_id, customer_name, customer_whatsapp, target_date,
                  payload_json, created_at, updated_at
           FROM orders
           ORDER BY updated_at DESC
           LIMIT 200`
        )
        .all<OrderMetaRow>();

  const matchedOrders = (orderRowsRes.results ?? []).filter(
    (row) => resolveOrderCustomerKey(row) === customerKey
  );

  const orders = matchedOrders.map((row) => {
    let categoryName = row.category_id;
    let designTitle = row.category_id;
    let tailoringFee: number | null = null;
    try {
      const parsed = JSON.parse(row.payload_json) as {
        categoryName?: string;
        designTitle?: string;
        invoice?: { tailoringFee?: number | null };
      };
      if (parsed.categoryName) categoryName = parsed.categoryName;
      if (parsed.designTitle) designTitle = parsed.designTitle;
      if (typeof parsed.invoice?.tailoringFee === "number") {
        tailoringFee = parsed.invoice.tailoringFee;
      }
    } catch {
      // Abaikan
    }
    return {
      id: row.id,
      orderCode: row.order_code,
      categoryName,
      designTitle,
      status: row.status as OrderStatus,
      productionStage: row.production_stage as AdminCustomerDetail["orders"][number]["productionStage"],
      targetDate: row.target_date,
      tailoringFee,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  let designs: AdminCustomerDetail["designs"] = [];
  let measurementProfiles: AdminCustomerDetail["measurementProfiles"] = [];
  let chatThreads: AdminCustomerDetail["chatThreads"] = [];

  if (customer.sessionId) {
    const [designsRes, profilesRes, threadsRes] = await Promise.all([
      db
        .prepare(
          `SELECT id, title, category_id, model_name, specifications_json, updated_at
           FROM design_configs
           WHERE customer_session_id = ?
           ORDER BY updated_at DESC
           LIMIT 30`
        )
        .bind(customer.sessionId)
        .all<{
          id: string;
          title: string;
          category_id: string;
          model_name: string;
          specifications_json: string;
          updated_at: string;
        }>(),
      db
        .prepare(
          `SELECT id, label, template_id, category_hint, values_json, extra_values_json, updated_at
           FROM measurement_profiles
           WHERE customer_session_id = ?
           ORDER BY updated_at DESC
           LIMIT 30`
        )
        .bind(customer.sessionId)
        .all<{
          id: string;
          label: string;
          template_id: string;
          category_hint: string | null;
          values_json: string;
          extra_values_json: string | null;
          updated_at: string;
        }>(),
      db
        .prepare(
          `SELECT id, title, source, order_code, unread_by_admin, last_message_preview, updated_at
           FROM chat_threads
           WHERE customer_session_id = ?
           ORDER BY updated_at DESC
           LIMIT 20`
        )
        .bind(customer.sessionId)
        .all<{
          id: string;
          title: string;
          source: string;
          order_code: string | null;
          unread_by_admin: number;
          last_message_preview: string | null;
          updated_at: string;
        }>(),
    ]);

    designs = (designsRes.results ?? []).map((row) => {
      let fabric = "";
      let colorName = "";
      try {
        const specs = JSON.parse(row.specifications_json) as {
          fabric?: string;
          colorName?: string;
        };
        fabric = specs.fabric ?? "";
        colorName = specs.colorName ?? "";
      } catch {
        // Abaikan
      }
      return {
        id: row.id,
        title: row.title,
        categoryId: row.category_id as GarmentCategoryId,
        modelName: row.model_name,
        fabric,
        colorName,
        updatedAt: row.updated_at,
      };
    });

    measurementProfiles = (profilesRes.results ?? []).map((row) => {
      let values: MeasurementValues = {
        bust: "",
        waist: "",
        hip: "",
        shoulderWidth: "",
        sleeveLength: "",
        garmentLength: "",
        neckCircumference: "",
      };
      let extraValues: MeasurementExtraValues | undefined;
      try {
        values = { ...values, ...(JSON.parse(row.values_json) as Partial<MeasurementValues>) };
      } catch {
        // Abaikan
      }
      if (row.extra_values_json) {
        try {
          extraValues = JSON.parse(row.extra_values_json) as MeasurementExtraValues;
        } catch {
          extraValues = undefined;
        }
      }
      const templateId = row.template_id as MeasurementTemplateId;
      return {
        id: row.id,
        label: row.label,
        templateId,
        categoryHint: (row.category_hint as GarmentCategoryId | null) ?? undefined,
        summary: summarizeMeasurementProfile({ templateId, values, extraValues }, templates),
        updatedAt: row.updated_at,
      };
    });

    chatThreads = (threadsRes.results ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      source: row.source as ChatThreadSource,
      orderCode: row.order_code ?? undefined,
      unreadByAdmin: Number(row.unread_by_admin ?? 0),
      lastMessagePreview: row.last_message_preview ?? undefined,
      updatedAt: row.updated_at,
    }));
  }

  return {
    customer,
    orders,
    designs,
    measurementProfiles,
    chatThreads,
  };
}

export async function saveAdminCustomerNoteInDb(
  db: D1Database,
  customerKey: string,
  rawNote: string
): Promise<{ ok: true; internalNote: string; updatedAt: string } | { ok: false; error: string; status: number }> {
  await ensureAdminModuleSchema(db);
  const key = customerKey.trim();
  if (!key || key.length > 120) {
    return { ok: false, error: "Identitas pelanggan tidak valid.", status: 400 };
  }

  const trimmed = rawNote.trim();
  if (trimmed.length > MAX_ADMIN_CUSTOMER_NOTE_LENGTH) {
    return {
      ok: false,
      error: `Catatan internal maksimal ${MAX_ADMIN_CUSTOMER_NOTE_LENGTH} karakter.`,
      status: 400,
    };
  }

  const updatedAt = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO admin_customer_notes (customer_key, internal_note, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(customer_key) DO UPDATE SET
         internal_note = excluded.internal_note,
         updated_at = excluded.updated_at`
    )
    .bind(key, trimmed, updatedAt)
    .run();

  return { ok: true, internalNote: trimmed, updatedAt };
}
