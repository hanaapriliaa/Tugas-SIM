import {
  adminCancelOrder,
  adminExtendDpDeadline,
  adminIssueSettlementInvoice,
  adminSendQuote,
  adminUpdateEstimatedCompletion,
  adminUpdateFulfillment,
  adminUpdateProductionStage,
  adminVerifyPayment,
  evaluateDpOverdueForReview,
  type TransitionResult,
} from "@/lib/order-tracking";
import { getAdminSession } from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import { getOrderById, saveOrderInDb } from "@/lib/server/order-repo";
import type { PaymentStage, ProductionStage } from "@/lib/types/tailor";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export type AdminOrderActionBody =
  | {
      action: "send_quote";
      tailoringFee: number;
      shippingFee?: number | null;
      estimatedCompletionDate?: string;
      quoteNote?: string;
    }
  | {
      action: "verify_payment";
      stage: PaymentStage;
      decision: "approve" | "reject";
      adminNote?: string;
    }
  | {
      action: "extend_dp_deadline";
      extraHours?: number;
      note?: string;
    }
  | {
      action: "update_production_stage";
      stage: ProductionStage;
      estimatedCompletionDate?: string;
      note?: string;
    }
  | {
      action: "update_estimated_completion";
      estimatedCompletionDate: string;
      note?: string;
    }
  | {
      action: "issue_settlement_invoice";
      shippingFee?: number | null;
      note?: string;
    }
  | {
      action: "update_fulfillment";
      courierName?: string;
      trackingNumber?: string;
      pickupReadyNote?: string;
      fulfillmentAction: "save_details" | "mark_dispatched_or_ready" | "mark_completed";
    }
  | {
      action: "cancel_order";
      reason: string;
      isTimeoutCancellation?: boolean;
    }
  | {
      action: "evaluate_overdue";
      note?: string;
    };

export async function POST(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { orderId } = await context.params;
  const found = await getOrderById(env.DB, orderId);
  if (!found) {
    return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  let body: AdminOrderActionBody;
  try {
    body = (await request.json()) as AdminOrderActionBody;
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const now = new Date();
  let result: TransitionResult;

  switch (body.action) {
    case "send_quote":
      result = adminSendQuote(
        found.order,
        {
          tailoringFee: body.tailoringFee,
          shippingFee: body.shippingFee,
          estimatedCompletionDate: body.estimatedCompletionDate,
          quoteNote: body.quoteNote,
        },
        now
      );
      break;
    case "verify_payment":
      result = adminVerifyPayment(
        found.order,
        {
          stage: body.stage,
          decision: body.decision,
          adminNote: body.adminNote,
        },
        now
      );
      break;
    case "extend_dp_deadline":
      result = adminExtendDpDeadline(
        found.order,
        {
          extraHours: body.extraHours,
          note: body.note,
        },
        now
      );
      break;
    case "update_production_stage":
      result = adminUpdateProductionStage(
        found.order,
        {
          stage: body.stage,
          estimatedCompletionDate: body.estimatedCompletionDate,
          note: body.note,
        },
        now
      );
      break;
    case "update_estimated_completion":
      result = adminUpdateEstimatedCompletion(
        found.order,
        body.estimatedCompletionDate,
        body.note,
        now
      );
      break;
    case "issue_settlement_invoice":
      result = adminIssueSettlementInvoice(
        found.order,
        {
          shippingFee: body.shippingFee,
          note: body.note,
        },
        now
      );
      break;
    case "update_fulfillment":
      result = adminUpdateFulfillment(
        found.order,
        {
          courierName: body.courierName,
          trackingNumber: body.trackingNumber,
          pickupReadyNote: body.pickupReadyNote,
          action: body.fulfillmentAction,
        },
        now
      );
      break;
    case "cancel_order":
      result = adminCancelOrder(
        found.order,
        {
          reason: body.reason,
          isTimeoutCancellation: body.isTimeoutCancellation,
        },
        now
      );
      break;
    case "evaluate_overdue":
      result = evaluateDpOverdueForReview(found.order, now, body.note);
      break;
    default:
      return Response.json({ error: "Aksi pesanan admin tidak dikenali." }, { status: 400 });
  }

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const saved = await saveOrderInDb(env.DB, result.order);

  const targets = ["role:admin"];
  if (found.customerSessionId) targets.push(`customer:${found.customerSessionId}`);
  await broadcastChatEvent(env.CHAT_HUB, targets, {
    type: "order:updated",
    orderId: saved.id,
    orderCode: saved.orderCode,
    status: saved.status,
    updatedAt: saved.updatedAt,
  });

  return Response.json(
    { order: saved },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
