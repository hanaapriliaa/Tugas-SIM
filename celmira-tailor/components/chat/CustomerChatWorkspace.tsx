"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatContextBanner } from "@/components/chat/ChatContextBanner";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatThreadList } from "@/components/chat/ChatThreadList";
import {
  ArrowLeft,
  ArrowUpRight,
  CloseIcon,
} from "@/components/ui/icons";
import { garmentCategories } from "@/lib/booking-options";
import {
  appendCustomerMessage,
  buildOfficialWhatsappHref,
  createChatThread,
  createDefaultAdminChatConfig,
  filterChatThreads,
  findMatchingContextThread,
  markThreadReadByCustomer,
  parseChatQueryParams,
  sanitizeOrderCodeParam,
  upsertChatThreadInList,
} from "@/lib/chat";
import { verifyOrderTrackingAccess } from "@/lib/order-tracking";
import { site } from "@/lib/site";
import {
  CHAT_UPDATED_EVENT,
  isOrderVerifiedInSession,
  loadAdminChatConfig,
  loadChatThreads,
  loadMeasurementProfiles,
  loadSavedDesigns,
  loadSubmittedOrders,
  markOrderVerifiedInSession,
  saveChatThreads,
  upsertChatThread,
} from "@/lib/storage/tailor-store";
import type {
  AdminChatConfig,
  ChatMessageAttachment,
  ChatThread,
  ChatThreadContext,
  ChatThreadSource,
  GarmentCategoryId,
  SubmittedOrder,
} from "@/lib/types/tailor";

