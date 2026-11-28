"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { navigation, site } from "@/lib/site";
import { MenuIcon } from "@/components/ui/icons";

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b transition-colors duration-500 ${
          isScrolled
            ? "border-cocoa/10 bg-ivory/92 backdrop-blur-md"
            : "border-transparent bg-ivory/70 backdrop-blur-sm"
        }`}
      >
        <div className="shell flex h-[4.5rem] items-center justify-between gap-6 lg:h-20">
          <Link
            aria-label={`${site.name} — beranda`}
            className="flex shrink-0 items-center gap-3"
            href="/"
          >
            <Image
              alt="Celmira Boutique"
              className="h-8 w-auto sm:h-9"
              height={533}
              priority
              src="/images/logo.png"
              width={1600}
            />
            <span className="hidden border-l border-cocoa/20 pl-3 text-[0.625rem] font-medium uppercase leading-[1.5] tracking-[0.22em] text-muted sm:block">
              Tailor
              <br />
              Atelier
            </span>
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-5 lg:flex xl:gap-7">
            {navigation.map((item) => (
              <Link
                className={`relative py-1 text-[0.8125rem] tracking-[0.04em] transition-colors duration-300 hover:text-espresso ${
                  isActive(item.href) ? "text-espresso" : "text-muted"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
                <span
                  className={`absolute -bottom-0.5 left-0 h-px w-full origin-left bg-cocoa/60 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive(item.href) ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              className="hidden rounded-full bg-espresso px-6 py-3 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ivory transition-colors duration-500 hover:bg-cocoa sm:inline-flex"
              href="/orders"
            >
              Mulai Pesanan
            </Link>
            <button
              aria-controls="mobile-navigation"
              aria-expanded={isMenuOpen}
              aria-label="Buka menu navigasi"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cocoa/20 text-espresso transition-colors duration-300 hover:border-cocoa/50 lg:hidden"
              onClick={() => setIsMenuOpen(true)}
              type="button"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      <MobileNavigation isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}
