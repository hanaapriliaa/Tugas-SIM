import type { ChatConnectionStatus } from "@/lib/types/tailor";

export type ChatRealtimeEvent = {
  type: "connected" | "pong" | "message:new" | "messages:read" | "thread:updated" | "config:updated";
  threadId?: string;
  readerRole?: "customer" | "admin";
  readAt?: string;
  unreadByAdmin?: number;
  unreadByCustomer?: number;
  updatedAt?: string;
};

export type RealtimeControllerOptions = {
  role: "customer" | "admin";
  enabled: boolean;
  onEvent: (event: ChatRealtimeEvent) => void;
  onSyncNeeded: () => unknown | Promise<unknown>;
  onStatusChange?: (status: ChatConnectionStatus) => void;
};

/**
 * Mengelola koneksi WebSocket ke Durable Object (/api/chat/ws) dengan:
 * - Reconnect exponential backoff (1s -> 2s -> 4s -> 8s -> 15s)
 * - Fallback controlled polling (4s saat tab aktif) jika WS tidak tersedia
 * - Auto-recovery saat browser kembali online atau tab kembali aktif
 */
export function startChatRealtime(options: RealtimeControllerOptions): () => void {
  if (typeof window === "undefined" || !options.enabled) {
    return () => {};
  }

  let closed = false;
  let ws: WebSocket | null = null;
  let retryCount = 0;
  let hadConnectedOnce = false;
  let reconnectTimer: number | null = null;
  let heartbeatTimer: number | null = null;
  let pollingTimer: number | null = null;

  const setStatus = (next: ChatConnectionStatus) => {
    if (!closed) options.onStatusChange?.(next);
  };

  const clearTimers = () => {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (heartbeatTimer !== null) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const stopPolling = () => {
    if (pollingTimer !== null) {
      window.clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };

  const startFallbackPolling = () => {
    if (pollingTimer !== null || closed) return;
    setStatus("polling");
    pollingTimer = window.setInterval(() => {
      if (closed || document.visibilityState === "hidden") return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("offline");
        return;
      }
      void options.onSyncNeeded();
    }, 4000);
  };

  const scheduleReconnect = () => {
    if (closed) return;
    clearTimers();

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      return;
    }

    retryCount += 1;
    if (retryCount >= 2) {
      startFallbackPolling();
    } else {
      setStatus("reconnecting");
    }

    const delayMs =
      retryCount >= 3 ? 20_000 : Math.min(15_000, 1000 * Math.pow(2, retryCount - 1));
    reconnectTimer = window.setTimeout(() => {
      connect();
    }, delayMs);
  };

  const connect = () => {
    if (closed) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      return;
    }

    clearTimers();
    if (ws) {
      try {
        ws.close();
      } catch {
        // Abaikan error close
      }
      ws = null;
    }

    if (retryCount === 0) {
      setStatus("connecting");
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/chat/ws?role=${options.role}`;

    try {
      const socket = new WebSocket(wsUrl);
      ws = socket;

      socket.addEventListener("open", () => {
        if (closed) {
          socket.close();
          return;
        }
        const isReconnect = hadConnectedOnce || retryCount > 0;
        hadConnectedOnce = true;
        retryCount = 0;
        stopPolling();
        setStatus("realtime");

        if (isReconnect) {
          void options.onSyncNeeded();
        }

        heartbeatTimer = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 25_000);
      });

      socket.addEventListener("message", (event) => {
        if (closed || typeof event.data !== "string") return;
        if (event.data === "pong") return;
        try {
          const parsed = JSON.parse(event.data) as ChatRealtimeEvent;
          if (parsed.type === "pong") return;
          options.onEvent(parsed);
        } catch {
          // Abaikan payload non-JSON
        }
      });

      socket.addEventListener("close", () => {
        if (closed) return;
        ws = null;
        scheduleReconnect();
      });

      socket.addEventListener("error", () => {
        if (closed) return;
        try {
          socket.close();
        } catch {
          // Abaikan
        }
      });
    } catch {
      scheduleReconnect();
    }
  };

  const handleOnline = () => {
    if (closed) return;
    retryCount = 0;
    void options.onSyncNeeded();
    connect();
  };

  const handleOffline = () => {
    if (closed) return;
    setStatus("offline");
  };

  const handleVisibility = () => {
    if (closed || document.visibilityState !== "visible") return;
    void options.onSyncNeeded();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect();
    }
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  document.addEventListener("visibilitychange", handleVisibility);

  connect();

  return () => {
    closed = true;
    clearTimers();
    stopPolling();
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    document.removeEventListener("visibilitychange", handleVisibility);
    if (ws) {
      try {
        ws.close(1000, "Component unmounted");
      } catch {
        // Abaikan
      }
      ws = null;
    }
  };
}
