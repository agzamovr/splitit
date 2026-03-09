import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { onRequestPost } from "@functions/telegram_bot";
import type { Env } from "@functions/lib/types";

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
    expect(button.web_app.url).toBe("https://example.com/new?billId=abc123");
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
    expect(button.web_app.url).toBe("https://example.com/new");
  });

  it("unknown command returns 'ok' without sending a message", async () => {
    await onRequestPost(makeCtx(update("/unknown_command")));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("/mybills", () => {
    it("sends My Bills and New Bill buttons", async () => {
      await onRequestPost(makeCtx(update("/mybills", 55)));

      expect(fetchMock).toHaveBeenCalledOnce();
      const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
        chat_id: number;
        reply_markup: { inline_keyboard: { text: string; web_app: { url: string } }[][] };
      };
      expect(payload.chat_id).toBe(55);
      const [row0, row1] = payload.reply_markup.inline_keyboard;
      expect(row0[0].text).toBe("My Bills");
      expect(row0[0].web_app.url).toBe("https://example.com/bills");
      expect(row1[0].text).toBe("New Bill");
      expect(row1[0].web_app.url).toBe("https://example.com/new");
    });
  });
});
