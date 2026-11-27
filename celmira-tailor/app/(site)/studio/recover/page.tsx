"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/ButtonLink";
import { AlertCircleIcon, CheckIcon, LockIcon } from "@/components/ui/icons";
import { consumeGuestRecoveryTokenApi } from "@/lib/studio-client";

type RecoverPhase = "processing" | "success" | "error";

export default function StudioRecoverPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<RecoverPhase>("processing");
  const [message, setMessage] = useState("Memverifikasi tautan pemulihan privat...");
  const [summary, setSummary] = useState<{ designsCount: number; profilesCount: number } | null>(
    null
  );

  useEffect(() => {
    let active = true;

    async function runRecovery() {
      const rawHash = typeof window !== "undefined" ? window.location.hash : "";
      const params = new URLSearchParams(rawHash.replace(/^#/, ""));
      const token = params.get("t") || rawHash.replace(/^#/, "").trim();
      const target = params.get("to") === "measurement" ? "/measurement-studio?view=saved" : "/design-studio";

      // Hapus fragment token segera dari address bar & riwayat browser agar tidak tertinggal
      if (typeof window !== "undefined" && rawHash) {
        window.history.replaceState(null, "", "/studio/recover");
      }

      if (!token || token.length < 32) {
        if (!active) return;
        setPhase("error");
        setMessage(
          "Tautan pemulihan tidak lengkap atau sudah tidak berlaku. Buat tautan pemulihan baru dari perangkat asal Anda."
        );
        return;
      }

      try {
        const res = await consumeGuestRecoveryTokenApi(token);
        if (!active) return;
        setSummary({ designsCount: res.designsCount, profilesCount: res.profilesCount });
        setPhase("success");
        setMessage(
          "Sesi berhasil dipulihkan pada perangkat ini. Mengarahkan ke studio Anda..."
        );
        setTimeout(() => {
          if (active) router.replace(target);
        }, 1200);
      } catch (err) {
        if (!active) return;
        setPhase("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "Tautan pemulihan tidak valid, sudah terpakai, atau telah kedaluwarsa."
        );
      }
    }

    void runRecovery();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="shell py-16 sm:py-24">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-cocoa/16 bg-cream/55 p-7 text-center sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cocoa/20 bg-ivory text-espresso">
          {phase === "success" ? (
            <CheckIcon className="h-5 w-5 text-emerald-800" />
          ) : phase === "error" ? (
            <AlertCircleIcon className="h-5 w-5 text-rose" />
          ) : (
            <LockIcon className="h-5 w-5 text-cocoa" />
          )}
        </div>

        <p className="mt-4 text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
          Pemulihan Sesi Privat
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-espresso sm:text-3xl">
          {phase === "success"
            ? "Sesi Studio Dipulihkan"
            : phase === "error"
              ? "Tautan Tidak Dapat Digunakan"
              : "Memulihkan Sesi Anda..."}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>

        {summary ? (
          <p className="mt-3 text-xs font-medium text-espresso">
            {summary.designsCount} desain tersimpan · {summary.profilesCount} profil ukuran
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className={buttonClass("solid")} href="/design-studio">
            Buka Design Studio
          </Link>
          <Link className={buttonClass("outline")} href="/measurement-studio">
            Buka Measurement Studio
          </Link>
        </div>
      </div>
    </div>
  );
}
