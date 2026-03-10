import { describe, it, expect } from "vitest";
import { onRequestPost } from "@functions/api/auth/widget";
import { makeEnv, makeCtx, createMockKV } from "../../helpers";

const BOT_TOKEN = "test_token"; // matches makeEnv()
const encoder = new TextEncoder();

async function buildWidgetAuth(
  fields: Record<string, string | number>,
  useToken = BOT_TOKEN,
): Promise<Record<string, unknown>> {
  const rest = Object.fromEntries(Object.entries(fields).filter(([k]) => k !== "hash"));
  const dataCheckString = Object.entries(rest)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secretKeyBytes = await crypto.subtle.digest("SHA-256", encoder.encode(useToken));
  const key = await crypto.subtle.importKey("raw", secretKeyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(dataCheckString));
  const hash = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { ...rest, hash };
}

describe("POST /api/auth/widget", () => {
  const { kv } = createMockKV();
  const env = makeEnv(kv);

  it("returns 200 + sessionToken for valid auth data", async () => {
    const authData = await buildWidgetAuth({
      id: 42,
      first_name: "Alice",
      auth_date: String(Math.floor(Date.now() / 1000) - 60),
    });
    const ctx = makeCtx({ body: authData, env, authHeader: "" });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(200);
    const json = await res.json() as { sessionToken: string };
    expect(json.sessionToken).toMatch(/^[A-Za-z0-9_-]+\.[0-9a-f]+$/);
  });

  it("returns 400 when hash is missing", async () => {
    const ctx = makeCtx({ body: { id: 42, auth_date: String(Math.floor(Date.now() / 1000)) }, env, authHeader: "" });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
  });

  it("returns 401 when hash is invalid", async () => {
    const authData = await buildWidgetAuth({ id: 42, auth_date: String(Math.floor(Date.now() / 1000)) });
    (authData as Record<string, unknown>).hash = "deadbeef".repeat(8);
    const ctx = makeCtx({ body: authData, env, authHeader: "" });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(401);
  });

  it("returns 401 when auth_date is older than 24h", async () => {
    const staleDate = String(Math.floor(Date.now() / 1000) - 90000); // 25h ago
    const authData = await buildWidgetAuth({ id: 42, auth_date: staleDate });
    const ctx = makeCtx({ body: authData, env, authHeader: "" });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(401);
  });

  it("returns 401 when signed with wrong token", async () => {
    const authData = await buildWidgetAuth(
      { id: 42, auth_date: String(Math.floor(Date.now() / 1000)) },
      "wrong_token",
    );
    const ctx = makeCtx({ body: authData, env, authHeader: "" });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(401);
  });
});
