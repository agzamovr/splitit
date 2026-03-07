import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listBills, type Bill } from "@/api";
import { formatAmount } from "@/currency";

export const Route = createFileRoute("/bills")({
  component: BillsPage,
});

function computeTotal(bill: Bill): number {
  if (bill.expenses.length > 0) {
    return bill.expenses.reduce((sum, e) => {
      const price = parseFloat(e.price) || 0;
      if (e.pricingMode === "each") {
        return sum + price * (bill.assignments[e.id] || []).length;
      }
      return sum + price;
    }, 0);
  }
  return parseFloat(bill.manualTotal) || 0;
}

function isBillBalanced(bill: Bill): boolean {
  const total = computeTotal(bill);
  if (total < 0.01) return true;

  let covered: number;
  if (bill.splitMode === "equally") {
    const amounts: Record<string, number> = {};
    for (const p of bill.people) amounts[p.id] = 0;
    for (const expense of bill.expenses) {
      const price = parseFloat(expense.price) || 0;
      const assigned = bill.assignments[expense.id] || [];
      if (assigned.length === 0 || price === 0) continue;
      if (expense.pricingMode === "each") {
        for (const pid of assigned) {
          if (amounts[pid] !== undefined) amounts[pid] += price;
        }
      } else {
        const share = price / assigned.length;
        for (const pid of assigned) {
          if (amounts[pid] !== undefined) amounts[pid] += share;
        }
      }
    }
    covered = Object.values(amounts).reduce((s, v) => s + v, 0);
  } else {
    covered = bill.people.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }

  return Math.abs(total - covered) < 0.01;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function BillsPage() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unbalanced">("all");
  const tg = window.Telegram?.WebApp ?? null;

  useEffect(() => {
    if (!window.Telegram?.WebApp?.initData) {
      setBills([]);
      return;
    }
    listBills().then(setBills).catch(() => setBills([]));
  }, []);

  useEffect(() => {
    if (!tg) return;
    tg.BackButton.show();
    const goBack = () => void navigate({ to: "/" });
    tg.BackButton.onClick(goBack);
    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick(goBack);
    };
  }, [navigate]);

  // Compute total and balance once per bill, not twice (filter + render)
  const billStats = useMemo(
    () => new Map((bills ?? []).map((b) => [b.id, { total: computeTotal(b), balanced: isBillBalanced(b) }])),
    [bills],
  );

  const displayed = bills
    ? filter === "unbalanced"
      ? bills.filter((b) => !billStats.get(b.id)!.balanced)
      : bills
    : [];

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-espresso/8 flex items-center justify-between">
        {!tg && (
          <button
            onClick={() => void navigate({ to: "/" })}
            className="text-sm text-espresso/50 hover:text-espresso mr-3"
          >
            ← Back
          </button>
        )}
        <h1 className="text-base font-semibold text-espresso tracking-tight flex-1">My Bills</h1>

        {/* Filter toggle */}
        <div className="flex gap-1 bg-espresso/8 rounded-lg p-1 text-xs">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filter === "all" ? "bg-white text-espresso shadow-sm" : "text-espresso/50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unbalanced")}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filter === "unbalanced" ? "bg-white text-espresso shadow-sm" : "text-espresso/50"
            }`}
          >
            Unpaid
          </button>
        </div>
      </div>

      {/* List */}
      {bills === null ? (
        <div className="flex items-center justify-center pt-20">
          <p className="text-espresso/40 text-sm">Loading…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex items-center justify-center pt-20">
          <p className="text-espresso/40 text-sm">
            {filter === "unbalanced" ? "No unpaid bills" : "No bills yet"}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-espresso/8">
          {displayed.map((bill) => {
            const { total, balanced } = billStats.get(bill.id)!;
            return (
              <li key={bill.id}>
                <button
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-espresso/4 active:bg-espresso/8 transition-colors"
                  onClick={() => { window.location.href = `/?billId=${bill.id}`; }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-espresso truncate">
                      {bill.receiptTitle || "Untitled"}
                    </p>
                    <p className="text-xs text-espresso/40 mt-0.5">
                      {formatDate(bill.createdAt)}
                      {bill.people.length > 0 && ` · ${bill.people.length} people`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {total > 0 && (
                      <span className="text-sm font-semibold text-espresso">
                        {formatAmount(total, bill.currency)}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        balanced
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {balanced ? "Balanced" : "Unpaid"}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
