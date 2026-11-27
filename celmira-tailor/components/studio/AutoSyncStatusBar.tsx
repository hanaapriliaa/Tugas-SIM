"use client";

import { AlertCircleIcon, CheckIcon } from "@/components/ui/icons";
import type { AutoSyncState } from "@/lib/studio-client";

type AutoSyncStatusBarProps = {
  syncState: AutoSyncState;
  syncError?: string | null;
  lastSavedAt?: string | null;
  onRetry?: () => void;
};

function formatTimeShort(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AutoSyncStatusBar({
  syncState,
  syncError,
  lastSavedAt,
  onRetry,
}: AutoSyncStatusBarProps) {
  const savedClock = formatTimeShort(lastSavedAt);

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-cocoa/12 pt-4 text-xs">
      <div
        aria-live="polite"
        className="flex flex-wrap items-center gap-2.5"
        data-testid="autosync-status"
        data-sync-state={syncState}
      >
        {syncState === "saving" ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-cocoa/20 bg-cream/70 px-3 py-1 text-[0.6875rem] font-medium text-espresso">
            <span
              aria-hidden="true"
              className="h-2 w-2 animate-pulse rounded-full bg-cocoa"
            />
            Menyimpan...
          </span>
        ) : syncState === "saved" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/20 bg-emerald-50 px-3 py-1 text-[0.6875rem] font-medium text-emerald-900">
            <CheckIcon className="h-3.5 w-3.5" />
            Tersimpan{savedClock ? ` · ${savedClock}` : ""}
          </span>
        ) : syncState === "error" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-800/25 bg-red-50 px-3 py-1 text-[0.6875rem] font-medium text-red-900">
              <AlertCircleIcon className="h-3.5 w-3.5" />
              Gagal menyimpan
            </span>
            {onRetry ? (
              <button
                className="cursor-pointer rounded-full border border-espresso/30 bg-ivory px-3 py-1 text-[0.6875rem] font-medium text-espresso transition-colors hover:border-espresso"
                onClick={onRetry}
                type="button"
              >
                Coba lagi
              </button>
            ) : null}
            {syncError ? (
              <span className="text-[0.6875rem] text-red-800">{syncError}</span>
            ) : null}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-muted">
            <CheckIcon className="h-3.5 w-3.5 text-cocoa/70" />
            Penyimpanan otomatis aktif
          </span>
        )}
      </div>
    </div>
  );
}
