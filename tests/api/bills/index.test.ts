import { describe, it, expect, vi, beforeEach } from "vitest";
import { onRequestPost, onRequestGet } from "@functions/api/bills/index";
import type { Env, Bill } from "@functions/lib/types";
import { createMockKV, makeEnv, makeCtx } from "../../helpers";

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
  it("returns 405", async () => {
    const { kv } = createMockKV();
    const ctx = makeCtx({ method: "GET", env: makeEnv(kv) });
    const res = await onRequestGet(ctx);
    expect(res.status).toBe(405);
  });
});
