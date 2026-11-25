import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "solid" | "outline" | "quiet";

const base =
  "group inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-[0.8125rem] font-medium tracking-[0.12em] uppercase transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

const variants: Record<Variant, string> = {
  solid:
    "bg-espresso text-ivory hover:bg-cocoa focus-visible:bg-cocoa shadow-[0_12px_30px_-18px_rgba(59,43,37,0.8)]",
  outline:
    "border border-cocoa/30 text-espresso hover:border-cocoa hover:bg-cream/70",
  quiet: "text-espresso hover:text-cocoa px-0 py-0 normal-case tracking-normal",
};

export function buttonClass(variant: Variant = "solid", className = "") {
  return `${base} ${variants[variant]} ${className}`.replace(/\s+/g, " ").trim();
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

export function ButtonLink({ href, children, variant = "solid", className }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
