import type { Env } from "../../lib/types";
import { verifyInitData, extractUser } from "../../lib/verify";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { initData } = await context.request.json<{ initData: string }>();

  if (!initData || !(await verifyInitData(initData, context.env.BOT_TOKEN))) {
    return new Response(JSON.stringify({ error: "Invalid initData" }), { status: 401 });
  }

  const user = extractUser(initData);
  if (!user) {
    return new Response(JSON.stringify({ error: "No user in initData" }), { status: 400 });
  }

  const sessionPayload = {
    sub: user.id,
    fn: user.first_name ?? "",
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
