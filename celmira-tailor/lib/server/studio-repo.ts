import {
  MAX_SAVED_DESIGNS,
  createSavedDesignConfig,
  validateDesignDraft,
  type DesignStudioDraft,
} from "../design-studio.ts";
import {
  DEFAULT_MEASUREMENT_TEMPLATES,
  MAX_SAVED_MEASUREMENT_PROFILES,
  createSavedMeasurementProfile,
  validateMeasurementDraft,
  type MeasurementStudioDraft,
} from "../measurement-studio.ts";
import type {
  DesignStudioSavedConfig,
  GarmentCategoryId,
  GarmentSpecifications,
  MeasurementExtraValues,
  MeasurementProfile,
  MeasurementTemplateId,
  MeasurementValues,
  ReferenceAttachment,
} from "@/lib/types/tailor";
import { ensureStudioSchema } from "./studio-schema.ts";
import { bindStudioFilesToDesign, extractStudioFileIdFromUrl } from "./studio-storage.ts";

const SYNC_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function normalizeStudioSyncCode(raw: string): string {
  const cleaned = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (cleaned.startsWith("CS") && cleaned.length === 10) {
    return `CS-${cleaned.slice(2, 6)}-${cleaned.slice(6, 10)}`;
  }
  return raw.trim().toUpperCase();
}

export function generateStudioSyncCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let chars = "";
  for (let i = 0; i < 8; i += 1) {
    chars += SYNC_CODE_ALPHABET[bytes[i] % SYNC_CODE_ALPHABET.length];
  }
  return `CS-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

export async function getOrCreateStudioSyncCode(
  db: D1Database,
  customerSessionId: string
): Promise<string> {
  await ensureStudioSchema(db);
  const existing = await db
    .prepare(`SELECT sync_code FROM studio_access_codes WHERE customer_session_id = ?`)
    .bind(customerSessionId)
    .first<{ sync_code: string }>();

  if (existing?.sync_code) {
    return existing.sync_code;
  }

  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const syncCode = generateStudioSyncCode();
    try {
      await db
        .prepare(
          `INSERT INTO studio_access_codes (customer_session_id, sync_code, created_at, updated_at)
           VALUES (?, ?, ?, ?)`
        )
        .bind(customerSessionId, syncCode, now, now)
        .run();
      return syncCode;
    } catch {
      const retryExisting = await db
        .prepare(`SELECT sync_code FROM studio_access_codes WHERE customer_session_id = ?`)
        .bind(customerSessionId)
        .first<{ sync_code: string }>();
      if (retryExisting?.sync_code) return retryExisting.sync_code;
    }
  }

  throw new Error("Gagal membuat kode sinkronisasi studio.");
}

export async function findCustomerSessionBySyncCode(
  db: D1Database,
  rawSyncCode: string
): Promise<{ customerSessionId: string; syncCode: string } | null> {
  await ensureStudioSchema(db);
  const normalized = normalizeStudioSyncCode(rawSyncCode);
  if (!normalized || normalized.length < 6) return null;

  const row = await db
    .prepare(
      `SELECT customer_session_id, sync_code
       FROM studio_access_codes
       WHERE sync_code = ?`
    )
    .bind(normalized)
    .first<{ customer_session_id: string; sync_code: string }>();

  if (!row) return null;
  return {
    customerSessionId: row.customer_session_id,
    syncCode: row.sync_code,
  };
}

type DesignConfigRow = {
  id: string;
  customer_session_id: string;
  title: string;
  category_id: string;
  model_name: string;
  specifications_json: string;
  attachments_json: string;
  created_at: string;
  updated_at: string;
};

function parseDesignRow(row: DesignConfigRow): DesignStudioSavedConfig {
  const specs = JSON.parse(row.specifications_json) as GarmentSpecifications;
  const rawAttachments = JSON.parse(row.attachments_json) as ReferenceAttachment[];
  const attachments: ReferenceAttachment[] = Array.isArray(rawAttachments)
    ? rawAttachments.map((att) => ({
        id: att.id,
        name: att.name,
        size: att.size,
        mimeType: att.mimeType,
        kind: att.kind === "pdf" ? "pdf" : "image",
        url: att.url,
        note: att.note,
      }))
    : [];

  return {
    id: row.id,
    title: row.title,
    categoryId: row.category_id as GarmentCategoryId,
    modelName: row.model_name,
    specifications: specs,
    attachments,
    updatedAt: row.updated_at,
  };
}

function sanitizeDesignAttachments(attachments: ReferenceAttachment[]): ReferenceAttachment[] {
  return attachments.slice(0, 5).map((att) => ({
    id: att.id,
    name: att.name,
    size: att.size,
    mimeType: att.mimeType,
    kind: att.kind === "pdf" ? "pdf" : "image",
    url: att.url,
    note: att.note?.trim() ?? "",
  }));
}

export async function listDesignsInDb(
  db: D1Database,
  customerSessionId: string
): Promise<DesignStudioSavedConfig[]> {
  await ensureStudioSchema(db);
  const res = await db
    .prepare(
      `SELECT id, customer_session_id, title, category_id, model_name,
              specifications_json, attachments_json, created_at, updated_at
       FROM design_configs
       WHERE customer_session_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .bind(customerSessionId, MAX_SAVED_DESIGNS)
    .all<DesignConfigRow>();

  return (res.results ?? []).map(parseDesignRow);
}

