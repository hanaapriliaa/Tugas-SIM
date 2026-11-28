import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import {
  computeProductionScheduleSummary,
  createDefaultProductionCapacityConfig,
  validateMeasurementTemplateUpdate,
  validateProductionCapacityInput,
} from "../lib/admin-modules.ts";
import { createInitialOrderDraft } from "../lib/booking-options.ts";
import { createEmptyDesignDraft } from "../lib/design-studio.ts";
import {
  DEFAULT_MEASUREMENT_TEMPLATES,
  createMeasurementDraftForTemplate,
} from "../lib/measurement-studio.ts";
import {
  getAdminCustomerDetailInDb,
  getAdminProductionScheduleInDb,
  getOrInitProductionCapacityInDb,
  listAdminCustomersInDb,
  listMeasurementTemplatesInDb,
  resetMeasurementTemplatesInDb,
  saveAdminCustomerNoteInDb,
  saveMeasurementTemplateInDb,
  updateProductionCapacityInDb,
} from "../lib/server/admin-repo.ts";
import { ensureAdminModuleSchema } from "../lib/server/admin-schema.ts";
import {
  getOrCreateCustomerSession,
  updateCustomerSessionIdentity,
} from "../lib/server/auth.ts";
import { createChatMessage, createCustomerThread } from "../lib/server/chat-repo.ts";
import { createOrderInDb, saveOrderInDb } from "../lib/server/order-repo.ts";
import { saveDesignInDb, saveMeasurementProfileInDb } from "../lib/server/studio-repo.ts";

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

