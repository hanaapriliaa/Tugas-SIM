import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCTION_STAGES,
  adminCancelOrder,
  adminExtendDpDeadline,
  adminIssueSettlementInvoice,
  adminSendQuote,
  adminUpdateEstimatedCompletion,
  adminUpdateFulfillment,
  adminUpdateProductionStage,
  adminVerifyPayment,
  canAdvanceToFulfillment,
  canStartProduction,
  createDefaultAdminPaymentConfig,
  customerRespondToQuote,
  customerUploadPaymentProof,
  evaluateDpOverdueForReview,
  getDpDeadlineState,
  getLatestPaymentByStage,
  isPaymentVerified,
  normalizeSubmittedOrder,
  verifyOrderTrackingAccess,
} from "../lib/order-tracking.ts";
import type { SubmittedOrder } from "../lib/types/tailor.ts";

const T0 = new Date("2026-11-25T10:00:00.000Z");

function makeSampleOrder(method: "shipping" | "pickup" = "shipping"): SubmittedOrder {
  return {
    id: "order-test-1",
    orderCode: "CT-20261125-K9M2",
    trackingAccessCode: "AB78CD",
    createdAt: T0.toISOString(),
    updatedAt: T0.toISOString(),
    persistenceMode: "local-browser",
    status: "menunggu_penawaran",
    productionStage: "menunggu_produksi",
    categoryId: "kebaya",
    categoryName: "Kebaya",
    designSource: "celmira",
    designTitle: "Kebaya Brokat Panjang",
    attachments: [],
    specifications: {
      fabric: "Brokat & Lace + Furing",
      customFabricNote: "",
      colorName: "Maroon",
      colorHex: "#6f2631",
      sleeveStyle: "Lengan panjang",
      collarStyle: "Kerah V lembut",
      lengthOption: "Selutut",
      laceDetail: "Renda tepi",
      embroideryDetail: "Payet kerah",
      buttonStyle: "Kancing bungkus",
      zipperStyle: "Resleting belakang",
      notes: "",
    },
    measurements: {
      mode: "manual",
      values: {
        bust: "90",
        waist: "72",
        hip: "96",
        shoulderWidth: "38",
        sleeveLength: "55",
        garmentLength: "100",
        neckCircumference: "36",
      },
      sampleGarmentNote: "",
      fitPreferenceNote: "",
    },
    customer: {
      fullName: "Nadia Putri",
      whatsapp: "0812-3456-7890",
      email: "nadia@example.com",
    },
    delivery:
      method === "shipping"
        ? {
            method: "shipping",
            addressLine: "Jl. Kaliurang KM 7, Sleman",
            city: "Sleman",
            postalCode: "55281",
            courierNote: "Reguler",
          }
        : {
            method: "pickup",
            addressLine: "",
            city: "",
            postalCode: "",
            courierNote: "",
          },
    targetDate: "2026-12-15",
    invoice: {
      quoteStatus: "belum_dikirim",
      tailoringFee: null,
      shippingFee: method === "pickup" ? 0 : null,
      dpAmount: null,
      dpDueAt: null,
      settlementTailoringAmount: null,
      settlementTotalAmount: null,
    },
    payments: [],
    history: [
      {
        id: "evt-1",
        timestamp: T0.toISOString(),
        actor: "customer",
        category: "pesanan",
        title: "Pengajuan pesanan dikirim",
        description: "Pesanan Kebaya diajukan.",
        orderStatus: "menunggu_penawaran",
        productionStage: "menunggu_produksi",
      },
    ],
  };
}

test("tersedia 10 tahapan produksi yang urut dan jelas", () => {
  assert.equal(PRODUCTION_STAGES.length, 10);
  assert.equal(PRODUCTION_STAGES[0].id, "menunggu_produksi");
  assert.equal(PRODUCTION_STAGES[9].id, "pesanan_selesai");
});

test("konfigurasi pembayaran bawaan tidak berisi QRIS atau rekening palsu", () => {
  const cfg = createDefaultAdminPaymentConfig(T0);
  assert.equal(cfg.qrisImageDataUrl, undefined);
  assert.equal(cfg.qrisMerchantName, undefined);
  assert.equal(cfg.dpWindowHours, 24);
});

