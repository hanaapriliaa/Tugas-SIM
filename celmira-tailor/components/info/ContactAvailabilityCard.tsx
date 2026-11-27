"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ArrowUpRight, ChatIcon } from "@/components/ui/icons";
import { buildOfficialWhatsappHref } from "@/lib/chat";

type ContactInfoState = {
  adminDisplayName: string;
  statusLabel: string;
  availabilityNote: string;
  officialWhatsappNumber: string | null;
};

export function ContactAvailabilityCard() {
  const [info, setInfo] = useState<ContactInfoState | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/site/contact-info", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setInfo(data as ContactInfoState);
      })
      .catch(() => {
        // Fallback aman bila request sementara gagal
      });
    return () => {
      active = false;
    };
  }, []);

  const whatsappHref = info?.officialWhatsappNumber
    ? buildOfficialWhatsappHref(
        info.officialWhatsappNumber,
        "Halo Celmira Tailor, saya ingin berkonsultasi mengenai pesanan jahit custom."
      )
    : null;

  return (
    <div className="rounded-[1.75rem] border border-cocoa/15 bg-cream/55 p-6 sm:p-8">
      <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
        Saluran Komunikasi Aktif
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-espresso">
        Konsultasi langsung dengan {info?.adminDisplayName ?? "Tim Celmira Tailor"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {info?.availabilityNote ??
          "Anda dapat mengirimkan pertanyaan seputar model, bahan, ukuran, maupun status pesanan melalui Chat Pelanggan di platform ini."}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ButtonLink href="/chat">
          <ChatIcon className="h-4 w-4" />
          Buka Chat Pelanggan
        </ButtonLink>

        {whatsappHref ? (
          <a
            className="inline-flex items-center gap-2 rounded-full border border-cocoa/30 bg-ivory px-5 py-3 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-espresso transition-colors hover:border-espresso"
            href={whatsappHref}
            rel="noreferrer"
            target="_blank"
          >
            WhatsApp Resmi ({info?.officialWhatsappNumber})
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      <div className="mt-6 rounded-2xl border border-cocoa/12 bg-ivory/85 p-4 text-xs leading-relaxed text-muted">
        <p className="font-semibold uppercase tracking-[0.14em] text-cocoa">
          Catatan Transparansi Kontak
        </p>
        <p className="mt-1.5">
          {whatsappHref
            ? "Nomor WhatsApp resmi di atas diatur langsung oleh admin Celmira Tailor. Alamat email resmi dan jam operasional belum dicantumkan terpisah pada halaman ini."
            : "Nomor telepon, nomor WhatsApp resmi, alamat email, dan jam operasional toko belum dicantumkan secara publik pada halaman ini sampai dikonfirmasi langsung oleh pihak Celmira Boutique. Gunakan Chat Pelanggan di atas atau situs resmi celmiraboutique.com."}
        </p>
        <p className="mt-2">
          Sudah memiliki nomor pesanan?{" "}
          <Link className="font-medium text-espresso underline underline-offset-4" href="/track">
            Lacak status pesanan di sini
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
