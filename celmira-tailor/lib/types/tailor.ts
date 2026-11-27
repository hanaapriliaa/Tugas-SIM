export type GarmentCategoryId =
  | "kebaya"
  | "gamis"
  | "kemeja-pria"
  | "blazer"
  | "mukena"
  | "busana-wisuda"
  | "busana-pernikahan"
  | "custom-lainnya";

export type GarmentCategoryOption = {
  id: GarmentCategoryId;
  index: string;
  name: string;
  description: string;
  detail: string;
  defaultLengthLabel: string;
};

export type DesignSourceType = "celmira" | "custom-upload" | "design-studio";

export type CelmiraDesignReference = {
  id: string;
  title: string;
  categoryId: GarmentCategoryId;
  subtitle: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  sourceNote: string;
  defaults: {
    fabric: string;
    colorName: string;
    colorHex: string;
    sleeveStyle: string;
    collarStyle: string;
    lengthOption: string;
  };
};

export type ReferenceAttachment = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: "image" | "pdf";
  url?: string;
  previewDataUrl?: string;
  note?: string;
};

export type GarmentSpecifications = {
  fabric: string;
  customFabricNote: string;
  colorName: string;
  colorHex: string;
  sleeveStyle: string;
  collarStyle: string;
  lengthOption: string;
  laceDetail: string;
  embroideryDetail: string;
  buttonStyle: string;
  zipperStyle: string;
  notes: string;
};

export type MeasurementInputMode = "manual" | "profile" | "sample_garment";

export type MeasurementValues = {
  bust: string;
  waist: string;
  hip: string;
  shoulderWidth: string;
  sleeveLength: string;
  garmentLength: string;
  neckCircumference: string;
};

export type MeasurementStandardKey = keyof MeasurementValues;

export type MeasurementExtraValues = Record<string, string>;

export type CustomerMeasurements = {
  mode: MeasurementInputMode;
  profileId?: string;
  profileName?: string;
  templateId?: MeasurementTemplateId;
  values: MeasurementValues;
  extraValues?: MeasurementExtraValues;
  sampleGarmentNote: string;
  fitPreferenceNote: string;
};

export type MeasurementTemplateId =
  | "hijab"
  | "atasan"
  | "gamis"
  | "busana-formal"
  | "bawahan";

export type MeasurementMannequinAnchor =
  | "face"
  | "neck"
  | "shoulder"
  | "bust"
  | "waist"
  | "hip"
  | "sleeve"
  | "length"
  | "back-length"
  | "thigh"
  | "hem";

export type MeasurementTemplateField = {
  key: string;
  storageTarget: "standard" | "extra";
  standardKey?: MeasurementStandardKey;
  label: string;
  shortLabel: string;
  required: boolean;
  unit: "cm";
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  guideTitle: string;
  guideSteps: string[];
  tip: string;
  mannequinAnchor: MeasurementMannequinAnchor;
};

export type MeasurementSizePreset = {
  id: string;
  label: string;
  summary: string;
  values: Partial<Record<MeasurementStandardKey, number>>;
  extraValues?: Record<string, number>;
};

/**
 * Struktur konfigurasi template ukuran yang dirancang agar
 * dapat dikelola (tambah/ubah/nonaktifkan) melalui Admin Dashboard
 * pada tahap pengembangan berikutnya.
 */
export type MeasurementTemplateConfig = {
  id: MeasurementTemplateId;
  name: string;
  shortLabel: string;
  tagline: string;
  description: string;
  mannequinType: MeasurementTemplateId;
  defaultCategoryId: GarmentCategoryId;
  supportedCategories: GarmentCategoryId[];
  active: boolean;
  sortOrder: number;
  updatedAt: string;
  fields: MeasurementTemplateField[];
  sizePresets: MeasurementSizePreset[];
};

export type MeasurementProfile = {
  id: string;
  label: string;
  templateId: MeasurementTemplateId;
  categoryHint?: GarmentCategoryId;
  values: MeasurementValues;
  extraValues?: MeasurementExtraValues;
  notes: string;
  updatedAt: string;
};

export type DesignStudioSavedConfig = {
  id: string;
  title: string;
  categoryId: GarmentCategoryId;
  modelName: string;
  specifications: GarmentSpecifications;
  attachments: ReferenceAttachment[];
  updatedAt: string;
};

export type CustomerIdentity = {
  fullName: string;
  whatsapp: string;
  email: string;
};

export type DeliveryMethod = "pickup" | "shipping";

export type DeliveryDetails = {
  method: DeliveryMethod;
  addressLine: string;
  city: string;
  postalCode: string;
  courierNote: string;
};

export type OrderDraft = {
  categoryId: GarmentCategoryId | "";
  designSource: DesignSourceType;
  selectedCelmiraDesignId: string;
  selectedStudioDesignId: string;
  customDesignTitle: string;
  attachments: ReferenceAttachment[];
  specifications: GarmentSpecifications;
  measurements: CustomerMeasurements;
  customer: CustomerIdentity;
  delivery: DeliveryDetails;
  targetDate: string;
  agreedToTerms: boolean;
  updatedAt: string;
};

export type OrderStatus =
  | "menunggu_penawaran"
  | "penawaran_dikirim"
  | "penawaran_ditolak"
  | "menunggu_dp"
  | "menunggu_verifikasi_dp"
  | "perlu_tinjauan_admin"
  | "dalam_produksi"
  | "selesai_jahit_menunggu_pelunasan"
  | "menunggu_verifikasi_pelunasan"
  | "siap_diambil_atau_dikirim"
  | "dalam_pengiriman"
  | "selesai"
  | "dibatalkan";

