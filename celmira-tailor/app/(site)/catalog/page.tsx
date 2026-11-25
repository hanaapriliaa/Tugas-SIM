import type { Metadata } from "next";
import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";

export const metadata: Metadata = {
  title: "Katalog Jahit",
  description:
    "Telusuri delapan kategori jahit custom Celmira Tailor, acuan model, karakter bahan, dan mulai pesanan atau kustomisasi desain.",
};

export default function CatalogPage() {
  return <CatalogExplorer />;
}
