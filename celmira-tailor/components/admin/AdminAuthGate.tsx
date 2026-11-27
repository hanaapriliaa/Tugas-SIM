"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/ButtonLink";
import { AlertCircleIcon } from "@/components/ui/icons";
import {
  fetchAdminAuthStatus,
  loginAdminApi,
  logoutAdminApi,
  type AdminIdentity,
} from "@/lib/chat-client";

type AdminAuthGateProps = {
  children: (ctx: { admin: AdminIdentity; onLogout: () => Promise<void> }) => ReactNode;
};

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAdminAuthStatus()
      .then((res) => {
        if (!active) return;
        setConfigured(res.configured);
        setAdmin(res.authenticated && res.admin ? res.admin : null);
      })
      .catch(() => {
        if (!active) return;
        setAdmin(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await loginAdminApi(email, password);
      setAdmin(res.admin);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk ke dashboard admin.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await logoutAdminApi();
    setAdmin(null);
    setPassword("");
  }

  if (checking) {
    return (
      <div className="shell py-16">
        <p className="text-sm text-muted">Memeriksa sesi autentikasi admin Celmira Tailor...</p>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="shell py-14 sm:py-20">
        <div className="mx-auto max-w-md rounded-[2rem] border border-cocoa/18 bg-ivory p-6 shadow-[0_24px_60px_-42px_rgba(59,43,37,0.38)] sm:p-8">
          <p className="eyebrow">Akses Internal Terproteksi</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-espresso sm:text-3xl">
            Masuk Admin Celmira Tailor
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Autentikasi diverifikasi langsung oleh server (session cookie <code>HttpOnly</code>).
            Endpoint chat admin tidak dapat diakses tanpa sesi admin yang sah.
          </p>

          {!configured ? (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose/40 bg-rose/10 p-4 text-xs leading-relaxed text-espresso">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
              <div>
                <p className="font-semibold">Konfigurasi server admin belum diatur</p>
                <p className="mt-1 text-muted">
                  Tambahkan <code>ADMIN_EMAIL</code> dan <code>ADMIN_PASSWORD_HASH</code> di file{" "}
                  <code>.dev.vars</code> (lokal) atau Cloudflare Secrets (produksi). Lihat{" "}
                  <code>.dev.vars.example</code> dan jalankan{" "}
                  <code>node scripts/hash-admin-password.mjs</code>.
                </p>
              </div>
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <div>
              <label
                className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                htmlFor="admin-login-email"
              >
                Email Admin
              </label>
              <input
                autoComplete="username"
                className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-cream/30 px-4 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:bg-ivory focus:outline-none"
                id="admin-login-email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@celmira.local"
                required
                type="email"
                value={email}
              />
            </div>

            <div>
              <label
                className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                htmlFor="admin-login-password"
              >
                Kata Sandi Admin
              </label>
              <input
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-cream/30 px-4 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:bg-ivory focus:outline-none"
                id="admin-login-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi admin"
                required
                type="password"
                value={password}
              />
            </div>

            {error ? (
              <p
                className="rounded-xl border border-rose/40 bg-rose/10 px-3.5 py-2.5 text-xs font-medium text-espresso"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              className={buttonClass("solid", "w-full cursor-pointer")}
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Memverifikasi..." : "Masuk ke Dashboard Admin"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children({ admin, onLogout: handleLogout })}</>;
}
