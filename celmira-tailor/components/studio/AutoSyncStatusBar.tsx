"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircleIcon, CheckIcon, CloseIcon, LockIcon } from "@/components/ui/icons";
import {
  fetchCustomerAuthApi,
  loginCustomerApi,
  logoutCustomerApi,
  registerCustomerApi,
  type AutoSyncState,
  type CustomerIdentitySummary,
} from "@/lib/studio-client";
import type { DesignStudioSavedConfig, MeasurementProfile } from "@/lib/types/tailor";

type AutoSyncStatusBarProps = {
  syncState: AutoSyncState;
  syncError?: string | null;
  lastSavedAt?: string | null;
  onRetry?: () => void;
  onAccountSynced?: (payload: {
    customer: CustomerIdentitySummary | null;
    designs?: DesignStudioSavedConfig[];
    profiles?: MeasurementProfile[];
  }) => void;
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
  onAccountSynced,
}: AutoSyncStatusBarProps) {
  const [customer, setCustomer] = useState<CustomerIdentitySummary | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCustomerAuthApi()
      .then((res) => {
        if (!active) return;
        setCustomer(res.customer);
        setAuthLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setAuthLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);

    try {
      const result =
        authMode === "register"
          ? await registerCustomerApi({ email, password, fullName })
          : await loginCustomerApi({ email, password });

      setCustomer(result.customer);
      setModalOpen(false);
      setPassword("");
      onAccountSynced?.({
        customer: result.customer,
        designs: result.designs,
        profiles: result.profiles,
      });
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Gagal memproses autentikasi akun pelanggan."
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutCustomerApi();
      setCustomer(null);
      onAccountSynced?.({ customer: null, designs: [], profiles: [] });
    } catch {
      // Abaikan kegagalan sementara
    }
  }

  const savedClock = formatTimeShort(lastSavedAt);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cocoa/12 pt-4 text-xs">
        {/* Indikator Status Penyimpanan Otomatis */}
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
                Gagal Menyimpan
              </span>
              {onRetry ? (
                <button
                  className="cursor-pointer rounded-full border border-espresso/30 bg-ivory px-3 py-1 text-[0.6875rem] font-medium text-espresso transition-colors hover:border-espresso"
                  onClick={onRetry}
                  type="button"
                >
                  Coba Lagi
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

        {/* Identitas Akun Pelanggan (Opsional untuk pemulihan otomatis lintas perangkat) */}
        {authLoaded ? (
          <div className="flex flex-wrap items-center gap-2.5">
            {customer ? (
              <>
                <span
                  className="inline-flex items-center gap-1.5 text-[0.6875rem] text-muted"
                  data-testid="customer-account-badge"
                >
                  <LockIcon className="h-3.5 w-3.5 text-cocoa" />
                  <span className="font-medium text-espresso">
                    {customer.fullName || customer.email}
                  </span>
                </span>
                <button
                  className="cursor-pointer text-[0.6875rem] font-medium text-cocoa underline underline-offset-4 transition-colors hover:text-espresso"
                  onClick={() => void handleLogout()}
                  type="button"
                >
                  Keluar
                </button>
              </>
            ) : (
              <button
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-cocoa/25 bg-ivory px-3.5 py-1.5 text-[0.6875rem] font-medium text-espresso transition-colors hover:border-espresso"
                data-testid="open-customer-auth-button"
                onClick={() => {
                  setAuthError(null);
                  setModalOpen(true);
                }}
                type="button"
              >
                <LockIcon className="h-3.5 w-3.5 text-cocoa" />
                Masuk / Daftar Akun
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Modal Masuk / Daftar Akun Pelanggan */}
      {modalOpen ? (
        <div
          aria-labelledby="customer-auth-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 p-4 backdrop-blur-xs"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-[1.75rem] border border-cocoa/20 bg-ivory p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-cocoa/12 pb-4">
              <div>
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                  Akun Pelanggan Celmira
                </p>
                <h2
                  className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso"
                  id="customer-auth-title"
                >
                  {authMode === "login" ? "Masuk ke Akun Anda" : "Buat Akun Pelanggan"}
                </h2>
              </div>
              <button
                aria-label="Tutup dialog akun"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-cocoa/20 text-espresso hover:border-espresso"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-full border border-cocoa/15 bg-cream/55 p-1">
              <button
                className={`cursor-pointer rounded-full py-2 text-xs font-medium transition-colors ${
                  authMode === "login"
                    ? "bg-espresso text-ivory"
                    : "text-muted hover:text-espresso"
                }`}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                }}
                type="button"
              >
                Masuk
              </button>
              <button
                className={`cursor-pointer rounded-full py-2 text-xs font-medium transition-colors ${
                  authMode === "register"
                    ? "bg-espresso text-ivory"
                    : "text-muted hover:text-espresso"
                }`}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                type="button"
              >
                Daftar Baru
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted">
              {authMode === "login"
                ? "Desain dan profil ukuran tersimpan Anda akan otomatis muncul saat masuk dari perangkat atau browser mana saja."
                : "Simpan seluruh desain dan profil ukuran yang sedang Anda kerjakan ke akun pribadi agar otomatis tersedia di perangkat lain."}
            </p>

            <form className="mt-4 space-y-3.5" onSubmit={(e) => void handleAuthSubmit(e)}>
              {authMode === "register" ? (
                <div>
                  <label
                    className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                    htmlFor="customer-auth-name"
                  >
                    Nama Lengkap (Opsional)
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
                    id="customer-auth-name"
                    maxLength={80}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Hana Aprilia"
                    type="text"
                    value={fullName}
                  />
                </div>
              ) : null}

              <div>
                <label
                  className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                  htmlFor="customer-auth-email"
                >
                  Email *
                </label>
                <input
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
                  id="customer-auth-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div>
                <label
                  className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                  htmlFor="customer-auth-password"
                >
                  Kata Sandi *
                </label>
                <input
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  className="mt-1 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
                  id="customer-auth-password"
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  required
                  type="password"
                  value={password}
                />
              </div>

              {authError ? (
                <p
                  className="rounded-xl border border-red-800/20 bg-red-50 px-3 py-2 text-xs font-medium text-red-900"
                  role="alert"
                >
                  {authError}
                </p>
              ) : null}

              <button
                className="w-full cursor-pointer rounded-full bg-espresso px-5 py-3 text-xs font-medium uppercase tracking-[0.16em] text-ivory transition-colors hover:bg-cocoa disabled:opacity-60"
                disabled={isSubmittingAuth}
                type="submit"
              >
                {isSubmittingAuth
                  ? "Memproses..."
                  : authMode === "login"
                    ? "Masuk & Sinkronkan Otomatis"
                    : "Daftar & Simpan Otomatis"}
              </button>
            </form>

            <p className="mt-4 border-t border-cocoa/12 pt-3 text-[0.6875rem] leading-relaxed text-muted">
              Sudah pernah memesan sebelumnya? Anda juga dapat memulihkan sesi secara otomatis
              dengan memverifikasi pesanan di{" "}
              <Link
                className="font-medium text-espresso underline underline-offset-4"
                href="/track"
                onClick={() => setModalOpen(false)}
              >
                Lacak Pesanan
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
