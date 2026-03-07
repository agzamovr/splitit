import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { onRequestPost } from "@functions/telegram_bot";
import type { Bill, Env } from "@functions/lib/types";
import { createMockKV, makeEnv } from "./helpers";

const ENV: Env = {
  SPLIT_BILLS: {} as KVNamespace,
  BOT_TOKEN: "test_token",
  APP_URL: "https://example.com",
};

function makeCtx(body: unknown, env: Env = ENV) {
  return {
    params: {},
    request: new Request("http://localhost/bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    next: vi.fn(),
    data: {},
    functionPath: "",
  } as unknown as Parameters<PagesFunction<Env>>[0];
}

function update(text: string, chatId = 42) {
  return { message: { chat: { id: chatId, type: "group" }, text } };
}

function updateFromUser(text: string, userId: number, chatId = userId) {
  return { message: { chat: { id: chatId, type: "private" }, from: { id: userId, first_name: "Alice" }, text } };
}

function makeBill(id: string, title: string, userId = 99): Bill {
  return {
    id, creatorTelegramId: userId, createdAt: Date.now(),
    receiptTitle: title, expenses: [], manualTotal: "50",
    people: [], assignments: {}, splitMode: "equally", currency: "USD", version: 1,
  };
}

describe("telegram_bot webhook", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 'ok' for any request", async () => {
    const res = await onRequestPost(makeCtx(update("/start")));
    expect(await res.text()).toBe("ok");
  });

  it("returns 'ok' without fetching when message has no text", async () => {
    await onRequestPost(makeCtx({ message: { chat: { id: 1, type: "private" } } }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 'ok' without fetching when update has no message", async () => {
    await onRequestPost(makeCtx({}));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("/start <billId> sends Open Bill button with correct URL", async () => {
    await onRequestPost(makeCtx(update("/start abc123", 55)));

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bottest_token/sendMessage");

    const payload = JSON.parse(init.body as string) as {
      chat_id: number;
      reply_markup: { inline_keyboard: { text: string; web_app: { url: string } }[][] };
    };
    expect(payload.chat_id).toBe(55);
    const button = payload.reply_markup.inline_keyboard[0][0];
    expect(button.text).toBe("Open Bill");
    expect(button.web_app.url).toBe("https://example.com/?billId=abc123");
  });

  it("/start without param sends join message (no inline keyboard)", async () => {
    await onRequestPost(makeCtx(update("/start", 55)));

    expect(fetchMock).toHaveBeenCalledOnce();
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      text: string;
      reply_markup?: unknown;
    };
    expect(payload.text).toBe("Add me to a group to split bills!");
    expect(payload.reply_markup).toBeUndefined();
  });

  it("/newbill sends New Bill button pointing to APP_URL", async () => {
    await onRequestPost(makeCtx(update("/newbill", 77)));

    expect(fetchMock).toHaveBeenCalledOnce();
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      chat_id: number;
      reply_markup: { inline_keyboard: { text: string; web_app: { url: string } }[][] };
    };
    expect(payload.chat_id).toBe(77);
    const button = payload.reply_markup.inline_keyboard[0][0];
    expect(button.text).toBe("New Bill");
    expect(button.web_app.url).toBe("https://example.com");
  });

  it("unknown command returns 'ok' without sending a message", async () => {
    await onRequestPost(makeCtx(update("/unknown_command")));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("/mybills", () => {
    it("sends 'no bills yet' with New Bill button when user has no bills", async () => {
      const { kv } = createMockKV();
      await onRequestPost(makeCtx(updateFromUser("/mybills", 99), makeEnv(kv)));

      expect(fetchMock).toHaveBeenCalledOnce();
      const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
        chat_id: number; text: string;
        reply_markup: { inline_keyboard: { text: string; web_app?: { url: string } }[][] };
      };
      expect(payload.chat_id).toBe(99);
      expect(payload.text).toContain("no saved bills");
      expect(payload.reply_markup.inline_keyboard[0][0].text).toBe("New Bill");
      expect(payload.reply_markup.inline_keyboard[0][0].web_app?.url).toBe("https://example.com");
    });

    it("sends bill buttons for each indexed bill", async () => {
      const mockKV = createMockKV();
      const bill = makeBill("bill-abc", "Dinner with friends");
      mockKV.store.set("bill:bill-abc", JSON.stringify(bill));
      mockKV.store.set("user:99:bills", JSON.stringify(["bill-abc"]));

      await onRequestPost(makeCtx(updateFromUser("/mybills", 99), makeEnv(mockKV.kv)));

      const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
        text: string;
        reply_markup: { inline_keyboard: { text: string; web_app?: { url: string } }[][] };
      };
      expect(payload.text).toContain("most recent bill");
      const billBtn = payload.reply_markup.inline_keyboard[0][0];
      expect(billBtn.text).toBe("Dinner with friends");
      expect(billBtn.web_app?.url).toBe("https://example.com/?billId=bill-abc");
    });

    it("includes 'View All Bills' button that opens /bills page", async () => {
      const mockKV = createMockKV();
      mockKV.store.set("bill:b1", JSON.stringify(makeBill("b1", "Lunch")));
      mockKV.store.set("user:99:bills", JSON.stringify(["b1"]));

      await onRequestPost(makeCtx(updateFromUser("/mybills", 99), makeEnv(mockKV.kv)));

      const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
        reply_markup: { inline_keyboard: { text: string; web_app?: { url: string } }[][] };
      };
      const lastRow = payload.reply_markup.inline_keyboard.at(-1)!;
      expect(lastRow[0].text).toBe("View All Bills");
      expect(lastRow[0].web_app?.url).toBe("https://example.com/bills");
    });

    it("shows plural text for multiple bills", async () => {
      const mockKV = createMockKV();
      mockKV.store.set("bill:b1", JSON.stringify(makeBill("b1", "Lunch")));
      mockKV.store.set("bill:b2", JSON.stringify(makeBill("b2", "Dinner")));
      mockKV.store.set("user:99:bills", JSON.stringify(["b1", "b2"]));

      await onRequestPost(makeCtx(updateFromUser("/mybills", 99), makeEnv(mockKV.kv)));

      const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { text: string };
      expect(payload.text).toMatch(/2 most recent bills/);
    });

    it("caps at 10 bills even if more are indexed", async () => {
      const mockKV = createMockKV();
      const ids = Array.from({ length: 15 }, (_, i) => `b${i}`);
      for (const id of ids) {
        mockKV.store.set(`bill:${id}`, JSON.stringify(makeBill(id, `Bill ${id}`)));
      }
      mockKV.store.set("user:99:bills", JSON.stringify(ids));

      await onRequestPost(makeCtx(updateFromUser("/mybills", 99), makeEnv(mockKV.kv)));

      const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
        reply_markup: { inline_keyboard: unknown[][] };
      };
      // 10 bill rows + 1 "View All Bills" row
      expect(payload.reply_markup.inline_keyboard).toHaveLength(11);
    });

    it("skips expired bills silently", async () => {
      const mockKV = createMockKV();
      mockKV.store.set("bill:live", JSON.stringify(makeBill("live", "Live Bill")));
      // "expired" is in index but not in KV
      mockKV.store.set("user:99:bills", JSON.stringify(["live", "expired"]));

      await onRequestPost(makeCtx(updateFromUser("/mybills", 99), makeEnv(mockKV.kv)));

      const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
        reply_markup: { inline_keyboard: { text: string }[][] };
      };
      const billRows = payload.reply_markup.inline_keyboard.slice(0, -1);
      expect(billRows).toHaveLength(1);
      expect(billRows[0][0].text).toBe("Live Bill");
    });

    it("uses 'Untitled' for bills with empty receiptTitle", async () => {
      const mockKV = createMockKV();
      mockKV.store.set("bill:b1", JSON.stringify(makeBill("b1", "")));
      mockKV.store.set("user:99:bills", JSON.stringify(["b1"]));

      await onRequestPost(makeCtx(updateFromUser("/mybills", 99), makeEnv(mockKV.kv)));

      const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
        reply_markup: { inline_keyboard: { text: string }[][] };
      };
      expect(payload.reply_markup.inline_keyboard[0][0].text).toBe("Untitled");
    });

    it("does nothing when message has no from field", async () => {
      const { kv } = createMockKV();
      // update() helper has no from field
      await onRequestPost(makeCtx(update("/mybills", 42), makeEnv(kv)));
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
