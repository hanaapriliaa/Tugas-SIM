import type { AdminOrderActionBody } from "@/app/api/admin/orders/[orderId]/action/route";
import type { AdminOrderIntegratedContext } from "@/lib/server/order-repo";
import type {
  AdminPaymentConfig,
  OrderDraft,
  PaymentRecord,
  PaymentStage,
  SubmittedOrder,
} from "@/lib/types/tailor";

export type { AdminOrderIntegratedContext };

export type GuestCustomerContact = {
  fullName: string;
  whatsapp: string;
  email: string;
};

export class OrdersApiError extends Error {
  status: number;
  errors?: Record<string, string>;

  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message);
    this.name = "OrdersApiError";
    this.status = status;
    this.errors = errors;
  }
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errObj = (data ?? {}) as { error?: string; errors?: Record<string, string> };
    throw new OrdersApiError(
      errObj.error ?? `Permintaan gagal dengan status ${res.status}.`,
      res.status,
      errObj.errors
    );
  }

  return data as T;
}

export async function fetchCustomerOrdersApi(): Promise<{
  orders: SubmittedOrder[];
  customerContact: GuestCustomerContact | null;
  serverTime: string;
}> {
  const res = await fetch("/api/orders", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJsonResponse<{
    orders: SubmittedOrder[];
    customerContact: GuestCustomerContact | null;
    serverTime: string;
  }>(res);
}

export async function submitOrderApi(
  draft: OrderDraft,
  studioDesignTitle?: string
): Promise<{ order: SubmittedOrder }> {
  const res = await fetch("/api/orders", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ draft, studioDesignTitle }),
  });
  return parseJsonResponse<{ order: SubmittedOrder }>(res);
}

export async function verifyTrackingOrderApi(
  orderCode: string,
  verifier: string
): Promise<{ order: SubmittedOrder; paymentConfig: AdminPaymentConfig }> {
  const res = await fetch("/api/track/verify", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderCode, verifier }),
  });
  return parseJsonResponse<{ order: SubmittedOrder; paymentConfig: AdminPaymentConfig }>(res);
}

export async function fetchTrackedOrderApi(
  orderCode: string
): Promise<{ order: SubmittedOrder; paymentConfig: AdminPaymentConfig }> {
  const res = await fetch(`/api/track/${encodeURIComponent(orderCode.trim().toUpperCase())}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJsonResponse<{ order: SubmittedOrder; paymentConfig: AdminPaymentConfig }>(res);
}

export async function respondToQuoteApi(
  orderCode: string,
  decision: "approve" | "reject",
  rejectionReason?: string
): Promise<{ order: SubmittedOrder }> {
  const res = await fetch(
    `/api/track/${encodeURIComponent(orderCode.trim().toUpperCase())}/quote-response`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, rejectionReason }),
    }
  );
  return parseJsonResponse<{ order: SubmittedOrder }>(res);
}

export async function uploadPaymentProofApi(
  orderCode: string,
  payload: {
    stage: PaymentStage;
    file: File;
    customerNote?: string;
  }
): Promise<{ order: SubmittedOrder; payment: PaymentRecord | null }> {
  const formData = new FormData();
  formData.append("stage", payload.stage);
  formData.append("file", payload.file);
  if (payload.customerNote?.trim()) {
    formData.append("customerNote", payload.customerNote.trim());
  }

  const res = await fetch(
    `/api/track/${encodeURIComponent(orderCode.trim().toUpperCase())}/payments`,
    {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    }
  );
  return parseJsonResponse<{ order: SubmittedOrder; payment: PaymentRecord | null }>(res);
}

export async function fetchAdminOrdersApi(): Promise<{
  orders: SubmittedOrder[];
  paymentConfig: AdminPaymentConfig;
  serverTime: string;
}> {
  const res = await fetch("/api/admin/orders", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJsonResponse<{
    orders: SubmittedOrder[];
    paymentConfig: AdminPaymentConfig;
    serverTime: string;
  }>(res);
}

export async function fetchAdminOrderContextApi(orderId: string): Promise<{
  context: AdminOrderIntegratedContext;
  serverTime: string;
}> {
  const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/context`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJsonResponse<{
    context: AdminOrderIntegratedContext;
    serverTime: string;
  }>(res);
}

export async function runAdminOrderActionApi(
  orderId: string,
  payload: AdminOrderActionBody
): Promise<{ order: SubmittedOrder }> {
  const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/action`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<{ order: SubmittedOrder }>(res);
}

export async function updateAdminPaymentConfigApi(patch: {
  qrisMerchantName?: string | null;
  paymentInstructions?: string;
  dpWindowHours?: number;
}): Promise<{ paymentConfig: AdminPaymentConfig }> {
  const res = await fetch("/api/admin/payment-config", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseJsonResponse<{ paymentConfig: AdminPaymentConfig }>(res);
}

export async function uploadAdminQrisApi(
  file: File,
  qrisMerchantName?: string
): Promise<{ paymentConfig: AdminPaymentConfig }> {
  const formData = new FormData();
  formData.append("file", file);
  if (qrisMerchantName?.trim()) {
    formData.append("qrisMerchantName", qrisMerchantName.trim());
  }

  const res = await fetch("/api/admin/payment-config/qris", {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  return parseJsonResponse<{ paymentConfig: AdminPaymentConfig }>(res);
}

export async function deleteAdminQrisApi(): Promise<{ paymentConfig: AdminPaymentConfig }> {
  const res = await fetch("/api/admin/payment-config/qris", {
    method: "DELETE",
    credentials: "same-origin",
  });
  return parseJsonResponse<{ paymentConfig: AdminPaymentConfig }>(res);
}
