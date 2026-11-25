"use client";

import { CheckIcon } from "@/components/ui/icons";

export type BookingStepMeta = {
  number: number;
  shortTitle: string;
  title: string;
};

export const BOOKING_STEPS: BookingStepMeta[] = [
  { number: 1, shortTitle: "Kategori & Desain", title: "Kategori & Referensi Desain" },
  { number: 2, shortTitle: "Detail Busana", title: "Kain, Warna & Finishing" },
  { number: 3, shortTitle: "Ukuran", title: "Ukuran Pelanggan" },
  { number: 4, shortTitle: "Identitas & Kirim", title: "Identitas, Pengambilan & Target" },
  { number: 5, shortTitle: "Ringkasan", title: "Ringkasan & Ajukan Pesanan" },
];

type BookingStepperProps = {
  currentStep: number;
  highestUnlockedStep: number;
  onSelectStep: (step: number) => void;
};

export function BookingStepper({
  currentStep,
  highestUnlockedStep,
  onSelectStep,
}: BookingStepperProps) {
  return (
    <nav aria-label="Tahapan pengajuan pesanan" className="border-y border-cocoa/12 bg-cream/55">
      <div className="shell py-4">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
          {BOOKING_STEPS.map((step) => {
            const isCurrent = step.number === currentStep;
            const isDone = step.number < currentStep;
            const isAccessible = step.number <= highestUnlockedStep;

            return (
              <li key={step.number}>
                <button
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-300 ${
                    isCurrent
                      ? "border-espresso bg-espresso text-ivory shadow-sm"
                      : isDone
                        ? "border-cocoa/25 bg-ivory text-espresso hover:border-cocoa"
                        : isAccessible
                          ? "border-cocoa/15 bg-ivory/75 text-espresso hover:border-cocoa/40"
                          : "cursor-not-allowed border-cocoa/10 bg-ivory/40 text-muted/60"
                  }`}
                  disabled={!isAccessible}
                  onClick={() => onSelectStep(step.number)}
                  type="button"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold ${
                      isCurrent
                        ? "bg-ivory text-espresso"
                        : isDone
                          ? "bg-cocoa text-ivory"
                          : "border border-cocoa/25 text-cocoa"
                    }`}
                  >
                    {isDone ? <CheckIcon className="h-3.5 w-3.5" /> : step.number}
                  </span>
                  <span className="min-w-0 truncate text-xs font-medium tracking-[0.02em]">
                    {step.shortTitle}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