export type ProductionStage =
  | "menunggu_produksi"
  | "persiapan_bahan"
  | "pemotongan_kain"
  | "proses_penjahitan"
  | "finishing_qc"
  | "selesai_dikerjakan"
  | "menunggu_pelunasan"
  | "siap_dikirim_atau_diambil"
  | "dalam_pengiriman_atau_siap_diambil"
  | "pesanan_selesai";

export type QuoteStatus =
  | "belum_dikirim"
  | "menunggu_persetujuan"
  | "disetujui"
  | "ditolak";

export type PaymentStage = "dp" | "pelunasan";

export type PaymentVerificationStatus =
  | "belum_unggah"
  | "menunggu_verifikasi_admin"
  | "terverifikasi"
  | "ditolak";

export type PaymentRecord = {
  id: string;
  invoiceNumber?: string;
  stage: PaymentStage;
  tailoringPortion: number;
  shippingPortion: number;
  totalAmount: number;
  method: "qris";
  proofFileName?: string;
  proofMimeType?: string;
  proofSize?: number;
  proofPreviewDataUrl?: string;
  proofUploadedAt?: string;
  customerNote?: string;
  verificationStatus: PaymentVerificationStatus;
  verifiedAt?: string;
  adminNote?: string;
};

export type OrderInvoice = {
  quoteStatus: QuoteStatus;
  quoteSentAt?: string;
  quoteRespondedAt?: string;
  quoteRejectionReason?: string;
  tailoringFee: number | null;
  shippingFee: number | null;
  dpInvoiceNumber?: string;
  dpIssuedAt?: string;
  dpAmount: number | null;
  dpDueAt: string | null;
  settlementInvoiceNumber?: string;
  settlementIssuedAt?: string;
  settlementTailoringAmount: number | null;
  settlementTotalAmount: number | null;
  quoteNote?: string;
};

export type OrderHistoryCategory =
  | "pesanan"
  | "penawaran"
  | "pembayaran"
  | "produksi"
  | "pengiriman"
  | "pembatalan";

export type OrderHistoryEvent = {
  id: string;
  timestamp: string;
  actor: "customer" | "admin" | "system";
  category: OrderHistoryCategory;
  title: string;
  description: string;
  orderStatus?: OrderStatus;
  productionStage?: ProductionStage;
};

/**
 * Konfigurasi pembayaran resmi yang dikelola admin.
 * Tidak menyimpan QRIS palsu maupun nomor rekening fiktif secara bawaan.
 */
export type AdminPaymentConfig = {
  qrisFileId?: string;
  qrisImageUrl?: string;
  qrisImageDataUrl?: string;
  qrisFileName?: string;
  qrisMerchantName?: string;
  qrisUpdatedAt?: string;
  paymentInstructions: string;
  dpWindowHours: number;
  updatedAt: string;
};

export type SubmittedOrder = {
  id: string;
  orderCode: string;
  trackingAccessCode: string;
  createdAt: string;
  updatedAt: string;
  persistenceMode: "local-browser" | "cloudflare-d1";
  status: OrderStatus;
  productionStage: ProductionStage;
  categoryId: GarmentCategoryId;
  categoryName: string;
  designSource: DesignSourceType;
  designTitle: string;
  selectedCelmiraDesignId?: string;
  selectedStudioDesignId?: string;
  attachments: ReferenceAttachment[];
  specifications: GarmentSpecifications;
  measurements: CustomerMeasurements;
  customer: CustomerIdentity;
  delivery: DeliveryDetails;
  targetDate: string;
  estimatedCompletionDate?: string;
  invoice: OrderInvoice;
  payments: PaymentRecord[];
  trackingNumber?: string;
  courierName?: string;
  pickupReadyNote?: string;
  shippedAt?: string;
  completedAt?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  history: OrderHistoryEvent[];
};

export type ChatThreadSource =
  | "general"
  | "design-studio"
  | "measurement-studio"
  | "orders"
  | "track";

export type ChatMessageSender = "customer" | "admin" | "system";

export type ChatMessageStatus = "terkirim" | "dibaca";

export type ChatMessageAttachment = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  previewDataUrl?: string;
};

export type ChatThreadContext = {
  source: ChatThreadSource;
  orderCode?: string;
  orderVerified?: boolean;
  categoryId?: GarmentCategoryId;
  designId?: string;
  designTitle?: string;
  measurementProfileId?: string;
  measurementLabel?: string;
  templateId?: MeasurementTemplateId;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  clientMessageId?: string;
  sender: ChatMessageSender;
  senderName: string;
  body: string;
  attachments: ChatMessageAttachment[];
  createdAt: string;
  status: ChatMessageStatus;
  readAt?: string;
};

export type ChatConnectionStatus = "connecting" | "realtime" | "polling" | "reconnecting" | "offline";

export type ChatThread = {
  id: string;
  title: string;
  customerName?: string;
  source: ChatThreadSource;
  context: ChatThreadContext;
  createdAt: string;
  updatedAt: string;
  unreadByCustomer: number;
  unreadByAdmin: number;
  messages: ChatMessage[];
};

/**
 * Konfigurasi identitas & status admin chat.
 * Nomor WhatsApp resmi dibiarkan kosong sampai nomor terverifikasi tersedia.
 */
export type AdminChatConfig = {
  adminDisplayName: string;
  statusLabel: string;
  availabilityNote: string;
  officialWhatsappNumber?: string;
  updatedAt: string;
};