test("verifyOrderTrackingAccess mewajibkan verifikasi dua faktor (tidak cukup nomor pesanan saja)", () => {
  const order = makeSampleOrder();

  // Hanya nomor pesanan tanpa identitas kedua -> wajib ditolak
  const codeOnly = verifyOrderTrackingAccess([order], order.orderCode, "");
  assert.equal(codeOnly.ok, false);

  // Nomor pesanan benar tapi WhatsApp/kode salah -> ditolak
  const wrongVerifier = verifyOrderTrackingAccess([order], order.orderCode, "08999999999");
  assert.equal(wrongVerifier.ok, false);

  // Format WhatsApp +62 harus cocok dengan 0812-3456-7890
  const byWhatsapp = verifyOrderTrackingAccess([order], order.orderCode, "+62 812 3456 7890");
  assert.equal(byWhatsapp.ok, true);

  // Kode Akses Tracking cocok tanpa sensitif huruf besar/kecil
  const byAccessCode = verifyOrderTrackingAccess([order], "ct-20261125-k9m2", "ab78cd");
  assert.equal(byAccessCode.ok, true);

  // Email terdaftar juga dapat memverifikasi
  const byEmail = verifyOrderTrackingAccess([order], order.orderCode, "NADIA@example.com");
  assert.equal(byEmail.ok, true);
});

test("aturan keras DP: produksi terkunci sebelum DP diverifikasi & bukti upload tidak otomatis lunas", () => {
  const initial = makeSampleOrder("shipping");

  // Admin kirim penawaran Rp 700.000
  const quoted = adminSendQuote(
    initial,
    {
      tailoringFee: 700_000,
      estimatedCompletionDate: "2026-12-12",
      quoteNote: "Termasuk furing & payet kerah",
    },
    T0
  );
  assert.equal(quoted.ok, true);
  if (!quoted.ok) return;
  assert.equal(quoted.order.status, "penawaran_dikirim");
  assert.equal(quoted.order.invoice.dpAmount, 350_000);

  // Produksi tidak boleh dimulai sebelum DP diverifikasi
  const blockedBeforeApproval = adminUpdateProductionStage(
    quoted.order,
    { stage: "persiapan_bahan" },
    T0
  );
  assert.equal(blockedBeforeApproval.ok, false);

  // Customer menyetujui penawaran -> Invoice DP 50% terbit dengan batas 24 jam
  const tApprove = new Date("2026-11-25T12:00:00.000Z");
  const approved = customerRespondToQuote(quoted.order, { decision: "approve" }, tApprove, 24);
  assert.equal(approved.ok, true);
  if (!approved.ok) return;
  assert.equal(approved.order.status, "menunggu_dp");
  assert.equal(approved.order.invoice.dpDueAt, "2026-11-26T12:00:00.000Z");
  assert.ok(approved.order.invoice.dpInvoiceNumber?.startsWith("INV-DP-"));

  // Customer unggah bukti DP pada jam ke-20 (sebelum 24 jam)
  const tUpload = new Date("2026-11-26T08:00:00.000Z");
  const uploaded = customerUploadPaymentProof(
    approved.order,
    {
      stage: "dp",
      proofFileName: "bukti-qris-dp.jpg",
      proofMimeType: "image/jpeg",
      proofSize: 120_000,
      customerNote: "Transfer QRIS pukul 15.00 WIB",
    },
    tUpload
  );
  assert.equal(uploaded.ok, true);
  if (!uploaded.ok) return;

  // Pembayaran TIDAK otomatis berhasil hanya karena bukti sudah diunggah
  assert.equal(isPaymentVerified(uploaded.order, "dp"), false);
  assert.equal(canStartProduction(uploaded.order), false);
  assert.equal(getLatestPaymentByStage(uploaded.order, "dp")?.verificationStatus, "menunggu_verifikasi_admin");

  // Produksi TETAP terkunci sebelum admin memverifikasi bukti DP
  const blockedWhilePending = adminUpdateProductionStage(
    uploaded.order,
    { stage: "persiapan_bahan" },
    tUpload
  );
  assert.equal(blockedWhilePending.ok, false);

  // Admin tidak dapat mengubah harga penawaran saat bukti DP masih menunggu verifikasi admin
  const blockedRequoteWhilePending = adminSendQuote(
    uploaded.order,
    { tailoringFee: 750_000 },
    tUpload
  );
  assert.equal(blockedRequoteWhilePending.ok, false);

  // Meski melewati batas 24 jam (jam ke-30), pesanan TIDAK BOLEH dibatalkan otomatis karena bukti sudah diunggah tepat waktu
  const tAfter24h = new Date("2026-11-26T18:00:00.000Z");
  const deadlineState = getDpDeadlineState(uploaded.order, tAfter24h);
  assert.equal(deadlineState.protectedByProofUpload, true);
  assert.equal(deadlineState.requiresAdminReview, false);

  const overdueAttempt = evaluateDpOverdueForReview(uploaded.order, tAfter24h);
  assert.equal(overdueAttempt.ok, false);

  const timeoutCancelAttempt = adminCancelOrder(
    uploaded.order,
    { reason: "Melewati batas waktu 24 jam", isTimeoutCancellation: true },
    tAfter24h
  );
  assert.equal(timeoutCancelAttempt.ok, false);
});

