import { getAuthenticatedCustomerAccount } from "@/lib/server/customer-auth";
import { getChatEnv } from "@/lib/server/cf-env";

export async function GET(request: Request) {
  const env = getChatEnv();
  const account = await getAuthenticatedCustomerAccount(request, env.DB);

  return Response.json(
    {
      authenticated: Boolean(account),
      customer: account
        ? {
            id: account.id,
            email: account.email,
            fullName: account.fullName,
          }
        : null,
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
