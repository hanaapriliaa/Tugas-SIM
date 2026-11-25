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

export type CustomerMeasurements = {
  mode: MeasurementInputMode;
  profileId?: string;
  profileName?: string;
  values: MeasurementValues;
  sampleGarmentNote: string;
  fitPreferenceNote: string;
};

export type MeasurementTemplateId =
  | "hijab"
  | "atasan"
  | "gamis"
  | "busana-formal"
  | "bawahan";

export type MeasurementProfile = {
  id: string;
  label: string;
  templateId: MeasurementTemplateId;
  categoryHint?: GarmentCategoryId;
  values: MeasurementValues;
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
  | "menunggu_dp"
  | "menunggu_verifikasi_dp"
  | "dalam_produksi"
  | "selesai_jahit_menunggu_pelunasan"
  | "menunggu_verifikasi_pelunasan"
  | "siap_diambil_atau_dikirim"
  | "selesai";

export type ProductionStage =
  | "antrian_penawaran"
  | "menunggu_dp"
  | "pemotongan_bahan"
  | "penjahitan"
  | "finishing"
  | "quality_check"
  | "siap_serah_terima"
  | "selesai";

export type PaymentStage = "dp" | "pelunasan";

export type PaymentRecord = {
  id: string;
  stage: PaymentStage;
  tailoringPortion: number;
  shippingPortion: number;
  totalAmount: number;
  method: "qris";
  proofFileName?: string;
  proofUploadedAt?: string;
  verificationStatus: "belum_unggah" | "menunggu_verifikasi_admin" | "terverifikasi" | "ditolak";
  verifiedAt?: string;
  adminNote?: string;
};

export type OrderInvoice = {
  tailoringFee: number | null;
  shippingFee: number | null;
  dpAmount: number | null;
  dpDueAt: string | null;
  settlementTailoringAmount: number | null;
  settlementTotalAmount: number | null;
  quoteNote?: string;
};

export type SubmittedOrder = {
  id: string;
  orderCode: string;
  createdAt: string;
  updatedAt: string;
  persistenceMode: "local-browser";
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
  invoice: OrderInvoice;
  payments: PaymentRecord[];
  trackingNumber?: string;
  courierName?: string;
};
