import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyDesignDraft, createSavedDesignConfig } from "../lib/design-studio.ts";
import {
  DEFAULT_MEASUREMENT_TEMPLATES,
  createMeasurementDraftForTemplate,
  createSavedMeasurementProfile,
} from "../lib/measurement-studio.ts";
import { createInitialOrderDraft } from "../lib/booking-options.ts";
import { STUDIO_SCHEMA_STATEMENTS } from "../lib/server/studio-schema.ts";
import {
  extractStudioFileIdFromUrl,
  validateStudioBinaryFile,
} from "../lib/server/studio-storage.ts";
import {
  listDesignsInDb,
  listMeasurementProfilesInDb,
  migrateLegacyStudioDataInDb,
  saveDesignInDb,
  saveMeasurementProfileInDb,
} from "../lib/server/studio-repo.ts";
import {
  RECOVERY_TOKEN_TTL_MS,
  consumeGuestRecoveryToken,
  createGuestRecoveryToken,
  revokeActiveGuestRecoveryTokens,
} from "../lib/server/guest-recovery.ts";
import { createOrderInDb, getOrderById } from "../lib/server/order-repo.ts";

const PNG_HEADER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const FAKE_HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");

/**
 * Mock D1 in-memory untuk menguji repository Design Studio, Measurement Studio,
 * migrasi idempotent localStorage, token pemulihan privat satu kali pakai,
 * dan immutability snapshot ukuran pesanan.
 */
