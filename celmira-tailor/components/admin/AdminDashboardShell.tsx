"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminChatInbox } from "@/components/admin/AdminChatInbox";
import { AdminOrderManagement } from "@/components/admin/AdminOrderManagement";
import { ChatIcon, ReceiptIcon } from "@/components/ui/icons";
import { getTotalUnreadForAdmin, sanitizeOrderCodeParam } from "@/lib/chat";
import {
  CHAT_UPDATED_EVENT,
  loadChatThreads,
} from "@/lib/storage/tailor-store";

type AdminTab = "orders" | "chat";

export function AdminDashboardShell() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminTab>("orders");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [focusedChatOrderCode, setFocusedChatOrderCode] = useState<string | null>(null);
  const [focusedManageOrderCode, setFocusedManageOrderCode] = useState<string | null>(null);

  useEffect(() => {
    const syncUnread = () => {
      setUnreadChatCount(getTotalUnreadForAdmin(loadChatThreads()));
    };
    syncUnread();

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

    window.addEventListener("storage", syncUnread);
    window.addEventListener(CHAT_UPDATED_EVENT, syncUnread);
    return () => {
      window.removeEventListener("storage", syncUnread);
      window.removeEventListener(CHAT_UPDATED_EVENT, syncUnread);
    };
  }, [searchParams]);

  function handleOpenOrderChat(orderCode: string) {
    setFocusedChatOrderCode(orderCode);
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
        <div className="shell flex flex-wrap items-center gap-2.5 py-3.5">
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
          onOpenOrderDetail={handleOpenOrderDetail}
        />
      </div>
    </div>
  );
}
