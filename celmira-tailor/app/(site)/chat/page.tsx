import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerChatWorkspace } from "@/components/chat/CustomerChatWorkspace";

export const metadata: Metadata = {
  title: "Chat Pelanggan",
  description:
    "Ruang diskusi Celmira Tailor untuk membahas desain, bahan, ukuran, gambar referensi, dan detail pesanan jahit custom.",
};

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="shell py-16">
          <p className="text-sm text-muted">Memuat ruang percakapan Celmira Tailor...</p>
        </div>
      }
    >
      <CustomerChatWorkspace />
    </Suspense>
  );
}
