import { describe, it, expect, vi, beforeEach } from "vitest";
import { onRequestPost, onRequestGet, onRequestDelete } from "@functions/api/bills/index";
import type { Env, Bill } from "@functions/lib/types";
import { createMockKV, makeEnv, makeCtx } from "../../helpers";

const makeBill = (id: string): Bill => ({
  id, creatorTelegramId: 1, createdAt: 1000, receiptTitle: id,
  expenses: [], manualTotal: "0", people: [], assignments: {},
  splitMode: "equally", currency: "USD", version: 1,
});

vi.mock("@functions/lib/auth", () => ({
  requireUser: vi.fn().mockResolvedValue({
    ok: true,
    initData: "valid",
    user: { id: 1, first_name: "Alice" },
  }),
}));

describe("POST /api/bills", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let env: Env;

  beforeEach(() => {
    mockKV = createMockKV();
    env = makeEnv(mockKV.kv);
  });

  it("creates a bill and returns billId", async () => {
    const ctx = makeCtx({
      body: { receiptTitle: "Dinner", expenses: [], manualTotal: "100", people: [], assignments: {}, splitMode: "equally", currency: "USD" },
      env,
    });
    const res = await onRequestPost(ctx);
    const body = (await res.json()) as { billId: string };

    expect(res.status).toBe(200);
    expect(typeof body.billId).toBe("string");
    expect(body.billId).toHaveLength(10);
  });

  it("stores the bill in KV with correct fields", async () => {
    const ctx = makeCtx({ body: { receiptTitle: "Lunch", currency: "EUR" }, env });
    const res = await onRequestPost(ctx);
    const { billId } = (await res.json()) as { billId: string };

    const stored = mockKV.store.get(`bill:${billId}`);
    expect(stored).toBeDefined();
    const bill = JSON.parse(stored!) as Bill;
    expect(bill.receiptTitle).toBe("Lunch");
    expect(bill.currency).toBe("EUR");
    expect(bill.creatorTelegramId).toBe(1);
    expect(bill.version).toBe(1);
  });

  it("uses defaults for omitted fields", async () => {
    const ctx = makeCtx({ body: {}, env });
    const res = await onRequestPost(ctx);
    const { billId } = (await res.json()) as { billId: string };
    const bill = JSON.parse(mockKV.store.get(`bill:${billId}`)!) as Bill;

    expect(bill.receiptTitle).toBe("Bill");
    expect(bill.currency).toBe("USD");
    expect(bill.splitMode).toBe("equally");
    expect(bill.expenses).toEqual([]);
    expect(bill.people).toEqual([]);
  });

  it("returns 401 when auth fails", async () => {
    const { requireUser } = await import("@functions/lib/auth");
    vi.mocked(requireUser).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const ctx = makeCtx({ body: {}, env, authHeader: "" });
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/bills", () => {
  it("returns 401 without valid auth", async () => {
    const { requireUser } = await import("@functions/lib/auth");
    vi.mocked(requireUser).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { kv } = createMockKV();
    const ctx = makeCtx({ method: "GET", env: makeEnv(kv), authHeader: "" });
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(401);
  });

  it("returns empty array when user has no bills", async () => {
    const { kv } = createMockKV();
    const ctx = makeCtx({ method: "GET", env: makeEnv(kv) });
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns bills belonging to the authenticated user", async () => {
    const mockKV = createMockKV();
    const bill: Bill = {
      id: "abc123", creatorTelegramId: 1, createdAt: 1000,
      receiptTitle: "Dinner", expenses: [], manualTotal: "50",
      people: [], assignments: {}, splitMode: "equally", currency: "USD", version: 1,
    };
    mockKV.store.set("bill:abc123", JSON.stringify(bill));
    mockKV.store.set("user:1:bills", JSON.stringify(["abc123"]));

    const ctx = makeCtx({ method: "GET", env: makeEnv(mockKV.kv) });
    const res = await onRequestGet(ctx);
    const bills = (await res.json()) as Bill[];

    expect(res.status).toBe(200);
    expect(bills).toHaveLength(1);
    expect(bills[0].id).toBe("abc123");
    expect(bills[0].receiptTitle).toBe("Dinner");
  });

  it("returns multiple bills in index order", async () => {
    const mockKV = createMockKV();
    mockKV.store.set("bill:b1", JSON.stringify(makeBill("b1")));
    mockKV.store.set("bill:b2", JSON.stringify(makeBill("b2")));
    mockKV.store.set("user:1:bills", JSON.stringify(["b2", "b1"]));

    const ctx = makeCtx({ method: "GET", env: makeEnv(mockKV.kv) });
    const bills = (await (await onRequestGet(ctx)).json()) as Bill[];

    expect(bills.map((b) => b.id)).toEqual(["b2", "b1"]);
  });

  it("silently skips expired (missing) bills in the index", async () => {
    const mockKV = createMockKV();
    const bill: Bill = {
      id: "live", creatorTelegramId: 1, createdAt: 1000, receiptTitle: "Live",
      expenses: [], manualTotal: "0", people: [], assignments: {},
      splitMode: "equally", currency: "USD", version: 1,
    };
    mockKV.store.set("bill:live", JSON.stringify(bill));
    // "expired" bill ID is in the index but not in KV
    mockKV.store.set("user:1:bills", JSON.stringify(["live", "expired"]));

    const ctx = makeCtx({ method: "GET", env: makeEnv(mockKV.kv) });
    const bills = (await (await onRequestGet(ctx)).json()) as Bill[];

    expect(bills).toHaveLength(1);
    expect(bills[0].id).toBe("live");
  });
});

describe("POST /api/bills — user index", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let env: Env;

  beforeEach(() => {
    mockKV = createMockKV();
    env = makeEnv(mockKV.kv);
  });

  it("adds the new billId to the user index", async () => {
    const ctx = makeCtx({ body: { receiptTitle: "Lunch" }, env });
    const res = await onRequestPost(ctx);
    const { billId } = (await res.json()) as { billId: string };

    const raw = mockKV.store.get("user:1:bills");
    expect(raw).toBeDefined();
    const ids = JSON.parse(raw!) as string[];
    expect(ids).toContain(billId);
  });

  it("prepends new bill to existing index", async () => {
    mockKV.store.set("user:1:bills", JSON.stringify(["old-id"]));

    const ctx = makeCtx({ body: { receiptTitle: "New" }, env });
    const res = await onRequestPost(ctx);
    const { billId } = (await res.json()) as { billId: string };

    const ids = JSON.parse(mockKV.store.get("user:1:bills")!) as string[];
    expect(ids[0]).toBe(billId);
    expect(ids[1]).toBe("old-id");
  });

  it("caps the user index at 100 entries", async () => {
    const existing = Array.from({ length: 100 }, (_, i) => `old-${i}`);
    mockKV.store.set("user:1:bills", JSON.stringify(existing));

    const ctx = makeCtx({ body: {}, env });
    await onRequestPost(ctx);

    const ids = JSON.parse(mockKV.store.get("user:1:bills")!) as string[];
    expect(ids).toHaveLength(100);
    // oldest entry dropped
    expect(ids).not.toContain("old-99");
  });
});

