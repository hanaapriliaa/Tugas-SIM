import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <header className="border-b border-cocoa/12 bg-cream/40">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <Link className="flex items-center gap-3" href="/">
            <Image
              alt="Celmira Boutique"
              className="h-7 w-auto"
              height={533}
              priority
              src="/images/logo.png"
              width={1600}
            />
            <span className="border-l border-cocoa/20 pl-3 text-[0.5625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
              Admin
            </span>
          </Link>
          <Link
            className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-espresso"
            href="/"
          >
            Lihat situs
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-cocoa/10 py-6">
        <div className="shell flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{site.name} — area internal</p>
          <p>Hanya untuk tim Celmira Boutique.</p>
        </div>
      </footer>
    </div>
  );
}