test("batas waktu 24 jam tanpa bukti menandai pesanan untuk tinjauan admin, perpanjangan, atau pembatalan tercatat", () => {
  const initial = makeSampleOrder("pickup");
  const quoted = adminSendQuote(initial, { tailoringFee: 500_000 }, T0);
  assert.equal(quoted.ok, true);
  if (!quoted.ok) return;

  const approved = customerRespondToQuote(quoted.order, { decision: "approve" }, T0, 24);
  assert.equal(approved.ok, true);
  if (!approved.ok) return;

  // Setelah 25 jam tanpa unggahan bukti
  const t25h = new Date("2026-11-26T11:00:00.000Z");
  const deadline = getDpDeadlineState(approved.order, t25h);
  assert.equal(deadline.isExpired, true);
  assert.equal(deadline.requiresAdminReview, true);

  const flagged = evaluateDpOverdueForReview(approved.order, t25h);
  assert.equal(flagged.ok, true);
  if (!flagged.ok) return;
  assert.equal(flagged.order.status, "perlu_tinjauan_admin");

  // Admin dapat memperpanjang batas waktu
  const extended = adminExtendDpDeadline(flagged.order, { extraHours: 24 }, t25h);
  assert.equal(extended.ok, true);
  if (!extended.ok) return;
  assert.equal(extended.order.status, "menunggu_dp");

  // Atau admin dapat membatalkan dengan alasan wajib yang tercatat di history
  const badCancel = adminCancelOrder(flagged.order, { reason: "ok" }, t25h);
  assert.equal(badCancel.ok, false);

  const cancelled = adminCancelOrder(
    flagged.order,
    { reason: "Tidak ada pembayaran DP melewati batas waktu 24 jam.", isTimeoutCancellation: true },
    t25h
  );
  assert.equal(cancelled.ok, true);
  if (!cancelled.ok) return;
  assert.equal(cancelled.order.status, "dibatalkan");
  assert.ok(cancelled.order.history.some((e) => e.category === "pembatalan"));
});

