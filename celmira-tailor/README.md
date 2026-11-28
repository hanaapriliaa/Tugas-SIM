# Celmira Tailor — Platform Jahit Custom Celmira Boutique

Platform pemesanan jahit custom end-to-end untuk **Celmira Boutique** (Yogyakarta), dibangun di atas **vinext + Vite + React + Tailwind CSS v4** dengan backend **Cloudflare Workers, D1 (SQLite), R2 (privat), dan Durable Objects (WebSocket real-time)**.

## Fitur Utama

### Halaman Pelanggan (Pure Guest Experience — Tanpa Login/Registrasi)
- **Beranda & Halaman Informasi:** `/`, `/layanan`, `/catalog`, `/cara-pemesanan`, `/tentang-kami`, `/kontak`, `/kebijakan-privasi`, `/syarat-ketentuan`
- **Design Studio (`/design-studio`):** Kustomisasi siluet, bahan, warna, lengan, kerah, panjang, detail finishing, dan upload referensi biner (R2 privat) dengan auto-sync ke D1.
- **Measurement Studio (`/measurement-studio`):** Mannequin SVG 2D adaptif 5 template (`hijab`, `atasan`, `gamis`, `busana-formal`, `bawahan`) yang tersinkron dengan konfigurasi template admin di D1, panduan mengukur, validasi cm, dan simpan multi-profil.
- **Customer Booking Flow (`/orders`):** Alur 5 langkah terintegrasi dengan desain studio, profil ukuran (snapshot terkunci saat checkout), serta jadwal libur & estimasi pengerjaan dari admin.
- **Order Tracking & Invoice Dua Tahap (`/track`):** Verifikasi 2 faktor (Nomor Pesanan + WhatsApp / Kode Akses Tracking) dilindungi rate limiter D1, persetujuan penawaran, Invoice DP 50% (batas 24 jam + proteksi unggah bukti), Invoice Pelunasan (sisa 50% + ongkir terpisah), cetak/simpan PDF invoice, timeline 10 tahap produksi, serta pemulihan sesi studio otomatis.
- **Chat Pelanggan Real-Time (`/chat` & Floating Chat):** WebSocket via Durable Object `ChatRealtimeHub` (+ fallback polling), lampiran gambar R2 privat, dan konteks pesanan/desain/ukuran.

### Admin Dashboard (`/admin`)
Dilindungi autentikasi server-side PBKDF2 (`HttpOnly` cookie) + rate limiting brute-force D1, dengan **5 tab terintegrasi**:
1. **Pesanan & Invoice:** Penawaran harga akhir, konfigurasi QRIS resmi (R2), verifikasi manual bukti DP & pelunasan, kontrol 10 tahap produksi, pengiriman/resi, ringkasan keuangan, ekspor CSV, template update WhatsApp, dan cetak nota.
2. **Chat Pelanggan:** Inbox real-time dua arah, status `Terkirim` ↔ `Terbaca`, upload gambar referensi, dan pengaturan nomor WhatsApp resmi.
3. **Jadwal & Kapasitas:** Proyeksi beban produksi 6 minggu, kuota mingguan/harian, estimasi hari per 8 kategori, daftar tanggal libur/blokir, dan antrean target terdekat.
4. **Pelanggan:** Direktori pelanggan teragregasi dari pesanan, studio, dan chat + catatan internal admin (D1).
5. **Template & Kategori:** Pengaturan 5 template ukuran (rentang cm, wajib/opsional, status aktif, pemetaan kategori) yang langsung tersinkron ke `/measurement-studio`.

## Persiapan Pengembangan Lokal

1. **Instal dependensi:**
   ```bash
   npm install
   ```

2. **Konfigurasi rahasia lokal (`.dev.vars`):**
   Salin `.dev.vars.example` menjadi `.dev.vars` (jangan pernah commit `.dev.vars` ke Git):
   ```bash
   cp .dev.vars.example .dev.vars
   ```
   Buat hash PBKDF2 untuk password admin:
   ```bash
   node scripts/hash-admin-password.mjs "PasswordKuatAdminAnda"
   ```
   Isi `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, dan `AUTH_SIGNING_SECRET` (string acak panjang) di `.dev.vars`.

3. **Jalankan dev server:**
   ```bash
   npm run dev
   ```
   Skema D1 akan diinisialisasi otomatis pada runtime lokal melalui `ensure*Schema()`.

## Migrasi Database D1 (Produksi)

Jalankan migrasi berurutan `0001` hingga `0008` pada database D1 `celmira-tailor-db`:
- `migrations/0001_chat_backend.sql` — Chat, lampiran, & sesi admin
- `migrations/0002_orders_backend.sql` — Pesanan, file R2, QRIS, & sesi tracking
- `migrations/0003_studio_backend.sql` — Design Studio & Measurement Studio
- `migrations/0004_studio_autosync_and_accounts.sql` — Auto-sync & kolom migrasi idempotent
- `migrations/0005_guest_session_and_recovery.sql` — Token sesi guest & tautan pemulihan privat
- `migrations/0006_stage6c_customer_order_integration.sql` — Relasi guest, desain, ukuran, & pesanan
- `migrations/0007_stage6d_admin_modules.sql` — Template ukuran, kapasitas produksi, & catatan pelanggan
- `migrations/0008_stage6e_rate_limits.sql` — Rate limiting autentikasi & verifikasi tracking

## Pengujian & Build

```bash
npx tsc --noEmit   # Pemeriksaan tipe TypeScript
npm test           # Menjalankan seluruh unit & integration tests (SQLite D1)
npm run build      # Build produksi Cloudflare Worker
npm run deploy     # Deploy ke Cloudflare Workers (pastikan secrets & bindings siap)
```

## Bindings & Secrets Cloudflare (`cloudflare.config.ts`)
- **D1 Database:** `DB` (`celmira-tailor-db`)
- **R2 Bucket:** `CHAT_ATTACHMENTS` (`celmira-chat-attachments`)
- **Durable Object:** `CHAT_HUB` (`ChatRealtimeHub`)
- **Secrets wajib:** `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SIGNING_SECRET`
