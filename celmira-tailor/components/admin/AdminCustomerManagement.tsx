"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/track/StatusBadge";
import { buttonClass } from "@/components/ui/ButtonLink";
import {
  AlertCircleIcon,
  ArrowRight,
  ChatIcon,
  CheckIcon,
  SearchIcon,
  UsersIcon,
} from "@/components/ui/icons";
import {
  fetchAdminCustomerDetailApi,
  fetchAdminCustomersApi,
  saveAdminCustomerNoteApi,
} from "@/lib/admin-client";
import { MAX_ADMIN_CUSTOMER_NOTE_LENGTH } from "@/lib/admin-modules";
import {
  ORDER_STATUS_META,
  formatDateOnlyId,
  formatDateTimeId,
  formatRupiah,
} from "@/lib/order-tracking";
import type { AdminCustomerDetail, AdminCustomerRecord } from "@/lib/types/tailor";

type CustomerFilter = "all" | "active_orders" | "repeat" | "has_chat" | "has_studio";

type AdminCustomerManagementProps = {
  onOpenOrderDetail?: (orderCode: string) => void;
  onOpenOrderChat?: (orderCode: string, threadId?: string) => void;
};

const inputClass =
  "w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors focus:border-espresso";

function matchesCustomerFilter(customer: AdminCustomerRecord, filter: CustomerFilter): boolean {
  if (filter === "all") return true;
  if (filter === "active_orders") return customer.activeOrders > 0;
  if (filter === "repeat") return customer.totalOrders >= 2;
  if (filter === "has_chat") return customer.totalChatThreads > 0;
  return customer.totalDesigns > 0 || customer.totalMeasurementProfiles > 0;
}

