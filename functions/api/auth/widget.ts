import type { Env } from "../../lib/types";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const authData = await context.request.json<Record<string, unknown>>();
  const { hash, ...rest } = authData as Record<string, string | number>;

  if (!hash || typeof hash !== "string") {
    return new Response(JSON.stringify({ error: "Missing hash" }), { status: 400 });
  }

  // Verify auth_date is recent (within 24h)
  const authAge = Math.floor(Date.now() / 1000) - Number(rest.auth_date ?? 0);
  if (authAge > 86400) {
    return new Response(JSON.stringify({ error: "Auth data expired" }), { status: 401 });
  }

  // Build data_check_string
  const dataCheckString = Object.entries(rest)
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // secret_key = SHA256(bot_token) — Login Widget uses raw SHA256, NOT HMAC("WebAppData")
  const encoder = new TextEncoder();
  const secretKeyBytes = await crypto.subtle.digest("SHA-256", encoder.encode(context.env.BOT_TOKEN));
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(dataCheckString));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected !== hash) {
    return new Response(JSON.stringify({ error: "Invalid hash" }), { status: 401 });
  }

  // Build session token (same logic as exchange.ts)
  const sessionPayload = {
    sub: Number(rest.id),
    fn: String(rest.first_name ?? ""),
    exp: Math.floor(Date.now() / 1000) + 86_400 * 30,
  };
  const payloadB64 = btoa(JSON.stringify(sessionPayload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(context.env.BOT_TOKEN),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hmacSig = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(payloadB64));
  const hmacHex = Array.from(new Uint8Array(hmacSig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return new Response(JSON.stringify({ sessionToken: `${payloadB64}.${hmacHex}` }), {
    headers: { "Content-Type": "application/json" },
  });
};
