import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyDesignDraft } from "../lib/design-studio.ts";
import { createMeasurementDraftForTemplate } from "../lib/measurement-studio.ts";
import { createInitialOrderDraft } from "../lib/booking-options.ts";
import { STUDIO_SCHEMA_STATEMENTS } from "../lib/server/studio-schema.ts";
import {
  extractStudioFileIdFromUrl,
  validateStudioBinaryFile,
} from "../lib/server/studio-storage.ts";
import {
  generateStudioSyncCode,
  normalizeStudioSyncCode,
  saveDesignInDb,
  saveMeasurementProfileInDb,
  listDesignsInDb,
  listMeasurementProfilesInDb,
  getOrCreateStudioSyncCode,
  findCustomerSessionBySyncCode,
} from "../lib/server/studio-repo.ts";
import { createOrderInDb, getOrderById } from "../lib/server/order-repo.ts";

const PNG_HEADER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const FAKE_HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");

/**
 * Mock D1 minimal berbasis Map untuk menguji repository Design Studio, Measurement Studio,
 * Kode Sinkronisasi lintas browser, dan immutability snapshot ukuran pesanan.
 */
function createInMemoryMockDb() {
  const designs = new Map<string, Record<string, unknown>>();
  const profiles = new Map<string, Record<string, unknown>>();
  const syncCodes = new Map<string, { customer_session_id: string; sync_code: string }>();
  const orders = new Map<string, Record<string, unknown>>();

  const db = {
    async batch() {
      return [];
    },
    prepare(sql: string) {
      let bound: unknown[] = [];
      const stmt = {
        bind(...args: unknown[]) {
          bound = args;
          return stmt;
        },
        async first<T>() {
          if (/FROM studio_access_codes WHERE customer_session_id/i.test(sql)) {
            const row = syncCodes.get(String(bound[0]));
            return (row ?? null) as T;
          }
          if (/FROM studio_access_codes\s+WHERE sync_code/i.test(sql)) {
            for (const row of syncCodes.values()) {
              if (row.sync_code === bound[0]) return row as T;
            }
            return null as T;
          }
          if (/SELECT COUNT\(\*\) as total FROM design_configs/i.test(sql)) {
            const total = Array.from(designs.values()).filter(
              (r) => r.customer_session_id === bound[0]
            ).length;
            return { total } as T;
          }
          if (/FROM design_configs\s+WHERE id = \?/i.test(sql)) {
            return (designs.get(String(bound[0])) ?? null) as T;
          }
          if (/SELECT COUNT\(\*\) as total FROM measurement_profiles/i.test(sql)) {
            const total = Array.from(profiles.values()).filter(
              (r) => r.customer_session_id === bound[0]
            ).length;
            return { total } as T;
          }
          if (/FROM measurement_profiles\s+WHERE id = \?/i.test(sql)) {
            return (profiles.get(String(bound[0])) ?? null) as T;
          }
          if (/FROM orders WHERE id = \?/i.test(sql)) {
            return (orders.get(String(bound[0])) ?? null) as T;
          }
          return null as T;
        },
        async all<T>() {
          if (/FROM design_configs\s+WHERE customer_session_id = \?/i.test(sql)) {
            const results = Array.from(designs.values()).filter(
              (r) => r.customer_session_id === bound[0]
            );
            return { results: results as T[] };
          }
          if (/FROM measurement_profiles\s+WHERE customer_session_id = \?/i.test(sql)) {
            const results = Array.from(profiles.values()).filter(
              (r) => r.customer_session_id === bound[0]
            );
            return { results: results as T[] };
          }
          return { results: [] as T[] };
        },
        async run() {
          if (/INSERT INTO studio_access_codes/i.test(sql)) {
            syncCodes.set(String(bound[0]), {
              customer_session_id: String(bound[0]),
              sync_code: String(bound[1]),
            });
          } else if (/INSERT INTO design_configs/i.test(sql)) {
            designs.set(String(bound[0]), {
              id: bound[0],
              customer_session_id: bound[1],
              title: bound[2],
              category_id: bound[3],
              model_name: bound[4],
              specifications_json: bound[5],
              attachments_json: bound[6],
              created_at: bound[7],
              updated_at: bound[8],
            });
          } else if (/UPDATE design_configs/i.test(sql)) {
            const id = String(bound[6]);
            const existing = designs.get(id);
            if (existing) {
              designs.set(id, {
                ...existing,
                title: bound[0],
                category_id: bound[1],
                model_name: bound[2],
                specifications_json: bound[3],
                attachments_json: bound[4],
                updated_at: bound[5],
              });
            }
          } else if (/INSERT INTO measurement_profiles/i.test(sql)) {
            profiles.set(String(bound[0]), {
              id: bound[0],
              customer_session_id: bound[1],
              label: bound[2],
              template_id: bound[3],
              category_hint: bound[4],
              values_json: bound[5],
              extra_values_json: bound[6],
              notes: bound[7],
              created_at: bound[8],
              updated_at: bound[9],
            });
          } else if (/UPDATE measurement_profiles/i.test(sql)) {
            const id = String(bound[7]);
            const existing = profiles.get(id);
            if (existing) {
              profiles.set(id, {
                ...existing,
                label: bound[0],
                template_id: bound[1],
                category_hint: bound[2],
                values_json: bound[3],
                extra_values_json: bound[4],
                notes: bound[5],
                updated_at: bound[6],
              });
            }
          } else if (/INSERT INTO orders/i.test(sql)) {
            orders.set(String(bound[0]), {
              id: bound[0],
              order_code: bound[1],
              tracking_access_code: bound[2],
              customer_session_id: bound[3],
              status: bound[4],
              production_stage: bound[5],
              category_id: bound[6],
              customer_name: bound[7],
              customer_whatsapp: bound[8],
              target_date: bound[9],
              payload_json: bound[10],
              created_at: bound[11],
              updated_at: bound[12],
            });
          }
          return { success: true };
        },
      };
      return stmt;
    },
  };

  return db as unknown as D1Database;
}