export function AdminCustomerManagement({
  onOpenOrderDetail,
  onOpenOrderChat,
}: AdminCustomerManagementProps = {}) {
  const [customers, setCustomers] = useState<AdminCustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchAdminCustomersApi();
      setCustomers(res.customers);
      setSelectedKey((prev) => {
        if (prev && res.customers.some((c) => c.customerKey === prev)) return prev;
        return res.customers[0]?.customerKey ?? null;
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memuat daftar pelanggan dari server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const loadDetail = useCallback(async (customerKey: string) => {
    setDetailLoading(true);
    setFeedback(null);
    setErrorMessage(null);
    try {
      const res = await fetchAdminCustomerDetailApi(customerKey);
      setDetail(res.detail);
      setNoteInput(res.detail.customer.internalNote);
    } catch (err) {
      setDetail(null);
      setErrorMessage(err instanceof Error ? err.message : "Gagal memuat detail pelanggan.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedKey) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedKey);
  }, [selectedKey, loadDetail]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((customer) => {
      if (!matchesCustomerFilter(customer, filter)) return false;
      if (!q) return true;
      return (
        customer.fullName.toLowerCase().includes(q) ||
        customer.whatsapp.toLowerCase().includes(q) ||
        customer.email.toLowerCase().includes(q) ||
        (customer.latestOrderCode ?? "").toLowerCase().includes(q) ||
        customer.customerKey.toLowerCase().includes(q)
      );
    });
  }, [customers, filter, searchQuery]);

  const kpi = useMemo(() => {
    let withActiveOrders = 0;
    let repeatCustomers = 0;
    let withStudioData = 0;
    for (const c of customers) {
      if (c.activeOrders > 0) withActiveOrders += 1;
      if (c.totalOrders >= 2) repeatCustomers += 1;
      if (c.totalDesigns > 0 || c.totalMeasurementProfiles > 0) withStudioData += 1;
    }
    return {
      total: customers.length,
      withActiveOrders,
      repeatCustomers,
      withStudioData,
    };
  }, [customers]);

  async function handleSaveNote() {
    if (!selectedKey) return;
    setSavingNote(true);
    setFeedback(null);
    setErrorMessage(null);
    try {
      const res = await saveAdminCustomerNoteApi(selectedKey, noteInput);
      setCustomers((prev) =>
        prev.map((c) =>
          c.customerKey === selectedKey ? { ...c, internalNote: res.internalNote } : c
        )
      );
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              customer: { ...prev.customer, internalNote: res.internalNote },
            }
          : null
      );
      setFeedback("Catatan internal pelanggan berhasil disimpan.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal menyimpan catatan internal.");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="shell py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-cocoa/12 pb-6">
        <div className="max-w-2xl">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
            Direktori Pelanggan · Cloudflare D1
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-espresso sm:text-4xl">
            Manajemen Pelanggan
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ringkasan pelanggan terintegrasi dari pesanan, Design Studio, Measurement Studio, dan
            riwayat percakapan chat, lengkap dengan catatan internal tim Celmira.
          </p>
        </div>

        <button
          className={buttonClass("outline", "px-4 py-2 text-xs")}
          disabled={loading}
          onClick={() => void loadCustomers()}
          type="button"
        >
          {loading ? "Memuat..." : "Muat Ulang Data"}
        </button>
      </div>

      {/* Ringkasan KPI Pelanggan */}
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Pelanggan Tercatat", value: kpi.total, hint: "Sesi aktif & pemesan" },
          { label: "Pesanan Aktif", value: kpi.withActiveOrders, hint: "Sedang diproses/antre" },
          { label: "Pelanggan Berulang", value: kpi.repeatCustomers, hint: "≥ 2 pesanan" },
          { label: "Punya Data Studio", value: kpi.withStudioData, hint: "Desain / profil ukuran" },
        ].map((item) => (
          <div className="rounded-2xl border border-cocoa/15 bg-ivory p-4" key={item.label}>
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-cocoa">
              {item.label}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-espresso">
              {item.value}
            </p>
            <p className="mt-1 text-xs text-muted">{item.hint}</p>
          </div>
        ))}
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

      <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.25fr)]">
        {/* Daftar Pelanggan */}
        <section className="rounded-[1.5rem] border border-cocoa/15 bg-ivory p-4 sm:p-5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              aria-label="Cari pelanggan"
              className={`${inputClass} pl-10`}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, WhatsApp, email, atau kode pesanan..."
              type="search"
              value={searchQuery}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {(
              [
                { id: "all", label: "Semua" },
                { id: "active_orders", label: "Pesanan Aktif" },
                { id: "repeat", label: "Berulang" },
                { id: "has_chat", label: "Ada Chat" },
                { id: "has_studio", label: "Ada Studio" },
              ] as const
            ).map((chip) => (
              <button
                className={`cursor-pointer rounded-full px-3 py-1 text-[0.6875rem] font-medium transition-colors ${
                  filter === chip.id
                    ? "bg-espresso text-ivory"
                    : "border border-cocoa/20 bg-cream/40 text-espresso hover:border-cocoa"
                }`}
                key={chip.id}
                onClick={() => setFilter(chip.id)}
                type="button"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="mt-4 max-h-[38rem] space-y-2.5 overflow-y-auto pr-1">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted">Memuat daftar pelanggan...</p>
            ) : filteredCustomers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-cocoa/20 p-6 text-center">
                <UsersIcon className="mx-auto h-6 w-6 text-cocoa/60" />
                <p className="mt-2 text-sm text-muted">
                  Tidak ada data pelanggan yang sesuai dengan filter saat ini.
                </p>
              </div>
            ) : (
              filteredCustomers.map((customer) => {
                const selected = customer.customerKey === selectedKey;
                return (
                  <button
                    className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition-all ${
                      selected
                        ? "border-espresso bg-cream/70 shadow-[0_10px_24px_-18px_rgba(59,43,37,0.6)]"
                        : "border-cocoa/12 bg-ivory hover:border-cocoa/40 hover:bg-cream/35"
                    }`}
                    key={customer.customerKey}
                    onClick={() => setSelectedKey(customer.customerKey)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-espresso">
                          {customer.fullName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {customer.whatsapp || customer.email || "Sesi guest tanpa kontak"}
                        </p>
                      </div>
                      {customer.unreadChatByAdmin > 0 ? (
                        <span className="rounded-full bg-espresso px-2 py-0.5 text-[0.625rem] font-semibold text-ivory">
                          {customer.unreadChatByAdmin} chat baru
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-[0.6875rem] text-muted">
                      <span className="rounded-full bg-cream px-2 py-0.5 text-espresso">
                        {customer.totalOrders} pesanan
                      </span>
                      {customer.totalDesigns > 0 ? (
                        <span className="rounded-full bg-cream px-2 py-0.5">
                          {customer.totalDesigns} desain
                        </span>
                      ) : null}
                      {customer.totalMeasurementProfiles > 0 ? (
                        <span className="rounded-full bg-cream px-2 py-0.5">
                          {customer.totalMeasurementProfiles} ukuran
                        </span>
                      ) : null}
                      {customer.totalChatThreads > 0 ? (
                        <span className="rounded-full bg-cream px-2 py-0.5">
                          {customer.totalChatThreads} chat
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Panel Detail Pelanggan */}
        <section className="rounded-[1.5rem] border border-cocoa/15 bg-cream/30 p-5 sm:p-6">
          {detailLoading ? (
            <p className="py-12 text-center text-sm text-muted">Memuat detail pelanggan...</p>
          ) : !detail ? (
            <div className="py-12 text-center">
              <UsersIcon className="mx-auto h-7 w-7 text-cocoa/50" />
              <p className="mt-2 text-sm text-muted">
                Pilih salah satu pelanggan di sebelah kiri untuk melihat riwayat lengkapnya.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Identitas */}
              <div className="border-b border-cocoa/12 pb-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                      Profil Pelanggan
                    </p>
                    <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso">
                      {detail.customer.fullName}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <span>WhatsApp: {detail.customer.whatsapp || "—"}</span>
                      <span>Email: {detail.customer.email || "—"}</span>
                      <span>Aktif terakhir: {formatDateTimeId(detail.customer.lastActivityAt)}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-cocoa/15 bg-ivory px-3.5 py-2 text-right">
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-cocoa">
                      Total Nilai Penawaran
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-espresso">
                      {formatRupiah(detail.customer.totalQuotedValue)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Catatan Internal Admin */}
              <div className="rounded-2xl border border-cocoa/15 bg-ivory p-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">
                    Catatan Internal Tim Celmira (Hanya Admin)
                  </span>
                  <textarea
                    className={`mt-2 ${inputClass}`}
                    maxLength={MAX_ADMIN_CUSTOMER_NOTE_LENGTH}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Contoh: Preferensi potongan longgar di lengan, cocok dengan bahan silk/brokat lembut..."
                    rows={3}
                    value={noteInput}
                  />
                </label>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-[0.75rem] text-muted">
                    {noteInput.length} / {MAX_ADMIN_CUSTOMER_NOTE_LENGTH} karakter
                  </span>
                  <button
                    className={buttonClass("outline", "px-4 py-2 text-xs")}
                    disabled={savingNote}
                    onClick={() => void handleSaveNote()}
                    type="button"
                  >
                    {savingNote ? "Menyimpan..." : "Simpan Catatan"}
                  </button>
                </div>
              </div>

              {/* Riwayat Pesanan */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
                  Riwayat Pesanan ({detail.orders.length})
                </h4>
                {detail.orders.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">Belum ada pesanan yang diajukan.</p>
                ) : (
                  <div className="mt-2.5 space-y-2.5">
                    {detail.orders.map((order) => {
                      const meta = ORDER_STATUS_META[order.status];
                      return (
                        <div
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cocoa/12 bg-ivory p-3.5"
                          key={order.id}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-espresso">
                                {order.orderCode}
                              </span>
                              <StatusBadge label={meta.label} tone={meta.tone} />
                            </div>
                            <p className="mt-1 text-xs font-medium text-espresso">
                              {order.categoryName} · {order.designTitle}
                            </p>
                            <p className="mt-0.5 text-[0.75rem] text-muted">
                              Target: {formatDateOnlyId(order.targetDate)}
                              {order.tailoringFee ? ` · ${formatRupiah(order.tailoringFee)}` : ""}
                            </p>
                          </div>

                          {onOpenOrderDetail ? (
                            <button
                              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-cocoa/25 bg-cream/50 px-3 py-1.5 text-xs font-medium text-espresso hover:border-espresso"
                              onClick={() => onOpenOrderDetail(order.orderCode)}
                              type="button"
                            >
                              Kelola
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Profil Ukuran & Desain Studio */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-cocoa/12 bg-ivory p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
                    Profil Ukuran ({detail.measurementProfiles.length})
                  </h4>
                  {detail.measurementProfiles.length === 0 ? (
                    <p className="mt-2 text-xs text-muted">Belum ada profil ukuran tersimpan.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2.5">
                      {detail.measurementProfiles.map((profile) => (
                        <div
                          className="rounded-xl border border-cocoa/10 bg-cream/35 p-3 text-xs"
                          key={profile.id}
                        >
                          <p className="font-medium text-espresso">{profile.label}</p>
                          <p className="mt-1 text-[0.6875rem] text-muted">
                            {profile.summary
                              .slice(0, 4)
                              .map((s) => `${s.label}: ${s.value}`)
                              .join(" · ") || "Data ukuran tersimpan"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-cocoa/12 bg-ivory p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
                    Desain Studio ({detail.designs.length})
                  </h4>
                  {detail.designs.length === 0 ? (
                    <p className="mt-2 text-xs text-muted">Belum ada desain studio tersimpan.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2.5">
                      {detail.designs.map((design) => (
                        <div
                          className="rounded-xl border border-cocoa/10 bg-cream/35 p-3 text-xs"
                          key={design.id}
                        >
                          <p className="font-medium text-espresso">{design.title}</p>
                          <p className="mt-1 text-[0.6875rem] text-muted">
                            {design.modelName}
                            {design.fabric ? ` · ${design.fabric}` : ""}
                            {design.colorName ? ` · ${design.colorName}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Percakapan Chat Terkait */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
                  Percakapan Chat ({detail.chatThreads.length})
                </h4>
                {detail.chatThreads.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">Belum ada percakapan chat tercatat.</p>
                ) : (
                  <div className="mt-2.5 space-y-2">
                    {detail.chatThreads.map((thread) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cocoa/12 bg-ivory p-3.5"
                        key={thread.id}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <ChatIcon className="h-3.5 w-3.5 text-cocoa" />
                            <p className="truncate text-xs font-semibold text-espresso">
                              {thread.title}
                            </p>
                            {thread.unreadByAdmin > 0 ? (
                              <span className="rounded-full bg-espresso px-2 py-0.5 text-[0.625rem] font-semibold text-ivory">
                                {thread.unreadByAdmin} baru
                              </span>
                            ) : null}
                          </div>
                          {thread.lastMessagePreview ? (
                            <p className="mt-1 truncate text-xs text-muted">
                              {thread.lastMessagePreview}
                            </p>
                          ) : null}
                        </div>

                        {onOpenOrderChat ? (
                          <button
                            className="cursor-pointer rounded-full border border-cocoa/25 bg-cream/50 px-3 py-1.5 text-xs font-medium text-espresso hover:border-espresso"
                            onClick={() => onOpenOrderChat(thread.orderCode ?? "", thread.id)}
                            type="button"
                          >
                            Buka Chat
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