test("alur lengkap penawaran -> DP -> produksi -> invoice pelunasan (ongkir terpisah) -> pengiriman -> selesai", () => {
  const initial = makeSampleOrder("shipping");

  // 1. Admin kirim penawaran -> Customer setujui -> Upload DP -> Admin tolak dulu lalu setujui setelah unggah ulang
  const q1 = adminSendQuote(initial, { tailoringFee: 800_000, shippingFee: 25_000 }, T0);
  assert.equal(q1.ok, true);
  if (!q1.ok) return;

  const a1 = customerRespondToQuote(q1.order, { decision: "approve" }, T0, 24);
  assert.equal(a1.ok, true);
  if (!a1.ok) return;

  const u1 = customerUploadPaymentProof(
    a1.order,
    { stage: "dp", proofFileName: "blur.jpg", proofMimeType: "image/jpeg", proofSize: 50_000 },
    new Date("2026-11-25T11:00:00.000Z")
  );
  assert.equal(u1.ok, true);
  if (!u1.ok) return;

  const rejDp = adminVerifyPayment(
    u1.order,
    { stage: "dp", decision: "reject", adminNote: "Nominal transfer tidak terbaca jelas" },
    new Date("2026-11-25T12:00:00.000Z")
  );
  assert.equal(rejDp.ok, true);
  if (!rejDp.ok) return;
  assert.equal(rejDp.order.status, "menunggu_dp");
  // Setelah bukti DP ditolak, admin kembali diizinkan mengirim penawaran harga baru bila diperlukan
  assert.equal(adminSendQuote(rejDp.order, { tailoringFee: 820_000 }).ok, true);

  const u2 = customerUploadPaymentProof(
    rejDp.order,
    { stage: "dp", proofFileName: "jelas-dp.png", proofMimeType: "image/png", proofSize: 95_000 },
    new Date("2026-11-25T13:00:00.000Z")
  );
  assert.equal(u2.ok, true);
  if (!u2.ok) return;

  const verDp = adminVerifyPayment(
    u2.order,
    { stage: "dp", decision: "approve", adminNote: "Nominal Rp 400.000 cocok" },
    new Date("2026-11-25T14:00:00.000Z")
  );
  assert.equal(verDp.ok, true);
  if (!verDp.ok) return;
  assert.equal(canStartProduction(verDp.order), true);

  // 2. Admin update estimasi & progres produksi hingga Selesai dikerjakan
  const est = adminUpdateEstimatedCompletion(
    verDp.order,
    "2026-12-10",
    "Jadwal jahit masuk kloter pertama",
    new Date("2026-11-25T14:30:00.000Z")
  );
  assert.equal(est.ok, true);
  if (!est.ok) return;
  assert.equal(est.order.estimatedCompletionDate, "2026-12-10");

  // Invoice pelunasan tidak boleh diterbitkan sebelum Selesai dikerjakan
  const earlySettlement = adminIssueSettlementInvoice(est.order, { shippingFee: 28_000 });
  assert.equal(earlySettlement.ok, false);

  const s6 = adminUpdateProductionStage(
    est.order,
    { stage: "selesai_dikerjakan", note: "Lulus quality control" },
    new Date("2026-12-08T10:00:00.000Z")
  );
  assert.equal(s6.ok, true);
  if (!s6.ok) return;

  // 3. Terbitkan Invoice Pelunasan: sisa 50% (400.000) + ongkir terpisah (28.000) = 428.000
  const invLn = adminIssueSettlementInvoice(
    s6.order,
    { shippingFee: 28_000, note: "Tarif resmi JNE Reguler" },
    new Date("2026-12-08T11:00:00.000Z")
  );
  assert.equal(invLn.ok, true);
  if (!invLn.ok) return;
  assert.equal(invLn.order.invoice.settlementTailoringAmount, 400_000);
  assert.equal(invLn.order.invoice.shippingFee, 28_000);
  assert.equal(invLn.order.invoice.settlementTotalAmount, 428_000);
  assert.equal(invLn.order.productionStage, "menunggu_pelunasan");

  // Pengiriman belum boleh diproses sebelum pelunasan diverifikasi admin
  assert.equal(canAdvanceToFulfillment(invLn.order), false);
  const blockedShip = adminUpdateFulfillment(invLn.order, {
    courierName: "JNE",
    trackingNumber: "JNE12345",
    action: "mark_dispatched_or_ready",
  });
  assert.equal(blockedShip.ok, false);

  // 4. Customer unggah bukti pelunasan -> Admin verifikasi
  const uLn = customerUploadPaymentProof(
    invLn.order,
    { stage: "pelunasan", proofFileName: "pelunasan.jpg", proofMimeType: "image/jpeg", proofSize: 88_000 },
    new Date("2026-12-08T13:00:00.000Z")
  );
  assert.equal(uLn.ok, true);
  if (!uLn.ok) return;
  assert.equal(isPaymentVerified(uLn.order, "pelunasan"), false);

  const verLn = adminVerifyPayment(
    uLn.order,
    { stage: "pelunasan", decision: "approve" },
    new Date("2026-12-08T14:00:00.000Z")
  );
  assert.equal(verLn.ok, true);
  if (!verLn.ok) return;
  assert.equal(canAdvanceToFulfillment(verLn.order), true);
  assert.equal(verLn.order.productionStage, "siap_dikirim_atau_diambil");

  // 5. Kirim dengan resi -> Selesai
  const missingResi = adminUpdateFulfillment(verLn.order, {
    courierName: "JNE Reguler",
    trackingNumber: "",
    action: "mark_dispatched_or_ready",
  });
  assert.equal(missingResi.ok, false);

  const dispatched = adminUpdateFulfillment(
    verLn.order,
    {
      courierName: "JNE Reguler",
      trackingNumber: "CGK99887766",
      action: "mark_dispatched_or_ready",
    },
    new Date("2026-12-09T09:00:00.000Z")
  );
  assert.equal(dispatched.ok, true);
  if (!dispatched.ok) return;
  assert.equal(dispatched.order.status, "dalam_pengiriman");
  assert.equal(dispatched.order.productionStage, "dalam_pengiriman_atau_siap_diambil");

  const done = adminUpdateFulfillment(
    dispatched.order,
    { action: "mark_completed" },
    new Date("2026-12-11T16:00:00.000Z")
  );
  assert.equal(done.ok, true);
  if (!done.ok) return;
  assert.equal(done.order.status, "selesai");
  assert.equal(done.order.productionStage, "pesanan_selesai");
  assert.ok(done.order.history.length >= 10);
});

