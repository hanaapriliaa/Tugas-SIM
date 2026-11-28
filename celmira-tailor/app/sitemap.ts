import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const PUBLIC_ROUTES = [
  "",
  "/layanan",
  "/catalog",
  "/design-studio",
  "/measurement-studio",
  "/orders",
  "/track",
  "/chat",
  "/cara-pemesanan",
  "/tentang-kami",
  "/kontak",
  "/kebijakan-privasi",
  "/syarat-ketentuan",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${site.url}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/catalog" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/orders" || route === "/catalog" ? 0.9 : 0.7,
  }));
}
