"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatContextBanner } from "@/components/chat/ChatContextBanner";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatThreadList } from "@/components/chat/ChatThreadList";
import { ArrowLeft, ArrowUpRight, CloseIcon } from "@/components/ui/icons";
import { garmentCategories } from "@/lib/booking-options";
import {
  buildOfficialWhatsappHref,
  createDefaultAdminChatConfig,
  filterChatThreads,
  findMatchingContextThread,
  parseChatQueryParams,
  sanitizeOrderCodeParam,
} from "@/lib/chat";
import {
  createCustomerThreadApi,
  fetchCustomerThreads,
  generateClientMessageId,
  getLocalMigrationInfo,
  markCustomerThreadReadApi,
  migrateLocalChatToBackend,
  sendCustomerMessageApi,
  uploadChatAttachmentApi,
  type MigrationSummary,
} from "@/lib/chat-client";
import { startChatRealtime } from "@/lib/chat-realtime";
import {
  fetchCustomerOrdersApi,
  verifyTrackingOrderApi,
  type GuestCustomerContact,
} from "@/lib/orders-client";
import { site } from "@/lib/site";
import {
  isOrderVerifiedInSession,
  markOrderVerifiedInSession,
} from "@/lib/storage/tailor-store";
import { fetchMeasurementProfilesApi, fetchSavedDesignsApi } from "@/lib/studio-client";
import type {
  AdminChatConfig,
  ChatConnectionStatus,
  ChatMessageAttachment,
  ChatThread,
  ChatThreadContext,
  ChatThreadSource,
  GarmentCategoryId,
  SubmittedOrder,
} from "@/lib/types/tailor";

type PendingUpload = {
  id: string;
  file: File;
  previewUrl: string;
};

const CONNECTION_LABELS: Record<ChatConnectionStatus, string> = {
  connecting: "Menyambungkan...",
  realtime: "Real-time aktif",
  polling: "Sinkronisasi berkala",
  reconnecting: "Menyambung ulang...",
  offline: "Koneksi terputus",
};

