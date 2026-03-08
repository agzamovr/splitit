import type { Env } from "../../lib/types";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { code, code_verifier } = await context.request.json<{
    code: string;
    code_verifier: string;
  }>();

  const tokenRes = await fetch("https://oauth.telegram.org/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: context.env.APP_URL + "/login",
      client_id: context.env.BOT_ID,
      client_secret: context.env.BOT_TOKEN,
      code_verifier,
    }),
  });
  if (!tokenRes.ok) {
    return new Response(JSON.stringify({ error: "Token exchange failed" }), { status: 401 });
  }
  const { id_token } = await tokenRes.json<{ id_token: string }>();

  const claims = await verifyOidcJwt(id_token, context.env.BOT_ID);
  if (!claims) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
  }

  const sessionPayload = {
    sub: parseInt(claims.sub as string, 10),
    fn: (claims.name as string) ?? "",
    exp: Math.floor(Date.now() / 1000) + 86_400 * 30,
  };
  const payloadB64 = btoa(JSON.stringify(sessionPayload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(context.env.BOT_TOKEN),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const hmacHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const sessionToken = `${payloadB64}.${hmacHex}`;

  return new Response(JSON.stringify({ sessionToken }), {
    headers: { "Content-Type": "application/json" },
  });
};

async function verifyOidcJwt(
  idToken: string,
  botId: string,
): Promise<Record<string, unknown> | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = JSON.parse(
    atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")),
  ) as { kid?: string; alg?: string };

  const jwksRes = await fetch("https://oauth.telegram.org/.well-known/jwks.json");
  const { keys } = await jwksRes.json<{ keys: JsonWebKey[] }>();
  const jwk = keys.find((k: JsonWebKey & { kid?: string }) => k.kid === header.kid);
  if (!jwk) return null;

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBytes = Uint8Array.from(
    atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
  const dataBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, sigBytes, dataBytes);
  if (!valid) return null;

  const payload = JSON.parse(
    atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
  ) as Record<string, unknown>;
  if (payload.iss !== "https://oauth.telegram.org") return null;
  if (String(payload.aud) !== String(botId)) return null;
  if (Date.now() / 1000 > (payload.exp as number)) return null;

  return payload;
}