describe("DELETE /api/bills", () => {
  it("returns 401 without auth", async () => {
    const { requireUser } = await import("@functions/lib/auth");
    vi.mocked(requireUser).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { kv } = createMockKV();
    const ctx = makeCtx({ method: "DELETE", env: makeEnv(kv), authHeader: "" });
    const res = await onRequestDelete(ctx);
    expect(res.status).toBe(401);
  });

  it("deletes all user bills from KV and clears the index", async () => {
    const mockKV = createMockKV();
    mockKV.store.set("bill:b1", JSON.stringify(makeBill("b1")));
    mockKV.store.set("bill:b2", JSON.stringify(makeBill("b2")));
    mockKV.store.set("user:1:bills", JSON.stringify(["b1", "b2"]));

    const ctx = makeCtx({ method: "DELETE", env: makeEnv(mockKV.kv) });
    const res = await onRequestDelete(ctx);

    expect(res.status).toBe(200);
    expect(mockKV.store.has("bill:b1")).toBe(false);
    expect(mockKV.store.has("bill:b2")).toBe(false);
    expect(mockKV.store.has("user:1:bills")).toBe(false);
  });

  it("succeeds when user has no bills", async () => {
    const { kv } = createMockKV();
    const ctx = makeCtx({ method: "DELETE", env: makeEnv(kv) });
    const res = await onRequestDelete(ctx);
    expect(res.status).toBe(200);
  });
});
