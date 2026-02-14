import { useState, useRef } from "react";
import {
  type Expense,
  type Person,
  type PricingMode,
  type AssignmentMode,
  SAMPLE_PEOPLE,
  genId,
} from "./types";

export function useExpenseStore() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [manualTotal, setManualTotal] = useState("");
  const [people, setPeople] = useState<Person[]>(SAMPLE_PEOPLE);
  const [splitMode, setSplitMode] = useState<"equally" | "amounts">("equally");
  const focusNewId = useRef<string | null>(null);

  const [pricingMode, setPricingMode] = useState<PricingMode>("total");
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>(null);

  const hasItems = expenses.length > 0;
  const total = hasItems
    ? expenses.reduce((sum, e) => {
        const price = parseFloat(e.price) || 0;
        if (pricingMode === "each") {
          return sum + price * (assignments[e.id] || []).length;
        }
        return sum + price;
      }, 0)
    : parseFloat(manualTotal) || 0;

  // Computed amounts per person based on assignments
  const computedAmounts: Record<string, number> = {};
  for (const person of people) {
    computedAmounts[person.id] = 0;
  }

  if (hasItems) {
    for (const expense of expenses) {
      const price = parseFloat(expense.price) || 0;
      const assigned = assignments[expense.id] || [];
      if (assigned.length === 0 || price === 0) continue;
      if (pricingMode === "each") {
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

  const coveredAmount =
    splitMode === "equally"
      ? Object.values(computedAmounts).reduce((sum, v) => sum + v, 0)
      : people.reduce((sum, person) => sum + (parseFloat(person.amount) || 0), 0);
  const remaining = total - coveredAmount;
  const isBalanced = Math.abs(remaining) < 0.01;
  const isOver = remaining < -0.01;

  const inItemMode = assignmentMode?.type === "item";
  const inPersonMode = assignmentMode?.type === "person";
  const inAssignmentMode = assignmentMode !== null;

  // --- Actions ---

  const exitAssignmentMode = () => {
    setSplitMode("amounts");
    setPeople((prev) =>
      prev.map((p) => ({
        ...p,
        amount: (computedAmounts[p.id] || 0).toFixed(2),
      }))
    );
    setAssignmentMode(null);
  };

  const handleItemFocus = (expenseId: string) => {
    if (inItemMode && assignmentMode.itemId === expenseId) {
      exitAssignmentMode();
    } else {
      setAssignmentMode({ type: "item", itemId: expenseId });
    }
  };

  const handlePersonFocus = (personId: string) => {
    if (inPersonMode && assignmentMode.personId === personId) {
      exitAssignmentMode();
    } else {
      setAssignmentMode({ type: "person", personId });
    }
  };

  const toggleAssignment = (expenseId: string, personId: string) => {
    setAssignments((prev) => {
      const current = prev[expenseId] || [];
      const has = current.includes(personId);
      return {
        ...prev,
        [expenseId]: has
          ? current.filter((id) => id !== personId)
          : [...current, personId],
      };
    });
  };

  const addExpense = () => {
    const price = expenses.length === 0 ? manualTotal : "";
    const id = genId();
    focusNewId.current = id;
    setExpenses((prev) => [...prev, { id, description: "", price }]);
    setAssignments((prev) => ({
      ...prev,
      [id]: people.map((p) => p.id),
    }));
  };

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateExpenseDescription = (id: string, description: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, description } : e))
    );
  };

  const updateExpensePrice = (id: string, price: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, price } : e))
    );
  };

  const addPerson = () => {
    const newPerson: Person = { id: genId(), name: "", amount: "" };
    focusNewId.current = newPerson.id;
    setPeople((prev) => [...prev, newPerson]);
    setAssignments((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = [...next[key], newPerson.id];
      }
      return next;
    });
  };

  const removePerson = (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setAssignments((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter((pid) => pid !== id);
      }
      return next;
    });
  };

  const updatePersonName = (id: string, name: string) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const updatePersonAmount = (id: string, amount: string) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, amount } : p)));
  };

  const selectAllItems = () => {
    if (!inPersonMode) return;
    const personId = assignmentMode.personId;
    const allItemIds = expenses.map((e) => e.id);
    const currentlyAssigned = allItemIds.filter((id) =>
      (assignments[id] || []).includes(personId)
    );
    const allSelected = currentlyAssigned.length === expenses.length;
    setAssignments((prev) => {
      const next = { ...prev };
      for (const id of allItemIds) {
        const current = next[id] || [];
        if (allSelected) {
          next[id] = current.filter((pid) => pid !== personId);
        } else if (!current.includes(personId)) {
          next[id] = [...current, personId];
        }
      }
      return next;
    });
  };

  const selectAllPeople = () => {
    if (!inItemMode) return;
    const itemId = assignmentMode.itemId;
    const allPersonIds = people.map((p) => p.id);
    const current = assignments[itemId] || [];
    const allSelected = current.length === people.length;
    setAssignments((prev) => ({
      ...prev,
      [itemId]: allSelected ? [] : allPersonIds,
    }));
  };

  return {
    // State
    expenses,
    manualTotal,
    people,
    splitMode,
    pricingMode,
    assignments,
    assignmentMode,
    focusNewId,

    // Derived
    hasItems,
    total,
    computedAmounts,
    coveredAmount,
    remaining,
    isBalanced,
    isOver,
    inItemMode,
    inPersonMode,
    inAssignmentMode,

    // Actions
    addExpense,
    removeExpense,
    updateExpenseDescription,
    updateExpensePrice,
    setPricingMode,
    addPerson,
    removePerson,
    updatePersonName,
    updatePersonAmount,
    handleItemFocus,
    handlePersonFocus,
    toggleAssignment,
    exitAssignmentMode,
    setManualTotal,
    setSplitMode,
    selectAllItems,
    selectAllPeople,
  };
}