export async function getDesignByIdInDb(
  db: D1Database,
  designId: string
): Promise<{ design: DesignStudioSavedConfig; customerSessionId: string } | null> {
  await ensureStudioSchema(db);
  const row = await db
    .prepare(
      `SELECT id, customer_session_id, title, category_id, model_name,
              specifications_json, attachments_json, created_at, updated_at
       FROM design_configs
       WHERE id = ?`
    )
    .bind(designId)
    .first<DesignConfigRow>();

  if (!row) return null;
  return {
    design: parseDesignRow(row),
    customerSessionId: row.customer_session_id,
  };
}

export async function saveDesignInDb(
  db: D1Database,
  customerSessionId: string,
  draft: DesignStudioDraft,
  existingId?: string | null
): Promise<
  | { ok: true; design: DesignStudioSavedConfig }
  | { ok: false; status: number; error: string; errors?: Record<string, string> }
> {
  const validation = validateDesignDraft(draft);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] ?? "Data desain belum lengkap.";
    return { ok: false, status: 400, error: firstError, errors: validation.errors };
  }

  await ensureStudioSchema(db);
  const now = new Date();
  const timestamp = now.toISOString();

  let targetId: string;
  let isUpdate = false;

  if (existingId) {
    const found = await getDesignByIdInDb(db, existingId);
    if (!found) {
      return { ok: false, status: 404, error: "Desain tidak ditemukan." };
    }
    if (found.customerSessionId !== customerSessionId) {
      return { ok: false, status: 403, error: "Anda tidak memiliki izin mengubah desain ini." };
    }
    targetId = found.design.id;
    isUpdate = true;
  } else {
    const existingCount = await db
      .prepare(`SELECT COUNT(*) as total FROM design_configs WHERE customer_session_id = ?`)
      .bind(customerSessionId)
      .first<{ total: number }>();

    if ((existingCount?.total ?? 0) >= MAX_SAVED_DESIGNS) {
      return {
        ok: false,
        status: 400,
        error: `Batas maksimal ${MAX_SAVED_DESIGNS} desain tersimpan tercapai. Hapus salah satu desain lama terlebih dahulu.`,
      };
    }
    targetId = `dsn-${crypto.randomUUID()}`;
  }

  const normalized = createSavedDesignConfig(
    {
      ...draft,
      id: targetId,
      attachments: sanitizeDesignAttachments(draft.attachments),
    },
    now
  );

  if (isUpdate) {
    await db
      .prepare(
        `UPDATE design_configs
         SET title = ?, category_id = ?, model_name = ?,
             specifications_json = ?, attachments_json = ?, updated_at = ?
         WHERE id = ? AND customer_session_id = ?`
      )
      .bind(
        normalized.title,
        normalized.categoryId,
        normalized.modelName,
        JSON.stringify(normalized.specifications),
        JSON.stringify(normalized.attachments),
        timestamp,
        targetId,
        customerSessionId
      )
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO design_configs (
          id, customer_session_id, title, category_id, model_name,
          specifications_json, attachments_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        targetId,
        customerSessionId,
        normalized.title,
        normalized.categoryId,
        normalized.modelName,
        JSON.stringify(normalized.specifications),
        JSON.stringify(normalized.attachments),
        timestamp,
        timestamp
      )
      .run();
  }

  const fileIds = normalized.attachments
    .map((att) => extractStudioFileIdFromUrl(att.url))
    .filter((id): id is string => Boolean(id));
  await bindStudioFilesToDesign(db, targetId, customerSessionId, fileIds);

  return { ok: true, design: normalized };
}

