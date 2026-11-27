import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { createInitialOrderDraft } from "../lib/booking-options.ts";
import { createEmptyDesignDraft } from "../lib/design-studio.ts";
import {
  DEFAULT_MEASUREMENT_TEMPLATES,
  createMeasurementDraftForTemplate,
} from "../lib/measurement-studio.ts";
import {
  adminSendQuote,
  adminUpdateProductionStage,
  adminVerifyPayment,
  customerRespondToQuote,
  customerUploadPaymentProof,
  verifyOrderTrackingAccess,
} from "../lib/order-tracking.ts";
import {
  getCustomerSession,
  getOrCreateCustomerSession,
  normalizeWhatsappForSession,
  updateCustomerSessionIdentity,
} from "../lib/server/auth.ts";
import {
  createChatMessage,
  createCustomerThread,
  listAdminThreads,
} from "../lib/server/chat-repo.ts";
import { ensureChatSchema } from "../lib/server/chat-schema.ts";
import {
  createOrderInDb,
  getAdminOrderContextInDb,
  getOrderById,
  listOrdersByCustomerSessionInDb,
  saveOrderInDb,
} from "../lib/server/order-repo.ts";
import { ensureOrderSchema } from "../lib/server/order-schema.ts";
import {
  deleteDesignInDb,
  listDesignsInDb,
  listMeasurementProfilesInDb,
  saveDesignInDb,
  saveMeasurementProfileInDb,
} from "../lib/server/studio-repo.ts";
import { ensureStudioSchema } from "../lib/server/studio-schema.ts";

/**
 * Adapter D1Database berbasis node:sqlite (in-memory) untuk menjalankan SQL D1 nyata
 * (DDL, JOIN, WHERE, COUNT, ALTER TABLE) pada integration test Stage 6C.
 */
function createSqliteD1(): { db: D1Database; raw: DatabaseSync } {
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
      _sql: sql,
      _getParams: () => params,
    };
    return stmtObj;
  };

  const db = {
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

  return { db, raw };
}

function buildCookieHeaderFromSetCookie(setCookie: string): string {
  return setCookie.split(";")[0] ?? "";
}

