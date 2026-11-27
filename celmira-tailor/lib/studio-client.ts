import type { DesignStudioDraft } from "@/lib/design-studio";
import type { MeasurementStudioDraft } from "@/lib/measurement-studio";
import {
  STORAGE_KEYS,
  loadMeasurementProfiles,
  loadSavedDesigns,
} from "@/lib/storage/tailor-store";
import type {
  DesignStudioSavedConfig,
  MeasurementProfile,
  ReferenceAttachment,
} from "@/lib/types/tailor";

export type AutoSyncState = "idle" | "saving" | "saved" | "error";

export class StudioApiError extends Error {
  status: number;
  errors?: Record<string, string>;

  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message);
    this.name = "StudioApiError";
    this.status = status;
    this.errors = errors;
  }
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errObj = (data ?? {}) as { error?: string; errors?: Record<string, string> };
    throw new StudioApiError(
      errObj.error ?? `Permintaan gagal dengan status ${res.status}.`,
      res.status,
      errObj.errors
    );
  }

  return data as T;
}

export async function createGuestRecoveryLinkApi(): Promise<{
  token: string;
  expiresAt: string;
  ttlMinutes: number;
}> {
  const res = await fetch("/api/studio/recovery-links", {
    method: "POST",
    credentials: "same-origin",
  });
  return parseJsonResponse(res);
}

export async function revokeGuestRecoveryLinksApi(): Promise<{ ok: true }> {
  const res = await fetch("/api/studio/recovery-links", {
    method: "DELETE",
    credentials: "same-origin",
  });
  return parseJsonResponse(res);
}

export async function consumeGuestRecoveryTokenApi(token: string): Promise<{
  ok: true;
  designsCount: number;
  profilesCount: number;
}> {
  const res = await fetch("/api/studio/recovery-links/consume", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return parseJsonResponse(res);
}

export async function fetchSavedDesignsApi(): Promise<{
  designs: DesignStudioSavedConfig[];
}> {
  const res = await fetch("/api/studio/designs", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJsonResponse(res);
}

export async function saveDesignApi(
  draft: DesignStudioDraft
): Promise<{ design: DesignStudioSavedConfig }> {
  const isUpdate = Boolean(draft.id && draft.id.startsWith("dsn-"));
  const url = isUpdate
    ? `/api/studio/designs/${encodeURIComponent(draft.id!)}`
    : "/api/studio/designs";
  const res = await fetch(url, {
    method: isUpdate ? "PUT" : "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ draft }),
  });
  return parseJsonResponse(res);
}

export async function deleteDesignApi(designId: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/studio/designs/${encodeURIComponent(designId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return parseJsonResponse(res);
}

export async function uploadStudioReferenceFileApi(
  file: File,
  designId?: string | null
): Promise<{ attachment: ReferenceAttachment }> {
  const formData = new FormData();
  formData.append("file", file);
  if (designId) {
    formData.append("designId", designId);
  }
  const res = await fetch("/api/studio/files", {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  return parseJsonResponse(res);
}

export async function fetchMeasurementProfilesApi(): Promise<{
  profiles: MeasurementProfile[];
}> {
  const res = await fetch("/api/studio/measurements", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJsonResponse(res);
}

export async function saveMeasurementProfileApi(
  draft: MeasurementStudioDraft
): Promise<{ profile: MeasurementProfile }> {
  const isUpdate = Boolean(draft.id && draft.id.startsWith("mprof-"));
  const url = isUpdate
    ? `/api/studio/measurements/${encodeURIComponent(draft.id!)}`
    : "/api/studio/measurements";
  const res = await fetch(url, {
    method: isUpdate ? "PUT" : "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ draft }),
  });
  return parseJsonResponse(res);
}

export async function deleteMeasurementProfileApi(profileId: string): Promise<{ ok: true }> {
  const res = await fetch(`/api/studio/measurements/${encodeURIComponent(profileId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return parseJsonResponse(res);
}

/**
 * Memigrasikan data lama Design Studio & Measurement Studio dari localStorage ke server D1/R2
 * secara aman & idempotent. Data localStorage TIDAK dihapus sampai server mengonfirmasi
 * keberhasilan dan mengembalikan daftar data yang terverifikasi.
 */
export async function migrateLegacyStudioDataIfNeeded(): Promise<{
  ran: boolean;
  designs?: DesignStudioSavedConfig[];
  profiles?: MeasurementProfile[];
}> {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return { ran: false };
  }

  const localDesigns = loadSavedDesigns();
  const localProfiles = loadMeasurementProfiles();
  if (localDesigns.length === 0 && localProfiles.length === 0) {
    return { ran: false };
  }

  const res = await fetch("/api/studio/migrate", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      designs: localDesigns,
      profiles: localProfiles,
    }),
  });

  const data = await parseJsonResponse<{
    ok: boolean;
    migratedDesigns: number;
    migratedProfiles: number;
    designs: DesignStudioSavedConfig[];
    profiles: MeasurementProfile[];
  }>(res);

  if (data.ok && Array.isArray(data.designs) && Array.isArray(data.profiles)) {
    const designsVerified = localDesigns.length === 0 || data.designs.length > 0;
    const profilesVerified = localProfiles.length === 0 || data.profiles.length > 0;
    try {
      if (designsVerified && localDesigns.length > 0) {
        window.localStorage.removeItem(STORAGE_KEYS.designs);
      }
      if (profilesVerified && localProfiles.length > 0) {
        window.localStorage.removeItem(STORAGE_KEYS.measurements);
      }
    } catch {
      // Abaikan jika browser membatasi akses storage
    }
  }

  return {
    ran: true,
    designs: data.designs,
    profiles: data.profiles,
  };
}
