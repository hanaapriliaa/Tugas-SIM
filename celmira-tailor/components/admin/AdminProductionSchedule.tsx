"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/track/StatusBadge";
import { buttonClass } from "@/components/ui/ButtonLink";
import {
  AlertCircleIcon,
  ArrowRight,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { fetchAdminScheduleApi, updateAdminCapacityApi } from "@/lib/admin-client";
import { DEFAULT_CATEGORY_LEAD_DAYS } from "@/lib/admin-modules";
import { garmentCategories } from "@/lib/booking-options";
import {
  ORDER_STATUS_META,
  formatDateOnlyId,
  formatDateTimeId,
  getProductionStageIndex,
  getProductionStageMeta,
} from "@/lib/order-tracking";
import type {
  BlockedProductionDate,
  GarmentCategoryId,
  ProductionLoadStatus,
  ProductionScheduleSummary,
} from "@/lib/types/tailor";

type AdminProductionScheduleProps = {
  onOpenOrderDetail?: (orderCode: string) => void;
};

const inputClass =
  "w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors focus:border-espresso";

function loadStatusBadge(status: ProductionLoadStatus): { label: string; className: string } {
  if (status === "melebihi_kapasitas") {
    return {
      label: "Melebihi Kapasitas",
      className: "border-rose/45 bg-rose/15 text-espresso",
    };
  }
  if (status === "mendekati_penuh") {
    return {
      label: "Mendekati Penuh",
      className: "border-cocoa/35 bg-sand/60 text-espresso",
    };
  }
  return {
    label: "Aman",
    className: "border-cocoa/20 bg-cream/70 text-cocoa",
  };
}

export function AdminProductionSchedule({
  onOpenOrderDetail,
}: AdminProductionScheduleProps = {}) {
  const [schedule, setSchedule] = useState<ProductionScheduleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state kapasitas
  const [weeklyLimit, setWeeklyLimit] = useState("12");
  const [dailyLimit, setDailyLimit] = useState("3");
  const [standardLeadDays, setStandardLeadDays] = useState("14");
  const [operationalNote, setOperationalNote] = useState("");
  const [blockedDates, setBlockedDates] = useState<BlockedProductionDate[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [newBlockedReason, setNewBlockedReason] = useState("");
  const [categoryLeadDays, setCategoryLeadDays] = useState<Record<GarmentCategoryId, string>>(() => {
    const init = {} as Record<GarmentCategoryId, string>;
    for (const cat of garmentCategories) {
      init[cat.id] = String(DEFAULT_CATEGORY_LEAD_DAYS[cat.id]);
    }
    return init;
  });

  const applyScheduleToForm = useCallback((data: ProductionScheduleSummary) => {
    setSchedule(data);
    setWeeklyLimit(String(data.capacity.weeklyOrderLimit));
    setDailyLimit(String(data.capacity.dailyTargetLimit));
    setStandardLeadDays(String(data.capacity.standardLeadDays));
    setOperationalNote(data.capacity.operationalNote);
    setBlockedDates(data.capacity.blockedDates);
    const nextCat = {} as Record<GarmentCategoryId, string>;
    for (const cat of garmentCategories) {
      nextCat[cat.id] = String(
        data.capacity.categoryLeadDays[cat.id] ?? DEFAULT_CATEGORY_LEAD_DAYS[cat.id]
      );
    }
    setCategoryLeadDays(nextCat);
  }, []);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchAdminScheduleApi();
      applyScheduleToForm(res.schedule);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memuat jadwal & kapasitas produksi."
      );
    } finally {
      setLoading(false);
    }
  }, [applyScheduleToForm]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  function handleAddBlockedDate() {
    setErrorMessage(null);
    const date = newBlockedDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setErrorMessage("Pilih tanggal libur/blokir yang valid terlebih dahulu.");
      return;
    }
    if (blockedDates.some((item) => item.date === date)) {
      setErrorMessage("Tanggal tersebut sudah terdaftar dalam daftar libur/blokir.");
      return;
    }
    const next = [
      ...blockedDates,
      {
        date,
        reason: newBlockedReason.trim() || "Tutup / jadwal penuh",
      },
    ].sort((a, b) => a.date.localeCompare(b.date));
    setBlockedDates(next);
    setNewBlockedDate("");
    setNewBlockedReason("");
  }

  function handleRemoveBlockedDate(date: string) {
    setBlockedDates((prev) => prev.filter((item) => item.date !== date));
  }

  async function handleSaveCapacity() {
    setSaving(true);
    setFeedback(null);
    setErrorMessage(null);
    try {
      const parsedCatLead: Partial<Record<GarmentCategoryId, number>> = {};
      for (const cat of garmentCategories) {
        const val = Number(categoryLeadDays[cat.id]);
        if (!Number.isFinite(val) || val < 1 || val > 120) {
          throw new Error(`Estimasi hari kategori ${cat.name} harus antara 1 sampai 120 hari.`);
        }
        parsedCatLead[cat.id] = Math.round(val);
      }

      const res = await updateAdminCapacityApi({
        weeklyOrderLimit: Number(weeklyLimit),
        dailyTargetLimit: Number(dailyLimit),
        standardLeadDays: Number(standardLeadDays),
        operationalNote,
        blockedDates,
        categoryLeadDays: parsedCatLead,
      });

      applyScheduleToForm(res.schedule);
      setFeedback("Pengaturan kapasitas & jadwal produksi berhasil disimpan ke server D1.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal menyimpan pengaturan kapasitas produksi."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="shell py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-cocoa/12 pb-6">
        <div className="max-w-2xl">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
            Manajemen Produksi · Cloudflare D1
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-espresso sm:text-4xl">
            Kapasitas &amp; Jadwal Produksi
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Pantau beban antrean jahit mingguan berdasarkan pesanan nyata, atur batas kuota
            produksi, estimasi pengerjaan per kategori, serta tanggal libur atau blokir target.
          </p>
        </div>

        <button
          className={buttonClass("outline", "px-4 py-2 text-xs")}
          disabled={loading}
          onClick={() => void loadSchedule()}
          type="button"
        >
          {loading ? "Memuat..." : "Muat Ulang Jadwal"}
        </button>
      </div>

      {feedback ? (
        <div
          className="mt-6 flex items-center gap-2.5 rounded-2xl border border-cocoa/25 bg-cream/70 px-4 py-3 text-sm text-espresso"
          role="status"
        >
          <CheckIcon className="h-4 w-4 shrink-0 text-cocoa" />
          <span>{feedback}</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className="mt-6 flex items-center gap-2.5 rounded-2xl border border-rose/45 bg-rose/10 px-4 py-3 text-sm text-espresso"
          role="alert"
        >
          <AlertCircleIcon className="h-4 w-4 shrink-0 text-rose" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {/* Ringkasan Metrik Produksi */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Pesanan Aktif",
            value: schedule?.metrics.totalActiveOrders ?? 0,
            hint: "Belum selesai/batal",
          },
          {
            label: "Dalam Produksi",
            value: schedule?.metrics.inProductionOrders ?? 0,
            hint: "DP terverifikasi",
          },
          {
            label: "Menunggu Quote/DP",
            value: schedule?.metrics.awaitingQuoteOrDpOrders ?? 0,
            hint: "Potensi antrean",
          },
          {
            label: "Target ≤ 7 Hari",
            value: schedule?.metrics.dueWithin7Days ?? 0,
            hint: "Prioritas dekat",
          },
          {
            label: "Lewat Target",
            value: schedule?.metrics.overdueOrders ?? 0,
            hint: "Perlu perhatian",
            highlight: (schedule?.metrics.overdueOrders ?? 0) > 0,
          },
          {
            label: "Bentrok Libur",
            value: schedule?.metrics.blockedDateConflicts ?? 0,
            hint: "Target di hari blokir",
            highlight: (schedule?.metrics.blockedDateConflicts ?? 0) > 0,
          },
        ].map((kpi) => (
          <div
            className={`rounded-2xl border p-4 ${
              kpi.highlight
                ? "border-rose/45 bg-rose/10"
                : "border-cocoa/15 bg-ivory"
            }`}
            key={kpi.label}
          >
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-cocoa">
              {kpi.label}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-espresso">
              {kpi.value}
            </p>
            <p className="mt-1 text-[0.75rem] text-muted">{kpi.hint}</p>
          </div>
        ))}
      </div>

      {/* Peringatan Harian (Melebihi Kuota Harian atau Bentrok Tanggal Blokir) */}
      {schedule && schedule.dailyAlerts.length > 0 ? (
        <section className="mt-7 rounded-[1.5rem] border border-rose/35 bg-rose/8 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-espresso">
            <AlertCircleIcon className="h-4 w-4 text-rose" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em]">
              Peringatan Tanggal Target ({schedule.dailyAlerts.length})
            </h3>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {schedule.dailyAlerts.map((alert) => (
              <div
                className="rounded-xl border border-rose/25 bg-ivory/90 p-3.5 text-xs text-espresso"
                key={alert.date}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm">{formatDateOnlyId(alert.date)}</strong>
                  <span className="rounded-full bg-rose/15 px-2.5 py-0.5 font-medium text-espresso">
                    {alert.count} pesanan (batas {alert.limit}/hari)
                  </span>
                </div>
                {alert.isBlocked ? (
                  <p className="mt-1.5 text-rose">
                    Tanggal diblokir/libur: {alert.blockedReason}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {alert.orderCodes.map((code) => (
                    <button
                      className="cursor-pointer rounded-full border border-cocoa/25 bg-cream/60 px-2.5 py-0.5 text-[0.6875rem] font-medium text-espresso hover:border-espresso"
                      key={code}
                      onClick={() => onOpenOrderDetail?.(code)}
                      type="button"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        {/* Kolom Kiri: Beban Mingguan + Antrean Produksi */}
        <div className="space-y-8">
          <section className="rounded-[1.5rem] border border-cocoa/15 bg-ivory p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cocoa/10 pb-4">
              <div>
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                  Proyeksi 6 Minggu ke Depan
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso">
                  Beban Kapasitas Mingguan
                </h3>
              </div>
              <span className="text-xs text-muted">
                Kuota: <strong className="text-espresso">{schedule?.capacity.weeklyOrderLimit ?? 12}</strong>{" "}
                pesanan/minggu
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {(schedule?.weeks ?? []).map((week) => {
                const badge = loadStatusBadge(week.status);
                const barWidth = Math.min(100, week.utilizationPercent);
                return (
                  <div
                    className="rounded-2xl border border-cocoa/12 bg-cream/35 p-4"
                    key={week.weekStart}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-espresso">{week.label}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {week.activeCount} / {week.limit} pesanan · {week.inProductionCount} dalam
                          jahit
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cocoa/12">
                      <div
                        className={`h-full rounded-full transition-all ${
                          week.status === "melebihi_kapasitas"
                            ? "bg-rose"
                            : week.status === "mendekati_penuh"
                              ? "bg-cocoa"
                              : "bg-espresso"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    {week.orders.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {week.orders.slice(0, 5).map((item) => (
                          <button
                            className="cursor-pointer rounded-full border border-cocoa/20 bg-ivory px-2.5 py-0.5 text-[0.6875rem] text-espresso transition-colors hover:border-espresso"
                            key={item.orderId}
                            onClick={() => onOpenOrderDetail?.(item.orderCode)}
                            type="button"
                          >
                            {item.orderCode}
                          </button>
                        ))}
                        {week.orders.length > 5 ? (
                          <span className="px-1.5 py-0.5 text-[0.6875rem] text-muted">
                            +{week.orders.length - 5} lainnya
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted">Belum ada target selesai di minggu ini.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Antrean Pesanan Aktif Berdasarkan Target Terdekat */}
          <section className="rounded-[1.5rem] border border-cocoa/15 bg-ivory p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cocoa/10 pb-4">
              <div>
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                  Urutan Target Terdekat
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso">
                  Antrean Produksi Aktif ({schedule?.queue.length ?? 0})
                </h3>
              </div>
              <ClockIcon className="h-5 w-5 text-cocoa" />
            </div>

            {!schedule || schedule.queue.length === 0 ? (
              <p className="mt-5 text-sm text-muted">
                Belum ada pesanan aktif pada antrean produksi saat ini.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {schedule.queue.map((item) => {
                  const statusMeta = ORDER_STATUS_META[item.status];
                  const stageMeta = getProductionStageMeta(item.productionStage);
                  const stageIdx = getProductionStageIndex(item.productionStage) + 1;
                  const deadlineLabel =
                    item.daysUntilTarget < 0
                      ? `Lewat ${Math.abs(item.daysUntilTarget)} hari`
                      : item.daysUntilTarget === 0
                        ? "Target hari ini"
                        : `${item.daysUntilTarget} hari lagi`;

                  return (
                    <div
                      className="flex flex-col gap-3 rounded-2xl border border-cocoa/12 bg-cream/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                      key={item.orderId}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-espresso">
                            {item.orderCode}
                          </span>
                          <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                          {item.isBlockedDateConflict ? (
                            <span className="rounded-full bg-rose/15 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-espresso">
                              Bentrok Libur
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-espresso">
                          {item.customerName} · {item.categoryName} ({item.designTitle})
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Tahap {stageIdx}/10: {stageMeta.label} · Target:{" "}
                          <strong className="text-espresso">
                            {formatDateOnlyId(item.estimatedCompletionDate ?? item.targetDate)}
                          </strong>{" "}
                          ({deadlineLabel})
                        </p>
                      </div>

                      {onOpenOrderDetail ? (
                        <button
                          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-full border border-cocoa/25 bg-ivory px-3.5 py-1.5 text-xs font-medium text-espresso transition-colors hover:border-espresso sm:self-center"
                          onClick={() => onOpenOrderDetail(item.orderCode)}
                          type="button"
                        >
                          Buka Pesanan
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Kolom Kanan: Form Pengaturan Kapasitas & Hari Libur */}
        <section className="rounded-[1.5rem] border border-cocoa/15 bg-cream/35 p-5 sm:p-6">
          <div className="flex items-center gap-2 border-b border-cocoa/12 pb-4">
            <CalendarIcon className="h-5 w-5 text-cocoa" />
            <div>
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                Konfigurasi Kapasitas
              </p>
              <h3 className="font-[family-name:var(--font-display)] text-2xl text-espresso">
                Aturan Jadwal &amp; Kuota
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-medium text-espresso">Kuota / Minggu</span>
                <input
                  className={`mt-1.5 ${inputClass}`}
                  max={200}
                  min={1}
                  onChange={(e) => setWeeklyLimit(e.target.value)}
                  type="number"
                  value={weeklyLimit}
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-espresso">Target / Hari</span>
                <input
                  className={`mt-1.5 ${inputClass}`}
                  max={50}
                  min={1}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  type="number"
                  value={dailyLimit}
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-espresso">Lead Time Default (Hari)</span>
                <input
                  className={`mt-1.5 ${inputClass}`}
                  max={120}
                  min={1}
                  onChange={(e) => setStandardLeadDays(e.target.value)}
                  type="number"
                  value={standardLeadDays}
                />
              </label>
            </div>

            {/* Estimasi Hari per Kategori */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">
                Estimasi Hari Pengerjaan per Kategori
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                {garmentCategories.map((cat) => (
                  <label
                    className="flex items-center justify-between gap-2 rounded-xl border border-cocoa/15 bg-ivory px-3 py-2 text-xs"
                    key={cat.id}
                  >
                    <span className="truncate font-medium text-espresso">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <input
                        aria-label={`Estimasi hari ${cat.name}`}
                        className="w-14 rounded-lg border border-cocoa/20 bg-cream/40 px-2 py-1 text-right text-xs text-espresso outline-none focus:border-espresso"
                        max={120}
                        min={1}
                        onChange={(e) =>
                          setCategoryLeadDays((prev) => ({
                            ...prev,
                            [cat.id]: e.target.value,
                          }))
                        }
                        type="number"
                        value={categoryLeadDays[cat.id] ?? "14"}
                      />
                      <span className="text-[0.6875rem] text-muted">hr</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Catatan Operasional */}
            <label className="block">
              <span className="text-xs font-medium text-espresso">
                Catatan Operasional / Info Jadwal
              </span>
              <textarea
                className={`mt-1.5 ${inputClass}`}
                maxLength={600}
                onChange={(e) => setOperationalNote(e.target.value)}
                placeholder="Contoh: Slot penjahitan menjelang Lebaran/wisuda dibatasi 10 pesanan per minggu."
                rows={3}
                value={operationalNote}
              />
            </label>

            {/* Daftar Tanggal Libur / Blokir */}
            <div className="rounded-2xl border border-cocoa/15 bg-ivory p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">
                Tanggal Libur / Blokir Target ({blockedDates.length})
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
                <input
                  aria-label="Pilih tanggal libur"
                  className={inputClass}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  type="date"
                  value={newBlockedDate}
                />
                <input
                  aria-label="Alasan libur atau blokir"
                  className={inputClass}
                  maxLength={120}
                  onChange={(e) => setNewBlockedReason(e.target.value)}
                  placeholder="Alasan (mis. Libur workshop / slot penuh)"
                  type="text"
                  value={newBlockedReason}
                />
                <button
                  className={buttonClass("outline", "px-4 py-2 text-xs")}
                  onClick={handleAddBlockedDate}
                  type="button"
                >
                  Tambah
                </button>
              </div>

              {blockedDates.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {blockedDates.map((item) => (
                    <li
                      className="flex items-center justify-between gap-2 rounded-xl border border-cocoa/12 bg-cream/40 px-3 py-2 text-xs"
                      key={item.date}
                    >
                      <div className="min-w-0">
                        <strong className="text-espresso">{formatDateOnlyId(item.date)}</strong>
                        <span className="ml-2 text-muted">{item.reason}</span>
                      </div>
                      <button
                        aria-label={`Hapus tanggal blokir ${item.date}`}
                        className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-rose/15 hover:text-espresso"
                        onClick={() => handleRemoveBlockedDate(item.date)}
                        type="button"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted">
                  Belum ada tanggal libur atau blokir target yang ditambahkan.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {schedule?.capacity.updatedAt ? (
                <p className="text-[0.75rem] text-muted">
                  Terakhir disimpan: {formatDateTimeId(schedule.capacity.updatedAt)}
                </p>
              ) : (
                <span />
              )}
              <button
                className={buttonClass("solid", "px-5 py-2.5 text-xs")}
                disabled={saving}
                onClick={() => void handleSaveCapacity()}
                type="button"
              >
                {saving ? "Menyimpan..." : "Simpan Kapasitas & Jadwal"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
