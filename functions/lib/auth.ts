import type { Env } from "./types";
import { verifyInitData, extractUser } from "./verify";

export type AuthUser = { id: number; first_name: string; last_name?: string; username?: string };

type AuthSuccess = { ok: true; initData: string; user: AuthUser };
type AuthFailure = { ok: false; response: Response };
export type AuthResult = AuthSuccess | AuthFailure;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function requireUser(context: {
  request: Request;
  env: Env;
}): Promise<AuthResult> {
  const initDataHeader = context.request.headers.get("Authorization") ?? "";
  const initData = initDataHeader.replace("TelegramInitData ", "");

  if (!initData || !(await verifyInitData(initData, context.env.BOT_TOKEN))) {
    return { ok: false, response: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const user = extractUser(initData);
  if (!user) {
    return { ok: false, response: jsonResponse({ error: "No user in initData" }, 400) };
  }

  return { ok: true, initData, user };
}
