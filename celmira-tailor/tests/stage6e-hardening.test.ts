import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import {
  buildOrderWhatsAppUpdateMessage,
  buildOrdersCsv,
  buildWhatsAppChatUrl,
  computeAdminRevenueSummary,
  normalizePhoneForWaMe,
} from "../lib/admin-exports.ts";
import { createInitialOrderDraft } from "../lib/booking-options.ts";
import {
  adminIssueSettlementInvoice,
  adminSendQuote,
  adminUpdateProductionStage,
  adminVerifyPayment,
  customerRespondToQuote,
  customerUploadPaymentProof,
} from "../lib/order-tracking.ts";
import { createOrderInDb } from "../lib/server/order-repo.ts";
import {
  ADMIN_LOGIN_RATE_LIMIT,
  buildRateLimitKey,
  checkRateLimit,
  clearRateLimit,
  recordRateLimitFailure,
} from "../lib/server/rate-limit.ts";

function createSqliteD1(): D1Database {
  const raw = new DatabaseSync(":memory:");
  const makeStatement = (sql: string) => {
    let params: unknown[] = [];
    const stmtObj = {
      bind(...args: unknown[]) {
        params = args.map((v) => (v === undefined ? null : v));
        return stmtObj;
      },
      async first<T>(): Promise<T | null> {
        const prepared = raw.prepare(sql);
        const row = prepared.get(...(params as never[])) as T | undefined;
        return row ?? null;
      },
      async all<T>(): Promise<{ results: T[]; success: boolean }> {
        const prepared = raw.prepare(sql);
        const rows = prepared.all(...(params as never[])) as T[];
        return { results: rows, success: true };
      },
      async run(): Promise<{ success: boolean; meta: { changes: number } }> {
        const prepared = raw.prepare(sql);
        const info = prepared.run(...(params as never[]));
        return { success: true, meta: { changes: Number(info.changes ?? 0) } };
      },
    };
    return stmtObj;
  };

  return {
    prepare(sql: string) {
      return makeStatement(sql);
    },
    async batch(statements: Array<ReturnType<typeof makeStatement>>) {
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results;
    },
  } as unknown as D1Database;
}

