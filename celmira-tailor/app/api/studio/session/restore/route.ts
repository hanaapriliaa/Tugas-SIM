import { issueAdditionalCustomerSessionCookie } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  findCustomerSessionBySyncCode,
  listDesignsInDb,
  listMeasurementProfilesInDb,
} from "@/lib/server/studio-repo";

export async function POST(request: Request) {
  const env = getChatEnv();

  let body: { syncCode?: string };
  try {
    body = (await request.json()) as { syncCode?: string };
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const rawCode = (body.syncCode ?? "").trim();
  if (!rawCode) {
    return Response.json(
      { error: "Masukkan Kode Sinkronisasi Studio terlebih dahulu." },
      { status: 400 }
    );
  }

  const found = await findCustomerSessionBySyncCode(env.DB, rawCode);
  if (!found) {
    return Response.json(
      { error: "Kode Sinkronisasi Studio tidak ditemukan. Periksa kembali kode Anda." },
      { status: 404 }
    );
  }

  const [setCookieHeader, designs, profiles] = await Promise.all([
    issueAdditionalCustomerSessionCookie(request, env.DB, found.customerSessionId),
    listDesignsInDb(env.DB, found.customerSessionId),
    listMeasurementProfilesInDb(env.DB, found.customerSessionId),
  ]);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  headers.append("set-cookie", setCookieHeader);

  return new Response(
    JSON.stringify({
      sessionId: found.customerSessionId,
      syncCode: found.syncCode,
      designs,
      profiles,
    }),
    { status: 200, headers }
  );
}
