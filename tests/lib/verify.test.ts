import { describe, it, expect } from "vitest";
import { verifyInitData, extractUser, extractChat } from "@functions/lib/verify";

const BOT_TOKEN = "TEST_BOT_TOKEN_12345";
const encoder = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", k, encoder.encode(data));
}

async function buildInitData(fields: Record<string, string>): Promise<string> {
  const sorted = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = sorted.map(([k, v]) => `${k}=${v}`).join("\n");
  const secretKeyBytes = await hmac(encoder.encode("WebAppData"), BOT_TOKEN);
  const signatureBytes = await hmac(secretKeyBytes, dataCheckString);
  const hash = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return new URLSearchParams({ ...fields, hash }).toString();
}

describe("verifyInitData", () => {
  it("returns true for a correctly signed initData", async () => {
    const initData = await buildInitData({
      user: JSON.stringify({ id: 1, first_name: "Alice" }),
      auth_date: "1000000",
    });
    expect(await verifyInitData(initData, BOT_TOKEN)).toBe(true);
  });

  it("returns false when hash is wrong", async () => {
    const initData = await buildInitData({
      user: JSON.stringify({ id: 1, first_name: "Alice" }),
      auth_date: "1000000",
    });
    const tampered = initData.replace(/hash=[^&]+/, "hash=deadbeefdeadbeef");
    expect(await verifyInitData(tampered, BOT_TOKEN)).toBe(false);
  });

  it("returns false when hash is missing", async () => {
    expect(await verifyInitData("user=%7B%22id%22%3A1%7D&auth_date=1000000", BOT_TOKEN)).toBe(
      false,
    );
  });

  it("returns false when bot token is wrong", async () => {
    const initData = await buildInitData({ auth_date: "1000000" });
    expect(await verifyInitData(initData, "WRONG_TOKEN")).toBe(false);
  });
});

describe("extractUser", () => {
  it("parses user object from initData", () => {
    const user = { id: 42, first_name: "Bob", last_name: "Smith" };
    const initData = `user=${encodeURIComponent(JSON.stringify(user))}&hash=abc`;
    expect(extractUser(initData)).toEqual(user);
  });

  it("returns null when user field is absent", () => {
    expect(extractUser("auth_date=1000000&hash=abc")).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    expect(extractUser("user=not_json&hash=abc")).toBeNull();
  });
});

describe("extractChat", () => {
  it("parses chat object from initData", () => {
    const chat = { id: -100999, type: "supergroup" };
    const initData = `chat=${encodeURIComponent(JSON.stringify(chat))}&hash=abc`;
    expect(extractChat(initData)).toEqual(chat);
  });

  it("returns null when chat field is absent", () => {
    expect(extractChat("user=%7B%7D&hash=abc")).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    expect(extractChat("chat=bad_json&hash=abc")).toBeNull();
  });
});
