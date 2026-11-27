import { loginCustomerAccount } from "@/lib/server/customer-auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { listDesignsInDb, listMeasurementProfilesInDb } from "@/lib/server/studio-repo";

export async function POST(request: Request) {
  const env = getChatEnv();

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const result = await loginCustomerAccount(request, env.DB, {
    email: body.email ?? "",
    password: body.password ?? "",
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const [designs, profiles] = await Promise.all([
    listDesignsInDb(env.DB, result.account.customerSessionId),
    listMeasurementProfilesInDb(env.DB, result.account.customerSessionId),
  ]);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  headers.append("set-cookie", result.setCookieHeader);

  return new Response(
    JSON.stringify({
      customer: {
        id: result.account.id,
        email: result.account.email,
        fullName: result.account.fullName,
      },
      designs,
      profiles,
    }),
    { status: 200, headers }
  );
}
