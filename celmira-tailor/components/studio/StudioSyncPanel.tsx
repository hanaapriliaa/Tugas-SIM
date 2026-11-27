"use client";

import { useState, type FormEvent } from "react";
import { CheckIcon, LockIcon } from "@/components/ui/icons";
import { restoreStudioSessionApi } from "@/lib/studio-client";
import type { DesignStudioSavedConfig, MeasurementProfile } from "@/lib/types/tailor";

type StudioSyncPanelProps = {
  syncCode: string | null;
  contextLabel: "Design Studio" | "Measurement Studio";
  onRestored: (payload: {
    syncCode: string;
    designs: DesignStudioSavedConfig[];
    profiles: MeasurementProfile[];
  }) => void;
};

export function StudioSyncPanel({
  syncCode,
  contextLabel,
  onRestored,
}: StudioSyncPanelProps) {
  const [copied, setCopied] = useState(false);
  const [showRestoreForm, setShowRestoreForm] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleCopy() {
    if (!syncCode) return;
    try {
      await navigator.clipboard.writeText(syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Abaikan bila clipboard tidak tersedia di browser
    }
  }

  async function handleRestoreSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    const cleaned = inputCode.trim();
    if (!cleaned) {
      setError("Masukkan Kode Sinkronisasi Studio terlebih dahulu.");
      return;
    }

    setIsRestoring(true);
    try {
      const restored = await restoreStudioSessionApi(cleaned);
      onRestored({
        syncCode: restored.syncCode,
        designs: restored.designs,
        profiles: restored.profiles,
      });
      setInputCode("");
      setShowRestoreForm(false);
      setFeedback(
        `Sesi ${contextLabel} berhasil dipulihkan (${restored.designs.length} desain · ${restored.profiles.length} profil ukuran).`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kode Sinkronisasi Studio tidak ditemukan. Periksa kembali kode Anda."
      );
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <section
      aria-label="Sinkronisasi lintas perangkat"
      className="rounded-[1.5rem] border border-cocoa/16 bg-cream/55 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
          <div className="min-w-0">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
              Sinkronisasi Server (D1 &amp; R2)
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Data {contextLabel} Anda disimpan di server Celmira. Simpan Kode Sinkronisasi berikut
              untuk membuka kembali desain &amp; profil ukuran di perangkat atau browser lain.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-cocoa/25 bg-ivory px-3.5 py-1.5 font-mono text-xs font-semibold tracking-[0.08em] text-espresso"
            data-testid="studio-sync-code"
          >
            {syncCode ?? "Memuat kode..."}
          </span>

          {syncCode ? (
            <button
              className="cursor-pointer rounded-full border border-cocoa/25 bg-ivory px-3 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-espresso transition-colors hover:border-espresso"
              onClick={() => void handleCopy()}
              type="button"
            >
              {copied ? (
                <span className="inline-flex items-center gap-1">
                  <CheckIcon className="h-3.5 w-3.5" />
                  Disalin
                </span>
              ) : (
                "Salin Kode"
              )}
            </button>
          ) : null}

          <button
            className="cursor-pointer rounded-full border border-espresso/30 bg-espresso px-3.5 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-cocoa"
            onClick={() => {
              setShowRestoreForm((prev) => !prev);
              setError(null);
            }}
            type="button"
          >
            {showRestoreForm ? "Tutup" : "Buka dengan Kode"}
          </button>
        </div>
      </div>

      {showRestoreForm ? (
        <form
          className="mt-4 flex flex-col gap-2.5 border-t border-cocoa/12 pt-4 sm:flex-row sm:items-center"
          onSubmit={(e) => void handleRestoreSubmit(e)}
        >
          <label className="sr-only" htmlFor="studio-restore-code-input">
            Kode Sinkronisasi Studio
          </label>
          <input
            autoComplete="off"
            className="w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2 font-mono text-xs uppercase tracking-[0.08em] text-espresso placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/65 focus:border-espresso focus:outline-none sm:max-w-xs"
            id="studio-restore-code-input"
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Contoh: CS-AB12-CD34"
            type="text"
            value={inputCode}
          />
          <button
            className="cursor-pointer rounded-full bg-espresso px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-cocoa disabled:opacity-60"
            disabled={isRestoring}
            type="submit"
          >
            {isRestoring ? "Memulihkan..." : "Pulihkan Sesi Studio"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl border border-red-800/20 bg-red-50 px-3 py-2 text-xs font-medium text-red-900" role="alert">
          {error}
        </p>
      ) : null}

      {feedback ? (
        <p className="mt-3 rounded-xl border border-emerald-800/20 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900" role="status">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
