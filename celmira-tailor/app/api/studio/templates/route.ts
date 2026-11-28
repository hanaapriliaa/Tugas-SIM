import { getChatEnv } from "@/lib/server/cf-env";
import { listMeasurementTemplatesInDb } from "@/lib/server/admin-repo";

export async function GET() {
  const env = getChatEnv();
  const templates = await listMeasurementTemplatesInDb(env.DB);
  return Response.json(
    { templates },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
