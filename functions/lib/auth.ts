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

async function verifySessionToken(
  token: string,
  botToken: string,
): Promise<{ sub: number; fn: string } | null> {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  const hmacHex = token.slice(dot + 1);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(botToken),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected !== hmacHex) return null;

  const payload = JSON.parse(
    atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
  ) as { sub: number; fn: string; exp: number };
  if (Date.now() / 1000 > payload.exp) return null;
  return { sub: payload.sub, fn: payload.fn };
}

export async function requireUser(context: {
  request: Request;
  env: Env;
}): Promise<AuthResult> {
  const header = context.request.headers.get("Authorization") ?? "";

  if (header.startsWith("TelegramInitData ")) {
    const initData = header.slice("TelegramInitData ".length);
    if (!initData || !(await verifyInitData(initData, context.env.BOT_TOKEN))) {
      return { ok: false, response: jsonResponse({ error: "Unauthorized" }, 401) };
    }
    const user = extractUser(initData);
    if (!user) {
      return { ok: false, response: jsonResponse({ error: "No user in initData" }, 400) };
    }
    return { ok: true, initData, user };
  }

  if (header.startsWith("TelegramSession ")) {
    const token = header.slice("TelegramSession ".length);
    const session = await verifySessionToken(token, context.env.BOT_TOKEN);
    if (!session) {
      return { ok: false, response: jsonResponse({ error: "Unauthorized" }, 401) };
    }
    return { ok: true, initData: "", user: { id: session.sub, first_name: session.fn } };
  }

  return { ok: false, response: jsonResponse({ error: "Unauthorized" }, 401) };
}
