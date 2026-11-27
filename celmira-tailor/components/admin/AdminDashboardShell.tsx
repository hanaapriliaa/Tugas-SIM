"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminChatInbox } from "@/components/admin/AdminChatInbox";
import { AdminOrderManagement } from "@/components/admin/AdminOrderManagement";
import { ChatIcon, ReceiptIcon } from "@/components/ui/icons";
import { sanitizeOrderCodeParam } from "@/lib/chat";
import { fetchAdminThreads, type AdminIdentity } from "@/lib/chat-client";

type AdminTab = "orders" | "chat";

function AdminDashboardContent({
  admin,
  onLogout,
}: {
  admin: AdminIdentity;
  onLogout: () => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminTab>("orders");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [focusedChatOrderCode, setFocusedChatOrderCode] = useState<string | null>(null);
  const [focusedChatThreadId, setFocusedChatThreadId] = useState<string | null>(null);
  const [focusedManageOrderCode, setFocusedManageOrderCode] = useState<string | null>(null);

  const syncUnread = useCallback(async () => {
    try {
      const data = await fetchAdminThreads();
      setUnreadChatCount(data.totalUnreadForAdmin);
    } catch {
      // Abaikan kegagalan sementara
    }
  }, []);

  useEffect(() => {
    void syncUnread();

    const tabParam = searchParams.get("tab");
    const orderCodeParam = sanitizeOrderCodeParam(searchParams.get("orderCode"));

    if (tabParam === "chat") {
      setActiveTab("chat");
      if (orderCodeParam) {
        setFocusedChatOrderCode(orderCodeParam);
      }
    } else if (orderCodeParam) {
      setFocusedManageOrderCode(orderCodeParam);
    }
  }, [searchParams, syncUnread]);

  function handleOpenOrderChat(orderCode: string, threadId?: string) {
    setFocusedChatOrderCode(orderCode);
    setFocusedChatThreadId(threadId ?? null);
    setActiveTab("chat");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleOpenOrderDetail(orderCode: string) {
    setFocusedManageOrderCode(orderCode);
    setActiveTab("orders");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      {/* Navigasi Tab Dashboard Admin */}
      <nav aria-label="Menu Dashboard Admin" className="border-b border-cocoa/12 bg-cream/35">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              aria-current={activeTab === "orders" ? "page" : undefined}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
                activeTab === "orders"
                  ? "bg-espresso text-ivory"
                  : "border border-cocoa/20 bg-ivory text-espresso hover:border-cocoa"
              }`}
              onClick={() => setActiveTab("orders")}
              type="button"
            >
              <ReceiptIcon className="h-4 w-4" />
              Pesanan &amp; Invoice
            </button>

            <button
              aria-current={activeTab === "chat" ? "page" : undefined}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
                activeTab === "chat"
                  ? "bg-espresso text-ivory"
                  : "border border-cocoa/20 bg-ivory text-espresso hover:border-cocoa"
              }`}
              onClick={() => setActiveTab("chat")}
              type="button"
            >
              <ChatIcon className="h-4 w-4" />
              Chat Pelanggan
              {unreadChatCount > 0 ? (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-bold ${
                    activeTab === "chat" ? "bg-ivory text-espresso" : "bg-espresso text-ivory"
                  }`}
                >
                  {unreadChatCount}
                </span>
              ) : null}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="truncate">{admin.email}</span>
            <button
              className="cursor-pointer rounded-full border border-cocoa/25 bg-ivory px-3 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-espresso transition-colors hover:border-espresso"
              onClick={() => void onLogout()}
              type="button"
            >
              Keluar
            </button>
          </div>
        </div>
      </nav>

      {/* Mempertahankan kedua panel tetap mounted agar state form penawaran/verifikasi tidak reset saat pindah tab */}
      <div className={activeTab === "orders" ? "block" : "hidden"}>
        <AdminOrderManagement
          focusedOrderCode={focusedManageOrderCode}
          onOpenOrderChat={handleOpenOrderChat}
        />
      </div>

      <div className={`shell py-10 sm:py-14 ${activeTab === "chat" ? "block" : "hidden"}`}>
        <AdminChatInbox
          focusedOrderCode={focusedChatOrderCode}
          focusedThreadId={focusedChatThreadId}
          onOpenOrderDetail={handleOpenOrderDetail}
          onUnreadCountChange={setUnreadChatCount}
        />
      </div>
    </div>
  );
}

export function AdminDashboardShell() {
  return (
    <AdminAuthGate>
      {({ admin, onLogout }) => <AdminDashboardContent admin={admin} onLogout={onLogout} />}
    </AdminAuthGate>
  );
}
