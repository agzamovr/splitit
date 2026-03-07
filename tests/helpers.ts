import { vi } from "vitest";
import type { Env, Bill } from "@functions/lib/types";

export function createMockKV(initial?: Bill) {
  const store = new Map<string, string>();
  if (initial) store.set(`bill:${initial.id}`, JSON.stringify(initial));
  return {
    kv: {
      get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      put: vi.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve(undefined);
      }),
    } as unknown as KVNamespace,
    store,
  };
}

export function makeEnv(kv: KVNamespace): Env {
  return { SPLIT_BILLS: kv, BOT_TOKEN: "test_token", APP_URL: "https://example.com" };
}

export function makeCtx(opts: {
  method?: string;
  params?: Record<string, string>;
  body?: unknown;
  env: Env;
  authHeader?: string;
}): Parameters<PagesFunction<Env>>[0] {
  const { method = "POST", params = {}, body, env, authHeader = "TelegramInitData valid" } = opts;
  const hasBody = method !== "GET" && method !== "HEAD" && body !== undefined;
  return {
    params,
    request: new Request("http://localhost/", {
      method,
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    }),
    env,
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    next: vi.fn(),
    data: {},
    functionPath: "",
  } as unknown as Parameters<PagesFunction<Env>>[0];
}
