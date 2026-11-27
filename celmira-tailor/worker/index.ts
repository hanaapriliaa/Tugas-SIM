import vinextHandler from "vinext/server/fetch-handler";
import { getAdminSession, getCustomerSession } from "../lib/server/auth";
import type { ChatWorkerEnv } from "../lib/server/cf-env";

export { ChatRealtimeHub } from "./chat-hub";

export default {
  async fetch(request: Request, env: ChatWorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Tangani WebSocket real-time langsung di entrypoint Worker sebelum masuk router HTTP vinext
    if (
      url.pathname === "/api/chat/ws" &&
      request.headers.get("upgrade")?.toLowerCase() === "websocket"
    ) {
      const requestedRole = url.searchParams.get("role") === "admin" ? "admin" : "customer";

      let sessionId: string | null = null;
      if (requestedRole === "admin") {
        const adminSession = await getAdminSession(request, env.DB);
        if (!adminSession) {
          return new Response("Unauthorized", { status: 401 });
        }
        sessionId = adminSession.id;
      } else {
        const customerSession = await getCustomerSession(request, env.DB);
        if (!customerSession) {
          return new Response("Unauthorized", { status: 401 });
        }
        sessionId = customerSession.id;
      }

      const hubId = env.CHAT_HUB.idFromName("celmira-chat-global");
      const stub = env.CHAT_HUB.get(hubId);

      const forwardedHeaders = new Headers(request.headers);
      forwardedHeaders.set("x-celmira-ws-role", requestedRole);
      forwardedHeaders.set("x-celmira-ws-session-id", sessionId);

      return stub.fetch(
        new Request("https://chat-hub.internal/connect", {
          method: "GET",
          headers: forwardedHeaders,
        })
      );
    }

    return vinextHandler.fetch(request, env as unknown as Env, ctx);
  },
};
