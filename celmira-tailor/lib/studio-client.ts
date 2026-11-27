import type { DesignStudioDraft } from "@/lib/design-studio";
import type { MeasurementStudioDraft } from "@/lib/measurement-studio";
import type {
  DesignStudioSavedConfig,
  MeasurementProfile,
  ReferenceAttachment,
} from "@/lib/types/tailor";

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

export async function fetchStudioSessionApi(): Promise<{
  sessionId: string;
  syncCode: string;
}> {
  const res = await fetch("/api/studio/session", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJsonResponse(res);
}

export async function restoreStudioSessionApi(syncCode: string): Promise<{
  sessionId: string;
  syncCode: string;
  designs: DesignStudioSavedConfig[];
  profiles: MeasurementProfile[];
}> {
  const res = await fetch("/api/studio/session/restore", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ syncCode }),
  });
  return parseJsonResponse(res);
}

export async function fetchSavedDesignsApi(): Promise<{
  designs: DesignStudioSavedConfig[];
  syncCode: string;
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
): Promise<{ design: DesignStudioSavedConfig; syncCode?: string }> {
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
  syncCode: string;
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
): Promise<{ profile: MeasurementProfile; syncCode?: string }> {
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
