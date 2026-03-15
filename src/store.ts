import { useMemo } from "react";
import { create } from "zustand";
import {
  type Expense,
  type Person,
  type PricingMode,
  type ViewMode,
  type AssignmentMode,
  genId,
} from "./types";
import {
  computeTotal,
  computeAmounts,
  computeCoveredAndRemaining,
  computeSettleSummary,
} from "./computations";
import { detectCurrency, detectCurrencyFromEdge } from "./currency";
import type { BillPayload } from "./api";
import { object, string, number, optional, array, union, literal, record, type InferOutput } from "valibot";

export const ParsedReceiptSchema = object({
  receiptTitle: optional(string()),
  expenses: optional(array(object({
    description: string(),
    price: string(),
  }))),
  manualTotal: optional(string()),
  currency: optional(string()),
  error: optional(string()),
});

export type ParsedReceipt = InferOutput<typeof ParsedReceiptSchema>;

const ExpenseSchema = object({
  id: string(),
  description: string(),
  price: string(),
  pricingMode: union([literal("total"), literal("each")]),
});

const PersonSchema = object({
  id: string(),
  name: string(),
  amount: string(),
  paid: string(),
  telegramId: optional(number()),
  photoUrl: optional(string()),
});

export const BillSchema = object({
  id: string(),
  creatorTelegramId: number(),
  chatId: optional(number()),
  createdAt: number(),
  receiptTitle: string(),
  expenses: array(ExpenseSchema),
  manualTotal: string(),
  people: array(PersonSchema),
  assignments: record(string(), array(string())),
  splitMode: union([literal("equally"), literal("amounts")]),
  currency: string(),
  version: number(),
});

function getDefaultReceiptTitle(date: Date): string {
  const hour = date.getHours();
  let meal: string;
  if (hour >= 5 && hour <= 9) meal = "Breakfast";
  else if (hour >= 10 && hour <= 11) meal = "Brunch";
  else if (hour >= 12 && hour <= 13) meal = "Lunch";
  else meal = "Dinner";
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  return `${meal} · ${month} ${day}`;
}

interface BillState {
  receiptTitle: string;
  expenses: Expense[];
  manualTotal: string;
  people: Person[];
  splitMode: "equally" | "amounts";
  currency: string;
  assignments: Record<string, string[]>;
  assignmentMode: AssignmentMode;
  viewMode: ViewMode;
  payerId: string | null;
  focusNewId: { current: string | null };
  settledDebtorIds: Set<string>;
  settleSubMode: "payer" | "own";
  currencySetByUser: boolean;
}

interface BillActions {
  setReceiptTitle: (title: string) => void;
  setCurrency: (code: string) => void;
  initCurrencyDetection: () => void;
  setManualTotal: (total: string) => void;
  setSplitMode: (mode: "equally" | "amounts") => void;
  setViewMode: (mode: ViewMode) => void;
  setPayerId: (id: string) => void;
  setSettleSubMode: (mode: "payer" | "own") => void;
  toggleSettledDebtor: (personId: string) => void;
  addExpense: () => void;
  removeExpense: (id: string) => void;
  updateExpenseDescription: (id: string, description: string) => void;
  updateExpensePrice: (id: string, price: string) => void;
  updateExpensePricingMode: (id: string, mode: PricingMode) => void;
  addPerson: (init?: { name?: string; telegramId?: number; photoUrl?: string }) => void;
  removePerson: (id: string) => void;
  updatePersonName: (id: string, name: string) => void;
  updatePersonAmount: (id: string, amount: string) => void;
  updatePersonPaid: (id: string, paid: string) => void;
  handleItemFocus: (expenseId: string) => void;
  handlePersonFocus: (personId: string) => void;
  toggleAssignment: (expenseId: string, personId: string) => void;
  exitAssignmentMode: () => void;
  selectAllItems: () => void;
  selectAllPeople: () => void;
  loadBill: (bill: BillPayload) => void;
  applyParsedReceipt: (parsed: ParsedReceipt) => void;
}

type BillStore = BillState & BillActions;

