export async function POST() {
  return Response.json(
    {
      error:
        "Pemulihan dengan kode sinkronisasi statis telah dinonaktifkan demi keamanan. Gunakan tautan pemulihan privat satu kali pakai atau verifikasi pesanan Anda di halaman Lacak Pesanan untuk pemulihan data studio otomatis.",
    },
    { status: 410, headers: { "cache-control": "no-store" } }
  );
}
