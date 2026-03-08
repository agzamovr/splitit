/// <reference path="../src/telegram.d.ts" />
import type { Page } from "@playwright/test";

/** Inject a mock window.Telegram.WebApp so Telegram-gated features activate. */
export async function mockTelegram(page: Page, userId = 123, chat?: { id: number; type: string }) {
  // Block the real Telegram script so it can't overwrite our mock
  await page.route("**/telegram-web-app.js", (route) => route.abort());
  await page.addInitScript(({ id, chat }) => {
    window.Telegram = {
      WebApp: {
        initData: "mock_init_data",
        initDataUnsafe: { user: { id, first_name: "Test" }, chat },
        expand() {},
        ready() {},
        setHeaderColor() {},
        setBackgroundColor() {},
        setBottomBarColor() {},
        isVersionAtLeast() { return true; },
        colorScheme: "light" as const,
        onEvent() {},
        sendData() {},
        close() {},
        BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
      },
    };
  }, { id: userId, chat });
}

type DeepPartial<T> = { [K in keyof T]?: T[K] };

export function makeBill(overrides: DeepPartial<{
  id: string; creatorTelegramId: number; createdAt: number;
  receiptTitle: string; expenses: unknown[]; manualTotal: string;
  people: { id: string; name: string; amount: string; paid: string }[];
  assignments: Record<string, string[]>; splitMode: string;
  currency: string; version: number;
}> = {}) {
  return {
    id: "bill1",
    creatorTelegramId: 123,
    createdAt: Date.now() - 86_400_000,
    receiptTitle: "Pizza night",
    expenses: [],
    manualTotal: "100",
    people: [
      { id: "p1", name: "Alice", amount: "50", paid: "" },
      { id: "p2", name: "Bob", amount: "50", paid: "" },
    ],
    assignments: {},
    splitMode: "amounts",
    currency: "USD",
    version: 1,
    ...overrides,
  };
}