describe("Stage 6E — Security Rate Limiting, Revenue Summary, CSV Export, & WA Template", () => {
  it("memblokir percobaan gagal berulang di D1 dan membuka kembali setelah lockout berakhir atau berhasil login", async () => {
    const db = createSqliteD1();
    const key = await buildRateLimitKey("admin_login", "203.0.113.10", "admin@celmira.local");
    const t0 = new Date("2026-11-28T10:00:00.000Z");

    const before = await checkRateLimit(db, key, ADMIN_LOGIN_RATE_LIMIT, t0);
    assert.equal(before.allowed, true);

    for (let i = 1; i <= 4; i += 1) {
      const rec = await recordRateLimitFailure(db, key, ADMIN_LOGIN_RATE_LIMIT, t0);
      assert.equal(rec.locked, false);
      assert.equal(rec.attempts, i);
    }

    const fifth = await recordRateLimitFailure(db, key, ADMIN_LOGIN_RATE_LIMIT, t0);
    assert.equal(fifth.locked, true);
    assert.equal(fifth.attempts, 5);

    const lockedCheck = await checkRateLimit(
      db,
      key,
      ADMIN_LOGIN_RATE_LIMIT,
      new Date(t0.getTime() + 60_000)
    );
    assert.equal(lockedCheck.allowed, false);

    // Setelah masa lockout 15 menit berakhir -> diizinkan kembali
    const afterLockout = await checkRateLimit(
      db,
      key,
      ADMIN_LOGIN_RATE_LIMIT,
      new Date(t0.getTime() + 16 * 60_000)
    );
    assert.equal(afterLockout.allowed, true);

    // Clear saat login berhasil
    await clearRateLimit(db, key);
    const cleared = await checkRateLimit(db, key, ADMIN_LOGIN_RATE_LIMIT, t0);
    assert.equal(cleared.allowed, true);
  });

  it("menghitung ringkasan keuangan admin, mengekspor CSV aman dari formula injection, dan menyusun pesan WA", async () => {
    const db = createSqliteD1();
    const draft = {
      ...createInitialOrderDraft(),
      categoryId: "kebaya" as const,
      designSource: "celmira" as const,
      selectedCelmiraDesignId: "celmira-kebaya-brokat-panjang",
      customer: {
        fullName: "=SUM(A1:A2) Nadia",
        whatsapp: "0812-3456-7890",
        email: "nadia@example.com",
      },
      delivery: {
        method: "shipping" as const,
        addressLine: "Jl. Kaliurang KM 7",
        city: "Sleman",
        postalCode: "55281",
        courierNote: "",
      },
      targetDate: "2026-12-20",
      agreedToTerms: true,
    };

    let order = await createOrderInDb(db, { draft, customerSessionId: null });
    const q = adminSendQuote(order, { tailoringFee: 800_000 });
    assert.equal(q.ok, true);
    if (!q.ok) return;
    order = q.order;

    const a = customerRespondToQuote(order, { decision: "approve" });
    assert.equal(a.ok, true);
    if (!a.ok) return;
    order = a.order;

    const upDp = customerUploadPaymentProof(order, {
      stage: "dp",
      proofFileName: "dp.png",
      proofMimeType: "image/png",
      proofSize: 1024,
    });
    assert.equal(upDp.ok, true);
    if (!upDp.ok) return;
    order = upDp.order;

    const verDp = adminVerifyPayment(order, { stage: "dp", decision: "approve" });
    assert.equal(verDp.ok, true);
    if (!verDp.ok) return;
    order = verDp.order;

    // Saat baru DP terverifikasi (Rp 400.000) -> sisa tagihan Rp 400.000
    const revAfterDp = computeAdminRevenueSummary([order]);
    assert.equal(revAfterDp.verifiedDpTotal, 400_000);
    assert.equal(revAfterDp.totalCashReceived, 400_000);
    assert.equal(revAfterDp.outstandingReceivable, 400_000);
    assert.equal(revAfterDp.paidDpOnlyCount, 1);

    // Selesai jahit -> terbitkan pelunasan + ongkir Rp 30.000 -> verifikasi pelunasan
    const st6 = adminUpdateProductionStage(order, { stage: "selesai_dikerjakan" });
    assert.equal(st6.ok, true);
    if (!st6.ok) return;
    const inv2 = adminIssueSettlementInvoice(st6.order, { shippingFee: 30_000 });
    assert.equal(inv2.ok, true);
    if (!inv2.ok) return;
    const up2 = customerUploadPaymentProof(inv2.order, {
      stage: "pelunasan",
      proofFileName: "lunas.png",
      proofMimeType: "image/png",
      proofSize: 1024,
    });
    assert.equal(up2.ok, true);
    if (!up2.ok) return;
    const ver2 = adminVerifyPayment(up2.order, { stage: "pelunasan", decision: "approve" });
    assert.equal(ver2.ok, true);
    if (!ver2.ok) return;

    const revAfterFull = computeAdminRevenueSummary([ver2.order]);
    assert.equal(revAfterFull.verifiedDpTotal, 400_000);
    assert.equal(revAfterFull.verifiedSettlementTotal, 430_000);
    assert.equal(revAfterFull.totalCashReceived, 830_000);
    assert.equal(revAfterFull.outstandingReceivable, 0);
    assert.equal(revAfterFull.paidFullCount, 1);

    // Cek CSV injection guard & BOM
    const csv = buildOrdersCsv([ver2.order]);
    assert.ok(csv.startsWith("\uFEFF"));
    assert.ok(csv.includes("\"'=SUM(A1:A2) Nadia\""));

    // Cek WhatsApp formatter & normalisasi nomor Indonesia
    assert.equal(normalizePhoneForWaMe("0812-3456-7890"), "6281234567890");
    const msg = buildOrderWhatsAppUpdateMessage(ver2.order, "https://celmiraboutique.com");
    assert.ok(msg.includes(ver2.order.orderCode));
    assert.ok(msg.includes("/track?code="));
    const waUrl = buildWhatsAppChatUrl("0812-3456-7890", msg);
    assert.ok(waUrl?.startsWith("https://wa.me/6281234567890?text="));
  });
});
