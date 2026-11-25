import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingChatButton } from "@/components/layout/FloatingChatButton";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-espresso focus:px-5 focus:py-3 focus:text-sm focus:text-ivory"
        href="#main-content"
      >
        Lompat ke konten utama
      </a>
      <Header />
      <main className="flex-1" id="main-content">
        {children}
      </main>
      <Footer />
      <FloatingChatButton />
    </div>
  );
}
