import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_CHAT_IMAGE_DATA_URL_LENGTH,
  MAX_CHAT_IMAGES_PER_MESSAGE,
  MAX_CHAT_THREADS,
  MAX_MESSAGES_PER_THREAD,
  appendCustomerMessage,
  buildChatHref,
  buildOfficialWhatsappHref,
  createChatThread,
  createDefaultAdminChatConfig,
  filterChatThreads,
  findMatchingContextThread,
  getTotalUnreadForCustomer,
  markCustomerMessagesReadByAdmin,
  markThreadReadByCustomer,
  parseChatQueryParams,
  prepareChatThreadsForStorage,
  sanitizeOrderCodeParam,
  upsertChatThreadInList,
  validateChatImageFile,
  validateChatMessageInput,
} from "../lib/chat.ts";

test("konfigurasi chat bawaan tidak berisi nomor WhatsApp palsu", () => {
  const config = createDefaultAdminChatConfig();
  assert.equal(config.officialWhatsappNumber, undefined);
  assert.equal(buildOfficialWhatsappHref(config.officialWhatsappNumber), null);
  assert.equal(
    buildOfficialWhatsappHref("0812-3456-7890", "Halo Celmira"),
    "https://wa.me/6281234567890?text=Halo%20Celmira"
  );
});

test("buildChatHref dan parseChatQueryParams memvalidasi serta meng-encode parameter URL dengan aman", () => {
  const href = buildChatHref({
    source: "track",
    orderCode: "ct-20261126-rfde",
    category: "kebaya",
    designId: "dsn-123",
    measurementId: "prf-456",
    template: "gamis",
  });
  assert.equal(
    href,
    "/chat?source=track&orderCode=CT-20261126-RFDE&category=kebaya&designId=dsn-123&measurementId=prf-456&template=gamis"
  );

  const parsed = parseChatQueryParams(new URLSearchParams(href.split("?")[1]));
  assert.equal(parsed.source, "track");
  assert.equal(parsed.orderCode, "CT-20261126-RFDE");
  assert.equal(parsed.categoryId, "kebaya");
  assert.equal(parsed.designId, "dsn-123");
  assert.equal(parsed.measurementProfileId, "prf-456");
  assert.equal(parsed.templateId, "gamis");

  // Parameter tidak valid harus ditolak secara aman
  const invalidParsed = parseChatQueryParams(
    new URLSearchParams("source=hacked&orderCode=INVALID-123&category=tidak-ada&template=alien")
  );
  assert.equal(invalidParsed.source, "general");
  assert.equal(invalidParsed.orderCode, undefined);
  assert.equal(invalidParsed.categoryId, undefined);
  assert.equal(invalidParsed.templateId, undefined);
  assert.equal(sanitizeOrderCodeParam("CT-20261126-AB12"), "CT-20261126-AB12");
  assert.equal(sanitizeOrderCodeParam("<script>alert(1)</script>"), undefined);
});

test("validateChatImageFile dan validateChatMessageInput menegakkan format, ukuran, dan batas lampiran", () => {
  assert.equal(
    validateChatImageFile({ name: "kebaya.jpg", size: 512_000, type: "image/jpeg" }),
    null
  );
  assert.equal(
    validateChatImageFile({ name: "sketsa.webp", size: 200_000, type: "image/webp" }),
    null
  );
  assert.ok(
    validateChatImageFile({ name: "dokumen.pdf", size: 100_000, type: "application/pdf" })
  );
  assert.ok(validateChatImageFile({ name: "kosong.png", size: 0, type: "image/png" }));
  assert.ok(
    validateChatImageFile({ name: "terlalu-besar.png", size: 6 * 1024 * 1024, type: "image/png" })
  );

  assert.equal(validateChatMessageInput("   ", []).valid, false);
  assert.equal(
    validateChatMessageInput("", [
      { id: "1", name: "a.jpg", size: 1000, mimeType: "image/jpeg" },
    ]).valid,
    true
  );

  const tooMany = Array.from({ length: MAX_CHAT_IMAGES_PER_MESSAGE + 1 }, (_, i) => ({
    id: String(i),
    name: `img-${i}.jpg`,
    size: 1000,
    mimeType: "image/jpeg",
  }));
  assert.equal(validateChatMessageInput("Halo", tooMany).valid, false);
});