test("pesanan ambil sendiri (pickup) selalu memiliki biaya pengiriman Rp 0", () => {
  const pickupOrder = makeSampleOrder("pickup");

  const q = adminSendQuote(pickupOrder, { tailoringFee: 600_000, shippingFee: 50_000 }, T0);
  assert.equal(q.ok, true);
  if (!q.ok) return;
  assert.equal(q.order.invoice.shippingFee, 0);

  const a = customerRespondToQuote(q.order, { decision: "approve" }, T0, 24);
  assert.equal(a.ok, true);
  if (!a.ok) return;

  const u = customerUploadPaymentProof(
    a.order,
    { stage: "dp", proofFileName: "dp.png", proofMimeType: "image/png", proofSize: 45_000 },
    T0
  );
  assert.equal(u.ok, true);
  if (!u.ok) return;

  const v = adminVerifyPayment(u.order, { stage: "dp", decision: "approve" }, T0);
  assert.equal(v.ok, true);
  if (!v.ok) return;

  const s6 = adminUpdateProductionStage(v.order, { stage: "selesai_dikerjakan" }, T0);
  assert.equal(s6.ok, true);
  if (!s6.ok) return;

  const inv = adminIssueSettlementInvoice(s6.order, { shippingFee: 99_000 }, T0);
  assert.equal(inv.ok, true);
  if (!inv.ok) return;
  assert.equal(inv.order.invoice.shippingFee, 0);
  assert.equal(inv.order.invoice.settlementTailoringAmount, 300_000);
  assert.equal(inv.order.invoice.settlementTotalAmount, 300_000);
});

test("normalizeSubmittedOrder menormalkan data pesanan lama agar tetap kompatibel", () => {
  const legacy = makeSampleOrder("pickup") as unknown as Record<string, unknown>;
  legacy.productionStage = "pemotongan_bahan";
  legacy.trackingAccessCode = "";
  legacy.history = [];

  const normalized = normalizeSubmittedOrder(legacy as unknown as SubmittedOrder);
  assert.equal(normalized.productionStage, "pemotongan_kain");
  assert.equal(normalized.trackingAccessCode.length, 6);
  assert.equal(normalized.history.length, 1);
});
