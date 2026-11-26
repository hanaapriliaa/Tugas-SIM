"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { StatusBadge } from "@/components/track/StatusBadge";
import { buttonClass } from "@/components/ui/ButtonLink";
import {
  AlertCircleIcon,
  ArrowLeft,
  ArrowUpRight,
  ChatIcon,
  SearchIcon,
} from "@/components/ui/icons";
import {
  CHAT_SOURCE_LABELS,
  appendAdminMessage,
  buildOfficialWhatsappHref,
  createDefaultAdminChatConfig,
  filterAdminChatThreads,
  formatChatTime,
  getTotalUnreadForAdmin,
  markCustomerMessagesReadByAdmin,
  resolveThreadCustomerDisplay,
  type AdminChatFilter,
} from "@/lib/chat";
import { ORDER_STATUS_META, formatDateOnlyId } from "@/lib/order-tracking";
import {
  CHAT_UPDATED_EVENT,
  loadAdminChatConfig,
  loadChatThreads,
  loadSubmittedOrders,
  saveAdminChatConfig,
  upsertChatThread,
} from "@/lib/storage/tailor-store";
import type {
  AdminChatConfig,
  ChatMessageAttachment,
  ChatThread,
  SubmittedOrder,
} from "@/lib/types/tailor";

type AdminChatInboxProps = {
  focusedOrderCode?: string | null;
  onOpenOrderDetail?: (orderCode: string) => void;
};

