import {
  ALLOWED_CHAT_IMAGE_MIME_TYPES,
  MAX_CHAT_IMAGE_SIZE_BYTES,
} from "../chat.ts";
import { ensureChatSchema } from "./chat-schema.ts";

export type AllowedImageMime = (typeof ALLOWED_CHAT_IMAGE_MIME_TYPES)[number];

export type StoredAttachmentMeta = {
  id: string;
  threadId: string;
  messageId: string | null;
  uploadedBy: "customer" | "admin";
  r2Key: string;
  fileName: string;
  mimeType: AllowedImageMime;
  sizeBytes: number;
  createdAt: string;
};

export function detectImageMimeFromBytes(bytes: Uint8Array): AllowedImageMime | null {
  if (bytes.byteLength < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export function sanitizeAttachmentFileName(rawName: string): string {
  const base = rawName
    .replace(/[\\/]/g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
  return (base || "lampiran-chat").slice(0, 120);
}

function extensionForMime(mime: AllowedImageMime): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function validateBinaryImageUpload(input: {
  fileName: string;
  declaredMimeType?: string;
  bytes: Uint8Array;
}): { ok: true; mimeType: AllowedImageMime; safeName: string } | { ok: false; error: string } {
  const safeName = sanitizeAttachmentFileName(input.fileName);

  if (input.bytes.byteLength <= 0) {
    return { ok: false, error: `File "${safeName}" kosong dan tidak dapat diunggah.` };
  }

  if (input.bytes.byteLength > MAX_CHAT_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      error: `Ukuran "${safeName}" melebihi batas maksimal 5 MB per gambar.`,
    };
  }

  const detected = detectImageMimeFromBytes(input.bytes);
  if (!detected) {
    return {
      ok: false,
      error: `Isi file "${safeName}" bukan gambar JPG, PNG, atau WEBP yang valid.`,
    };
  }

  if (input.declaredMimeType) {
    const normalizedDeclared = input.declaredMimeType.toLowerCase();
    const isAllowedDeclared = (ALLOWED_CHAT_IMAGE_MIME_TYPES as readonly string[]).includes(
      normalizedDeclared
    );
    if (!isAllowedDeclared) {
      return {
        ok: false,
        error: `Format "${safeName}" tidak didukung. Gunakan JPG, PNG, atau WEBP.`,
      };
    }
  }

  return { ok: true, mimeType: detected, safeName };
}

export async function storeChatAttachment(
  db: D1Database,
  bucket: R2Bucket,
  params: {
    threadId: string;
    uploadedBy: "customer" | "admin";
    fileName: string;
    declaredMimeType?: string;
    bytes: Uint8Array;
  }
): Promise<{ ok: true; attachment: StoredAttachmentMeta } | { ok: false; error: string }> {
  const validation = validateBinaryImageUpload({
    fileName: params.fileName,
    declaredMimeType: params.declaredMimeType,
    bytes: params.bytes,
  });

  if (!validation.ok) {
    return validation;
  }

  await ensureChatSchema(db);

  const id = `att-${crypto.randomUUID()}`;
  const ext = extensionForMime(validation.mimeType);
  const r2Key = `chat/${params.threadId}/${id}.${ext}`;
  const createdAt = new Date().toISOString();

  await bucket.put(r2Key, params.bytes, {
    httpMetadata: {
      contentType: validation.mimeType,
      cacheControl: "private, max-age=3600",
    },
    customMetadata: {
      attachmentId: id,
      threadId: params.threadId,
      uploadedBy: params.uploadedBy,
      fileName: validation.safeName,
    },
  });

  await db
    .prepare(
      `INSERT INTO chat_attachments
       (id, thread_id, message_id, uploaded_by, r2_key, file_name, mime_type, size_bytes, created_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      params.threadId,
      params.uploadedBy,
      r2Key,
      validation.safeName,
      validation.mimeType,
      params.bytes.byteLength,
      createdAt
    )
    .run();

  return {
    ok: true,
    attachment: {
      id,
      threadId: params.threadId,
      messageId: null,
      uploadedBy: params.uploadedBy,
      r2Key,
      fileName: validation.safeName,
      mimeType: validation.mimeType,
      sizeBytes: params.bytes.byteLength,
      createdAt,
    },
  };
}

export async function getAttachmentRecord(
  db: D1Database,
  attachmentId: string
): Promise<(StoredAttachmentMeta & { customerSessionId: string }) | null> {
  await ensureChatSchema(db);
  const row = await db
    .prepare(
      `SELECT a.id, a.thread_id, a.message_id, a.uploaded_by, a.r2_key,
              a.file_name, a.mime_type, a.size_bytes, a.created_at,
              t.customer_session_id
       FROM chat_attachments a
       INNER JOIN chat_threads t ON t.id = a.thread_id
       WHERE a.id = ?`
    )
    .bind(attachmentId)
    .first<{
      id: string;
      thread_id: string;
      message_id: string | null;
      uploaded_by: "customer" | "admin";
      r2_key: string;
      file_name: string;
      mime_type: AllowedImageMime;
      size_bytes: number;
      created_at: string;
      customer_session_id: string;
    }>();

  if (!row) return null;

  return {
    id: row.id,
    threadId: row.thread_id,
    messageId: row.message_id,
    uploadedBy: row.uploaded_by,
    r2Key: row.r2_key,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    customerSessionId: row.customer_session_id,
  };
}