describe("Stage 6D — Admin Dashboard Modules (Templates, Schedule/Capacity, Customers)", () => {
  it("menginisialisasi 3 tabel baru Stage 6D secara non-destruktif", async () => {
    const { db, raw } = createSqliteD1();
    await ensureAdminModuleSchema(db);

    const tables = raw
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
      .all() as Array<{ name: string }>;
    const names = new Set(tables.map((t) => t.name));

    assert.ok(names.has("admin_measurement_templates"));
    assert.ok(names.has("admin_production_capacity"));
    assert.ok(names.has("admin_customer_notes"));
  });

  it("mengelola template ukuran di D1, memvalidasi batas cm, sinkron ke Measurement Studio, dan reset ke bawaan", async () => {
    const { db } = createSqliteD1();
    const initial = await listMeasurementTemplatesInDb(db);
    assert.equal(initial.length, DEFAULT_MEASUREMENT_TEMPLATES.length);

    // Validasi menolak rentang min >= max
    const gamis = initial.find((t) => t.id === "gamis")!;
    const invalidMinMax = validateMeasurementTemplateUpdate(
      {
        ...gamis,
        fields: gamis.fields.map((f) => (f.key === "bust" ? { ...f, min: 120, max: 100 } : f)),
      },
      initial
    );
    assert.equal(invalidMinMax.valid, false);

    // Simpan perubahan rentang bust gamis ke D1 (max dinaikkan ke 180 cm)
    const updatedGamis = {
      ...gamis,
      name: "Gamis & Dress Celmira Custom",
      fields: gamis.fields.map((f) =>
        f.key === "bust" ? { ...f, min: 70, max: 180, defaultValue: 96 } : f
      ),
    };
    const saved = await saveMeasurementTemplateInDb(db, updatedGamis);
    assert.equal(saved.ok, true);
    if (!saved.ok) return;

    const reloaded = await listMeasurementTemplatesInDb(db);
    const reloadedGamis = reloaded.find((t) => t.id === "gamis")!;
    assert.equal(reloadedGamis.name, "Gamis & Dress Celmira Custom");
    assert.equal(reloadedGamis.fields.find((f) => f.key === "bust")?.max, 180);

    // Pastikan saveMeasurementProfileInDb otomatis memakai batas 180 cm dari D1
    const { session } = await getOrCreateCustomerSession(
      new Request("https://celmira.local/api/studio/measurements"),
      db
    );
    const draft = createMeasurementDraftForTemplate("gamis", reloaded);
    draft.label = "Profil Plus Size";
    draft.values.bust = "168";
    const profileRes = await saveMeasurementProfileInDb(db, session.id, draft);
    assert.equal(profileRes.ok, true);

    // Pastikan tidak boleh menonaktifkan seluruh template
    let currentList = reloaded;
    for (const tpl of currentList) {
      if (tpl.id === "gamis") continue;
      const res = await saveMeasurementTemplateInDb(db, { ...tpl, active: false });
      assert.equal(res.ok, true);
      if (res.ok) currentList = res.templates;
    }
    const disableLast = await saveMeasurementTemplateInDb(db, {
      ...reloadedGamis,
      active: false,
    });
    assert.equal(disableLast.ok, false);

    // Reset ke bawaan
    const afterReset = await resetMeasurementTemplatesInDb(db);
    assert.equal(
      afterReset.find((t) => t.id === "gamis")?.name,
      DEFAULT_MEASUREMENT_TEMPLATES.find((t) => t.id === "gamis")?.name
    );
  });

  it("menyimpan kapasitas produksi, mendeteksi over-capacity mingguan/harian, dan bentrok tanggal libur", async () => {
    const { db } = createSqliteD1();

    const invalidCap = validateProductionCapacityInput({
      weeklyOrderLimit: 0,
    });
    assert.equal(invalidCap.valid, false);

    const invalidDate = validateProductionCapacityInput({
      blockedDates: [{ date: "2026-02-31", reason: "Tidak valid" }],
    });
    assert.equal(invalidDate.valid, false);

    const defaultCap = await getOrInitProductionCapacityInDb(db);
    assert.equal(defaultCap.weeklyOrderLimit, 12);

    const updated = await updateProductionCapacityInDb(db, {
      weeklyOrderLimit: 2,
      dailyTargetLimit: 1,
      standardLeadDays: 12,
      blockedDates: [{ date: "2026-12-03", reason: "Libur workshop internal" }],
      categoryLeadDays: { kebaya: 16, mukena: 6 },
      operationalNote: "Slot Desember dibatasi agar kualitas QC terjaga.",
    });
    assert.equal(updated.ok, true);
    if (!updated.ok) return;
    assert.equal(updated.capacity.weeklyOrderLimit, 2);
    assert.equal(updated.capacity.blockedDates.length, 1);

    // Buat 3 pesanan aktif di minggu 2026-11-30 s.d. 2026-12-06 (2 di tanggal 2026-12-03 yang diblokir)
    const refDate = new Date("2026-11-30T08:00:00.000Z");
    const makeDraft = (name: string, targetDate: string) => ({
      ...createInitialOrderDraft(),
      categoryId: "kebaya" as const,
      designSource: "celmira" as const,
      selectedCelmiraDesignId: "celmira-kebaya-brokat-panjang",
      customer: { fullName: name, whatsapp: "081234567890", email: "" },
      targetDate,
      agreedToTerms: true,
    });

    const ord1 = await createOrderInDb(db, {
      draft: makeDraft("Siti", "2026-12-03"),
      customerSessionId: null,
      now: refDate,
    });
    const ord2 = await createOrderInDb(db, {
      draft: makeDraft("Rina", "2026-12-03"),
      customerSessionId: null,
      now: refDate,
    });
    const ord3 = await createOrderInDb(db, {
      draft: makeDraft("Dewi", "2026-12-04"),
      customerSessionId: null,
      now: refDate,
    });
    // Pesanan selesai tidak boleh masuk antrean aktif
    const ordDone = await createOrderInDb(db, {
      draft: makeDraft("Budi", "2026-12-03"),
      customerSessionId: null,
      now: refDate,
    });
    await saveOrderInDb(db, { ...ordDone, status: "selesai", productionStage: "pesanan_selesai" });

    assert.ok(ord1.orderCode && ord2.orderCode && ord3.orderCode);

    const schedule = await getAdminProductionScheduleInDb(db, refDate);
    assert.equal(schedule.metrics.totalActiveOrders, 3);
    assert.equal(schedule.metrics.blockedDateConflicts, 2);
    assert.equal(schedule.weeks[0]?.activeCount, 3);
    assert.equal(schedule.weeks[0]?.status, "melebihi_kapasitas");
    assert.equal(schedule.dailyAlerts.length, 1);
    assert.equal(schedule.dailyAlerts[0]?.date, "2026-12-03");
    assert.equal(schedule.dailyAlerts[0]?.isBlocked, true);
    assert.equal(schedule.dailyAlerts[0]?.count, 2);

    // Cek pure function computeProductionScheduleSummary dengan konfigurasi default
    const pureSummary = computeProductionScheduleSummary(
      [],
      createDefaultProductionCapacityConfig(refDate),
      refDate
    );
    assert.equal(pureSummary.weeks.length, 6);
    assert.equal(pureSummary.metrics.totalActiveOrders, 0);
  });

  it("mengagregasi direktori pelanggan dari pesanan, studio, chat, dan menyimpan catatan internal admin", async () => {
    const { db } = createSqliteD1();
    await ensureAdminModuleSchema(db);

    const { session } = await getOrCreateCustomerSession(
      new Request("https://celmira.local/api/orders"),
      db
    );
    await updateCustomerSessionIdentity(db, session.id, {
      fullName: "Aulia Rahma",
      whatsapp: "0812-8899-7766",
      email: "aulia@example.com",
    });

    // Simpan desain studio & profil ukuran
    const designDraft = {
      ...createEmptyDesignDraft("gamis"),
      title: "Gamis Lebaran Aulia",
      modelName: "Gamis A-Line",
    };
    const savedDesign = await saveDesignInDb(db, session.id, designDraft);
    assert.equal(savedDesign.ok, true);

    const measureDraft = createMeasurementDraftForTemplate("gamis");
    measureDraft.label = "Ukuran Aulia 2026";
    const savedMeasure = await saveMeasurementProfileInDb(db, session.id, measureDraft);
    assert.equal(savedMeasure.ok, true);

    // Buat 2 pesanan (repeat customer)
    const draft = {
      ...createInitialOrderDraft(),
      categoryId: "gamis" as const,
      designSource: "celmira" as const,
      selectedCelmiraDesignId: "celmira-gamis-layer-flowy",
      customer: {
        fullName: "Aulia Rahma",
        whatsapp: "081288997766",
        email: "aulia@example.com",
      },
      targetDate: "2026-12-20",
      agreedToTerms: true,
    };
    const orderA = await createOrderInDb(db, { draft, customerSessionId: session.id });
    const orderB = await createOrderInDb(db, { draft, customerSessionId: session.id });

    // Buat chat thread & pesan customer
    const createdThread = await createCustomerThread(db, session.id, {
      title: `Diskusi ${orderA.orderCode}`,
      customerName: "Aulia Rahma",
      context: { source: "orders", orderCode: orderA.orderCode },
    });
    await createChatMessage(db, {
      threadId: createdThread.thread.id,
      sender: "customer",
      senderName: "Aulia Rahma",
      body: "Halo kak, apakah bahan ceruty tersedia?",
    });

    // Simpan catatan internal admin
    const noteRes = await saveAdminCustomerNoteInDb(
      db,
      session.id,
      "Pelanggan prioritas, suka lengan agak longgar."
    );
    assert.equal(noteRes.ok, true);

    const customers = await listAdminCustomersInDb(db);
    assert.equal(customers.length, 1);
    const rec = customers[0]!;
    assert.equal(rec.fullName, "Aulia Rahma");
    assert.equal(rec.totalOrders, 2);
    assert.equal(rec.activeOrders, 2);
    assert.equal(rec.totalDesigns, 1);
    assert.equal(rec.totalMeasurementProfiles, 1);
    assert.equal(rec.totalChatThreads, 1);
    assert.equal(rec.unreadChatByAdmin, 1);
    assert.equal(rec.internalNote, "Pelanggan prioritas, suka lengan agak longgar.");

    const detail = await getAdminCustomerDetailInDb(db, session.id);
    assert.ok(detail);
    assert.equal(detail.orders.length, 2);
    assert.ok(detail.orders.some((o) => o.orderCode === orderB.orderCode));
    assert.equal(detail.designs.length, 1);
    assert.equal(detail.measurementProfiles.length, 1);
    assert.equal(detail.chatThreads.length, 1);
  });
});