export async function deleteDesignInDb(
  db: D1Database,
  customerSessionId: string,
  designId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  await ensureStudioSchema(db);
  const found = await getDesignByIdInDb(db, designId);
  if (!found) {
    return { ok: false, status: 404, error: "Desain tidak ditemukan." };
  }
  if (found.customerSessionId !== customerSessionId) {
    return { ok: false, status: 403, error: "Anda tidak memiliki izin menghapus desain ini." };
  }

  await db
    .prepare(`DELETE FROM design_configs WHERE id = ? AND customer_session_id = ?`)
    .bind(designId, customerSessionId)
    .run();

  return { ok: true };
}

type MeasurementProfileRow = {
  id: string;
  customer_session_id: string;
  label: string;
  template_id: string;
  category_hint: string | null;
  values_json: string;
  extra_values_json: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

function parseMeasurementRow(row: MeasurementProfileRow): MeasurementProfile {
  const values = JSON.parse(row.values_json) as MeasurementValues;
  const extraValues = row.extra_values_json
    ? (JSON.parse(row.extra_values_json) as MeasurementExtraValues)
    : undefined;

  return {
    id: row.id,
    label: row.label,
    templateId: row.template_id as MeasurementTemplateId,
    categoryHint: (row.category_hint ?? undefined) as GarmentCategoryId | undefined,
    values,
    extraValues: extraValues && Object.keys(extraValues).length > 0 ? extraValues : undefined,
    notes: row.notes ?? "",
    updatedAt: row.updated_at,
  };
}

export async function listMeasurementProfilesInDb(
  db: D1Database,
  customerSessionId: string
): Promise<MeasurementProfile[]> {
  await ensureStudioSchema(db);
  const res = await db
    .prepare(
      `SELECT id, customer_session_id, label, template_id, category_hint,
              values_json, extra_values_json, notes, created_at, updated_at
       FROM measurement_profiles
       WHERE customer_session_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .bind(customerSessionId, MAX_SAVED_MEASUREMENT_PROFILES)
    .all<MeasurementProfileRow>();

  return (res.results ?? []).map(parseMeasurementRow);
}

export async function getMeasurementProfileByIdInDb(
  db: D1Database,
  profileId: string
): Promise<{ profile: MeasurementProfile; customerSessionId: string } | null> {
  await ensureStudioSchema(db);
  const row = await db
    .prepare(
      `SELECT id, customer_session_id, label, template_id, category_hint,
              values_json, extra_values_json, notes, created_at, updated_at
       FROM measurement_profiles
       WHERE id = ?`
    )
    .bind(profileId)
    .first<MeasurementProfileRow>();

  if (!row) return null;
  return {
    profile: parseMeasurementRow(row),
    customerSessionId: row.customer_session_id,
  };
}

export async function saveMeasurementProfileInDb(
  db: D1Database,
  customerSessionId: string,
  draft: MeasurementStudioDraft,
  existingId?: string | null
): Promise<
  | { ok: true; profile: MeasurementProfile }
  | { ok: false; status: number; error: string; errors?: Record<string, string> }
> {
  const validation = validateMeasurementDraft(draft, DEFAULT_MEASUREMENT_TEMPLATES);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] ?? "Data ukuran belum lengkap.";
    return { ok: false, status: 400, error: firstError, errors: validation.errors };
  }

  await ensureStudioSchema(db);
  const now = new Date();
  const timestamp = now.toISOString();

  let targetId: string;
  let isUpdate = false;

  if (existingId) {
    const found = await getMeasurementProfileByIdInDb(db, existingId);
    if (!found) {
      return { ok: false, status: 404, error: "Profil ukuran tidak ditemukan." };
    }
    if (found.customerSessionId !== customerSessionId) {
      return {
        ok: false,
        status: 403,
        error: "Anda tidak memiliki izin mengubah profil ukuran ini.",
      };
    }
    targetId = found.profile.id;
    isUpdate = true;
  } else {
    const existingCount = await db
      .prepare(`SELECT COUNT(*) as total FROM measurement_profiles WHERE customer_session_id = ?`)
      .bind(customerSessionId)
      .first<{ total: number }>();

    if ((existingCount?.total ?? 0) >= MAX_SAVED_MEASUREMENT_PROFILES) {
      return {
        ok: false,
        status: 400,
        error: `Batas maksimal ${MAX_SAVED_MEASUREMENT_PROFILES} profil ukuran tercapai. Hapus profil lama terlebih dahulu.`,
      };
    }
    targetId = `mprof-${crypto.randomUUID()}`;
  }

  const normalized = createSavedMeasurementProfile(
    {
      ...draft,
      id: targetId,
    },
    DEFAULT_MEASUREMENT_TEMPLATES,
    now
  );

  if (isUpdate) {
    // Pembaruan hanya menyentuh tabel measurement_profiles — snapshot pada tabel orders TIDAK berubah.
    await db
      .prepare(
        `UPDATE measurement_profiles
         SET label = ?, template_id = ?, category_hint = ?,
             values_json = ?, extra_values_json = ?, notes = ?, updated_at = ?
         WHERE id = ? AND customer_session_id = ?`
      )
      .bind(
        normalized.label,
        normalized.templateId,
        normalized.categoryHint ?? null,
        JSON.stringify(normalized.values),
        normalized.extraValues ? JSON.stringify(normalized.extraValues) : null,
        normalized.notes,
        timestamp,
        targetId,
        customerSessionId
      )
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO measurement_profiles (
          id, customer_session_id, label, template_id, category_hint,
          values_json, extra_values_json, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        targetId,
        customerSessionId,
        normalized.label,
        normalized.templateId,
        normalized.categoryHint ?? null,
        JSON.stringify(normalized.values),
        normalized.extraValues ? JSON.stringify(normalized.extraValues) : null,
        normalized.notes,
        timestamp,
        timestamp
      )
      .run();
  }

  return { ok: true, profile: normalized };
}

export async function deleteMeasurementProfileInDb(
  db: D1Database,
  customerSessionId: string,
  profileId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  await ensureStudioSchema(db);
  const found = await getMeasurementProfileByIdInDb(db, profileId);
  if (!found) {
    return { ok: false, status: 404, error: "Profil ukuran tidak ditemukan." };
  }
  if (found.customerSessionId !== customerSessionId) {
    return {
      ok: false,
      status: 403,
      error: "Anda tidak memiliki izin menghapus profil ukuran ini.",
    };
  }

  await db
    .prepare(`DELETE FROM measurement_profiles WHERE id = ? AND customer_session_id = ?`)
    .bind(profileId, customerSessionId)
    .run();

  return { ok: true };
}
