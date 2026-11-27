"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { legalNavigation, navigation, site, studioNavigation } from "@/lib/site";
import { ArrowRight, CloseIcon, PinIcon } from "@/components/ui/icons";

type MobileNavigationProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
    // Hanya tutup panel ketika route berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 lg:hidden ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      id="mobile-navigation"
      inert={!isOpen}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-espresso/30 transition-opacity duration-500 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        aria-label="Menu navigasi"
        aria-modal="true"
        className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-ivory shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-cocoa/10 px-6 py-5">
          <span className="text-[0.625rem] font-medium uppercase tracking-[0.26em] text-muted">
            Menu
          </span>
          <button
            aria-label="Tutup menu navigasi"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cocoa/20 text-espresso"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <nav aria-label="Navigasi mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-8">
          {navigation.map((item) => (
            <Link
              className="border-b border-cocoa/10 py-4 font-[family-name:var(--font-display)] text-2xl text-espresso"
              href={item.href}
              key={item.href}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}

          <p className="mt-8 text-[0.625rem] font-medium uppercase tracking-[0.26em] text-muted">
            Studio
          </p>
          <div className="mt-2 flex flex-col">
            {studioNavigation.map((item) => (
              <Link
                className="flex items-center justify-between border-b border-cocoa/10 py-3 text-sm text-muted"
                href={item.href}
                key={item.href}
                onClick={onClose}
              >
                {item.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>

          <p className="mt-6 text-[0.625rem] font-medium uppercase tracking-[0.26em] text-muted">
            Kebijakan
          </p>
          <div className="mt-2 flex flex-col">
            {legalNavigation.map((item) => (
              <Link
                className="flex items-center justify-between border-b border-cocoa/10 py-2.5 text-xs text-muted"
                href={item.href}
                key={item.href}
                onClick={onClose}
              >
                {item.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        </nav>

        <div className="border-t border-cocoa/10 px-6 py-6">
          <Link
            className="flex w-full items-center justify-center rounded-full bg-espresso px-6 py-3.5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ivory"
            href="/orders"
            onClick={onClose}
          >
            Mulai Pesanan
          </Link>
          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <PinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {site.location.address[0]}, {site.location.address[1]}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
