import { describe, it, expect, vi, beforeEach } from "vitest";
import { onRequestGet, onRequestPatch, onRequestDelete } from "@functions/api/bills/[id]/index";
import type { Env, Bill } from "@functions/lib/types";
import { createMockKV, makeEnv, makeCtx } from "../../../helpers";

const requireUserMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    ok: true,
    initData: "valid",
    user: { id: 1, first_name: "Alice" },
  }),
);

vi.mock("@functions/lib/auth", () => ({ requireUser: requireUserMock }));

const BASE_BILL: Bill = {
  id: "bill123",
  creatorTelegramId: 1,
  createdAt: 1000000,
  receiptTitle: "Dinner",
  expenses: [],
  manualTotal: "100",
  people: [],
  assignments: {},
  splitMode: "equally",
  currency: "USD",
  version: 3,
};

describe("GET /api/bills/:id", () => {
  it("returns the bill when found", async () => {
    const { kv } = createMockKV(BASE_BILL);
    const ctx = makeCtx({ method: "GET", params: { id: "bill123" }, env: makeEnv(kv) });
    const res = await onRequestGet(ctx);
    const bill = (await res.json()) as Bill;

    expect(res.status).toBe(200);
    expect(bill.id).toBe("bill123");
    expect(bill.receiptTitle).toBe("Dinner");
  });

  it("returns 404 for unknown bill", async () => {
    const { kv } = createMockKV();
    const ctx = makeCtx({ method: "GET", params: { id: "missing" }, env: makeEnv(kv) });
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/bills/:id", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let env: Env;

  beforeEach(() => {
    mockKV = createMockKV(BASE_BILL);
    env = makeEnv(mockKV.kv);
    requireUserMock.mockResolvedValue({
      ok: true,
      initData: "valid",
      user: { id: 1, first_name: "Alice" },
    });
  });

  it("returns 401 when auth is missing", async () => {
    requireUserMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const ctx = makeCtx({ params: { id: "bill123" }, body: {}, env, authHeader: "" });
    const res = await onRequestPatch(ctx);
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown bill", async () => {
    const ctx = makeCtx({ params: { id: "no-such-bill" }, body: { receiptTitle: "X" }, env });
    const res = await onRequestPatch(ctx);
    expect(res.status).toBe(404);
  });

  it("creator can update receiptTitle", async () => {
    const ctx = makeCtx({ params: { id: "bill123" }, body: { receiptTitle: "Brunch" }, env });
    const res = await onRequestPatch(ctx);
    const bill = (await res.json()) as Bill;

    expect(res.status).toBe(200);
    expect(bill.receiptTitle).toBe("Brunch");
  });

  it("creator can update expenses and currency", async () => {
    const ctx = makeCtx({ params: { id: "bill123" }, body: { currency: "EUR", manualTotal: "200" }, env });
    const res = await onRequestPatch(ctx);
    const bill = (await res.json()) as Bill;

    expect(bill.currency).toBe("EUR");
    expect(bill.manualTotal).toBe("200");
  });

  it("increments version on every patch", async () => {
    const ctx = makeCtx({ params: { id: "bill123" }, body: { receiptTitle: "Updated" }, env });
    const res = await onRequestPatch(ctx);
    const bill = (await res.json()) as Bill;
    expect(bill.version).toBe(BASE_BILL.version + 1);
  });

  it("persists changes to KV", async () => {
    const ctx = makeCtx({ params: { id: "bill123" }, body: { receiptTitle: "Saved" }, env });
    await onRequestPatch(ctx);
    const stored = JSON.parse(mockKV.store.get("bill:bill123")!) as Bill;
    expect(stored.receiptTitle).toBe("Saved");
  });

  it("non-creator cannot update creator-only fields", async () => {
    requireUserMock.mockResolvedValueOnce({ ok: true, initData: "valid", user: { id: 999, first_name: "Eve" } });
    const ctx = makeCtx({ params: { id: "bill123" }, body: { receiptTitle: "Hacked", currency: "GBP" }, env });
    const res = await onRequestPatch(ctx);
    const bill = (await res.json()) as Bill;

    expect(bill.receiptTitle).toBe("Dinner");
    expect(bill.currency).toBe("USD");
  });

  it("non-creator can update people", async () => {
    requireUserMock.mockResolvedValueOnce({ ok: true, initData: "valid", user: { id: 999, first_name: "Eve" } });
    const newPeople = [{ id: "p1", name: "Eve", amount: "", paid: "" }];
    const ctx = makeCtx({ params: { id: "bill123" }, body: { people: newPeople }, env });
    const res = await onRequestPatch(ctx);
    const bill = (await res.json()) as Bill;

    expect(bill.people).toEqual(newPeople);
  });

  it("ignores attempts to overwrite immutable fields", async () => {
    const ctx = makeCtx({ params: { id: "bill123" }, body: { id: "hacked", creatorTelegramId: 999, version: 100 }, env });
    const res = await onRequestPatch(ctx);
    const bill = (await res.json()) as Bill;

    expect(bill.id).toBe("bill123");
    expect(bill.creatorTelegramId).toBe(1);
    expect(bill.version).toBe(BASE_BILL.version + 1);
  });
});

describe("DELETE /api/bills/:id", () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let env: Env;

  beforeEach(() => {
    mockKV = createMockKV(BASE_BILL);
    // Seed user index
    mockKV.store.set("user:1:bills", JSON.stringify(["bill123"]));
    env = makeEnv(mockKV.kv);
    requireUserMock.mockResolvedValue({
      ok: true,
      initData: "valid",
      user: { id: 1, first_name: "Alice" },
    });
  });

  it("returns 401 without auth", async () => {
    requireUserMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const ctx = makeCtx({ method: "DELETE", params: { id: "bill123" }, env, authHeader: "" });
    const res = await onRequestDelete(ctx);
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown bill", async () => {
    const ctx = makeCtx({ method: "DELETE", params: { id: "no-such" }, env });
    const res = await onRequestDelete(ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-creator tries to delete", async () => {
    requireUserMock.mockResolvedValueOnce({ ok: true, initData: "valid", user: { id: 999, first_name: "Eve" } });
    const ctx = makeCtx({ method: "DELETE", params: { id: "bill123" }, env });
    const res = await onRequestDelete(ctx);
    expect(res.status).toBe(403);
    // Bill should still exist
    expect(mockKV.store.has("bill:bill123")).toBe(true);
  });

  it("deletes the bill from KV", async () => {
    const ctx = makeCtx({ method: "DELETE", params: { id: "bill123" }, env });
    const res = await onRequestDelete(ctx);
    expect(res.status).toBe(200);
    expect(mockKV.store.has("bill:bill123")).toBe(false);
  });

  it("removes bill from user index", async () => {
    const ctx = makeCtx({ method: "DELETE", params: { id: "bill123" }, env });
    await onRequestDelete(ctx);
    const ids = JSON.parse(mockKV.store.get("user:1:bills")!) as string[];
    expect(ids).not.toContain("bill123");
  });

  it("removes only the deleted bill from a multi-bill index", async () => {
    mockKV.store.set("user:1:bills", JSON.stringify(["other-bill", "bill123"]));
    const ctx = makeCtx({ method: "DELETE", params: { id: "bill123" }, env });
    await onRequestDelete(ctx);
    const ids = JSON.parse(mockKV.store.get("user:1:bills")!) as string[];
    expect(ids).toEqual(["other-bill"]);
  });
});
