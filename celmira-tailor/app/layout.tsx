import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Jahit Custom oleh ${site.brand}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "jahit custom",
    "kebaya",
    "gamis",
    "kemeja pria",
    "blazer",
    "mukena",
    "busana wisuda",
    "Celmira Boutique",
    "Yogyakarta",
  ],
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    locale: "id_ID",
    siteName: site.name,
    type: "website",
    images: [
      {
        url: "/images/hero.png",
        width: 1200,
        height: 630,
        alt: `${site.name} — Jahit Custom oleh ${site.brand}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: ["/images/hero.png"],
  },
  icons: {
    icon: "/images/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-ivory text-ink antialiased">{children}</body>
    </html>
  );
}
