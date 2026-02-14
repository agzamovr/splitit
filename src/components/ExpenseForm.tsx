import { useState } from "react";

let nextId = 0;
const genId = () => `id-${++nextId}`;

interface Expense {
  id: string;
  description: string;
  price: string;
}

interface Person {
  id: string;
  name: string;
  amount: string;
}

type AssignmentMode =
  | null
  | { type: "item"; itemId: string }
  | { type: "person"; personId: string };

const SAMPLE_PEOPLE: Person[] = [
  { id: "1", name: "Rus", amount: "" },
  { id: "2", name: "Don", amount: "" },
  { id: "3", name: "Art", amount: "" },
  { id: "4", name: "Faz", amount: "" },
];

const formatPrice = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function ExpenseForm() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [manualTotal, setManualTotal] = useState("");
  const [people, setPeople] = useState<Person[]>(SAMPLE_PEOPLE);
  const [splitMode, setSplitMode] = useState<"equally" | "amounts">("equally");

  // Assignment state
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>(null);

  const hasItems = expenses.length > 0;
  const total = hasItems
    ? expenses.reduce((sum, e) => sum + (parseFloat(e.price) || 0), 0)
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
      const base = Math.floor((price * 100) / assigned.length) / 100;
      const remainder = +(price - base * assigned.length).toFixed(2);
      for (let i = 0; i < assigned.length; i++) {
        const pid = assigned[i];
        if (computedAmounts[pid] !== undefined) {
          computedAmounts[pid] += i === assigned.length - 1 ? base + remainder : base;
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

  const updatePersonAmount = (id: string, amount: string) => {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, amount } : p))
    );
  };

  const updatePersonName = (id: string, name: string) => {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
  };

  const addPerson = () => {
    const newPerson: Person = {
      id: genId(),
      name: "",
      amount: "",
    };
    setPeople((prev) => [...prev, newPerson]);
    // Add new person to every expense's assignment
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
    // Remove person from every assignment
    setAssignments((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter((pid) => pid !== id);
      }
      return next;
    });
  };

  const addExpense = () => {
    const price = expenses.length === 0 ? manualTotal : "";
    const id = genId();
    setExpenses((prev) => [...prev, { id, description: "", price }]);
    // Initialize assignment to all current people
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

  // Assignment mode functions
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

  const inItemMode = assignmentMode?.type === "item";
  const inPersonMode = assignmentMode?.type === "person";
  const inAssignmentMode = assignmentMode !== null;

  return (
    <div
      className="min-h-screen bg-cream px-4 py-6"
      onClick={(e) => {
        if (inAssignmentMode && e.target === e.currentTarget) {
          exitAssignmentMode();
        }
      }}
    >
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold text-espresso tracking-tight">
          Split the Bill
        </h1>
        <p className="mt-1 text-sm text-espresso-light/70">
          Who's paying what?
        </p>
      </header>

      {/* Receipt Card */}
      <div className="receipt-paper rounded-2xl overflow-hidden">
        {/* Items Section */}
        <div className="px-5 pt-5 pb-4 border-b border-dashed border-espresso/10">
          {inPersonMode ? (
            <button
              type="button"
              onClick={() => {
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
              }}
              className="block text-xs font-medium text-sage hover:text-sage/80 uppercase tracking-wider mb-3 transition-colors"
            >
              {expenses.every((e) => (assignments[e.id] || []).includes(assignmentMode.personId))
                ? "Deselect All"
                : "Select All"}
            </button>
          ) : (
            <span className="block text-xs font-medium text-espresso-light/60 uppercase tracking-wider mb-3">
              Items
            </span>
          )}

          {expenses.length > 0 && (
            <ul className="space-y-2 mb-3">
              {expenses.map((expense, index) => {
                const assignedCount = (assignments[expense.id] || []).length;
                const isActiveItem = inItemMode && assignmentMode.itemId === expense.id;
                const isDimmedItem = inItemMode && !isActiveItem;
                const isPersonModeRow = inPersonMode;
                const isAssignedInPersonMode =
                  inPersonMode &&
                  (assignments[expense.id] || []).includes(assignmentMode.personId);

                return (
                  <li
                    key={expense.id}
                    className={`animate-slide-up ${isDimmedItem ? "opacity-30" : ""} transition-opacity`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {isPersonModeRow ? (
                      // Person assignment mode: expense row is a toggle
                      <button
                        type="button"
                        onClick={() => toggleAssignment(expense.id, assignmentMode.personId)}
                        className={`w-full flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                          isAssignedInPersonMode
                            ? "bg-sage/10 border-sage/20"
                            : "bg-cream/80 border-espresso/5"
                        }`}
                      >
                        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-sage">
                          <span className="relative">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                            </svg>
                            <span className="absolute -bottom-1.5 -right-1.5 text-[9px] font-bold leading-none">{assignedCount}</span>
                          </span>
                        </span>
                        <span className="flex-1 min-w-0 px-3 py-2 border border-transparent text-left text-sm font-medium text-espresso truncate">
                          {expense.description || "Untitled"}
                        </span>
                        <div className="flex-shrink-0 w-24">
                          <span className="block pl-6 pr-2 py-2 border border-transparent text-sm font-semibold text-right text-espresso">
                            ${formatPrice(parseFloat(expense.price) || 0)}
                          </span>
                        </div>
                        {/* Check / empty */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                          isAssignedInPersonMode
                            ? "text-sage bg-sage/20"
                            : "text-espresso/30 bg-espresso/5"
                        }`}>
                          {isAssignedInPersonMode ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <rect x="4" y="4" width="16" height="16" rx="3" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ) : (
                      // Normal or item-assignment mode
                      <div className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        isActiveItem
                          ? "bg-cream/80 border-sage ring-2 ring-sage"
                          : "bg-cream/80 border-espresso/5"
                      }`}>
                        <button
                          type="button"
                          onClick={() => handleItemFocus(expense.id)}
                          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold transition-colors text-sage bg-sage/10 hover:bg-sage/20"
                          aria-label="Assign people to this expense"
                          title={`${assignedCount} people assigned`}
                        >
                          <span className="relative">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                            </svg>
                            <span className="absolute -bottom-1.5 -right-1.5 text-[9px] font-bold leading-none">{assignedCount}</span>
                          </span>
                        </button>
                        <input
                          type="text"
                          value={expense.description}
                          onChange={(e) =>
                            updateExpenseDescription(expense.id, e.target.value)
                          }
                          placeholder="Description"
                          className="input-glow flex-1 min-w-0 px-3 py-2 text-sm font-medium text-espresso bg-transparent border border-transparent rounded-lg focus:bg-white focus:border-espresso/10 outline-none transition-all placeholder:text-espresso/30"
                        />
                        <div className="relative flex-shrink-0 w-24">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-espresso/40">
                            $
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={expense.price}
                            onChange={(e) =>
                              updateExpensePrice(expense.id, e.target.value)
                            }
                            placeholder="0.00"
                            className="input-glow w-full pl-6 pr-2 py-2 text-sm font-semibold text-right text-espresso bg-white rounded-lg border border-espresso/10 focus:border-terracotta/30 outline-none transition-all placeholder:text-espresso/20"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExpense(expense.id)}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-espresso/30 hover:text-terracotta hover:bg-terracotta/10 active:bg-terracotta/20 rounded-lg transition-colors"
                          aria-label="Remove expense"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Total + Add Button */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-espresso-light/60">
              Total
            </span>
            <div className="flex items-center gap-2">
              {hasItems ? (
                <span className="text-3xl font-display font-bold text-espresso">
                  ${formatPrice(total)}
                </span>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-display font-semibold text-espresso/40">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={manualTotal}
                    onChange={(e) => setManualTotal(e.target.value)}
                    placeholder="0.00"
                    className="input-glow w-36 pl-8 pr-3 py-2 text-3xl font-display font-bold text-right text-espresso bg-cream-dark/50 rounded-xl border-2 border-transparent focus:border-terracotta/30 focus:bg-white outline-none transition-all placeholder:text-espresso/20"
                  />
                </div>
              )}
              {!inAssignmentMode && (
                <button
                  type="button"
                  onClick={addExpense}
                  className="w-8 h-8 rounded-full bg-terracotta/10 text-terracotta hover:bg-terracotta/20 active:bg-terracotta/30 flex items-center justify-center transition-colors"
                  aria-label="Add expense"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* People List */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            {inItemMode ? (
              <button
                type="button"
                onClick={() => {
                  const itemId = assignmentMode.itemId;
                  const allPersonIds = people.map((p) => p.id);
                  const current = assignments[itemId] || [];
                  const allSelected = current.length === people.length;
                  setAssignments((prev) => ({
                    ...prev,
                    [itemId]: allSelected ? [] : allPersonIds,
                  }));
                }}
                className="text-xs font-medium text-sage hover:text-sage/80 uppercase tracking-wider transition-colors"
              >
                {(assignments[assignmentMode.itemId] || []).length === people.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            ) : (
              <span className="text-xs font-medium text-espresso-light/60 uppercase tracking-wider">
                Split
              </span>
            )}
            <div className="flex gap-1 bg-cream-dark/50 rounded-lg p-0.5 border border-espresso/10">
              {(["equally", "amounts"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSplitMode(mode)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    splitMode === mode
                      ? "bg-white text-espresso shadow-sm"
                      : "text-espresso/40 hover:text-espresso/60"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-2">
            {people.map((person, index) => {
              const isEqual = splitMode === "equally";
              const personAmount = computedAmounts[person.id] || 0;
              const displayedAmount = isEqual
                ? personAmount > 0
                  ? personAmount.toFixed(2)
                  : ""
                : person.amount;

              const isActivePerson = inPersonMode && assignmentMode.personId === person.id;
              const isDimmedPerson = inPersonMode && !isActivePerson;
              const isItemModeRow = inItemMode;
              const isAssignedInItemMode =
                inItemMode &&
                (assignments[assignmentMode.itemId] || []).includes(person.id);

              return (
                <li
                  key={person.id}
                  className={`animate-slide-up ${isDimmedPerson ? "opacity-30" : ""} transition-opacity`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {isItemModeRow ? (
                    // Item assignment mode: person row is a toggle
                    <button
                      type="button"
                      onClick={() => toggleAssignment(assignmentMode.itemId, person.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        isAssignedInItemMode
                          ? "bg-sage/10 border-sage/20"
                          : "bg-cream/80 border-espresso/5"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-sage-light to-sage flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                        {person.name ? person.name[0].toUpperCase() : "?"}
                      </div>
                      <span className="flex-1 text-left text-sm font-medium text-espresso truncate">
                        {person.name || "Unnamed"}
                      </span>
                      <span className="flex-shrink-0 text-xs font-semibold text-espresso/50 tabular-nums">
                        ${formatPrice(computedAmounts[person.id] || 0)}
                      </span>
                      {/* Check / empty */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        isAssignedInItemMode
                          ? "text-sage"
                          : "text-espresso/30"
                      }`}>
                        {isAssignedInItemMode ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="4" y="4" width="16" height="16" rx="3" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ) : (
                    // Normal mode
                    <div className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isActivePerson
                        ? "bg-cream/80 border-sage ring-2 ring-sage"
                        : "bg-cream/80 border-espresso/5 hover:border-espresso/10"
                    }`}>
                      {/* Avatar */}
                      <button
                        type="button"
                        onClick={() => handlePersonFocus(person.id)}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-sage-light to-sage flex items-center justify-center text-white font-semibold text-sm shadow-sm hover:ring-2 hover:ring-sage/50 transition-all cursor-pointer"
                        aria-label="Assign expenses to this person"
                      >
                        {person.name ? person.name[0].toUpperCase() : "?"}
                      </button>

                      {/* Name Input */}
                      <input
                        type="text"
                        value={person.name}
                        onChange={(e) => updatePersonName(person.id, e.target.value)}
                        placeholder="Name"
                        className="input-glow flex-1 min-w-0 px-3 py-2 text-sm font-medium text-espresso bg-transparent border border-transparent rounded-lg focus:bg-white focus:border-espresso/10 outline-none transition-all placeholder:text-espresso/30"
                      />

                      {/* Amount Input */}
                      <div className="relative flex-shrink-0 w-24">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-espresso/40">
                          $
                        </span>
                        {isActivePerson ? (
                          <input
                            type="text"
                            value={formatPrice(computedAmounts[person.id] || 0)}
                            readOnly
                            className="w-full pl-6 pr-2 py-2 text-sm font-semibold text-right text-espresso rounded-lg border outline-none transition-all bg-sage/10 border-sage/20 text-espresso/60"
                          />
                        ) : (
                          <input
                            type="number"
                            inputMode="decimal"
                            value={displayedAmount}
                            onChange={(e) => updatePersonAmount(person.id, e.target.value)}
                            readOnly={isEqual}
                            placeholder="0.00"
                            className={`w-full pl-6 pr-2 py-2 text-sm font-semibold text-right text-espresso rounded-lg border outline-none transition-all placeholder:text-espresso/20 ${
                              isEqual
                                ? "bg-cream-dark/40 border-espresso/5 text-espresso/60"
                                : "input-glow bg-white border-espresso/10 focus:border-terracotta/30"
                            }`}
                          />
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removePerson(person.id)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-espresso/30 hover:text-terracotta hover:bg-terracotta/10 active:bg-terracotta/20 rounded-lg transition-colors"
                        aria-label="Remove person"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Add Person Button */}
          {!inAssignmentMode && (
            <button
              onClick={addPerson}
              className="mt-3 w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-terracotta bg-terracotta/5 hover:bg-terracotta/10 rounded-xl border-2 border-dashed border-terracotta/20 hover:border-terracotta/30 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Person
            </button>
          )}
        </div>

        {/* Summary Section */}
        {!inAssignmentMode && (
          <div className="px-5 py-4 bg-cream-dark/30 border-t border-dashed border-espresso/10">
            {/* Covered Amount */}
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-espresso-light/60">Covered</span>
              <span className="font-semibold text-sage">
                ${formatPrice(coveredAmount)}
              </span>
            </div>

            {/* Remaining Amount */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-espresso-light/60">Remaining</span>
              <span
                className={`text-xl font-display font-bold transition-colors ${
                  isBalanced
                    ? "text-sage"
                    : isOver
                      ? "text-terracotta pulse-attention"
                      : "text-amber pulse-attention"
                }`}
              >
                {isOver ? "+" : ""}${formatPrice(Math.abs(remaining))}
              </span>
            </div>

            {/* Status Message */}
            <div className="mt-3 text-center">
              {isBalanced ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sage bg-sage/10 rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Perfectly split!
                </span>
              ) : isOver ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-terracotta bg-terracotta/10 rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3l9.5 16.5H2.5L12 3z" />
                  </svg>
                  Over by ${formatPrice(Math.abs(remaining))}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber bg-amber/10 rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                  </svg>
                  ${formatPrice(remaining)} left to cover
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      {!inAssignmentMode && (
        <button
          disabled={!isBalanced || people.length === 0 || total === 0}
          className="mt-6 w-full py-4 text-base font-semibold text-white bg-gradient-to-r from-terracotta to-terracotta-light rounded-2xl shadow-lg shadow-terracotta/25 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:shadow-xl hover:shadow-terracotta/30 active:scale-[0.98] transition-all"
        >
          Save Split
        </button>
      )}
    </div>
  );
}
