export async function POST() {
  return Response.json(
    {
      error:
        "Pemulihan dengan kode sinkronisasi telah dinonaktifkan demi keamanan. Masuk ke akun pelanggan atau verifikasi pesanan Anda di halaman Lacak Pesanan untuk pemulihan data otomatis.",
    },
    { status: 410, headers: { "cache-control": "no-store" } }
  );
}
