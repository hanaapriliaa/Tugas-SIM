import { DurableObject } from "cloudflare:workers";

type BroadcastPayload = {
  targets?: string[];
  event?: Record<string, unknown>;
};

/**
 * Cloudflare Durable Object untuk komunikasi real-time Customer <-> Admin.
 * Menggunakan WebSocket Hibernation API agar hemat resource dan tahan skala.
 */
export class ChatRealtimeHub extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(
        JSON.stringify({ type: "ping" }),
        JSON.stringify({ type: "pong" })
      )
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/broadcast" && request.method === "POST") {
      let payload: BroadcastPayload;
      try {
        payload = (await request.json()) as BroadcastPayload;
      } catch {
        return Response.json({ error: "Payload broadcast tidak valid." }, { status: 400 });
      }

      const targets = Array.isArray(payload.targets) ? payload.targets : [];
      const serialized = JSON.stringify(payload.event ?? {});
      const sockets = new Set<WebSocket>();

      for (const tag of targets) {
        for (const ws of this.ctx.getWebSockets(tag)) {
          sockets.add(ws);
        }
      }

      let delivered = 0;
      for (const ws of sockets) {
        try {
          ws.send(serialized);
          delivered += 1;
        } catch {
          try {
            ws.close(1011, "Send failed");
          } catch {
            // Abaikan error penutupan socket rusak.
          }
        }
      }

      return Response.json({ ok: true, delivered });
    }

    if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
      const role = request.headers.get("x-celmira-ws-role");
      const sessionId = request.headers.get("x-celmira-ws-session-id");

      if ((role !== "admin" && role !== "customer") || !sessionId) {
        return new Response("Unauthorized", { status: 401 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const tags =
        role === "admin"
          ? ["role:admin", `admin:${sessionId}`]
          : ["role:customer", `customer:${sessionId}`];

      this.ctx.acceptWebSocket(server, tags);
      server.send(
        JSON.stringify({
          type: "connected",
          role,
          connectedAt: new Date().toISOString(),
        })
      );

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    if (typeof message !== "string") return;
    if (message === "ping") {
      ws.send("pong");
      return;
    }
    try {
      const parsed = JSON.parse(message) as { type?: string };
      if (parsed.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", ts: new Date().toISOString() }));
      }
    } catch {
      // Abaikan pesan yang tidak dikenal.
    }
  }

  webSocketClose(ws: WebSocket, code: number, reason: string): void {
    try {
      ws.close(code, reason);
    } catch {
      // Socket sudah tertutup.
    }
  }
}
