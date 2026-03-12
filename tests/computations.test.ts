import { describe, it, expect } from "vitest";
import {
  computeTotal,
  computeAmounts,
  computeCoveredAndRemaining,
  computeSettleSummary,
} from "../src/computations";
import type { Expense, Person } from "../src/types";
import type { PricingMode } from "../src/types";

const p = (id: string, amount = "", paid = ""): Person => ({ id, name: "", amount, paid });
const e = (id: string, price: string, pricingMode: PricingMode = "total"): Expense => ({
  id,
  description: "",
  price,
  pricingMode,
});

describe("computeTotal", () => {
  it("sums prices for total-priced items", () => {
    const expenses = [e("a", "10"), e("b", "20")];
    expect(computeTotal(expenses, "", { a: ["p1"], b: ["p1", "p2"] })).toBe(30);
  });

  it("multiplies price by assignee count for each-priced items", () => {
    const expenses = [e("a", "15", "each")];
    expect(computeTotal(expenses, "", { a: ["p1", "p2", "p3"] })).toBe(45);
  });

  it("parses manualTotal when no items", () => {
    expect(computeTotal([], "99.50", {})).toBe(99.5);
  });
});

describe("computeAmounts", () => {
  it("splits evenly with total pricing (no remainder)", () => {
    const people = [p("p1"), p("p2")];
    const expenses = [e("a", "20")];
    expect(computeAmounts(expenses, people, { a: ["p1", "p2"] }, 20)).toEqual({ p1: 10, p2: 10 });
  });

  it("assigns remainder to last assignee for uneven total split", () => {
    const people = [p("p1"), p("p2"), p("p3")];
    const expenses = [e("a", "10")];
    const amounts = computeAmounts(expenses, people, { a: ["p1", "p2", "p3"] }, 10);
    expect(amounts).toEqual({ p1: 3.33, p2: 3.33, p3: 3.34 });
  });

  it("charges each assignee the full price with each pricing", () => {
    const people = [p("p1"), p("p2")];
    const expenses = [e("a", "5", "each")];
    expect(computeAmounts(expenses, people, { a: ["p1", "p2"] }, 10)).toEqual({ p1: 5, p2: 5 });
  });

  it("splits manual total equally with remainder to last person", () => {
    const people = [p("p1"), p("p2"), p("p3")];
    const amounts = computeAmounts([], people, {}, 10);
    expect(amounts).toEqual({ p1: 3.33, p2: 3.33, p3: 3.34 });
  });

  it("accumulates amounts from multiple mixed-mode expenses", () => {
    const people = [p("p1"), p("p2")];
    // total expense: $10 split → $5 each; each expense: $8 per person → $8 each
    const expenses = [e("a", "10"), e("b", "8", "each")];
    expect(computeAmounts(expenses, people, { a: ["p1", "p2"], b: ["p1", "p2"] }, 26))
      .toEqual({ p1: 13, p2: 13 });
  });
});

describe("computeCoveredAndRemaining", () => {
  it("equally: sums computedAmounts; amounts: sums person.amount; detects isOver", () => {
    const people = [p("p1", "30"), p("p2", "40")];
    const computedAmounts = { p1: 35, p2: 35 };

    const eq = computeCoveredAndRemaining("equally", people, computedAmounts, 70);
    expect(eq).toEqual({ coveredAmount: 70, remaining: 0, isBalanced: true, isOver: false });

    const amt = computeCoveredAndRemaining("amounts", people, computedAmounts, 70);
    expect(amt).toEqual({ coveredAmount: 70, remaining: 0, isBalanced: true, isOver: false });

    const over = computeCoveredAndRemaining("amounts", [p("p1", "110")], { p1: 110 }, 100);
    expect(over.isOver).toBe(true);
    expect(over.isBalanced).toBe(false);
  });
});

describe("computeSettleSummary", () => {
  const people = [p("p1"), p("p2"), p("p3")];
  const computedAmounts = { p1: 40, p2: 30, p3: 30 };
  const base = {
    people,
    computedAmounts,
    total: 100,
    coveredAmount: 100,
    remaining: 0,
    isBalanced: true,
  };

  it("passes through store values in consumption mode", () => {
    const result = computeSettleSummary({
      ...base,
      isSettleMode: false,
      settleSubMode: "payer",
      payerId: null,
      settledDebtorIds: new Set(),
    });
    expect(result).toEqual({ coveredAmount: 100, remaining: 0, isBalanced: true });
  });

  it("payer mode, no payer: covered = 0, remaining = total", () => {
    const result = computeSettleSummary({
      ...base,
      isSettleMode: true,
      settleSubMode: "payer",
      payerId: null,
      settledDebtorIds: new Set(),
    });
    expect(result).toEqual({ coveredAmount: 0, remaining: 100, isBalanced: false });
  });

  it("payer mode, payer selected: covered = payer share, remaining = unsettled debtors; all settled → isBalanced", () => {
    const partial = computeSettleSummary({
      ...base,
      isSettleMode: true,
      settleSubMode: "payer",
      payerId: "p1",
      settledDebtorIds: new Set(["p2"]), // p3 not settled
    });
    expect(partial).toEqual({ coveredAmount: 40, remaining: 30, isBalanced: false });

    const allSettled = computeSettleSummary({
      ...base,
      isSettleMode: true,
      settleSubMode: "payer",
      payerId: "p1",
      settledDebtorIds: new Set(["p2", "p3"]),
    });
    expect(allSettled).toEqual({ coveredAmount: 40, remaining: 0, isBalanced: true });
  });

  it("payer mode, payer is the only person: isBalanced immediately (no debtors)", () => {
    const result = computeSettleSummary({
      ...base,
      people: [p("p1")],
      computedAmounts: { p1: 100 },
      isSettleMode: true,
      settleSubMode: "payer",
      payerId: "p1",
      settledDebtorIds: new Set(),
    });
    expect(result).toEqual({ coveredAmount: 100, remaining: 0, isBalanced: true });
  });

  it("own mode: covered = settled sum, remaining = unsettled sum; all settled → isBalanced", () => {
    const partial = computeSettleSummary({
      ...base,
      isSettleMode: true,
      settleSubMode: "own",
      payerId: null,
      settledDebtorIds: new Set(["p1", "p2"]), // p3 not settled
    });
    expect(partial).toEqual({ coveredAmount: 70, remaining: 30, isBalanced: false });

    const allSettled = computeSettleSummary({
      ...base,
      isSettleMode: true,
      settleSubMode: "own",
      payerId: null,
      settledDebtorIds: new Set(["p1", "p2", "p3"]),
    });
    expect(allSettled).toEqual({ coveredAmount: 100, remaining: 0, isBalanced: true });
  });
});
