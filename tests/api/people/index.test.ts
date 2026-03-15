import { describe, it, expect, vi, beforeEach } from "vitest";
import { onRequestGet, onRequestPost, onRequestDelete } from "@functions/api/people/index";
import type { KnownPerson } from "@functions/lib/kv";
import { createMockKV, makeEnv, makeCtx } from "../../helpers";

vi.mock("@functions/lib/auth", () => ({
  requireUser: vi.fn().mockResolvedValue({
    ok: true,
    initData: "valid",
    user: { id: 1, first_name: "Alice" },
  }),
}));

vi.mock("@functions/lib/verify", () => ({
  extractChat: vi.fn().mockReturnValue(null),
}));

describe("GET /api/people — user scope (no chat)", () => {
  it("returns empty list when no people stored", async () => {
    const { kv } = createMockKV();
    const ctx = makeCtx({ method: "GET", env: makeEnv(kv) });
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ people: [] });
  });

  it("returns the stored people for the user", async () => {
    const { kv, store } = createMockKV();
    const people: KnownPerson[] = [{ name: "Bob", telegramId: 7 }];
    store.set("user:1:people", JSON.stringify(people));
    const ctx = makeCtx({ method: "GET", env: makeEnv(kv) });
    const body = (await (await onRequestGet(ctx)).json()) as { people: KnownPerson[] };
    expect(body.people).toEqual(people);
  });

  it("returns 401 when auth fails", async () => {
    const { requireUser } = await import("@functions/lib/auth");
    vi.mocked(requireUser).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { kv } = createMockKV();
    const ctx = makeCtx({ method: "GET", env: makeEnv(kv), authHeader: "" });
    expect((await onRequestGet(ctx)).status).toBe(401);
  });
});

describe("GET /api/people — chat scope", () => {
  it("reads from chat key when chat context is present", async () => {
    const { extractChat } = await import("@functions/lib/verify");
    vi.mocked(extractChat).mockReturnValueOnce({ id: -100456, type: "supergroup" });

    const { kv, store } = createMockKV();
    store.set("chat:-100456:people", JSON.stringify([{ name: "Charlie" }]));
    // user key is empty — should not be read
    const ctx = makeCtx({ method: "GET", env: makeEnv(kv) });
    const body = (await (await onRequestGet(ctx)).json()) as { people: KnownPerson[] };
    expect(body.people).toEqual([{ name: "Charlie" }]);
  });

  it("does not fall back to user key when chat key is empty", async () => {
    const { extractChat } = await import("@functions/lib/verify");
    vi.mocked(extractChat).mockReturnValueOnce({ id: -100456, type: "group" });

    const { kv, store } = createMockKV();
    store.set("user:1:people", JSON.stringify([{ name: "From User" }]));
    const ctx = makeCtx({ method: "GET", env: makeEnv(kv) });
    const body = (await (await onRequestGet(ctx)).json()) as { people: KnownPerson[] };
    expect(body.people).toEqual([]);
  });
});

describe("POST /api/people — user scope", () => {
  let mockKV: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    mockKV = createMockKV();
  });

  it("saves a person and returns 200", async () => {
    const ctx = makeCtx({ method: "POST", env: makeEnv(mockKV.kv), body: { name: "Alice" } });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(200);
  });

  it("stores the person under the user key", async () => {
    const ctx = makeCtx({ method: "POST", env: makeEnv(mockKV.kv), body: { name: "Alice" } });
    await onRequestPost(ctx);
    const saved = JSON.parse(mockKV.store.get("user:1:people")!) as KnownPerson[];
    expect(saved[0].name).toBe("Alice");
  });

  it("preserves telegramId and photoUrl", async () => {
    const person = { name: "Eve", telegramId: 42, photoUrl: "https://example.com/photo.jpg" };
    const ctx = makeCtx({ method: "POST", env: makeEnv(mockKV.kv), body: person });
    await onRequestPost(ctx);
    const saved = JSON.parse(mockKV.store.get("user:1:people")!) as KnownPerson[];
    expect(saved[0]).toEqual(person);
  });

  it("returns 401 when auth fails", async () => {
    const { requireUser } = await import("@functions/lib/auth");
    vi.mocked(requireUser).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const ctx = makeCtx({ method: "POST", env: makeEnv(mockKV.kv), authHeader: "", body: { name: "X" } });
    expect((await onRequestPost(ctx)).status).toBe(401);
  });
});

describe("POST /api/people — chat scope", () => {
  it("saves under the chat key when chat context is present", async () => {
    const { extractChat } = await import("@functions/lib/verify");
    vi.mocked(extractChat).mockReturnValueOnce({ id: -100789, type: "group" });

    const { kv, store } = createMockKV();
    const ctx = makeCtx({ method: "POST", env: makeEnv(kv), body: { name: "Dave", telegramId: 55 } });
    await onRequestPost(ctx);

    const saved = JSON.parse(store.get("chat:-100789:people")!) as KnownPerson[];
    expect(saved[0]).toEqual({ name: "Dave", telegramId: 55 });
    expect(store.has("user:1:people")).toBe(false);
  });
});

describe("DELETE /api/people — user scope", () => {
  it("removes the person and returns 200", async () => {
    const { kv, store } = createMockKV();
    store.set("user:1:people", JSON.stringify([{ name: "Alice" }, { name: "Bob" }]));
    const ctx = makeCtx({ method: "DELETE", env: makeEnv(kv), body: { name: "Alice" } });
    const res = await onRequestDelete(ctx);
    expect(res.status).toBe(200);
    const remaining = JSON.parse(store.get("user:1:people")!) as KnownPerson[];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe("Bob");
  });

  it("returns 401 when auth fails", async () => {
    const { requireUser } = await import("@functions/lib/auth");
    vi.mocked(requireUser).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { kv } = createMockKV();
    const ctx = makeCtx({ method: "DELETE", env: makeEnv(kv), authHeader: "", body: { name: "X" } });
    expect((await onRequestDelete(ctx)).status).toBe(401);
  });
});

describe("DELETE /api/people — chat scope", () => {
  it("deletes under the chat key when chat context is present", async () => {
    const { extractChat } = await import("@functions/lib/verify");
    vi.mocked(extractChat).mockReturnValueOnce({ id: -100789, type: "group" });

    const { kv, store } = createMockKV();
    store.set("chat:-100789:people", JSON.stringify([{ name: "Dave" }, { name: "Eve" }]));
    const ctx = makeCtx({ method: "DELETE", env: makeEnv(kv), body: { name: "Dave" } });
    await onRequestDelete(ctx);

    const remaining = JSON.parse(store.get("chat:-100789:people")!) as KnownPerson[];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe("Eve");
    expect(store.has("user:1:people")).toBe(false);
  });
});
