import { bindings, defineConfig, defineWorker, exports } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "celmira-tailor",
    entrypoint: "./worker/index.ts",
    compatibilityDate: "2026-11-25",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    exports: {
      ChatRealtimeHub: exports.durableObject({ storage: "sqlite" }),
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      DB: bindings.d1({ name: "celmira-tailor-db" }),
      CHAT_ATTACHMENTS: bindings.r2({ name: "celmira-chat-attachments" }),
      CHAT_HUB: bindings.durableObject({
        worker: "celmira-tailor",
        exportName: "ChatRealtimeHub",
      }),
      ADMIN_EMAIL: bindings.secret(),
      ADMIN_PASSWORD_HASH: bindings.secret(),
      AUTH_SIGNING_SECRET: bindings.secret(),
    },
  }),
});
