import { MAX_ATTACHMENT_SIZE_BYTES } from "../booking-validation.ts";
import { sanitizeAttachmentFileName } from "./attachment-storage.ts";
import { detectOrderFileMimeFromBytes, type AllowedOrderFileMime } from "./order-storage.ts";
import { ensureStudioSchema } from "./studio-schema.ts";

export type StoredStudioFileMeta = {
  id: string;
  designId: string | null;
  customerSessionId: string;
  r2Key: string;
  fileName: string;
  mimeType: AllowedOrderFileMime;
  sizeBytes: number;
  createdAt: string;
  url: string;
};

function extForMime(mime: AllowedOrderFileMime): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return "jpg";
}

export function validateStudioBinaryFile(input: {
  fileName: string;
  bytes: Uint8Array;
}): { ok: true; mimeType: AllowedOrderFileMime; safeName: string } | { ok: false; error: string } {
  const safeName = sanitizeAttachmentFileName(input.fileName);

  if (input.bytes.byteLength <= 0) {
    return { ok: false, error: `File "${safeName}" kosong dan tidak dapat diunggah.` };
  }
  if (input.bytes.byteLength > MAX_ATTACHMENT_SIZE_BYTES) {
    return { ok: false, error: `Ukuran "${safeName}" melebihi batas maksimal 5 MB.` };
  }

  const detected = detectOrderFileMimeFromBytes(input.bytes, true);
  if (!detected) {
    return {
      ok: false,
      error: `Isi file "${safeName}" harus berupa gambar (JPG, PNG, WEBP) atau dokumen PDF yang valid.`,
    };
  }

  return { ok: true, mimeType: detected, safeName };
}

export function extractStudioFileIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/^\/api\/studio\/files\/([^/?#]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export async function storeStudioFile(
  db: D1Database,
  bucket: R2Bucket,
  params: {
    customerSessionId: string;
    designId?: string | null;
    fileName: string;
    bytes: Uint8Array;
  }
): Promise<{ ok: true; file: StoredStudioFileMeta } | { ok: false; error: string }> {
  const validation = validateStudioBinaryFile({
    fileName: params.fileName,
    bytes: params.bytes,
  });
  if (!validation.ok) return validation;

  await ensureStudioSchema(db);

  const id = `sfile-${crypto.randomUUID()}`;
  const ext = extForMime(validation.mimeType);
  const r2Key = `studio/designs/${params.customerSessionId}/${id}.${ext}`;
  const createdAt = new Date().toISOString();

  await bucket.put(r2Key, params.bytes, {
    httpMetadata: {
      contentType: validation.mimeType,
      cacheControl: "private, max-age=3600",
    },
    customMetadata: {
      fileId: id,
      designId: params.designId ?? "",
      customerSessionId: params.customerSessionId,
      fileName: validation.safeName,
    },
  });

  await db
    .prepare(
      `INSERT INTO studio_files (id, design_id, customer_session_id, r2_key, file_name, mime_type, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      params.designId ?? null,
      params.customerSessionId,
      r2Key,
      validation.safeName,
      validation.mimeType,
      params.bytes.byteLength,
      createdAt
    )
    .run();

  return {
    ok: true,
    file: {
      id,
      designId: params.designId ?? null,
      customerSessionId: params.customerSessionId,
      r2Key,
      fileName: validation.safeName,
      mimeType: validation.mimeType,
      sizeBytes: params.bytes.byteLength,
      createdAt,
      url: `/api/studio/files/${encodeURIComponent(id)}`,
    },
  };
}

export async function getStudioFileById(
  db: D1Database,
  fileId: string
): Promise<StoredStudioFileMeta | null> {
  await ensureStudioSchema(db);
  const row = await db
    .prepare(
      `SELECT id, design_id, customer_session_id, r2_key, file_name, mime_type, size_bytes, created_at
       FROM studio_files
       WHERE id = ?`
    )
    .bind(fileId)
    .first<{
      id: string;
      design_id: string | null;
      customer_session_id: string;
      r2_key: string;
      file_name: string;
      mime_type: AllowedOrderFileMime;
      size_bytes: number;
      created_at: string;
    }>();

  if (!row) return null;

  return {
    id: row.id,
    designId: row.design_id,
    customerSessionId: row.customer_session_id,
    r2Key: row.r2_key,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    url: `/api/studio/files/${encodeURIComponent(row.id)}`,
  };
}

export async function bindStudioFilesToDesign(
  db: D1Database,
  designId: string,
  customerSessionId: string,
  fileIds: string[]
): Promise<void> {
  if (fileIds.length === 0) return;
  await ensureStudioSchema(db);
  for (const fileId of fileIds) {
    await db
      .prepare(
        `UPDATE studio_files
         SET design_id = ?
         WHERE id = ? AND customer_session_id = ?`
      )
      .bind(designId, fileId, customerSessionId)
      .run();
  }
}

export async function deleteStudioFile(
  db: D1Database,
  bucket: R2Bucket,
  fileId: string,
  customerSessionId: string
): Promise<boolean> {
  const existing = await getStudioFileById(db, fileId);
  if (!existing || existing.customerSessionId !== customerSessionId) return false;
  await bucket.delete(existing.r2Key).catch(() => {});
  await db.prepare(`DELETE FROM studio_files WHERE id = ?`).bind(fileId).run();
  return true;
}
