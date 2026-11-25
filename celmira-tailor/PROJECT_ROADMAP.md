# Project Roadmap — Celmira Tailor

Platform pemesanan jahit custom untuk **Celmira Boutique** (`celmira-tailor/`), dibangun di atas **vinext + Vite + React + Tailwind CSS v4 + Cloudflare Vite plugin**.

## Prinsip Pengembangan
- Mempertahankan identitas visual Celmira (`ivory`, `cream`, `sand`, `blush`, `rose`, `cocoa`, `espresso`, `ink`, `muted`) serta font lokal `Playfair Display` & `DM Sans`.
- Antarmuka pelanggan berbahasa Indonesia, responsif di desktop & mobile.
- Jujur terhadap status fitur: tidak ada QRIS palsu, verifikasi pembayaran otomatis palsu, atau klaim backend aktif sebelum terintegrasi ke PostgreSQL & storage aman.

## Tahapan & Modul

1. **Tahap 0 — Fondasi Visual & Homepage** *(Selesai — commit `d9fbde3`)*
   - Design system, layout (`Header`, `MobileNavigation`, `Footer`, `FloatingChatButton`), dan 9 section homepage.

2. **Tahap 1 — Customer Booking Flow (`/orders`)** *(Prioritas Saat Ini)*
   - Arsitektur domain types, opsi kustomisasi jahit, validasi per langkah, dan penyimpanan draft/pesanan lokal terstruktur.
   - Alur multi-langkah: kategori busana, pilihan desain Celmira atau upload referensi (foto/sketsa/PDF), detail kain/warna/lengan/kerah/panjang/finishing, input ukuran (manual / profil / baju contoh), identitas pelanggan, pengiriman/ambil di butik, target tanggal selesai, ringkasan & pengajuan.

3. **Tahap 2 — Design Studio (`/design-studio`) & Katalog (`/catalog`)**
   - Kustomisasi visual interaktif (siluet, warna, kain, lengan, kerah, detail), upload referensi desain, penyimpanan konfigurasi desain, serta integrasi ke `/orders`.
   - Katalog jahit interaktif dengan filter 8 kategori dan tautan langsung ke pemesanan.

4. **Tahap 3 — Measurement Studio (`/measurement-studio`)**
   - Mannequin 2D berbasis SVG yang menyesuaikan kategori pakaian.
   - Input manual, slider, tombol plus/minus, panduan ilustrasi pengukuran, template (hijab, atasan, gamis, busana formal, bawahan), validasi ukuran, serta penyimpanan profil ukuran untuk dipakai ulang di `/orders`.

5. **Tahap 4 — Customer Order, Tracking (`/track`), & Alur Invoice/Pembayaran**
   - Daftar pesanan, detail pesanan, status produksi, pelacakan tahap jahit, pengiriman & nomor resi.
   - Pemisahan invoice biaya jahit dan ongkos kirim, skema DP 50% (batas 24 jam), upload bukti QRIS, dan status verifikasi manual admin sebelum masuk produksi serta pelunasan 50% + ongkir.

6. **Tahap 5 — Admin Dashboard (`/admin`) & Chat (`/chat`)**
   - Manajemen pesanan, peninjauan desain & ukuran, pengaturan harga & penawaran, template ukuran & kategori, kapasitas/jadwal produksi, verifikasi pembayaran manual, manajemen pelanggan, serta balasan chat admin–pelanggan.

7. **Tahap 6 — Arsitektur Backend, PostgreSQL, Autentikasi & Upload Storage**
   - Skema database PostgreSQL, repository/service layer, kontrak API, autentikasi role pelanggan/admin, dan penyimpanan upload file yang aman.