export const useBillStore = create<BillStore>()((set, get) => ({
  // Initial state
  receiptTitle: getDefaultReceiptTitle(new Date()),
  expenses: [],
  manualTotal: "",
  people: [],
  splitMode: "equally",
  currency: detectCurrency(),
  assignments: {},
  assignmentMode: null,
  viewMode: "consumption",
  payerId: null,
  focusNewId: { current: null },
  settledDebtorIds: new Set(),
  settleSubMode: "payer",
  currencySetByUser: false,

  // Actions
  setReceiptTitle: (title) => set({ receiptTitle: title }),

  setCurrency: (code) => set({ currency: code, currencySetByUser: true }),

  initCurrencyDetection: () => {
    detectCurrencyFromEdge().then((c) => {
      if (c && !get().currencySetByUser) set({ currency: c });
    });
  },

  setManualTotal: (total) => set({ manualTotal: total }),

  setSplitMode: (mode) => {
    const s = get();
    if (mode === "amounts" && s.splitMode === "equally") {
      const total = computeTotal(s.expenses, s.manualTotal, s.assignments);
      const computedAmounts = computeAmounts(s.expenses, s.people, s.assignments, total);
      set({
        people: s.people.map((p) => ({
          ...p,
          amount: computedAmounts[p.id] > 0 ? computedAmounts[p.id].toFixed(2) : "",
        })),
        splitMode: mode,
      });
    } else {
      set({ splitMode: mode });
    }
  },

  setViewMode: (mode) =>
    set({
      viewMode: mode,
      ...(mode !== "settle" ? { payerId: null, settledDebtorIds: new Set() } : {}),
    }),

  setPayerId: (id) =>
    set((s) => ({
      payerId: s.payerId === id ? null : id,
      settledDebtorIds: new Set(),
    })),

  setSettleSubMode: (mode) =>
    set((s) => {
      if (mode === s.settleSubMode) return s;
      return {
        ...s,
        settleSubMode: mode,
        settledDebtorIds: new Set(),
        payerId: mode === "own" ? null : s.payerId,
      };
    }),

  toggleSettledDebtor: (personId) =>
    set((s) => {
      const next = new Set(s.settledDebtorIds);
      if (next.has(personId)) next.delete(personId); else next.add(personId);
      return { settledDebtorIds: next };
    }),

  addExpense: () => {
    const s = get();
    const price = s.expenses.length === 0 ? s.manualTotal : "";
    const id = genId();
    s.focusNewId.current = id;
    set({
      expenses: [...s.expenses, { id, description: "", price, pricingMode: "total" }],
      assignments: { ...s.assignments, [id]: s.people.map((p) => p.id) },
    });
  },

  removeExpense: (id) =>
    set((s) => {
      const next = { ...s.assignments };
      delete next[id];
      return {
        expenses: s.expenses.filter((e) => e.id !== id),
        assignments: next,
      };
    }),

  updateExpenseDescription: (id, description) =>
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, description } : e)),
    })),

  updateExpensePrice: (id, price) =>
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, price } : e)),
    })),

  updateExpensePricingMode: (id, mode) =>
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, pricingMode: mode } : e)),
    })),

  addPerson: (init) => {
    const newPerson: Person = {
      id: genId(),
      name: init?.name ?? "",
      amount: "",
      paid: "",
      ...(init?.telegramId != null ? { telegramId: init.telegramId } : {}),
      ...(init?.photoUrl ? { photoUrl: init.photoUrl } : {}),
    };
    if (!init?.name) get().focusNewId.current = newPerson.id;
    set((s) => ({
      people: [...s.people, newPerson],
      assignments: Object.fromEntries(
        Object.entries(s.assignments).map(([k, v]) => [k, [...v, newPerson.id]])
      ),
    }));
  },

  removePerson: (id) =>
    set((s) => ({
      people: s.people.filter((p) => p.id !== id),
      assignments: Object.fromEntries(
        Object.entries(s.assignments).map(([k, v]) => [k, v.filter((pid) => pid !== id)])
      ),
    })),

  updatePersonName: (id, name) =>
    set((s) => ({
      people: s.people.map((p) => (p.id === id ? { ...p, name } : p)),
    })),

  updatePersonAmount: (id, amount) =>
    set((s) => ({
      people: s.people.map((p) => (p.id === id ? { ...p, amount } : p)),
    })),

  updatePersonPaid: (id, paid) =>
    set((s) => ({
      people: s.people.map((p) => (p.id === id ? { ...p, paid } : p)),
    })),

  handleItemFocus: (expenseId) => {
    const s = get();
    if (s.assignmentMode?.type === "item" && s.assignmentMode.itemId === expenseId) {
      const total = computeTotal(s.expenses, s.manualTotal, s.assignments);
      const computedAmounts = computeAmounts(s.expenses, s.people, s.assignments, total);
      set({
        people: s.people.map((p) => ({ ...p, amount: (computedAmounts[p.id] || 0).toFixed(2) })),
        assignmentMode: null,
      });
    } else {
      set({ assignmentMode: { type: "item", itemId: expenseId } });
    }
  },

  handlePersonFocus: (personId) => {
    const s = get();
    if (s.assignmentMode?.type === "person" && s.assignmentMode.personId === personId) {
      const total = computeTotal(s.expenses, s.manualTotal, s.assignments);
      const computedAmounts = computeAmounts(s.expenses, s.people, s.assignments, total);
      set({
        people: s.people.map((p) => ({ ...p, amount: (computedAmounts[p.id] || 0).toFixed(2) })),
        assignmentMode: null,
      });
    } else {
      set({ assignmentMode: { type: "person", personId } });
    }
  },

  toggleAssignment: (expenseId, personId) =>
    set((s) => {
      const current = s.assignments[expenseId] || [];
      const has = current.includes(personId);
      return {
        assignments: {
          ...s.assignments,
          [expenseId]: has
            ? current.filter((id) => id !== personId)
            : [...current, personId],
        },
      };
    }),

  exitAssignmentMode: () => {
    const s = get();
    const total = computeTotal(s.expenses, s.manualTotal, s.assignments);
    const computedAmounts = computeAmounts(s.expenses, s.people, s.assignments, total);
    set({
      people: s.people.map((p) => ({ ...p, amount: (computedAmounts[p.id] || 0).toFixed(2) })),
      assignmentMode: null,
    });
  },

  selectAllItems: () => {
    const s = get();
    if (s.assignmentMode?.type !== "person") return;
    const personId = s.assignmentMode.personId;
    const allItemIds = s.expenses.map((e) => e.id);
    const currentlyAssigned = allItemIds.filter((id) =>
      (s.assignments[id] || []).includes(personId)
    );
    const allSelected = currentlyAssigned.length === s.expenses.length;
    const next = { ...s.assignments };
    for (const id of allItemIds) {
      const current = next[id] || [];
      if (allSelected) {
        next[id] = current.filter((pid) => pid !== personId);
      } else if (!current.includes(personId)) {
        next[id] = [...current, personId];
      }
    }
    set({ assignments: next });
  },

  selectAllPeople: () => {
    const s = get();
    if (s.assignmentMode?.type !== "item") return;
    const itemId = s.assignmentMode.itemId;
    const allPersonIds = s.people.map((p) => p.id);
    const current = s.assignments[itemId] || [];
    const allSelected = current.length === s.people.length;
    set({ assignments: { ...s.assignments, [itemId]: allSelected ? [] : allPersonIds } });
  },

  loadBill: (bill) =>
    set({
      receiptTitle: bill.receiptTitle,
      expenses: bill.expenses,
      manualTotal: bill.manualTotal,
      people: bill.people,
      splitMode: bill.splitMode,
      currency: bill.currency,
      assignments: bill.assignments,
      assignmentMode: null,
      viewMode: "consumption",
      payerId: null,
      settledDebtorIds: new Set(),
      settleSubMode: "payer",
    }),

  applyParsedReceipt: (parsed) => {
    const s = get();
    if (parsed.expenses && parsed.expenses.length > 0) {
      const newExpenses: Expense[] = parsed.expenses.map((e) => ({
        id: genId(),
        description: e.description,
        price: e.price,
        pricingMode: "total" as const,
      }));
      set({
        ...(parsed.receiptTitle ? { receiptTitle: parsed.receiptTitle } : {}),
        ...(parsed.currency ? { currency: parsed.currency, currencySetByUser: true } : {}),
        expenses: newExpenses,
        manualTotal: "",
        assignments: Object.fromEntries(newExpenses.map((e) => [e.id, s.people.map((p) => p.id)])),
        assignmentMode: null,
      });
    } else {
      set({
        ...(parsed.receiptTitle ? { receiptTitle: parsed.receiptTitle } : {}),
        ...(parsed.currency ? { currency: parsed.currency, currencySetByUser: true } : {}),
        ...(parsed.manualTotal ? { manualTotal: parsed.manualTotal, expenses: [], assignments: {} } : {}),
        assignmentMode: null,
      });
    }
  },
}));

