import { getAdminSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  getAdminProductionScheduleInDb,
  updateProductionCapacityInDb,
} from "@/lib/server/admin-repo";
import type { AdminProductionCapacityConfig } from "@/lib/types/tailor";

export async function GET(request: Request) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const schedule = await getAdminProductionScheduleInDb(env.DB);
  return Response.json(
    { schedule, serverTime: new Date().toISOString() },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

export async function PUT(request: Request) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  let body: Partial<AdminProductionCapacityConfig>;
  try {
    body = (await request.json()) as Partial<AdminProductionCapacityConfig>;
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const updated = await updateProductionCapacityInDb(env.DB, body);
  if (!updated.ok) {
    return Response.json({ error: updated.error }, { status: updated.status });
  }

  const schedule = await getAdminProductionScheduleInDb(env.DB);
  return Response.json(
    {
      capacity: updated.capacity,
      schedule,
      serverTime: new Date().toISOString(),
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
