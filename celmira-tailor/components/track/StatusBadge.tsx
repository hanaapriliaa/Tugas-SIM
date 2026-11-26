import type { StatusTone } from "@/lib/order-tracking";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  className?: string;
};

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "border-cocoa/20 bg-cream/80 text-cocoa",
  info: "border-cocoa/30 bg-sand/70 text-espresso",
  warning: "border-rose/60 bg-blush/35 text-espresso",
  success: "border-emerald-800/25 bg-emerald-50 text-emerald-900",
  danger: "border-red-800/25 bg-red-50 text-red-900",
};

export function StatusBadge({ label, tone = "neutral", className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.6875rem] font-medium tracking-[0.06em] ${TONE_CLASSES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