export function useComputedStore() {
  const expenses = useBillStore((s) => s.expenses);
  const manualTotal = useBillStore((s) => s.manualTotal);
  const people = useBillStore((s) => s.people);
  const splitMode = useBillStore((s) => s.splitMode);
  const assignments = useBillStore((s) => s.assignments);
  const viewMode = useBillStore((s) => s.viewMode);
  const payerId = useBillStore((s) => s.payerId);
  const settleSubMode = useBillStore((s) => s.settleSubMode);
  const settledDebtorIds = useBillStore((s) => s.settledDebtorIds);
  const assignmentMode = useBillStore((s) => s.assignmentMode);

  return useMemo(() => {
    const total = computeTotal(expenses, manualTotal, assignments);
    const computedAmounts = computeAmounts(expenses, people, assignments, total);
    const { coveredAmount, remaining, isBalanced, isOver } = computeCoveredAndRemaining(
      splitMode,
      people,
      computedAmounts,
      total
    );
    const settle = computeSettleSummary({
      isSettleMode: viewMode === "settle",
      settleSubMode,
      payerId,
      people,
      computedAmounts,
      total,
      coveredAmount,
      remaining,
      isBalanced,
      settledDebtorIds,
    });
    const hasItems = expenses.length > 0;
    const totalPaid = people.reduce((sum, p) => sum + (parseFloat(p.paid) || 0), 0);
    const inItemMode = assignmentMode?.type === "item";
    const inPersonMode = assignmentMode?.type === "person";
    const inAssignmentMode = assignmentMode !== null;

    return {
      hasItems,
      total,
      computedAmounts,
      coveredAmount,
      remaining,
      isBalanced,
      isOver,
      totalPaid,
      remainingToPay: total - totalPaid,
      inItemMode,
      inPersonMode,
      inAssignmentMode,
      summaryCoveredAmount: settle.coveredAmount,
      summaryRemaining: settle.remaining,
      summaryIsBalanced: settle.isBalanced,
    };
  }, [
    expenses,
    manualTotal,
    people,
    splitMode,
    assignments,
    viewMode,
    payerId,
    settleSubMode,
    settledDebtorIds,
    assignmentMode,
  ]);
}
