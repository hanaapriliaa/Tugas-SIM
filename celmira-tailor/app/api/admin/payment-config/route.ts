import { getAdminSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  getOrInitPaymentConfigInDb,
  updatePaymentConfigInDb,
} from "@/lib/server/order-repo";

export async function GET(request: Request) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const paymentConfig = await getOrInitPaymentConfigInDb(env.DB);
  return Response.json(
    { paymentConfig },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

export async function PATCH(request: Request) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  let body: {
    qrisMerchantName?: string | null;
    paymentInstructions?: string;
    dpWindowHours?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const paymentConfig = await updatePaymentConfigInDb(env.DB, {
    qrisMerchantName:
      body.qrisMerchantName !== undefined
        ? body.qrisMerchantName?.trim() || null
        : undefined,
    paymentInstructions: body.paymentInstructions,
    dpWindowHours: body.dpWindowHours,
  });

  return Response.json(
    { paymentConfig },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
