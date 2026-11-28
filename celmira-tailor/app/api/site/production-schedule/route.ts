import { getChatEnv } from "@/lib/server/cf-env";
import { getOrInitProductionCapacityInDb } from "@/lib/server/admin-repo";

export async function GET() {
  const env = getChatEnv();
  const capacity = await getOrInitProductionCapacityInDb(env.DB);
  return Response.json(
    {
      standardLeadDays: capacity.standardLeadDays,
      categoryLeadDays: capacity.categoryLeadDays,
      blockedDates: capacity.blockedDates,
      operationalNote: capacity.operationalNote,
      updatedAt: capacity.updatedAt,
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