test("appendCustomerMessage menyimpan status terkirim tanpa balasan admin palsu dan status dibaca siap untuk Tahap 5B", () => {
  const t1 = new Date("2026-11-26T10:00:00.000Z");
  const t2 = new Date("2026-11-26T10:05:00.000Z");

  const thread = createChatThread(
    {
      context: { source: "track", orderCode: "CT-20261126-RFDE" },
    },
    t1
  );

  const sent = appendCustomerMessage(
    thread,
    { body: "Halo, apakah bahan brokat maroon tersedia?" },
    t1
  );
  assert.equal(sent.ok, true);
  if (!sent.ok) return;

  assert.equal(sent.thread.messages.length, 1);
  assert.equal(sent.message.sender, "customer");
  assert.equal(sent.message.status, "terkirim");
  assert.equal(sent.thread.unreadByAdmin, 1);

  const readByAdmin = markCustomerMessagesReadByAdmin(sent.thread, t2);
  assert.equal(readByAdmin.unreadByAdmin, 0);
  assert.equal(readByAdmin.messages[0].status, "dibaca");
  assert.equal(readByAdmin.messages[0].readAt, t2.toISOString());

  // Jika ada pesan admin masuk, markThreadReadByCustomer menandai terbaca
  const withAdminMsg = {
    ...readByAdmin,
    unreadByCustomer: 1,
    messages: [
      ...readByAdmin.messages,
      {
        id: "adm-1",
        threadId: readByAdmin.id,
        sender: "admin" as const,
        senderName: "Tim Atelier Celmira",
        body: "Tersedia kak.",
        attachments: [],
        createdAt: t2.toISOString(),
        status: "terkirim" as const,
      },
    ],
  };
  assert.equal(getTotalUnreadForCustomer([withAdminMsg]), 1);
  const readByCustomer = markThreadReadByCustomer(withAdminMsg, t2);
  assert.equal(readByCustomer.unreadByCustomer, 0);
  assert.equal(readByCustomer.messages[1].status, "dibaca");
});

test("filterChatThreads, findMatchingContextThread, dan manajemen daftar thread berjalan konsisten", () => {
  const tOld = createChatThread(
    { title: "Konsultasi Gamis", context: { source: "design-studio", designId: "dsn-1" } },
    new Date("2026-11-26T08:00:00.000Z")
  );
  const tOrder = createChatThread(
    { context: { source: "track", orderCode: "CT-20261126-AB12" } },
    new Date("2026-11-26T09:00:00.000Z")
  );
  const sentOrder = appendCustomerMessage(
    tOrder,
    { body: "Kapan pesanan kebaya mulai dipotong?" },
    new Date("2026-11-26T09:30:00.000Z")
  );
  assert.equal(sentOrder.ok, true);
  if (!sentOrder.ok) return;

  const list = upsertChatThreadInList([tOld], sentOrder.thread);
  assert.equal(list[0].id, sentOrder.thread.id);

  assert.equal(
    findMatchingContextThread(list, { source: "track", orderCode: "CT-20261126-AB12" })?.id,
    sentOrder.thread.id
  );
  assert.equal(
    findMatchingContextThread(list, { source: "design-studio", designId: "dsn-1" })?.id,
    tOld.id
  );

  assert.equal(filterChatThreads(list, "ab12").length, 1);
  assert.equal(filterChatThreads(list, "dipotong").length, 1);
  assert.equal(filterChatThreads(list, "", "design-studio").length, 1);
  assert.equal(filterChatThreads(list, "tidak-ketemu").length, 0);
});

test("prepareChatThreadsForStorage membatasi jumlah thread, pesan, dan ukuran preview gambar", () => {
  const oversized = `data:image/jpeg;base64,${"A".repeat(MAX_CHAT_IMAGE_DATA_URL_LENGTH + 50)}`;
  const validPreview = "data:image/jpeg;base64,VALID";

  let thread = createChatThread({ title: "Uji Kapasitas" }, new Date("2026-11-26T10:00:00.000Z"));
  for (let i = 0; i < MAX_MESSAGES_PER_THREAD + 5; i++) {
    const res = appendCustomerMessage(
      thread,
      {
        body: `Pesan ke-${i}`,
        attachments: [
          {
            id: `img-${i}`,
            name: `ref-${i}.jpg`,
            size: 1024,
            mimeType: "image/jpeg",
            previewDataUrl: i === 0 ? oversized : validPreview,
          },
        ],
      },
      new Date(Date.UTC(2026, 10, 26, 10, i))
    );
    if (res.ok) thread = res.thread;
  }

  const manyThreads = Array.from({ length: MAX_CHAT_THREADS + 4 }, (_, i) => ({
    ...thread,
    id: `thread-${i}`,
  }));

  const prepared = prepareChatThreadsForStorage(manyThreads);
  assert.equal(prepared.length, MAX_CHAT_THREADS);
  assert.equal(prepared[0].messages.length, MAX_MESSAGES_PER_THREAD);

  const stripped = prepareChatThreadsForStorage(manyThreads, { keepImagesOnlyForTopCount: 1 });
  assert.equal(stripped[0].messages[0].attachments[0].previewDataUrl, validPreview);
  assert.equal(stripped[1].messages[0].attachments[0].previewDataUrl, undefined);

  // Oversized preview dibersihkan otomatis saat appendCustomerMessage
  const tCheck = createChatThread({ title: "Oversized" });
  const oversizedRes = appendCustomerMessage(tCheck, {
    body: "Cek gambar besar",
    attachments: [
      {
        id: "big-1",
        name: "big.jpg",
        size: 1000,
        mimeType: "image/jpeg",
        previewDataUrl: oversized,
      },
    ],
  });
  assert.equal(oversizedRes.ok, true);
  if (oversizedRes.ok) {
    assert.equal(oversizedRes.message.attachments[0].previewDataUrl, undefined);
  }
});