export function CustomerChatWorkspace() {
  const searchParams = useSearchParams();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [orders, setOrders] = useState<SubmittedOrder[]>([]);
  const [customerContact, setCustomerContact] = useState<GuestCustomerContact | null>(null);
  const [chatConfig, setChatConfig] = useState<AdminChatConfig>(createDefaultAdminChatConfig);
  const [hydrated, setHydrated] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>("connecting");

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [pendingContext, setPendingContext] = useState<ChatThreadContext | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<ChatThreadSource | "all">("all");

  const [draftText, setDraftText] = useState("");
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [verifiedSessionTick, setVerifiedSessionTick] = useState(0);

  // Migrasi localStorage non-destruktif
  const [legacyInfo, setLegacyInfo] = useState(() => getLocalMigrationInfo());
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationFeedback, setMigrationFeedback] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Modal buat konsultasi baru
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTopicSource, setNewTopicSource] = useState<ChatThreadSource>("general");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newOrderCode, setNewOrderCode] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<GarmentCategoryId | "">("");

  const activeThreadIdRef = useRef<string | null>(null);
  const pendingClientMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  const syncFromServer = useCallback(async () => {
    try {
      const data = await fetchCustomerThreads();
      setThreads(data.threads);
      setChatConfig(data.config);
      setSessionReady(true);

      const openId = activeThreadIdRef.current;
      if (openId) {
        const current = data.threads.find((t) => t.id === openId);
        if (current && current.unreadByCustomer > 0) {
          const readRes = await markCustomerThreadReadApi(openId);
          setThreads((prev) => prev.map((t) => (t.id === openId ? readRes.thread : t)));
        }
      }
      return data.threads;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const [ordersRes, designsRes, profilesRes] = await Promise.all([
        fetchCustomerOrdersApi().catch(() => ({ orders: [] as SubmittedOrder[], customerContact: null })),
        fetchSavedDesignsApi().catch(() => ({ designs: [] })),
        fetchMeasurementProfilesApi().catch(() => ({ profiles: [] })),
      ]);
      if (!active) return;

      const initialOrders = ordersRes.orders;
      const designs = designsRes.designs;
      const profiles = profilesRes.profiles;

      setOrders(initialOrders);
      setCustomerContact(ordersRes.customerContact);
      setLegacyInfo(getLocalMigrationInfo());

      const loadedThreads = (await syncFromServer()) ?? [];
      if (!active) return;

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
          orderVerified: isOrderVerifiedInSession(queryContext.orderCode),
          categoryId:
            queryContext.categoryId ?? matchedDesign?.categoryId ?? matchedProfile?.categoryHint,
          designTitle: matchedDesign?.title,
          measurementLabel: matchedProfile?.label,
        };

        const existingMatch = findMatchingContextThread(loadedThreads, enrichedContext);
        if (existingMatch) {
          setActiveThreadId(existingMatch.id);
          setPendingContext(null);
          if (existingMatch.unreadByCustomer > 0) {
            void markCustomerThreadReadApi(existingMatch.id).then((res) => {
              if (!active) return;
              setThreads((prev) =>
                prev.map((t) => (t.id === existingMatch.id ? res.thread : t))
              );
            });
          }
        } else {
          setPendingContext(enrichedContext);
          setActiveThreadId(null);
        }
        setMobileView("thread");
      } else if (loadedThreads.length > 0) {
        const first = loadedThreads[0];
        setActiveThreadId(first.id);
        if (first.unreadByCustomer > 0) {
          void markCustomerThreadReadApi(first.id).then((res) => {
            if (!active) return;
            setThreads((prev) => prev.map((t) => (t.id === first.id ? res.thread : t)));
          });
        }
      }

      setHydrated(true);
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [searchParams, syncFromServer]);

  useEffect(() => {
    if (!sessionReady) return;
    return startChatRealtime({
      role: "customer",
      enabled: true,
      onStatusChange: setConnectionStatus,
      onEvent: () => {
        void syncFromServer();
      },
      onSyncNeeded: syncFromServer,
    });
  }, [sessionReady, syncFromServer]);

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
    return (
      Boolean(effectiveContext.orderVerified) ||
      isOrderVerifiedInSession(effectiveContext.orderCode)
    );
  }, [effectiveContext.orderCode, effectiveContext.orderVerified, verifiedSessionTick]);

  const officialWhatsappHref = useMemo(() => {
    const contextText = effectiveContext.orderCode
      ? `Halo Celmira, saya ingin menanyakan pesanan ${effectiveContext.orderCode}.`
      : "Halo Celmira, saya ingin berkonsultasi mengenai jahit custom.";
    return buildOfficialWhatsappHref(chatConfig.officialWhatsappNumber, contextText);
  }, [chatConfig.officialWhatsappNumber, effectiveContext.orderCode]);

  const composerAttachments: ChatMessageAttachment[] = useMemo(
    () =>
      pendingUploads.map((item) => ({
        id: item.id,
        name: item.file.name,
        size: item.file.size,
        mimeType: item.file.type,
        previewDataUrl: item.previewUrl,
      })),
    [pendingUploads]
  );

  async function handleSelectThread(threadId: string) {
    setActiveThreadId(threadId);
    setPendingContext(null);
    setComposerError(null);
    setMobileView("thread");

    const target = threads.find((item) => item.id === threadId);
    if (target && target.unreadByCustomer > 0) {
      try {
        const res = await markCustomerThreadReadApi(threadId);
        setThreads((prev) => prev.map((t) => (t.id === threadId ? res.thread : t)));
      } catch {
        // Akan disinkronkan saat refresh berikutnya
      }
    }
  }

  async function handleVerifyOrderFromBanner(orderCode: string, verifier: string) {
    try {
      const data = await verifyTrackingOrderApi(orderCode, verifier);
      markOrderVerifiedInSession(data.order.orderCode);
      setOrders((prev) => [
        data.order,
        ...prev.filter((item) => item.orderCode !== data.order.orderCode),
      ]);
      setCustomerContact({
        fullName: data.order.customer.fullName,
        whatsapp: data.order.customer.whatsapp,
        email: data.order.customer.email,
      });
      setVerifiedSessionTick((n) => n + 1);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Kombinasi nomor pesanan dan identitas verifikasi tidak cocok.",
      };
    }
  }

  function handleAddRawFiles(files: File[]) {
    const created: PendingUpload[] = files.map((file) => ({
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingUploads((prev) => [...prev, ...created]);
    pendingClientMsgIdRef.current = null;
  }

  function handleRemovePendingUpload(id: string) {
    setPendingUploads((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }

  async function handleSend() {
    if (isSending) return;
    setComposerError(null);

    if (!draftText.trim() && pendingUploads.length === 0) {
      setComposerError("Tulis pesan atau lampirkan minimal 1 gambar referensi sebelum mengirim.");
      return;
    }

    setIsSending(true);
    try {
      let threadId = activeThread?.id;
      if (!threadId) {
        const ctx: ChatThreadContext = {
          ...(pendingContext ?? { source: "general" }),
          orderVerified: isOrderVerified,
        };
        const created = await createCustomerThreadApi({
          context: ctx,
          customerName: matchedOrder?.customer.fullName || customerContact?.fullName || undefined,
        });
        threadId = created.thread.id;
        setActiveThreadId(threadId);
        setPendingContext(null);
      }

      const uploadedIds: string[] = [];
      for (const item of pendingUploads) {
        const uploaded = await uploadChatAttachmentApi(threadId, item.file, "customer");
        uploadedIds.push(uploaded.id);
      }

      const clientMessageId = pendingClientMsgIdRef.current ?? generateClientMessageId();
      pendingClientMsgIdRef.current = clientMessageId;

      const sent = await sendCustomerMessageApi(threadId, {
        body: draftText,
        senderName: matchedOrder?.customer.fullName || customerContact?.fullName || "Anda",
        clientMessageId,
        attachmentIds: uploadedIds,
      });

      pendingClientMsgIdRef.current = null;
      for (const item of pendingUploads) {
        URL.revokeObjectURL(item.previewUrl);
      }
      setPendingUploads([]);
      setDraftText("");
      setActiveThreadId(sent.thread.id);
      setThreads((prev) => [sent.thread, ...prev.filter((t) => t.id !== sent.thread.id)]);
      setMobileView("thread");
    } catch (err) {
      setComposerError(
        err instanceof Error
          ? err.message
          : "Gagal mengirim pesan ke server. Tekan Kirim lagi untuk mencoba ulang tanpa duplikasi."
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateNewConsultation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeOrderCode =
      newTopicSource === "track" ? sanitizeOrderCodeParam(newOrderCode) : undefined;

    const context: ChatThreadContext = {
      source: newTopicSource,
      orderCode: safeOrderCode,
      orderVerified: isOrderVerifiedInSession(safeOrderCode),
      categoryId: newCategoryId || undefined,
    };

    const existing = findMatchingContextThread(threads, context);
    if (existing && (safeOrderCode || newTopicTitle.trim() === "")) {
      await handleSelectThread(existing.id);
      setIsNewModalOpen(false);
      return;
    }

    try {
      const { thread } = await createCustomerThreadApi({
        title: newTopicTitle.trim() || undefined,
        context,
      });
      setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
      setActiveThreadId(thread.id);
      setPendingContext(null);
      setNewTopicTitle("");
      setNewOrderCode("");
      setNewCategoryId("");
      setIsNewModalOpen(false);
      setMobileView("thread");
    } catch (err) {
      setComposerError(err instanceof Error ? err.message : "Gagal membuat percakapan baru.");
    }
  }

  async function handleMigrateLegacy() {
    setIsMigrating(true);
    setMigrationError(null);
    setMigrationFeedback(null);
    try {
      const summary: MigrationSummary = await migrateLocalChatToBackend();
      setLegacyInfo(getLocalMigrationInfo());
      setMigrationFeedback(
        `Migrasi terverifikasi: ${summary.migratedThreads} percakapan baru (${summary.skippedThreads} sudah ada), ${summary.migratedMessages} pesan baru (${summary.skippedMessages} dilewati duplikat), ${summary.uploadedAttachments} gambar diunggah ke R2. Arsip lokal tetap dipertahankan.`
      );
      await syncFromServer();
    } catch (err) {
      setMigrationError(
        err instanceof Error ? err.message : "Migrasi data lokal gagal. Data lokal Anda tetap aman."
      );
    } finally {
      setIsMigrating(false);
    }
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
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="eyebrow">Ruang Konsultasi</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cocoa/25 bg-cream/70 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-cocoa">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connectionStatus === "realtime"
                    ? "bg-emerald-700"
                    : connectionStatus === "offline"
                      ? "bg-rose"
                      : "bg-cocoa"
                }`}
              />
              {CONNECTION_LABELS[connectionStatus]}
            </span>
          </div>
          <h1 className="text-balance text-[2.1rem] leading-[1.1] text-espresso sm:text-[2.75rem]">
            Diskusi desain, ukuran, dan pesanan Anda.
          </h1>
          <p className="text-sm leading-relaxed text-muted sm:text-[0.95rem]">
            Sampaikan pertanyaan atau lampirkan foto referensi busana. Percakapan tersimpan aman di
            server dan tersinkron langsung dengan Admin Chat Inbox Celmira Tailor.
          </p>
        </div>

        {/* Status Alternatif WhatsApp Resmi */}
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

      {/* Banner Migrasi Data localStorage Lama (Non-Destruktif) */}
      {legacyInfo.legacyThreadCount > 0 && !legacyInfo.alreadyVerified ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-cocoa/20 bg-cream/70 p-4 text-xs leading-relaxed sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted">
            <p className="font-semibold text-espresso">
              Ditemukan {legacyInfo.legacyThreadCount} percakapan lokal ({legacyInfo.legacyMessageCount}{" "}
              pesan) dari tahap sebelumnya
            </p>
            <p className="mt-0.5">
              Anda dapat memigrasikannya ke backend server tanpa duplikasi. Arsip lokal tidak akan
              dihapus otomatis.
            </p>
          </div>
          <button
            className="w-fit shrink-0 cursor-pointer rounded-full bg-espresso px-4 py-2 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-cocoa disabled:opacity-60"
            disabled={isMigrating}
            onClick={() => void handleMigrateLegacy()}
            type="button"
          >
            {isMigrating ? "Memigrasikan..." : "Migrasikan ke Server"}
          </button>
        </div>
      ) : null}

      {migrationFeedback ? (
        <div
          className="mb-6 rounded-2xl border border-cocoa/25 bg-cream/75 px-4 py-3 text-xs font-medium text-espresso"
          role="status"
        >
          {migrationFeedback}
        </div>
      ) : null}

      {migrationError ? (
        <div
          className="mb-6 rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-xs font-medium text-espresso"
          role="alert"
        >
          {migrationError}
        </div>
      ) : null}

      {/* Workspace 2 Kolom (Desktop) / Switchable (Mobile) */}
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Kolom Kiri: Daftar Percakapan */}
        <div className={`min-w-0 ${mobileView === "thread" ? "hidden lg:block" : "block"}`}>
          <ChatThreadList
            activeThreadId={activeThreadId}
            onChangeSearch={setSearchQuery}
            onChangeSourceFilter={setSourceFilter}
            onOpenNewThreadModal={() => openNewModal("general")}
            onSelectThread={(id) => void handleSelectThread(id)}
            searchQuery={searchQuery}
            sourceFilter={sourceFilter}
            threads={filteredThreads}
          />
        </div>

        {/* Kolom Kanan: Ruang Percakapan atau Empty State */}
        <section
          aria-label="Area percakapan pelanggan"
          className={`flex min-h-[34rem] min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-cocoa/15 bg-ivory shadow-[0_24px_60px_-48px_rgba(59,43,37,0.4)] ${
            mobileView === "list" ? "hidden lg:flex" : "flex"
          }`}
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
                onSelectQuickPrompt={(prompt) => {
                  setDraftText((prev) => (prev.trim() ? `${prev.trim()} ${prompt}` : prompt));
                  pendingClientMsgIdRef.current = null;
                }}
                onVerifyOrder={handleVerifyOrderFromBanner}
              />

              {/* Daftar Pesan */}
              <ChatMessageList
                emptyHint={
                  effectiveContext.orderCode
                    ? `Siap mengirim pertanyaan untuk pesanan ${effectiveContext.orderCode}. Pesan Anda langsung tersimpan di server dan masuk ke Admin Chat Inbox.`
                    : "Tulis pertanyaan Anda atau lampirkan foto referensi desain di bawah ini. Pesan akan langsung masuk ke tim Celmira."
                }
                messages={activeThread?.messages ?? []}
              />

              {/* Input & Upload Gambar ke R2 */}
              <ChatComposer
                attachments={composerAttachments}
                draftText={draftText}
                errorMessage={composerError}
                isSending={isSending}
                onAddRawFiles={handleAddRawFiles}
                onChangeText={(value) => {
                  setDraftText(value);
                  pendingClientMsgIdRef.current = null;
                }}
                onRemoveAttachment={handleRemovePendingUpload}
                onSend={() => void handleSend()}
                onSetError={setComposerError}
              />
            </>
          )}
        </section>
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
