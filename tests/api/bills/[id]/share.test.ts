import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { onRequestPost } from "@functions/api/bills/[id]/share";
import type { Bill } from "@functions/lib/types";
import { createMockKV, makeEnv, makeCtx } from "../../../helpers";

const requireUserMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    ok: true,
    initData: "valid",
    user: { id: 1, first_name: "Alice" },
  }),
);
const extractChatMock = vi.hoisted(() => vi.fn().mockReturnValue(null));

vi.mock("@functions/lib/auth", () => ({ requireUser: requireUserMock }));
vi.mock("@functions/lib/verify", () => ({ extractChat: extractChatMock }));

const STORED_BILL: Bill = {
  id: "bill123",
  creatorTelegramId: 1,
  createdAt: 1000000,
  receiptTitle: "Dinner",
  expenses: [],
  manualTotal: "50",
  people: [],
  assignments: {},
  splitMode: "equally",
  currency: "USD",
  version: 1,
};

describe("POST /api/bills/:id/share", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    requireUserMock.mockResolvedValue({ ok: true, initData: "valid", user: { id: 1, first_name: "Alice" } });
    extractChatMock.mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 401 without valid auth", async () => {
    requireUserMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { kv } = createMockKV(STORED_BILL);
    const ctx = makeCtx({ params: { id: "bill123" }, body: { chatId: -100 }, env: makeEnv(kv) });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 404 when bill does not exist", async () => {
    const { kv } = createMockKV();
    const ctx = makeCtx({ params: { id: "missing" }, body: { chatId: -100 }, env: makeEnv(kv) });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(404);
  });

  it("returns 400 when no chatId provided and none in initData", async () => {
    const { kv } = createMockKV(STORED_BILL);
    const ctx = makeCtx({ params: { id: "bill123" }, body: {}, env: makeEnv(kv) });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
  });

  it("sends a Telegram message with the bill link", async () => {
    const { kv } = createMockKV(STORED_BILL);
    const ctx = makeCtx({ params: { id: "bill123" }, body: { chatId: -100999 }, env: makeEnv(kv) });
    const res = await onRequestPost(ctx);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("sendMessage");
    const payload = JSON.parse(init.body as string) as {
      chat_id: number;
      text: string;
      reply_markup: { inline_keyboard: { text: string; web_app: { url: string } }[][] };
    };
    expect(payload.chat_id).toBe(-100999);
    expect(payload.text).toContain("Dinner");
    expect(payload.reply_markup.inline_keyboard[0][0].web_app.url).toContain("bill123");
  });

  it("uses chatId from initData when not provided in body", async () => {
    extractChatMock.mockReturnValueOnce({ id: -200, type: "group" });
    const { kv } = createMockKV(STORED_BILL);
    const ctx = makeCtx({ params: { id: "bill123" }, body: {}, env: makeEnv(kv) });
    const res = await onRequestPost(ctx);

    expect(res.status).toBe(200);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { chat_id: number };
    expect(payload.chat_id).toBe(-200);
  });

  it("stores chatId on the bill after sharing", async () => {
    const { kv, store } = createMockKV(STORED_BILL);
    const ctx = makeCtx({ params: { id: "bill123" }, body: { chatId: -100999 }, env: makeEnv(kv) });
    await onRequestPost(ctx);

    const saved = JSON.parse(store.get("bill:bill123")!) as Bill;
    expect(saved.chatId).toBe(-100999);
  });

  it("returns 502 when Telegram API fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Bad Request", { status: 400 }));
    const { kv } = createMockKV(STORED_BILL);
    const ctx = makeCtx({ params: { id: "bill123" }, body: { chatId: -100 }, env: makeEnv(kv) });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(502);
  });
});