function createInMemoryMockDb() {
  const designs = new Map<string, Record<string, unknown>>();
  const profiles = new Map<string, Record<string, unknown>>();
  const orders = new Map<string, Record<string, unknown>>();
  const recoveryTokens = new Map<string, Record<string, unknown>>();
  const sessionTokens = new Map<string, Record<string, unknown>>();

  const db = {
    _recoveryTokens: recoveryTokens,
    _sessionTokens: sessionTokens,
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
          if (/FROM studio_recovery_tokens\s+WHERE token_hash = \?/i.test(sql)) {
            for (const row of recoveryTokens.values()) {
              if (row.token_hash === bound[0]) return row as T;
            }
            return null as T;
          }
          if (/FROM design_configs WHERE customer_session_id = \? AND legacy_local_id = \?/i.test(sql)) {
            for (const row of designs.values()) {
              if (row.customer_session_id === bound[0] && row.legacy_local_id === bound[1]) {
                return { id: row.id } as T;
              }
            }
            return null as T;
          }
          if (/FROM measurement_profiles WHERE customer_session_id = \? AND legacy_local_id = \?/i.test(sql)) {
            for (const row of profiles.values()) {
              if (row.customer_session_id === bound[0] && row.legacy_local_id === bound[1]) {
                return { id: row.id } as T;
              }
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
          if (/INSERT INTO studio_recovery_tokens/i.test(sql)) {
            recoveryTokens.set(String(bound[0]), {
              id: bound[0],
              customer_session_id: bound[1],
              token_hash: bound[2],
              expires_at: bound[3],
              used_at: null,
              revoked_at: null,
              created_at: bound[4],
            });
          } else if (/UPDATE studio_recovery_tokens\s+SET revoked_at = \?/i.test(sql)) {
            for (const row of recoveryTokens.values()) {
              if (
                row.customer_session_id === bound[1] &&
                row.used_at === null &&
                row.revoked_at === null
              ) {
                row.revoked_at = bound[0];
              }
            }
          } else if (/UPDATE studio_recovery_tokens\s+SET used_at = \?/i.test(sql)) {
            const target = recoveryTokens.get(String(bound[1]));
            if (target && target.used_at === null && target.revoked_at === null) {
              target.used_at = bound[0];
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          } else if (/INSERT INTO customer_session_tokens/i.test(sql)) {
            sessionTokens.set(String(bound[0]), {
              id: bound[0],
              customer_session_id: bound[1],
              token_hash: bound[2],
              expires_at: bound[3],
              revoked_at: null,
              created_at: bound[4],
              last_seen_at: bound[5],
            });
          } else if (/INSERT INTO design_configs/i.test(sql)) {
            const hasLegacy = /legacy_local_id/i.test(sql);
            if (hasLegacy) {
              designs.set(String(bound[0]), {
                id: bound[0],
                customer_session_id: bound[1],
                legacy_local_id: bound[2],
                title: bound[3],
                category_id: bound[4],
                model_name: bound[5],
                specifications_json: bound[6],
                attachments_json: bound[7],
                created_at: bound[8],
                updated_at: bound[9],
              });
            } else {
              designs.set(String(bound[0]), {
                id: bound[0],
                customer_session_id: bound[1],
                legacy_local_id: null,
                title: bound[2],
                category_id: bound[3],
                model_name: bound[4],
                specifications_json: bound[5],
                attachments_json: bound[6],
                created_at: bound[7],
                updated_at: bound[8],
              });
            }
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
            const hasLegacy = /legacy_local_id/i.test(sql);
            if (hasLegacy) {
              profiles.set(String(bound[0]), {
                id: bound[0],
                customer_session_id: bound[1],
                legacy_local_id: bound[2],
                label: bound[3],
                template_id: bound[4],
                category_hint: bound[5],
                values_json: bound[6],
                extra_values_json: bound[7],
                notes: bound[8],
                created_at: bound[9],
                updated_at: bound[10],
              });
            } else {
              profiles.set(String(bound[0]), {
                id: bound[0],
                customer_session_id: bound[1],
                legacy_local_id: null,
                label: bound[2],
                template_id: bound[3],
                category_hint: bound[4],
                values_json: bound[5],
                extra_values_json: bound[6],
                notes: bound[7],
                created_at: bound[8],
                updated_at: bound[9],
              });
            }
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

  return db as unknown as D1Database & {
    _recoveryTokens: Map<string, Record<string, unknown>>;
    _sessionTokens: Map<string, Record<string, unknown>>;
  };
}

describe("Stage 6B & Pure Guest System — Studios, Private Recovery & Migration", () => {
  it("memiliki DDL lengkap untuk guest session tokens (expires/revoked), recovery tokens, dan tabel studio", () => {
    const joined = STUDIO_SCHEMA_STATEMENTS.join("\n");
    assert.match(joined, /CREATE TABLE IF NOT EXISTS customer_session_tokens/i);
    assert.match(joined, /expires_at/i);
    assert.match(joined, /revoked_at/i);
    assert.match(joined, /CREATE TABLE IF NOT EXISTS studio_recovery_tokens/i);
    assert.match(joined, /CREATE TABLE IF NOT EXISTS design_configs/i);
    assert.match(joined, /CREATE TABLE IF NOT EXISTS measurement_profiles/i);
    assert.match(joined, /CREATE TABLE IF NOT EXISTS studio_files/i);
    assert.match(joined, /legacy_local_id/i);
  });

  it("token pemulihan privat hanya menyimpan hash, satu kali pakai, dapat kedaluwarsa, dan dapat dicabut", async () => {
    const db = createInMemoryMockDb();
    const sessionId = "csess-guest-recovery-1";
    const req = new Request("https://celmira.local/api/studio/recovery-links/consume", {
      method: "POST",
    });

    const t0 = new Date("2026-11-27T10:00:00.000Z");
    const created = await createGuestRecoveryToken(db, sessionId, t0);
    assert.equal(created.token.length, 64);

    // Pastikan plaintext token TIDAK pernah tersimpan di database (hanya hash SHA-256)
    const storedRows = Array.from(db._recoveryTokens.values());
    assert.equal(storedRows.length, 1);
    assert.notEqual(storedRows[0].token_hash, created.token);

    // Pemakaian pertama valid -> menghasilkan cookie HttpOnly dan menandai used_at
    const firstConsume = await consumeGuestRecoveryToken(
      req,
      db,
      created.token,
      new Date(t0.getTime() + 60_000)
    );
    assert.equal(firstConsume.ok, true);
    if (firstConsume.ok) {
      assert.equal(firstConsume.customerSessionId, sessionId);
      assert.match(firstConsume.setCookieHeader, /celmira_chat_session=/);
      assert.match(firstConsume.setCookieHeader, /HttpOnly/);
    }

    // Pemakaian kedua (replay) HARUS ditolak 410
    const replay = await consumeGuestRecoveryToken(
      req,
      db,
      created.token,
      new Date(t0.getTime() + 120_000)
    );
    assert.equal(replay.ok, false);
    if (!replay.ok) assert.equal(replay.status, 410);

    // Token baru yang dicabut HARUS ditolak 410
    const created2 = await createGuestRecoveryToken(db, sessionId, t0);
    await revokeActiveGuestRecoveryTokens(db, sessionId, new Date(t0.getTime() + 5_000));
    const afterRevoke = await consumeGuestRecoveryToken(
      req,
      db,
      created2.token,
      new Date(t0.getTime() + 10_000)
    );
    assert.equal(afterRevoke.ok, false);
    if (!afterRevoke.ok) assert.equal(afterRevoke.status, 410);

    // Token kedaluwarsa (> 15 menit) HARUS ditolak 410
    const created3 = await createGuestRecoveryToken(db, sessionId, t0);
    const afterExpiry = await consumeGuestRecoveryToken(
      req,
      db,
      created3.token,
      new Date(t0.getTime() + RECOVERY_TOKEN_TTL_MS + 1000)
    );
    assert.equal(afterExpiry.ok, false);
    if (!afterExpiry.ok) assert.equal(afterExpiry.status, 410);

    // ID tebakan pendek HARUS ditolak 400
    const guess = await consumeGuestRecoveryToken(req, db, "csess-123");
    assert.equal(guess.ok, false);
    if (!guess.ok) assert.equal(guess.status, 400);
  });

  it("memvalidasi file referensi studio (PNG/PDF valid, tolak HTML palsu)", () => {
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

  it("memigrasikan data localStorage lama ke D1 secara idempotent tanpa duplikasi", async () => {
    const db = createInMemoryMockDb();
    const sessionId = "csess-migrate-1";

    const dDraft = createEmptyDesignDraft("kebaya");
    dDraft.title = "Kebaya Legacy Browser";
    const legacyDesign = createSavedDesignConfig({ ...dDraft, id: "design-legacy-1" });

    const mDraft = createMeasurementDraftForTemplate("gamis");
    mDraft.label = "Profil Legacy Browser";
    mDraft.values.bust = "90";
    mDraft.values.waist = "72";
    mDraft.values.garmentLength = "136";
    const legacyProfile = createSavedMeasurementProfile(
      { ...mDraft, id: "profile-legacy-1" },
      DEFAULT_MEASUREMENT_TEMPLATES
    );

    const first = await migrateLegacyStudioDataInDb(db, null, sessionId, {
      designs: [legacyDesign],
      profiles: [legacyProfile],
    });
    assert.equal(first.migratedDesigns, 1);
    assert.equal(first.migratedProfiles, 1);
    assert.equal(first.designs.length, 1);
    assert.equal(first.profiles.length, 1);

    const second = await migrateLegacyStudioDataInDb(db, null, sessionId, {
      designs: [legacyDesign],
      profiles: [legacyProfile],
    });
    assert.equal(second.migratedDesigns, 0);
    assert.equal(second.migratedProfiles, 0);
    assert.equal(second.designs.length, 1);
    assert.equal(second.profiles.length, 1);
  });

  it("menyimpan & memperbarui Design Studio di D1 secara konsisten", async () => {
    const db = createInMemoryMockDb();
    const sessionId = "csess-studio-test-1";

    const draft = createEmptyDesignDraft("kebaya");
    draft.title = "Kebaya Wisuda Sage";
    draft.modelName = "Kebaya Kartini";
    draft.specifications.fabric = "Brokat & Lace + Furing";
    draft.specifications.colorName = "Sage";
    draft.specifications.colorHex = "#a8b3a1";

    const created = await saveDesignInDb(db, sessionId, draft, null);
    assert.equal(created.ok, true);
    if (!created.ok) return;

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

    const designs = await listDesignsInDb(db, sessionId);
    assert.equal(designs.length, 1);
    assert.equal(designs[0].title, "Kebaya Wisuda Sage Revisi");
    assert.equal(designs[0].specifications.laceDetail, "Renda tipis bagian tepi");
  });

  it("menjaga snapshot ukuran pesanan lama tetap utuh ketika profil ukuran diperbarui", async () => {
    const db = createInMemoryMockDb();
    const sessionId = "csess-measure-test-1";

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

    const profilesAfter = await listMeasurementProfilesInDb(db, sessionId);
    assert.equal(profilesAfter[0].values.bust, "104");
    assert.equal(profilesAfter[0].values.garmentLength, "144");

    const oldOrder = await getOrderById(db, order.id);
    assert.ok(oldOrder);
    assert.equal(oldOrder.order.measurements.values.bust, "92");
    assert.equal(oldOrder.order.measurements.values.garmentLength, "138");
    assert.equal(oldOrder.order.measurements.profileName, "Profil Gamis Hana");
  });
});