describe("Stage 6B — Design Studio & Measurement Studio Backend", () => {
  it("memiliki DDL lengkap untuk tabel studio dan multi-device session tokens", () => {
    const joined = STUDIO_SCHEMA_STATEMENTS.join("\n");
    assert.match(joined, /CREATE TABLE IF NOT EXISTS customer_session_tokens/i);
    assert.match(joined, /CREATE TABLE IF NOT EXISTS studio_access_codes/i);
    assert.match(joined, /CREATE TABLE IF NOT EXISTS design_configs/i);
    assert.match(joined, /CREATE TABLE IF NOT EXISTS measurement_profiles/i);
    assert.match(joined, /CREATE TABLE IF NOT EXISTS studio_files/i);
  });

  it("memvalidasi file referensi studio (PNG/PDF valid, tolak HTML palsu dan >5MB)", () => {
    const png = validateStudioBinaryFile({ fileName: "sketsa-kebaya.png", bytes: PNG_HEADER });
    assert.equal(png.ok, true);
    if (png.ok) assert.equal(png.mimeType, "image/png");

    const pdf = validateStudioBinaryFile({ fileName: "referensi.pdf", bytes: PDF_HEADER });
    assert.equal(pdf.ok, true);
    if (pdf.ok) assert.equal(pdf.mimeType, "application/pdf");

    const spoof = validateStudioBinaryFile({ fileName: "fake.png", bytes: FAKE_HTML });
    assert.equal(spoof.ok, false);

    assert.equal(
      extractStudioFileIdFromUrl("/api/studio/files/sfile-abc-123"),
      "sfile-abc-123"
    );
    assert.equal(extractStudioFileIdFromUrl("/api/orders/files/ofile-1"), null);
  });

  it("menghasilkan dan menormalisasi Kode Sinkronisasi Studio secara konsisten", () => {
    const generated = generateStudioSyncCode();
    assert.match(generated, /^CS-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    assert.equal(normalizeStudioSyncCode("csab12cd34"), "CS-AB12-CD34");
    assert.equal(normalizeStudioSyncCode(" cs-ab12-cd34 "), "CS-AB12-CD34");
  });

  it("menyimpan & mengedit Design Studio serta dapat diakses ulang lintas sesi via syncCode", async () => {
    const db = createInMemoryMockDb();
    const sessionId = "csess-studio-test-1";

    const syncCode = await getOrCreateStudioSyncCode(db, sessionId);
    const draft = createEmptyDesignDraft("kebaya");
    draft.title = "Kebaya Wisuda Sage";
    draft.modelName = "Kebaya Kartini";
    draft.specifications.fabric = "Brokat";
    draft.specifications.colorName = "Sage";
    draft.specifications.colorHex = "#a8b3a1";

    const created = await saveDesignInDb(db, sessionId, draft, null);
    assert.equal(created.ok, true);
    if (!created.ok) return;

    // Edit desain yang sudah disimpan
    const editedDraft = {
      ...draft,
      id: created.design.id,
      title: "Kebaya Wisuda Sage Revisi",
      specifications: {
        ...draft.specifications,
        laceDetail: "Renda tipis bagian tepi",
      },
    };
    const updated = await saveDesignInDb(db, sessionId, editedDraft, created.design.id);
    assert.equal(updated.ok, true);

    // Simulasi browser context lain memulihkan sesi menggunakan syncCode
    const restoredSession = await findCustomerSessionBySyncCode(db, syncCode.toLowerCase());
    assert.ok(restoredSession);
    assert.equal(restoredSession.customerSessionId, sessionId);

    const designs = await listDesignsInDb(db, restoredSession.customerSessionId);
    assert.equal(designs.length, 1);
    assert.equal(designs[0].title, "Kebaya Wisuda Sage Revisi");
    assert.equal(designs[0].specifications.laceDetail, "Renda tipis bagian tepi");
  });

  it("menjaga snapshot ukuran pesanan lama tetap utuh ketika profil ukuran diperbarui", async () => {
    const db = createInMemoryMockDb();
    const sessionId = "csess-measure-test-1";

    // 1. Simpan profil ukuran awal di Measurement Studio
    const mDraft = createMeasurementDraftForTemplate("gamis");
    mDraft.label = "Profil Gamis Hana";
    mDraft.values.bust = "92";
    mDraft.values.waist = "74";
    mDraft.values.hip = "98";
    mDraft.values.shoulderWidth = "38";
    mDraft.values.sleeveLength = "56";
    mDraft.values.garmentLength = "138";
    mDraft.notes = "Kelonggaran standar";

    const savedProfile = await saveMeasurementProfileInDb(db, sessionId, mDraft, null);
    assert.equal(savedProfile.ok, true);
    if (!savedProfile.ok) return;

    // 2. Buat pesanan dengan profil ukuran tersebut
    const orderDraft = createInitialOrderDraft();
    orderDraft.categoryId = "gamis";
    orderDraft.designSource = "design-studio";
    orderDraft.selectedStudioDesignId = "dsn-123";
    orderDraft.measurements = {
      mode: "profile",
      profileId: savedProfile.profile.id,
      profileName: savedProfile.profile.label,
      templateId: savedProfile.profile.templateId,
      values: { ...savedProfile.profile.values },
      extraValues: savedProfile.profile.extraValues
        ? { ...savedProfile.profile.extraValues }
        : undefined,
      sampleGarmentNote: "",
      fitPreferenceNote: savedProfile.profile.notes,
    };
    orderDraft.customer = {
      fullName: "Hana Aprilia",
      whatsapp: "081234567890",
      email: "",
    };
    orderDraft.targetDate = "2027-01-15";
    orderDraft.agreedToTerms = true;

    const order = await createOrderInDb(db, {
      draft: orderDraft,
      customerSessionId: sessionId,
      studioDesignTitle: "Gamis Flowy Dusty Rose",
      studioDesignModelName: "Gamis Flowy",
    });

    assert.equal(order.measurements.values.bust, "92");
    assert.equal(order.designModelName, "Gamis Flowy");
    assert.ok(order.measurements.snapshotTakenAt);

    // 3. Perbarui profil ukuran customer di Measurement Studio (bust 92 -> 104, garmentLength 138 -> 144)
    const editedMeasureDraft = {
      ...mDraft,
      id: savedProfile.profile.id,
      label: "Profil Gamis Hana (Update)",
      values: {
        ...mDraft.values,
        bust: "104",
        garmentLength: "144",
      },
    };
    const updatedProfile = await saveMeasurementProfileInDb(
      db,
      sessionId,
      editedMeasureDraft,
      savedProfile.profile.id
    );
    assert.equal(updatedProfile.ok, true);

    // 4. Verifikasi profil baru berubah di D1
    const profilesAfter = await listMeasurementProfilesInDb(db, sessionId);
    assert.equal(profilesAfter[0].values.bust, "104");
    assert.equal(profilesAfter[0].values.garmentLength, "144");

    // 5. Verifikasi pesanan lama TIDAK berubah (tetap 92 & 138)
    const oldOrder = await getOrderById(db, order.id);
    assert.ok(oldOrder);
    assert.equal(oldOrder.order.measurements.values.bust, "92");
    assert.equal(oldOrder.order.measurements.values.garmentLength, "138");
    assert.equal(oldOrder.order.measurements.profileName, "Profil Gamis Hana");
  });
});
