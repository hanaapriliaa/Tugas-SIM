import { MAX_ATTACHMENT_SIZE_BYTES } from "../booking-validation.ts";
import { detectImageMimeFromBytes, sanitizeAttachmentFileName } from "./attachment-storage.ts";
import { ensureOrderSchema } from "./order-schema.ts";

export type OrderFileKind = "order_reference" | "payment_proof" | "qris";
export type AllowedOrderFileMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export type StoredOrderFileMeta = {
  id: string;
  orderId: string | null;
  kind: OrderFileKind;
  r2Key: string;
  fileName: string;
  mimeType: AllowedOrderFileMime;
  sizeBytes: number;
  createdAt: string;
  url: string;
};

export function detectOrderFileMimeFromBytes(
  bytes: Uint8Array,
  allowPdf: boolean
): AllowedOrderFileMime | null {
  const img = detectImageMimeFromBytes(bytes);
  if (img) return img;

  if (
    allowPdf &&
    bytes.byteLength >= 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  ) {
    return "application/pdf";
  }

  return null;
}

function extForMime(mime: AllowedOrderFileMime): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return "jpg";
}

export function validateOrderBinaryFile(input: {
  fileName: string;
  bytes: Uint8Array;
  kind: OrderFileKind;
}): { ok: true; mimeType: AllowedOrderFileMime; safeName: string } | { ok: false; error: string } {
  const safeName = sanitizeAttachmentFileName(input.fileName);
  const allowPdf = input.kind !== "qris";

  if (input.bytes.byteLength <= 0) {
    return { ok: false, error: `File "${safeName}" kosong dan tidak dapat diunggah.` };
  }
  if (input.bytes.byteLength > MAX_ATTACHMENT_SIZE_BYTES) {
    return { ok: false, error: `Ukuran "${safeName}" melebihi batas maksimal 5 MB.` };
  }

  const detected = detectOrderFileMimeFromBytes(input.bytes, allowPdf);
  if (!detected) {
    return {
      ok: false,
      error: allowPdf
        ? `Isi file "${safeName}" harus berupa gambar (JPG, PNG, WEBP) atau dokumen PDF yang valid.`
        : `Gambar QRIS "${safeName}" harus berformat JPG, PNG, atau WEBP yang valid.`,
    };
  }

  return { ok: true, mimeType: detected, safeName };
}

export async function storeOrderFile(
  db: D1Database,
  bucket: R2Bucket,
  params: {
    orderId: string | null;
    kind: OrderFileKind;
    fileName: string;
    bytes: Uint8Array;
  }
): Promise<{ ok: true; file: StoredOrderFileMeta } | { ok: false; error: string }> {
  const validation = validateOrderBinaryFile({
    fileName: params.fileName,
    bytes: params.bytes,
    kind: params.kind,
  });
  if (!validation.ok) return validation;

  await ensureOrderSchema(db);

  const id = `ofile-${crypto.randomUUID()}`;
  const ext = extForMime(validation.mimeType);
  const folder =
    params.kind === "qris"
      ? "config/qris"
      : params.kind === "payment_proof"
        ? `payments/${params.orderId ?? "unassigned"}`
        : `orders/${params.orderId ?? "unassigned"}`;
  const r2Key = `${folder}/${id}.${ext}`;
  const createdAt = new Date().toISOString();

  await bucket.put(r2Key, params.bytes, {
    httpMetadata: {
      contentType: validation.mimeType,
      cacheControl: "private, max-age=3600",
    },
    customMetadata: {
      fileId: id,
      orderId: params.orderId ?? "",
      kind: params.kind,
      fileName: validation.safeName,
    },
  });

  await db
    .prepare(
      `INSERT INTO order_files (id, order_id, kind, r2_key, file_name, mime_type, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      params.orderId,
      params.kind,
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
      orderId: params.orderId,
      kind: params.kind,
      r2Key,
      fileName: validation.safeName,
      mimeType: validation.mimeType,
      sizeBytes: params.bytes.byteLength,
      createdAt,
      url: `/api/orders/files/${encodeURIComponent(id)}`,
    },
  };
}

export async function getOrderFileWithOwner(
  db: D1Database,
  fileId: string
): Promise<
  (StoredOrderFileMeta & { orderCode: string | null; customerSessionId: string | null }) | null
> {
  await ensureOrderSchema(db);
  const row = await db
    .prepare(
      `SELECT f.id, f.order_id, f.kind, f.r2_key, f.file_name, f.mime_type, f.size_bytes, f.created_at,
              o.order_code, o.customer_session_id
       FROM order_files f
       LEFT JOIN orders o ON o.id = f.order_id
       WHERE f.id = ?`
    )
    .bind(fileId)
    .first<{
      id: string;
      order_id: string | null;
      kind: OrderFileKind;
      r2_key: string;
      file_name: string;
      mime_type: AllowedOrderFileMime;
      size_bytes: number;
      created_at: string;
      order_code: string | null;
      customer_session_id: string | null;
    }>();

  if (!row) return null;

  return {
    id: row.id,
    orderId: row.order_id,
    kind: row.kind,
    r2Key: row.r2_key,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    url: `/api/orders/files/${encodeURIComponent(row.id)}`,
    orderCode: row.order_code,
    customerSessionId: row.customer_session_id,
  };
}

export async function deleteOrderFile(
  db: D1Database,
  bucket: R2Bucket,
  fileId: string
): Promise<void> {
  const existing = await getOrderFileWithOwner(db, fileId);
  if (!existing) return;
  await bucket.delete(existing.r2Key).catch(() => {});
  await db.prepare(`DELETE FROM order_files WHERE id = ?`).bind(fileId).run();
}
