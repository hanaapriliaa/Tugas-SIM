"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminChatInbox } from "@/components/admin/AdminChatInbox";
import { AdminCustomerManagement } from "@/components/admin/AdminCustomerManagement";
import { AdminOrderManagement } from "@/components/admin/AdminOrderManagement";
import { AdminProductionSchedule } from "@/components/admin/AdminProductionSchedule";
import { AdminTemplateManager } from "@/components/admin/AdminTemplateManager";
import {
  CalendarIcon,
  ChatIcon,
  ReceiptIcon,
  SlidersIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { sanitizeOrderCodeParam } from "@/lib/chat";
import { fetchAdminThreads, type AdminIdentity } from "@/lib/chat-client";

type AdminTab = "orders" | "chat" | "schedule" | "customers" | "templates";

function parseAdminTabParam(raw: string | null): AdminTab | null {
  if (
    raw === "orders" ||
    raw === "chat" ||
    raw === "schedule" ||
    raw === "customers" ||
    raw === "templates"
  ) {
    return raw;
  }
  return null;
}

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

    const parsedTab = parseAdminTabParam(searchParams.get("tab"));
    const orderCodeParam = sanitizeOrderCodeParam(searchParams.get("orderCode"));

    if (parsedTab) {
      setActiveTab(parsedTab);
      if (parsedTab === "chat" && orderCodeParam) {
        setFocusedChatOrderCode(orderCodeParam);
      } else if (parsedTab === "orders" && orderCodeParam) {
        setFocusedManageOrderCode(orderCodeParam);
      }
    } else if (orderCodeParam) {
      setFocusedManageOrderCode(orderCodeParam);
    }
  }, [searchParams, syncUnread]);

  function handleOpenOrderChat(orderCode: string, threadId?: string) {
    setFocusedChatOrderCode(orderCode || null);
    setFocusedChatThreadId(threadId ?? null);
    setActiveTab("chat");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleOpenOrderDetail(orderCode: string) {
    setFocusedManageOrderCode(orderCode);
    setActiveTab("orders");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: "orders" | "chat" | "schedule" | "customers" | "templates";
    badge?: number;
  }> = [
    { id: "orders", label: "Pesanan & Invoice", icon: "orders" },
    { id: "chat", label: "Chat Pelanggan", icon: "chat", badge: unreadChatCount },
    { id: "schedule", label: "Jadwal & Kapasitas", icon: "schedule" },
    { id: "customers", label: "Pelanggan", icon: "customers" },
    { id: "templates", label: "Template & Kategori", icon: "templates" },
  ];

  function renderIcon(kind: (typeof navItems)[number]["icon"]) {
    switch (kind) {
      case "orders":
        return <ReceiptIcon className="h-4 w-4" />;
      case "chat":
        return <ChatIcon className="h-4 w-4" />;
      case "schedule":
        return <CalendarIcon className="h-4 w-4" />;
      case "customers":
        return <UsersIcon className="h-4 w-4" />;
      case "templates":
        return <SlidersIcon className="h-4 w-4" />;
    }
  }

  return (
    <div>
      {/* Navigasi Tab Dashboard Admin */}
      <nav aria-label="Menu Dashboard Admin" className="border-b border-cocoa/12 bg-cream/35">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
                    isActive
                      ? "bg-espresso text-ivory"
                      : "border border-cocoa/20 bg-ivory text-espresso hover:border-cocoa"
                  }`}
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  type="button"
                >
                  {renderIcon(item.icon)}
                  {item.label}
                  {item.badge && item.badge > 0 ? (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-bold ${
                        isActive ? "bg-ivory text-espresso" : "bg-espresso text-ivory"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
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

      {/* Mempertahankan panel pesanan & chat tetap mounted agar state form penawaran/verifikasi tidak reset saat pindah tab */}
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

      {activeTab === "schedule" ? (
        <AdminProductionSchedule onOpenOrderDetail={handleOpenOrderDetail} />
      ) : null}

      {activeTab === "customers" ? (
        <AdminCustomerManagement
          onOpenOrderChat={handleOpenOrderChat}
          onOpenOrderDetail={handleOpenOrderDetail}
        />
      ) : null}

      {activeTab === "templates" ? <AdminTemplateManager /> : null}
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
