import { getAdminSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  listMeasurementTemplatesInDb,
  resetMeasurementTemplatesInDb,
  saveMeasurementTemplateInDb,
} from "@/lib/server/admin-repo";
import type { MeasurementTemplateConfig } from "@/lib/types/tailor";

export async function GET(request: Request) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const templates = await listMeasurementTemplatesInDb(env.DB);
  return Response.json(
    { templates, serverTime: new Date().toISOString() },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

export async function PUT(request: Request) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  let body: { template?: MeasurementTemplateConfig };
  try {
    body = (await request.json()) as { template?: MeasurementTemplateConfig };
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (!body.template) {
    return Response.json({ error: "Data template ukuran wajib disertakan." }, { status: 400 });
  }

  const saved = await saveMeasurementTemplateInDb(env.DB, body.template);
  if (!saved.ok) {
    return Response.json({ error: saved.error }, { status: saved.status });
  }

  return Response.json(
    {
      template: saved.template,
      templates: saved.templates,
      serverTime: new Date().toISOString(),
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

export async function DELETE(request: Request) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const templates = await resetMeasurementTemplatesInDb(env.DB);
  return Response.json(
    { templates, reset: true, serverTime: new Date().toISOString() },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
