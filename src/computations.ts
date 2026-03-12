import type { Expense, Person } from "./types";

export function computeTotal(
  expenses: Expense[],
  manualTotal: string,
  assignments: Record<string, string[]>
): number {
  if (expenses.length > 0) {
    return expenses.reduce((sum, e) => {
      const price = parseFloat(e.price) || 0;
      if (e.pricingMode === "each") {
        return sum + price * (assignments[e.id] || []).length;
      }
      return sum + price;
    }, 0);
  }
  return parseFloat(manualTotal) || 0;
}

export function computeAmounts(
  expenses: Expense[],
  people: Person[],
  assignments: Record<string, string[]>,
  total: number
): Record<string, number> {
  const computedAmounts: Record<string, number> = {};
  for (const person of people) {
    computedAmounts[person.id] = 0;
  }

  if (expenses.length > 0) {
    for (const expense of expenses) {
      const price = parseFloat(expense.price) || 0;
      const assigned = assignments[expense.id] || [];
      if (assigned.length === 0 || price === 0) continue;
      if (expense.pricingMode === "each") {
        for (const pid of assigned) {
          if (computedAmounts[pid] !== undefined) {
            computedAmounts[pid] += price;
          }
        }
      } else {
        const base = Math.floor((price * 100) / assigned.length) / 100;
        const remainder = +(price - base * assigned.length).toFixed(2);
        for (let i = 0; i < assigned.length; i++) {
          const pid = assigned[i];
          if (computedAmounts[pid] !== undefined) {
            computedAmounts[pid] += i === assigned.length - 1 ? base + remainder : base;
          }
        }
      }
    }
  } else if (people.length > 0 && total > 0) {
    const base = Math.floor((total * 100) / people.length) / 100;
    const remainder = +(total - base * people.length).toFixed(2);
    for (let i = 0; i < people.length; i++) {
      computedAmounts[people[i].id] = i === people.length - 1 ? base + remainder : base;
    }
  }

  return computedAmounts;
}

export function computeCoveredAndRemaining(
  splitMode: "equally" | "amounts",
  people: Person[],
  computedAmounts: Record<string, number>,
  total: number
): { coveredAmount: number; remaining: number; isBalanced: boolean; isOver: boolean } {
  const coveredAmount =
    splitMode === "equally"
      ? Object.values(computedAmounts).reduce((sum, v) => sum + v, 0)
      : people.reduce((sum, person) => sum + (parseFloat(person.amount) || 0), 0);
  const remaining = total - coveredAmount;
  const isBalanced = Math.abs(remaining) < 0.01;
  const isOver = remaining < -0.01;
  return { coveredAmount, remaining, isBalanced, isOver };
}

export function computeSettleSummary(params: {
  isSettleMode: boolean;
  settleSubMode: "payer" | "own";
  payerId: string | null;
  people: Person[];
  computedAmounts: Record<string, number>;
  total: number;
  coveredAmount: number;
  remaining: number;
  isBalanced: boolean;
  settledDebtorIds: Set<string>;
}): { coveredAmount: number; remaining: number; isBalanced: boolean } {
  const {
    isSettleMode,
    settleSubMode,
    payerId,
    people,
    computedAmounts,
    total,
    coveredAmount,
    remaining,
    isBalanced,
    settledDebtorIds,
  } = params;

  if (!isSettleMode) {
    return { coveredAmount, remaining, isBalanced };
  }

  if (settleSubMode === "own") {
    return {
      coveredAmount: people
        .filter(p => settledDebtorIds.has(p.id))
        .reduce((sum, p) => sum + (computedAmounts[p.id] || 0), 0),
      remaining: people
        .filter(p => !settledDebtorIds.has(p.id))
        .reduce((sum, p) => sum + (computedAmounts[p.id] || 0), 0),
      isBalanced: people.every(p => settledDebtorIds.has(p.id)),
    };
  }

  // settleSubMode === "payer"
  return {
    coveredAmount: payerId ? (computedAmounts[payerId] || 0) : 0,
    remaining: !payerId
      ? total
      : people
          .filter(p => p.id !== payerId && !settledDebtorIds.has(p.id))
          .reduce((sum, p) => sum + (computedAmounts[p.id] || 0), 0),
    isBalanced:
      !!payerId &&
      people.filter(p => p.id !== payerId).every(p => settledDebtorIds.has(p.id)),
  };
}
