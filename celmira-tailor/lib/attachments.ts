import {
  MAX_ATTACHMENTS_COUNT,
  validateAttachmentFile,
} from "@/lib/booking-validation";
import type { ReferenceAttachment } from "@/lib/types/tailor";

/**
 * Membuat thumbnail JPEG yang ringkas dari file gambar.
 * Mengembalikan undefined jika browser gagal membaca file.
 */
export async function createImageThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(undefined);
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : undefined;
      if (!result) {
        resolve(undefined);
        return;
      }
      const img = new window.Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        const maxSide = 480;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function createAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export type ProcessedAttachments = {
  attachments: ReferenceAttachment[];
  error: string | null;
};

/**
 * Memvalidasi dan menyiapkan daftar file referensi untuk disimpan di draft.
 * Batas jumlah dan ukuran mengikuti aturan booking flow yang sama.
 */
export async function processAttachmentFiles(
  fileList: FileList | null,
  existingCount: number
): Promise<ProcessedAttachments> {
  if (!fileList || fileList.length === 0) {
    return { attachments: [], error: null };
  }

  const remainingSlots = MAX_ATTACHMENTS_COUNT - existingCount;
  if (remainingSlots <= 0) {
    return {
      attachments: [],
      error: `Maksimal ${MAX_ATTACHMENTS_COUNT} file referensi per desain.`,
    };
  }

  const incoming = Array.from(fileList).slice(0, remainingSlots);
  const attachments: ReferenceAttachment[] = [];
  let error: string | null = null;

  for (const file of incoming) {
    const validationMessage = validateAttachmentFile(file);
    if (validationMessage) {
      error = error ?? validationMessage;
      continue;
    }

    const isPdf = file.type.toLowerCase() === "application/pdf";
    const previewDataUrl = isPdf ? undefined : await createImageThumbnail(file);

    attachments.push({
      id: createAttachmentId(),
      name: file.name,
      size: file.size,
      mimeType: file.type,
      kind: isPdf ? "pdf" : "image",
      previewDataUrl,
      note: "",
    });
  }

  return { attachments, error };
}