describe("Stage 6C — Customer & Admin Data Integration (SQLite D1)", () => {
  it("menginisialisasi skema terintegrasi termasuk kolom relasi Stage 6C secara non-destruktif", async () => {
    const { db, raw } = createSqliteD1();
    await ensureChatSchema(db);
    await ensureOrderSchema(db);
    await ensureStudioSchema(db);

    const sessionCols = raw.prepare(`PRAGMA table_info(chat_customer_sessions)`).all() as Array<{
      name: string;
    }>;
    assert.ok(
      sessionCols.some((c) => c.name === "customer_email"),
      "Kolom customer_email harus ada pada chat_customer_sessions"
    );

    const orderCols = raw.prepare(`PRAGMA table_info(orders)`).all() as Array<{ name: string }>;
    assert.ok(orderCols.some((c) => c.name === "design_id"), "Kolom design_id harus ada pada orders");
    assert.ok(
      orderCols.some((c) => c.name === "measurement_profile_id"),
      "Kolom measurement_profile_id harus ada pada orders"
    );
  });

  it("menghubungkan guest session dengan identitas kontak, desain, profil ukuran, pesanan, dan chat secara terisolasi", async () => {
    const { db, raw } = createSqliteD1();
    await ensureChatSchema(db);
    await ensureOrderSchema(db);
    await ensureStudioSchema(db);

    // 1. Buat Guest A dan Guest B
    const createdA = await getOrCreateCustomerSession(new Request("https://celmira.local/api/orders"), db);
    const createdB = await getOrCreateCustomerSession(new Request("https://celmira.local/api/orders"), db);
    assert.ok(createdA.setCookieHeader && createdB.setCookieHeader);
    assert.notEqual(createdA.session.id, createdB.session.id);

    // 2. Guest A membuat desain di Design Studio & profil ukuran di Measurement Studio
    const designDraft = {
      ...createEmptyDesignDraft("kebaya"),
      title: "Kebaya Integrasi 6C",
      modelName: "Kebaya Kartini",
      specifications: {
        ...createEmptyDesignDraft("kebaya").specifications,
        fabric: "Brokat & Lace + Furing",
        colorName: "Champagne Ivory",
        colorHex: "#F4EDE1",
      },
    };
    const savedDesign = await saveDesignInDb(db, createdA.session.id, designDraft);
    assert.equal(savedDesign.ok, true);
    if (!savedDesign.ok) return;

    const measDraft = {
      ...createMeasurementDraftForTemplate("gamis", DEFAULT_MEASUREMENT_TEMPLATES),
      label: "Profil Utama 6C",
      values: {
        ...createMeasurementDraftForTemplate("gamis", DEFAULT_MEASUREMENT_TEMPLATES).values,
        bust: "94",
        waist: "74",
        garmentLength: "138",
      },
    };
    const savedProfile = await saveMeasurementProfileInDb(db, createdA.session.id, measDraft);
    assert.equal(savedProfile.ok, true);
    if (!savedProfile.ok) return;

    // 3. Guest A memulai chat konsultasi dari Design Studio (sebelum nama diisi)
    const { thread: preOrderThread } = await createCustomerThread(db, createdA.session.id, {
      context: {
        source: "design-studio",
        categoryId: "kebaya",
        designId: savedDesign.design.id,
        designTitle: savedDesign.design.title,
      },
    });
    await createChatMessage(db, {
      threadId: preOrderThread.id,
      sender: "customer",
      senderName: "Anda",
      body: "Halo, apakah brokat champagne tersedia untuk bulan depan?",
    });

    // 4. Guest A melakukan checkout pesanan 1 terhubung ke desain & profil ukuran
    const orderDraft1 = {
      ...createInitialOrderDraft(),
      categoryId: "kebaya" as const,
      designSource: "design-studio" as const,
      selectedStudioDesignId: savedDesign.design.id,
      specifications: { ...savedDesign.design.specifications },
      measurements: {
        ...createInitialOrderDraft().measurements,
        mode: "profile" as const,
        profileId: savedProfile.profile.id,
        profileName: savedProfile.profile.label,
        templateId: savedProfile.profile.templateId,
        values: { ...savedProfile.profile.values },
      },
      customer: {
        fullName: "Nadia Kartika",
        whatsapp: "+62 812-3456-7890",
        email: "nadia@example.test",
      },
      targetDate: "2027-06-15",
      agreementAccepted: true,
    };

    const order1 = await createOrderInDb(db, {
      draft: orderDraft1,
      customerSessionId: createdA.session.id,
      studioDesignTitle: savedDesign.design.title,
      studioDesignModelName: savedDesign.design.modelName,
    });
    await updateCustomerSessionIdentity(db, createdA.session.id, order1.customer);

    // Verifikasi kolom relasional design_id & measurement_profile_id tersimpan di D1
    const orderRow = raw
      .prepare(`SELECT design_id, measurement_profile_id FROM orders WHERE id = ?`)
      .get(order1.id) as { design_id: string | null; measurement_profile_id: string | null };
    assert.equal(orderRow.design_id, savedDesign.design.id);
    assert.equal(orderRow.measurement_profile_id, savedProfile.profile.id);

    // Verifikasi identitas guest session & backfill nama pelanggan di thread chat sebelumnya
    const sessionA = await getCustomerSession(
      new Request("https://celmira.local/api/orders", {
        headers: { cookie: buildCookieHeaderFromSetCookie(createdA.setCookieHeader) },
      }),
      db
    );
    assert.ok(sessionA);
    assert.equal(sessionA.customerName, "Nadia Kartika");
    assert.equal(sessionA.customerWhatsappNorm, normalizeWhatsappForSession("+62 812-3456-7890"));
    assert.equal(sessionA.customerEmail, "nadia@example.test");

    const adminThreadsRes = await listAdminThreads(db);
    assert.equal(adminThreadsRes.threads[0]?.customerName, "Nadia Kartika");

    // 5. Guest A mengajukan pesanan 2 untuk memverifikasi riwayat multi-order per sesi
    const order2 = await createOrderInDb(db, {
      draft: {
        ...orderDraft1,
        designSource: "custom-upload",
        selectedStudioDesignId: "",
        customDesignTitle: "Dress Lamaran Sage",
      },
      customerSessionId: createdA.session.id,
    });

    // 6. Isolasi Guest B: Guest B tidak boleh melihat pesanan, desain, atau profil Guest A
    const guestAOrders = await listOrdersByCustomerSessionInDb(db, createdA.session.id);
    const guestBOrders = await listOrdersByCustomerSessionInDb(db, createdB.session.id);
    assert.equal(guestAOrders.length, 2);
    assert.equal(guestBOrders.length, 0);
    assert.equal((await listDesignsInDb(db, createdB.session.id)).length, 0);
    assert.equal((await listMeasurementProfilesInDb(db, createdB.session.id)).length, 0);

    // 7. Immutability Snapshot: Ubah profil ukuran (94 -> 110) & hapus desain di Design Studio
    const updatedProfile = await saveMeasurementProfileInDb(
      db,
      createdA.session.id,
      {
        ...measDraft,
        id: savedProfile.profile.id,
        values: { ...measDraft.values, bust: "110" },
      },
      savedProfile.profile.id
    );
    assert.equal(updatedProfile.ok, true);
    const deletedDesign = await deleteDesignInDb(db, createdA.session.id, savedDesign.design.id);
    assert.equal(deletedDesign.ok, true);

    const reloadedOrder1 = await getOrderById(db, order1.id);
    assert.ok(reloadedOrder1);
    assert.equal(reloadedOrder1.order.measurements.values.bust, "94");
    assert.equal(reloadedOrder1.order.designTitle, "Kebaya Integrasi 6C");
    assert.equal(reloadedOrder1.order.specifications.fabric, "Brokat & Lace + Furing");

    // 8. Admin Integrated Order Context menggabungkan pelanggan, pesanan lain, & chat terkait
    const adminContext = await getAdminOrderContextInDb(db, order1.id);
    assert.ok(adminContext);
    assert.equal(adminContext.customerSummary.fullName, "Nadia Kartika");
    assert.equal(adminContext.customerSummary.totalOrders, 2);
    assert.equal(adminContext.customerSummary.totalMeasurementProfiles, 1);
    assert.equal(adminContext.customerSummary.totalDesigns, 0); // sudah dihapus, pesanan lama tetap aman
    assert.equal(adminContext.relatedOrders.length, 1);
    assert.equal(adminContext.relatedOrders[0]?.orderCode, order2.orderCode);
    assert.equal(adminContext.linkedThreads.length, 1);
    assert.equal(adminContext.linkedThreads[0]?.id, preOrderThread.id);
    assert.equal(adminContext.linkedThreads[0]?.unreadByAdmin, 1);
    assert.ok(
      adminContext.linkedThreads[0]?.recentMessages[0]?.body.includes("brokat champagne")
    );

    // 9. Regresi Tracking 2FA + Penawaran + DP 50% + Verifikasi Admin + Produksi
    const verifiedTrack = verifyOrderTrackingAccess(
      [reloadedOrder1.order],
      order1.orderCode,
      "081234567890"
    );
    assert.equal(verifiedTrack.ok, true);

    const quoted = adminSendQuote(reloadedOrder1.order, {
      tailoringFee: 1_200_000,
      estimatedCompletionDate: "2027-06-10",
    });
    assert.equal(quoted.ok, true);
    if (!quoted.ok) return;

    const approved = customerRespondToQuote(quoted.order, { decision: "approve" }, new Date(), 24);
    assert.equal(approved.ok, true);
    if (!approved.ok) return;
    assert.equal(approved.order.invoice.dpAmount, 600_000);

    const proof = customerUploadPaymentProof(approved.order, {
      stage: "dp",
      proofFileName: "dp.png",
      proofMimeType: "image/png",
      proofSize: 1024,
      proofPreviewDataUrl: "/api/orders/files/of-test-dp",
    });
    assert.equal(proof.ok, true);
    if (!proof.ok) return;

    const verifiedDp = adminVerifyPayment(proof.order, {
      stage: "dp",
      decision: "approve",
    });
    assert.equal(verifiedDp.ok, true);
    if (!verifiedDp.ok) return;

    const inProd = adminUpdateProductionStage(verifiedDp.order, { stage: "pemotongan_kain" });
    assert.equal(inProd.ok, true);
    if (!inProd.ok) return;

    const persisted = await saveOrderInDb(db, inProd.order);
    assert.equal(persisted.productionStage, "pemotongan_kain");
    assert.equal(persisted.measurements.values.bust, "94");
  });
});
