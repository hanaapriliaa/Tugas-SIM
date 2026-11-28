import type {
  AdminCustomerDetail,
  AdminCustomerRecord,
  AdminProductionCapacityConfig,
  MeasurementTemplateConfig,
  ProductionScheduleSummary,
} from "@/lib/types/tailor";

export class AdminModuleApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminModuleApiError";
    this.status = status;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const errObj = (data ?? {}) as { error?: string };
    throw new AdminModuleApiError(
      errObj.error ?? `Permintaan admin gagal (HTTP ${res.status}).`,
      res.status
    );
  }
  return data as T;
}

// ── Template Ukuran & Kategori ──────────────────────────────────────────────

export async function fetchAdminTemplatesApi(): Promise<{
  templates: MeasurementTemplateConfig[];
  serverTime: string;
}> {
  const res = await fetch("/api/admin/templates", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson(res);
}

export async function saveAdminTemplateApi(
  template: MeasurementTemplateConfig
): Promise<{
  template: MeasurementTemplateConfig;
  templates: MeasurementTemplateConfig[];
  serverTime: string;
}> {
  const res = await fetch("/api/admin/templates", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ template }),
  });
  return parseJson(res);
}

export async function resetAdminTemplatesApi(): Promise<{
  templates: MeasurementTemplateConfig[];
  reset: boolean;
  serverTime: string;
}> {
  const res = await fetch("/api/admin/templates", {
    method: "DELETE",
    credentials: "same-origin",
  });
  return parseJson(res);
}

// ── Kapasitas & Jadwal Produksi ─────────────────────────────────────────────

export async function fetchAdminScheduleApi(): Promise<{
  schedule: ProductionScheduleSummary;
  serverTime: string;
}> {
  const res = await fetch("/api/admin/schedule", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson(res);
}

export async function updateAdminCapacityApi(
  patch: Partial<AdminProductionCapacityConfig>
): Promise<{
  capacity: AdminProductionCapacityConfig;
  schedule: ProductionScheduleSummary;
  serverTime: string;
}> {
  const res = await fetch("/api/admin/schedule", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseJson(res);
}

// ── Manajemen Pelanggan ─────────────────────────────────────────────────────

export async function fetchAdminCustomersApi(): Promise<{
  customers: AdminCustomerRecord[];
  serverTime: string;
}> {
  const res = await fetch("/api/admin/customers", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson(res);
}

export async function fetchAdminCustomerDetailApi(
  customerKey: string
): Promise<{
  detail: AdminCustomerDetail;
  serverTime: string;
}> {
  const res = await fetch(`/api/admin/customers/${encodeURIComponent(customerKey)}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson(res);
}

export async function saveAdminCustomerNoteApi(
  customerKey: string,
  internalNote: string
): Promise<{
  internalNote: string;
  updatedAt: string;
}> {
  const res = await fetch(`/api/admin/customers/${encodeURIComponent(customerKey)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ internalNote }),
  });
  return parseJson(res);
}