export function AdminChatInbox({
  focusedOrderCode,
  onOpenOrderDetail,
}: AdminChatInboxProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [orders, setOrders] = useState<SubmittedOrder[]>([]);
  const [chatConfig, setChatConfig] = useState<AdminChatConfig>(createDefaultAdminChatConfig);
  const [hydrated, setHydrated] = useState(false);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AdminChatFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const [replyText, setReplyText] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<ChatMessageAttachment[]>([]);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Panel pengaturan identitas/status admin & WhatsApp resmi
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [adminNameInput, setAdminNameInput] = useState("");
  const [statusLabelInput, setStatusLabelInput] = useState("");
  const [availabilityNoteInput, setAvailabilityNoteInput] = useState("");
  const [whatsappInput, setWhatsappInput] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);

  const syncFromStore = () => {
    const loadedThreads = loadChatThreads();
    const loadedOrders = loadSubmittedOrders();
    const loadedConfig = loadAdminChatConfig();
    setThreads(loadedThreads);
    setOrders(loadedOrders);
    setChatConfig(loadedConfig);
    return { loadedThreads, loadedOrders, loadedConfig };
  };

  useEffect(() => {
    const { loadedThreads, loadedConfig } = syncFromStore();
    setAdminNameInput(loadedConfig.adminDisplayName);
    setStatusLabelInput(loadedConfig.statusLabel);
    setAvailabilityNoteInput(loadedConfig.availabilityNote);
    setWhatsappInput(loadedConfig.officialWhatsappNumber ?? "");

    if (loadedThreads.length > 0) {
      setSelectedThreadId(loadedThreads[0].id);
    }
    setHydrated(true);

    const onSync = () => {
      syncFromStore();
    };
    window.addEventListener("storage", onSync);
    window.addEventListener(CHAT_UPDATED_EVENT, onSync);
    return () => {
      window.removeEventListener("storage", onSync);
      window.removeEventListener(CHAT_UPDATED_EVENT, onSync);
    };
  }, []);

  // Jika diarahkan dari tombol "Buka Chat Pesanan" dengan kode pesanan tertentu
  useEffect(() => {
    if (!focusedOrderCode) return;
    const match = threads.find((item) => item.context.orderCode === focusedOrderCode);
    if (match) {
      handleSelectThread(match.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedOrderCode]);

  const filteredThreads = useMemo(
    () => filterAdminChatThreads(threads, { query: searchQuery, filter, orders }),
    [threads, searchQuery, filter, orders]
  );

  const selectedThread = useMemo(
    () => threads.find((item) => item.id === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );

  const selectedCustomerInfo = useMemo(() => {
    if (!selectedThread) return null;
    return resolveThreadCustomerDisplay(selectedThread, orders);
  }, [selectedThread, orders]);

  const totalUnread = useMemo(() => getTotalUnreadForAdmin(threads), [threads]);
  const activeCount = useMemo(
    () => threads.filter((item) => item.messages.length > 0).length,
    [threads]
  );

  function handleSelectThread(threadId: string) {
    setReplyError(null);
    setFeedback(null);
    setSelectedThreadId(threadId);
    setMobileView("thread");

    const target = threads.find((item) => item.id === threadId);
    if (!target) return;

    const marked = markCustomerMessagesReadByAdmin(target);
    if (marked !== target) {
      const updatedList = upsertChatThread(marked);
      setThreads(updatedList);
    }
  }

  function handleSendReply() {
    if (!selectedThread) return;
    setReplyError(null);
    setFeedback(null);

    const result = appendAdminMessage(selectedThread, {
      body: replyText,
      attachments: replyAttachments,
      senderName: chatConfig.adminDisplayName,
    });

    if (!result.ok) {
      setReplyError(result.error);
      return;
    }

    const updated = upsertChatThread(result.thread);
    setThreads(updated);
    setReplyText("");
    setReplyAttachments([]);
    setFeedback("Balasan admin berhasil disimpan pada percakapan lokal.");
  }

  function handleSaveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfigError(null);
    setFeedback(null);

    const trimmedWhatsapp = whatsappInput.trim();
    if (trimmedWhatsapp && !buildOfficialWhatsappHref(trimmedWhatsapp)) {
      setConfigError(
        "Nomor WhatsApp resmi tidak valid. Gunakan format Indonesia seperti 081234567890 atau kosongkan jika belum tersedia."
      );
      return;
    }

    const saved = saveAdminChatConfig({
      ...chatConfig,
      adminDisplayName: adminNameInput.trim() || "Tim Atelier Celmira",
      statusLabel: statusLabelInput.trim() || "Siap menerima pesan · Mode lokal",
      availabilityNote:
        availabilityNoteInput.trim() ||
        createDefaultAdminChatConfig().availabilityNote,
      officialWhatsappNumber: trimmedWhatsapp || undefined,
      updatedAt: new Date().toISOString(),
    });
    setChatConfig(saved);
    setShowConfigPanel(false);
    setFeedback("Pengaturan identitas & status chat admin disimpan.");
  }

  const filterTabs: Array<{ id: AdminChatFilter; label: string; count: number }> = [
    { id: "all", label: "Semua", count: threads.length },
    { id: "unread", label: "Belum Dibaca", count: totalUnread > 0 ? threads.filter((t) => t.unreadByAdmin > 0).length : 0 },
    { id: "active", label: "Aktif", count: activeCount },
  ];

  return (
    <div className="space-y-6">
      {/* Header Inbox Admin */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-cocoa">
              Komunikasi Pelanggan
            </p>
            <span className="rounded-full border border-cocoa/25 bg-cream px-3 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-cocoa">
              Stage 5B-1 · Mode Lokal
            </span>
          </div>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-espresso sm:text-4xl">
            Admin Chat Inbox
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Tinjau pesan, gambar referensi, dan konteks pesanan dari pelanggan pada browser ini,
            lalu kirim balasan resmi admin secara langsung.
          </p>
        </div>

        <button
          className={buttonClass("outline", "w-fit cursor-pointer")}
          onClick={() => setShowConfigPanel((prev) => !prev)}
          type="button"
        >
          {showConfigPanel ? "Tutup Pengaturan Chat" : "Pengaturan Identitas & Status Chat"}
        </button>
      </div>

      {/* Catatan Keterbatasan localStorage (Jujur) */}
      <div className="flex items-start gap-3 rounded-2xl border border-cocoa/18 bg-cream/60 p-4 text-xs leading-relaxed text-muted">
        <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
        <p>
          <strong className="font-semibold text-espresso">Keterbatasan Penyimpanan Lokal:</strong>{" "}
          Inbox ini membaca thread yang sama dengan halaman <code>/chat</code> pelanggan melalui{" "}
          <code>localStorage</code> pada browser dan perangkat yang sama (sinkron otomatis antar-tab).
          Belum tersedia backend atau sinkronisasi antarperangkat secara real-time sebelum Tahap 6.
        </p>
      </div>

      {/* Panel Pengaturan Chat Admin (Opsional) */}
      {showConfigPanel ? (
        <section className="rounded-[1.75rem] border border-cocoa/18 bg-cream/55 p-5 sm:p-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl text-espresso">
            Identitas Admin &amp; Alternatif WhatsApp Resmi
          </h3>
          <p className="mt-1 text-xs text-muted">
            Informasi ini tampil pada header halaman chat pelanggan dan panel floating chat.
          </p>

          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSaveConfig}>
            <div>
              <label
                className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                htmlFor="admin-chat-display-name"
              >
                Nama Tampilan Admin
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
                id="admin-chat-display-name"
                onChange={(e) => setAdminNameInput(e.target.value)}
                type="text"
                value={adminNameInput}
              />
            </div>

            <div>
              <label
                className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                htmlFor="admin-chat-status-label"
              >
                Status Layanan Admin
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
                id="admin-chat-status-label"
                onChange={(e) => setStatusLabelInput(e.target.value)}
                type="text"
                value={statusLabelInput}
              />
            </div>

            <div>
              <label
                className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                htmlFor="admin-chat-wa"
              >
                Nomor WhatsApp Resmi (Opsional)
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
                id="admin-chat-wa"
                onChange={(e) => setWhatsappInput(e.target.value)}
                placeholder="Kosongkan jika nomor resmi belum tersedia"
                type="text"
                value={whatsappInput}
              />
            </div>

            <div>
              <label
                className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                htmlFor="admin-chat-note"
              >
                Catatan Ketersediaan
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
                id="admin-chat-note"
                onChange={(e) => setAvailabilityNoteInput(e.target.value)}
                type="text"
                value={availabilityNoteInput}
              />
            </div>

            {configError ? (
              <p className="text-xs font-medium text-red-900 sm:col-span-2" role="alert">
                {configError}
              </p>
            ) : null}

            <div className="flex justify-end gap-2.5 sm:col-span-2">
              <button
                className={buttonClass("outline", "cursor-pointer")}
                onClick={() => setShowConfigPanel(false)}
                type="button"
              >
                Batal
              </button>
              <button className={buttonClass("solid", "cursor-pointer")} type="submit">
                Simpan Pengaturan Chat
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {feedback ? (
        <div
          className="rounded-2xl border border-cocoa/25 bg-cream/70 px-4 py-3 text-xs font-medium text-espresso"
          role="status"
        >
          {feedback}
        </div>
      ) : null}

      {/* Grid Utama Inbox: Daftar Thread + Detail Percakapan */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Inbox Daftar Percakapan */}
        <aside
          className={`min-w-0 rounded-[1.75rem] border border-cocoa/15 bg-cream/45 p-4 sm:p-5 lg:col-span-4 ${
            mobileView === "thread" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-cocoa/12 pb-3">
            <div>
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                Inbox Pelanggan
              </p>
              <h3 className="mt-0.5 font-[family-name:var(--font-display)] text-xl text-espresso">
                Daftar Percakapan
              </h3>
            </div>
            {totalUnread > 0 ? (
              <span className="rounded-full bg-espresso px-2.5 py-1 text-[0.625rem] font-semibold text-ivory">
                {totalUnread} belum dibaca
              </span>
            ) : null}
          </div>

          {/* Pencarian */}
          <div className="relative mt-3.5">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              aria-label="Cari nama pelanggan, nomor pesanan, atau isi pesan"
              className="w-full rounded-full border border-cocoa/20 bg-ivory py-2.5 pl-10 pr-4 text-xs text-espresso placeholder:text-muted/65 focus:border-espresso focus:outline-none"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, CT-..., atau pesan..."
              type="search"
              value={searchQuery}
            />
          </div>

          {/* Filter Semua / Belum Dibaca / Aktif */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {filterTabs.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  aria-pressed={active}
                  className={`cursor-pointer rounded-full px-3 py-1 text-[0.6875rem] font-medium transition-colors ${
                    active
                      ? "bg-espresso text-ivory"
                      : "border border-cocoa/15 bg-ivory text-muted hover:text-espresso"
                  }`}
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  type="button"
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>

          {/* List Percakapan */}
          <div className="mt-4 max-h-[34rem] space-y-2.5 overflow-y-auto pr-0.5">
            {!hydrated ? (
              <p className="py-6 text-center text-xs text-muted">Memuat percakapan...</p>
            ) : filteredThreads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-cocoa/20 bg-ivory/75 p-5 text-center text-xs leading-relaxed text-muted">
                <ChatIcon className="mx-auto h-5 w-5 text-cocoa/60" />
                <p className="mt-2 font-medium text-espresso">
                  {threads.length === 0
                    ? "Belum ada percakapan pelanggan."
                    : "Tidak ada percakapan yang cocok dengan filter."}
                </p>
                <p className="mt-1">
                  Pesan yang dikirim pelanggan melalui halaman <code>/chat</code> atau Floating Chat
                  pada browser ini akan otomatis muncul di sini.
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const { customerName, order } = resolveThreadCustomerDisplay(thread, orders);
                const lastMessage = thread.messages[thread.messages.length - 1];
                const previewText = lastMessage
                  ? lastMessage.body || `${lastMessage.attachments.length} gambar referensi`
                  : "Thread dibuat, belum ada pesan";
                const isSelected = thread.id === selectedThreadId;

                return (
                  <button
                    className={`flex w-full min-w-0 cursor-pointer flex-col gap-1.5 rounded-2xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? "border-espresso bg-ivory shadow-sm ring-1 ring-espresso/20"
                        : "border-cocoa/12 bg-ivory/75 hover:border-cocoa/40 hover:bg-ivory"
                    }`}
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    type="button"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-semibold text-espresso">
                        {customerName}
                      </span>
                      <span className="shrink-0 text-[0.625rem] text-muted">
                        {formatChatTime(thread.updatedAt)}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-cocoa/20 bg-cream/70 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-cocoa">
                        {thread.context.orderCode
                          ? thread.context.orderCode
                          : CHAT_SOURCE_LABELS[thread.source]}
                      </span>
                      {order ? (
                        <span className="min-w-0 truncate text-[0.625rem] text-muted">
                          {order.categoryName}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate font-[family-name:var(--font-display)] text-[0.95rem] text-espresso">
                        {thread.title}
                      </p>
                      {thread.unreadByAdmin > 0 ? (
                        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-espresso px-1.5 text-[0.625rem] font-semibold text-ivory">
                          {thread.unreadByAdmin}
                        </span>
                      ) : null}
                    </div>

                    <p className="w-full truncate text-xs text-muted">{previewText}</p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Kolom Kanan: Detail Percakapan & Balasan Admin */}
        <section
          aria-label="Detail percakapan admin"
          className={`flex min-h-[36rem] min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-cocoa/15 bg-ivory shadow-[0_24px_60px_-48px_rgba(59,43,37,0.35)] lg:col-span-8 ${
            mobileView === "list" ? "hidden lg:flex" : "flex"
          }`}
        >
          {!selectedThread ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-cocoa/20 bg-cream/60 text-cocoa">
                <ChatIcon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl text-espresso">
                Pilih percakapan pelanggan
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                Klik salah satu thread di daftar sebelah kiri untuk membaca detail pesan, melihat
                gambar referensi, dan mengirim balasan admin.
              </p>
            </div>
          ) : (
            <>
              {/* Header Thread */}
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cocoa/12 bg-ivory px-4 py-3.5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    aria-label="Kembali ke daftar inbox"
                    className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-cocoa/20 text-espresso lg:hidden"
                    onClick={() => setMobileView("list")}
                    type="button"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-[family-name:var(--font-display)] text-lg text-espresso sm:text-xl">
                        {selectedCustomerInfo?.customerName ?? "Pelanggan"}
                      </h3>
                      <span className="rounded-full border border-cocoa/20 bg-cream/70 px-2.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-cocoa">
                        {CHAT_SOURCE_LABELS[selectedThread.source]}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted">
                      Topik: {selectedThread.title}
                      {selectedCustomerInfo?.order?.customer.whatsapp
                        ? ` · WA: ${selectedCustomerInfo.order.customer.whatsapp}`
                        : ""}
                    </p>
                  </div>
                </div>

                {selectedThread.context.orderCode && onOpenOrderDetail ? (
                  <button
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-cocoa/25 bg-cream/60 px-3.5 py-1.5 text-xs font-medium text-espresso transition-colors hover:border-espresso"
                    onClick={() => onOpenOrderDetail(selectedThread.context.orderCode!)}
                    type="button"
                  >
                    Kelola Pesanan {selectedThread.context.orderCode}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </header>

              {/* Kartu Konteks Pesanan / Halaman Asal */}
              {selectedThread.context.orderCode ||
              selectedThread.context.designTitle ||
              selectedThread.context.measurementLabel ||
              selectedThread.context.categoryId ||
              selectedThread.source !== "general" ? (
                <div className="border-b border-cocoa/12 bg-cream/45 px-4 py-3 text-xs sm:px-6">
                  {selectedCustomerInfo?.order ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="font-medium text-espresso">
                          Pesanan {selectedCustomerInfo.order.orderCode} ·{" "}
                          {selectedCustomerInfo.order.designTitle}
                        </p>
                        <p className="text-muted">
                          {selectedCustomerInfo.order.categoryName} ·{" "}
                          {selectedCustomerInfo.order.specifications.fabric} (
                          {selectedCustomerInfo.order.specifications.colorName}) · Target{" "}
                          {formatDateOnlyId(selectedCustomerInfo.order.targetDate)}
                        </p>
                      </div>
                      <StatusBadge
                        label={ORDER_STATUS_META[selectedCustomerInfo.order.status].label}
                        tone={ORDER_STATUS_META[selectedCustomerInfo.order.status].tone}
                      />
                    </div>
                  ) : (
                    <p className="text-muted">
                      <strong className="font-medium text-espresso">Konteks asal:</strong>{" "}
                      {CHAT_SOURCE_LABELS[selectedThread.source]}
                      {selectedThread.context.orderCode
                        ? ` · Kode ${selectedThread.context.orderCode} (belum ditemukan di daftar pesanan lokal)`
                        : ""}
                      {selectedThread.context.designTitle
                        ? ` · Desain "${selectedThread.context.designTitle}"`
                        : ""}
                      {selectedThread.context.measurementLabel
                        ? ` · Profil "${selectedThread.context.measurementLabel}"`
                        : ""}
                    </p>
                  )}
                </div>
              ) : null}

              {/* Riwayat Percakapan (sudut pandang admin) */}
              <ChatMessageList
                emptyHint="Pelanggan belum mengirim pesan pada percakapan ini."
                messages={selectedThread.messages}
                viewerRole="admin"
              />

              {/* Composer Balasan Admin */}
              <ChatComposer
                attachments={replyAttachments}
                draftText={replyText}
                errorMessage={replyError}
                inputAriaLabel="Tulis balasan admin untuk pelanggan"
                onAddAttachments={(files) =>
                  setReplyAttachments((prev) => [...prev, ...files])
                }
                onChangeText={setReplyText}
                onRemoveAttachment={(id) =>
                  setReplyAttachments((prev) => prev.filter((item) => item.id !== id))
                }
                onSend={handleSendReply}
                onSetError={setReplyError}
                placeholder={`Balas sebagai ${chatConfig.adminDisplayName}...`}
                submitLabel="Kirim Balasan"
                uploadInputId="admin-chat-image-upload"
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