export function CustomerChatWorkspace() {
  const searchParams = useSearchParams();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [orders, setOrders] = useState<SubmittedOrder[]>([]);
  const [chatConfig, setChatConfig] = useState<AdminChatConfig>(createDefaultAdminChatConfig);
  const [hydrated, setHydrated] = useState(false);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [pendingContext, setPendingContext] = useState<ChatThreadContext | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<ChatThreadSource | "all">("all");

  const [draftText, setDraftText] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<ChatMessageAttachment[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);

  const [verifiedSessionTick, setVerifiedSessionTick] = useState(0);

  // Modal buat konsultasi baru
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTopicSource, setNewTopicSource] = useState<ChatThreadSource>("general");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newOrderCode, setNewOrderCode] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<GarmentCategoryId | "">("");

  useEffect(() => {
    const syncAll = () => {
      setThreads(loadChatThreads());
      setOrders(loadSubmittedOrders());
      setChatConfig(loadAdminChatConfig());
    };

    const initialThreads = loadChatThreads();
    const initialOrders = loadSubmittedOrders();
    const designs = loadSavedDesigns();
    const profiles = loadMeasurementProfiles();
    setThreads(initialThreads);
    setOrders(initialOrders);
    setChatConfig(loadAdminChatConfig());

    const queryContext = parseChatQueryParams(searchParams);
    const hasQueryContext =
      queryContext.source !== "general" ||
      Boolean(queryContext.orderCode) ||
      Boolean(queryContext.categoryId) ||
      Boolean(queryContext.designId) ||
      Boolean(queryContext.measurementProfileId) ||
      Boolean(queryContext.templateId);

    if (hasQueryContext) {
      const matchedDesign = queryContext.designId
        ? designs.find((item) => item.id === queryContext.designId)
        : undefined;
      const matchedProfile = queryContext.measurementProfileId
        ? profiles.find((item) => item.id === queryContext.measurementProfileId)
        : undefined;

      const enrichedContext: ChatThreadContext = {
        ...queryContext,
        categoryId: queryContext.categoryId ?? matchedDesign?.categoryId ?? matchedProfile?.categoryHint,
        designTitle: matchedDesign?.title,
        measurementLabel: matchedProfile?.label,
      };

      const existingMatch = findMatchingContextThread(initialThreads, enrichedContext);
      if (existingMatch) {
        const readThread = markThreadReadByCustomer(existingMatch);
        if (readThread !== existingMatch) {
          saveChatThreads(upsertChatThreadInList(initialThreads, readThread));
          setThreads(loadChatThreads());
        }
        setActiveThreadId(existingMatch.id);
        setPendingContext(null);
      } else {
        setPendingContext(enrichedContext);
        setActiveThreadId(null);
      }
      setMobileView("thread");
    } else if (initialThreads.length > 0) {
      const first = initialThreads[0];
      const readThread = markThreadReadByCustomer(first);
      if (readThread !== first) {
        saveChatThreads(upsertChatThreadInList(initialThreads, readThread));
        setThreads(loadChatThreads());
      }
      setActiveThreadId(first.id);
    }

    setHydrated(true);

    const onUpdate = () => syncAll();
    window.addEventListener("storage", onUpdate);
    window.addEventListener(CHAT_UPDATED_EVENT, onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener(CHAT_UPDATED_EVENT, onUpdate);
    };
  }, [searchParams]);

  const filteredThreads = useMemo(
    () => filterChatThreads(threads, searchQuery, sourceFilter),
    [threads, searchQuery, sourceFilter]
  );

  const activeThread = useMemo(
    () => threads.find((item) => item.id === activeThreadId) ?? null,
    [threads, activeThreadId]
  );

  const effectiveContext: ChatThreadContext = activeThread?.context ??
    pendingContext ?? { source: "general" };

  const matchedOrder = useMemo(() => {
    if (!effectiveContext.orderCode) return null;
    return orders.find((item) => item.orderCode === effectiveContext.orderCode) ?? null;
  }, [orders, effectiveContext.orderCode]);

  const isOrderVerified = useMemo(() => {
    void verifiedSessionTick;
    return isOrderVerifiedInSession(effectiveContext.orderCode);
  }, [effectiveContext.orderCode, verifiedSessionTick]);

  const officialWhatsappHref = useMemo(() => {
    const contextText = effectiveContext.orderCode
      ? `Halo Celmira, saya ingin menanyakan pesanan ${effectiveContext.orderCode}.`
      : "Halo Celmira, saya ingin berkonsultasi mengenai jahit custom.";
    return buildOfficialWhatsappHref(chatConfig.officialWhatsappNumber, contextText);
  }, [chatConfig.officialWhatsappNumber, effectiveContext.orderCode]);

  function handleSelectThread(threadId: string) {
    const target = threads.find((item) => item.id === threadId);
    if (!target) return;

    const marked = markThreadReadByCustomer(target);
    if (marked !== target) {
      upsertChatThread(marked);
      setThreads(loadChatThreads());
    }
    setActiveThreadId(threadId);
    setPendingContext(null);
    setComposerError(null);
    setMobileView("thread");
  }

  function handleVerifyOrderFromBanner(orderCode: string, verifier: string) {
    const result = verifyOrderTrackingAccess(orders, orderCode, verifier);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    markOrderVerifiedInSession(result.order.orderCode);
    setVerifiedSessionTick((n) => n + 1);
    return { ok: true };
  }

  function handleSend() {
    setComposerError(null);

    let targetThread = activeThread;
    if (!targetThread) {
      targetThread = createChatThread({
        context: pendingContext ?? { source: "general" },
      });
    }

    const result = appendCustomerMessage(targetThread, {
      body: draftText,
      attachments: draftAttachments,
      senderName: "Anda",
    });

    if (!result.ok) {
      setComposerError(result.error);
      return;
    }

    const nextThreads = upsertChatThread(result.thread);
    setThreads(nextThreads);
    setActiveThreadId(result.thread.id);
    setPendingContext(null);
    setDraftText("");
    setDraftAttachments([]);
    setMobileView("thread");
  }

  function handleCreateNewConsultation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeOrderCode =
      newTopicSource === "track" ? sanitizeOrderCodeParam(newOrderCode) : undefined;

    const context: ChatThreadContext = {
      source: newTopicSource,
      orderCode: safeOrderCode,
      categoryId: newCategoryId || undefined,
    };

    const existing = findMatchingContextThread(threads, context);
    if (existing && (safeOrderCode || newTopicTitle.trim() === "")) {
      handleSelectThread(existing.id);
      setIsNewModalOpen(false);
      return;
    }

    const created = createChatThread({
      title: newTopicTitle.trim() || undefined,
      context,
    });
    const next = upsertChatThread(created);
    setThreads(next);
    setActiveThreadId(created.id);
    setPendingContext(null);
    setNewTopicTitle("");
    setNewOrderCode("");
    setNewCategoryId("");
    setIsNewModalOpen(false);
    setMobileView("thread");
  }

  function openNewModal(defaultSource: ChatThreadSource = "general") {
    setNewTopicSource(defaultSource);
    setIsNewModalOpen(true);
  }

  const showConversationArea = Boolean(activeThread) || Boolean(pendingContext);

  return (
    <div className="shell py-10 sm:py-14">
      {/* Header Halaman Chat */}
      <div className="flex flex-col gap-4 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">Ruang Konsultasi</p>
            <span className="rounded-full border border-cocoa/25 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cocoa">
              Tahap 5A · Chat Pelanggan
            </span>
          </div>
          <h1 className="text-balance text-[2.1rem] leading-[1.1] text-espresso sm:text-[2.75rem]">
            Diskusi desain, ukuran, dan pesanan Anda.
          </h1>
          <p className="text-sm leading-relaxed text-muted sm:text-[0.95rem]">
            Sampaikan pertanyaan atau lampirkan foto referensi busana. Seluruh percakapan tersimpan
            di perangkat ini hingga integrasi backend tersedia.
          </p>
        </div>

        {/* Status Alternatif WhatsApp Resmi (Jujur) */}
        <div className="rounded-2xl border border-cocoa/15 bg-cream/55 px-4 py-3 text-xs leading-relaxed">
          {officialWhatsappHref ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted">Butuh kanal alternatif?</span>
              <a
                className="inline-flex items-center gap-1.5 rounded-full bg-espresso px-3.5 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-cocoa"
                href={officialWhatsappHref}
                rel="noreferrer"
                target="_blank"
              >
                WhatsApp Resmi
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-muted">
              <span>Alternatif WhatsApp resmi akan aktif setelah nomor terverifikasi tersedia.</span>
              <a
                className="inline-flex items-center gap-1 font-medium text-espresso underline underline-offset-4 hover:text-cocoa"
                href={site.tailorUrl}
                rel="noreferrer"
                target="_blank"
              >
                Info resmi Celmira
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Workspace 2 Kolom (Desktop) / Switchable (Mobile) */}
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Kolom Kiri: Daftar Percakapan */}
        <div className={mobileView === "thread" ? "hidden lg:block" : "block"}>
          <ChatThreadList
            activeThreadId={activeThreadId}
            onChangeSearch={setSearchQuery}
            onChangeSourceFilter={setSourceFilter}
            onOpenNewThreadModal={() => openNewModal("general")}
            onSelectThread={handleSelectThread}
            searchQuery={searchQuery}
            sourceFilter={sourceFilter}
            threads={filteredThreads}
          />
        </div>

        {/* Kolom Kanan: Ruang Percakapan atau Empty State */}
        <section
          aria-label="Area percakapan pelanggan"
          className={`flex min-h-[34rem] flex-col overflow-hidden rounded-[1.75rem] border border-cocoa/15 bg-ivory shadow-[0_24px_60px_-48px_rgba(59,43,37,0.4)] ${
            mobileView === "list" && !showConversationArea ? "hidden lg:flex" : ""
          } ${mobileView === "list" && showConversationArea ? "hidden lg:flex" : "flex"}`}
        >
          {!hydrated ? (
            <div className="flex flex-1 items-center justify-center p-10">
              <p className="text-sm text-muted">Memuat ruang percakapan Celmira Tailor...</p>
            </div>
          ) : !showConversationArea ? (
            <ChatEmptyState
              hasLocalOrders={orders.length > 0}
              onStartNewConsultation={() => openNewModal("general")}
              onStartOrderConsultation={() => openNewModal("track")}
            />
          ) : (
            <>
              {/* Header Identitas & Status Admin */}
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cocoa/12 bg-ivory px-4 py-3.5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    aria-label="Kembali ke daftar percakapan"
                    className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-cocoa/20 text-espresso lg:hidden"
                    onClick={() => setMobileView("list")}
                    type="button"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-espresso font-[family-name:var(--font-display)] text-base text-ivory"
                  >
                    C
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-[family-name:var(--font-display)] text-lg text-espresso">
                        {activeThread?.title ?? chatConfig.adminDisplayName}
                      </h2>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-cocoa/20 bg-cream/65 px-2.5 py-0.5 text-[0.625rem] font-medium text-cocoa">
                        <span className="h-1.5 w-1.5 rounded-full bg-cocoa" />
                        {chatConfig.statusLabel}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted">
                      {chatConfig.adminDisplayName} · {chatConfig.availabilityNote}
                    </p>
                  </div>
                </div>
              </header>

              {/* Banner Konteks Pesanan / Studio + Quick Prompts */}
              <ChatContextBanner
                context={effectiveContext}
                isOrderVerified={isOrderVerified}
                matchedOrder={matchedOrder}
                onSelectQuickPrompt={(prompt) =>
                  setDraftText((prev) => (prev.trim() ? `${prev.trim()} ${prompt}` : prompt))
                }
                onVerifyOrder={handleVerifyOrderFromBanner}
              />

              {/* Daftar Pesan */}
              <ChatMessageList
                emptyHint={
                  effectiveContext.orderCode
                    ? `Siap mengirim pertanyaan untuk pesanan ${effectiveContext.orderCode}. Pesan Anda akan berstatus "Terkirim" dan menunggu balasan admin pada Tahap 5B.`
                    : undefined
                }
                messages={activeThread?.messages ?? []}
              />

              {/* Input & Upload Gambar */}
              <ChatComposer
                attachments={draftAttachments}
                draftText={draftText}
                errorMessage={composerError}
                onAddAttachments={(files) =>
                  setDraftAttachments((prev) => [...prev, ...files])
                }
                onChangeText={setDraftText}
                onRemoveAttachment={(id) =>
                  setDraftAttachments((prev) => prev.filter((item) => item.id !== id))
                }
                onSend={handleSend}
                onSetError={setComposerError}
              />
            </>
          )}
        </section>
      </div>

      {/* Catatan Jujur Penyimpanan Lokal */}
      <div className="mt-8 rounded-[1.5rem] border border-cocoa/15 bg-cream/40 p-4 text-xs leading-relaxed text-muted sm:p-5">
        <strong className="font-semibold text-espresso">Catatan Mode Penyimpanan Lokal:</strong>{" "}
        Percakapan chat pelanggan pada tahap ini disimpan di browser perangkat Anda (
        <code>localStorage</code>) dan belum tersinkron dengan server, perangkat lain, maupun
        balasan admin otomatis. Fitur balasan admin di dashboard akan dibangun pada Tahap 5B dan
        integrasi backend PostgreSQL pada Tahap 6.
      </div>

      {/* Modal Mulai Konsultasi Baru */}
      {isNewModalOpen ? (
        <div
          aria-labelledby="new-chat-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/45 p-4 backdrop-blur-sm"
          onClick={() => setIsNewModalOpen(false)}
          role="dialog"
        >
          <div
            className="w-full max-w-md rounded-[1.75rem] border border-cocoa/20 bg-ivory p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-cocoa/12 pb-3.5">
              <div>
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                  Konsultasi Baru
                </p>
                <h2
                  className="mt-1 font-[family-name:var(--font-display)] text-xl text-espresso"
                  id="new-chat-title"
                >
                  Pilih topik diskusi
                </h2>
              </div>
              <button
                aria-label="Tutup dialog"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-cocoa/20 text-muted hover:text-espresso"
                onClick={() => setIsNewModalOpen(false)}
                type="button"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-4 flex flex-col gap-4" onSubmit={handleCreateNewConsultation}>
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-cocoa"
                  htmlFor="new-chat-source"
                >
                  Topik
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
                  id="new-chat-source"
                  onChange={(e) => setNewTopicSource(e.target.value as ChatThreadSource)}
                  value={newTopicSource}
                >
                  <option value="general">Konsultasi Umum (Model / Bahan / Cara Pesan)</option>
                  <option value="track">Terkait Pesanan (Nomor CT-...)</option>
                  <option value="design-studio">Diskusi Design Studio</option>
                  <option value="measurement-studio">Diskusi Measurement Studio</option>
                  <option value="orders">Persiapan Pemesanan</option>
                </select>
              </div>

              {newTopicSource === "track" ? (
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-cocoa"
                    htmlFor="new-chat-order-code"
                  >
                    Nomor Pesanan (Opsional)
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 font-mono text-sm uppercase text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
                    id="new-chat-order-code"
                    onChange={(e) => setNewOrderCode(e.target.value)}
                    placeholder="CT-20261126-XXXX"
                    type="text"
                    value={newOrderCode}
                  />
                  {orders.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {orders.slice(0, 4).map((order) => (
                        <button
                          className="cursor-pointer rounded-full border border-cocoa/20 bg-cream/60 px-2.5 py-1 font-mono text-[0.6875rem] text-espresso hover:border-espresso"
                          key={order.id}
                          onClick={() => setNewOrderCode(order.orderCode)}
                          type="button"
                        >
                          {order.orderCode}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-cocoa"
                    htmlFor="new-chat-category"
                  >
                    Kategori Busana (Opsional)
                  </label>
                  <select
                    className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
                    id="new-chat-category"
                    onChange={(e) => setNewCategoryId(e.target.value as GarmentCategoryId | "")}
                    value={newCategoryId}
                  >
                    <option value="">Pilih kategori jika ada</option>
                    {garmentCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-cocoa"
                  htmlFor="new-chat-title-input"
                >
                  Judul Singkat (Opsional)
                </label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
                  id="new-chat-title-input"
                  maxLength={80}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="Contoh: Konsultasi kebaya akad & bahan brokat"
                  type="text"
                  value={newTopicTitle}
                />
              </div>

              <div className="mt-2 flex justify-end gap-2.5">
                <button
                  className="cursor-pointer rounded-full border border-cocoa/25 px-4 py-2 text-xs font-medium text-espresso hover:border-espresso"
                  onClick={() => setIsNewModalOpen(false)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="cursor-pointer rounded-full bg-espresso px-5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-ivory hover:bg-cocoa"
                  type="submit"
                >
                  Buka Percakapan
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
