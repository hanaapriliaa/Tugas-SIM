"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CHAT_SOURCE_LABELS, getChatQuickPrompts } from "@/lib/chat";
import { ORDER_STATUS_META } from "@/lib/order-tracking";
import { ArrowUpRight, LockIcon, ShieldIcon } from "@/components/ui/icons";
import type { ChatThreadContext, SubmittedOrder } from "@/lib/types/tailor";

type ChatContextBannerProps = {
  context: ChatThreadContext;
  matchedOrder: SubmittedOrder | null;
  isOrderVerified: boolean;
  onVerifyOrder: (
    orderCode: string,
    verifier: string
  ) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
  onSelectQuickPrompt: (prompt: string) => void;
};

export function ChatContextBanner({
  context,
  matchedOrder,
  isOrderVerified,
  onVerifyOrder,
  onSelectQuickPrompt,
}: ChatContextBannerProps) {
  const [verifierInput, setVerifierInput] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [showVerifyForm, setShowVerifyForm] = useState(false);

  const hasContext =
    Boolean(context.orderCode) ||
    Boolean(context.designTitle) ||
    Boolean(context.measurementLabel) ||
    Boolean(context.categoryId) ||
    context.source !== "general";

  if (!hasContext) {
    return null;
  }

  const quickPrompts = getChatQuickPrompts(context);

  async function handleSubmitVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context.orderCode) return;
    setVerifyError(null);
    const result = await onVerifyOrder(context.orderCode, verifierInput);
    if (!result.ok) {
      setVerifyError(result.error ?? "Verifikasi gagal.");
      return;
    }
    setVerifierInput("");
    setShowVerifyForm(false);
  }

  return (
    <div className="border-b border-cocoa/12 bg-cream/45 px-4 py-3.5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cocoa/25 bg-ivory px-2.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-cocoa">
              Konteks {CHAT_SOURCE_LABELS[context.source]}
            </span>

            {context.orderCode ? (
              <span className="font-mono text-xs font-semibold text-espresso">
                {context.orderCode}
              </span>
            ) : null}

            {context.orderCode && isOrderVerified && matchedOrder ? (
              <span className="rounded-full border border-cocoa/20 bg-ivory px-2.5 py-0.5 text-[0.625rem] font-medium text-espresso">
                {ORDER_STATUS_META[matchedOrder.status].label}
              </span>
            ) : null}
          </div>

          {/* Detail aman sesuai status verifikasi */}
          {context.orderCode ? (
            isOrderVerified && matchedOrder ? (
              <p className="mt-1.5 text-xs leading-relaxed text-espresso">
                <span className="font-medium">{matchedOrder.categoryName}</span> ·{" "}
                {matchedOrder.designTitle} ({matchedOrder.specifications.fabric} ·{" "}
                {matchedOrder.specifications.colorName})
              </p>
            ) : (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                <LockIcon className="h-3.5 w-3.5 shrink-0 text-cocoa" />
                <span>
                  Detail pesanan disembunyikan demi privasi sampai identitas diverifikasi.
                </span>
                {matchedOrder ? (
                  <button
                    className="cursor-pointer font-medium text-cocoa underline underline-offset-4 hover:text-espresso"
                    onClick={() => setShowVerifyForm((prev) => !prev)}
                    type="button"
                  >
                    {showVerifyForm ? "Tutup verifikasi" : "Verifikasi untuk lihat detail"}
                  </button>
                ) : null}
              </div>
            )
          ) : (
            <p className="mt-1.5 text-xs text-muted">
              {context.designTitle
                ? `Membahas rancangan "${context.designTitle}".`
                : context.measurementLabel
                  ? `Membahas profil ukuran "${context.measurementLabel}".`
                  : "Pertanyaan terkait halaman layanan yang sedang Anda siapkan."}
            </p>
          )}
        </div>

        {/* Tautan kembali ke halaman asal */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {context.orderCode ? (
            <Link
              className="inline-flex items-center gap-1 rounded-full border border-cocoa/25 bg-ivory px-3 py-1.5 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-espresso transition-colors hover:border-espresso"
              href={`/track?code=${encodeURIComponent(context.orderCode)}`}
            >
              Lacak Pesanan
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : context.source === "design-studio" ? (
            <Link
              className="inline-flex items-center gap-1 rounded-full border border-cocoa/25 bg-ivory px-3 py-1.5 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-espresso transition-colors hover:border-espresso"
              href="/design-studio"
            >
              Design Studio
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : context.source === "measurement-studio" ? (
            <Link
              className="inline-flex items-center gap-1 rounded-full border border-cocoa/25 bg-ivory px-3 py-1.5 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-espresso transition-colors hover:border-espresso"
              href="/measurement-studio"
            >
              Measurement Studio
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : context.source === "orders" ? (
            <Link
              className="inline-flex items-center gap-1 rounded-full border border-cocoa/25 bg-ivory px-3 py-1.5 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-espresso transition-colors hover:border-espresso"
              href="/orders"
            >
              Kembali ke Pesanan
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Form verifikasi inline jika nomor pesanan belum diverifikasi di sesi ini */}
      {context.orderCode && !isOrderVerified && showVerifyForm && matchedOrder ? (
        <form
          className="mt-3 flex flex-col gap-2 rounded-2xl border border-cocoa/18 bg-ivory p-3.5 sm:flex-row sm:items-end"
          onSubmit={handleSubmitVerify}
        >
          <div className="flex-1">
            <label
              className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
              htmlFor="chat-order-verifier"
            >
              <ShieldIcon className="h-3.5 w-3.5" />
              Nomor WhatsApp atau Kode Akses Tracking
            </label>
            <input
              className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3 py-2 text-xs text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
              id="chat-order-verifier"
              onChange={(e) => setVerifierInput(e.target.value)}
              placeholder="Contoh: 0812... atau kode 6 karakter"
              type="text"
              value={verifierInput}
            />
            {verifyError ? (
              <p className="mt-1 text-xs text-rose" role="alert">
                {verifyError}
              </p>
            ) : null}
          </div>
          <button
            className="cursor-pointer rounded-full bg-espresso px-4 py-2 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-cocoa"
            type="submit"
          >
            Buka Detail
          </button>
        </form>
      ) : null}

      {/* Chip pertanyaan cepat */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {quickPrompts.map((prompt) => (
          <button
            className="cursor-pointer rounded-full border border-cocoa/18 bg-ivory/90 px-3 py-1 text-[0.6875rem] text-espresso transition-colors hover:border-cocoa hover:bg-ivory"
            key={prompt}
            onClick={() => onSelectQuickPrompt(prompt)}
            type="button"
          >
            + {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
