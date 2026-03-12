import { useState } from "react";
import { useBillStore, useComputedStore } from "../store";
import { PersonCard } from "./PersonCard";
import { PersonPicker } from "./PersonPicker";

export function PeopleSection() {
  const [showPicker, setShowPicker] = useState(false);

  const viewMode = useBillStore((s) => s.viewMode);
  const expenses = useBillStore((s) => s.expenses);
  const payerId = useBillStore((s) => s.payerId);
  const people = useBillStore((s) => s.people);
  const currency = useBillStore((s) => s.currency);
  const splitMode = useBillStore((s) => s.splitMode);
  const assignmentMode = useBillStore((s) => s.assignmentMode);
  const assignments = useBillStore((s) => s.assignments);
  const focusNewId = useBillStore((s) => s.focusNewId);
  const settledDebtorIds = useBillStore((s) => s.settledDebtorIds);
  const settleSubMode = useBillStore((s) => s.settleSubMode);
  const setPayerId = useBillStore((s) => s.setPayerId);
  const setSettleSubMode = useBillStore((s) => s.setSettleSubMode);
  const toggleSettledDebtor = useBillStore((s) => s.toggleSettledDebtor);
  const toggleAssignment = useBillStore((s) => s.toggleAssignment);
  const handlePersonFocus = useBillStore((s) => s.handlePersonFocus);
  const updatePersonName = useBillStore((s) => s.updatePersonName);
  const updatePersonAmount = useBillStore((s) => s.updatePersonAmount);
  const removePerson = useBillStore((s) => s.removePerson);
  const addPerson = useBillStore((s) => s.addPerson);
  const setSplitMode = useBillStore((s) => s.setSplitMode);
  const selectAllPeople = useBillStore((s) => s.selectAllPeople);

  const { computedAmounts, total, inItemMode, inPersonMode, inAssignmentMode } = useComputedStore();

  const isPaymentMode = viewMode === "settle";
  const payer = payerId ? people.find(p => p.id === payerId) ?? null : null;
  const settleOrder = isPaymentMode && payer
    ? [payer, ...people.filter(p => p.id !== payerId)]
    : people;

  return (
    <div>
      {isPaymentMode ? (
        // ── Settle mode: single stable <ul>, headers injected as <li> siblings ──
        <>
          <div className="flex items-center justify-between border-t border-separator px-4 py-2">
            <span className="text-xs font-medium text-espresso/40 uppercase tracking-wider">
              {settleSubMode === "own"
                ? "Who owes"
                : payerId ? "Paid by" : "Who paid?"}
            </span>
            <div className="flex gap-0.5 bg-cream-dark/50 rounded-lg p-0.5">
              {(["payer", "own"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSettleSubMode(mode)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ease-out ${
                    settleSubMode === mode
                      ? "bg-white text-espresso shadow-sm"
                      : "text-espresso/40 hover:text-espresso/60"
                  }`}
                >
                  {mode === "payer" ? "One Person" : "Everyone"}
                </button>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-espresso/8">
            {settleOrder.map((person, index) => {
              const isPayer = person.id === payerId;
              const settleVariant: "select" | "payer" | "debt" =
                settleSubMode === "own"
                  ? "debt"
                  : !payerId ? "select" : isPayer ? "payer" : "debt";
              // Inject "Who owes" header as a <li> before the first debtor,
              // keeping PersonCard keys stable so FLIP animation stays intact.
              const owesHeader = settleSubMode === "payer" && payerId && !isPayer && index === 1
                ? <li key="h-owes" className="px-4 py-2"><span className="text-xs font-medium text-espresso/40 uppercase tracking-wider">Who owes</span></li>
                : null;
              return [
                owesHeader,
                <PersonCard
                  key={person.id}
                  settleVariant={settleVariant}
                  person={person}
                  index={index}
                  currency={currency}
                  computedAmount={isPayer ? total : (computedAmounts[person.id] || 0)}
                  onSelectPayer={() => setPayerId(person.id)}
                  isSettled={settledDebtorIds.has(person.id)}
                  onToggleSettled={() => toggleSettledDebtor(person.id)}
                />,
              ];
            })}
          </ul>
        </>
      ) : (
        // ── Consumption mode ──────────────────────────
        <>
          <div className="flex items-center justify-between px-4 py-2 border-t border-separator">
            {inItemMode ? (
              <button
                type="button"
                onClick={selectAllPeople}
                className="text-xs font-medium text-sage hover:text-sage/80 uppercase tracking-wider transition-colors"
              >
                {assignmentMode!.type === "item" && (assignments[assignmentMode!.itemId] || []).length === people.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            ) : (
              <span className="text-xs font-medium text-espresso/50 uppercase tracking-wider">
                Split
              </span>
            )}
            <div className="flex gap-1 bg-cream-dark/50 rounded-lg p-0.5">
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

          <ul className="divide-y divide-espresso/8">
            {people.map((person, index) => {
              const isEqual = splitMode === "equally";
              const personAmount = computedAmounts[person.id] || 0;
              const displayedAmount = isEqual
                ? personAmount > 0
                  ? personAmount.toFixed(2)
                  : ""
                : person.amount;

              const isActivePerson = inPersonMode && assignmentMode!.type === "person" && assignmentMode!.personId === person.id;
              const isDimmedPerson = inPersonMode && !isActivePerson;
              const isAssignedInItemMode =
                inItemMode &&
                assignmentMode!.type === "item" &&
                (assignments[assignmentMode!.itemId] || []).includes(person.id);
              const itemCount = expenses.filter(e =>
                (assignments[e.id] || []).includes(person.id)
              ).length;

              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  index={index}
                  currency={currency}
                  computedAmount={computedAmounts[person.id] || 0}
                  displayedAmount={displayedAmount}
                  isEqual={isEqual}
                  isActivePerson={isActivePerson}
                  isDimmedPerson={isDimmedPerson}
                  isItemModeRow={inItemMode}
                  isAssignedInItemMode={isAssignedInItemMode}
                  focusNewId={focusNewId}
                  itemCount={itemCount}
                  onToggleAssignment={() =>
                    assignmentMode?.type === "item" &&
                    toggleAssignment(assignmentMode.itemId, person.id)
                  }
                  onPersonFocus={() => handlePersonFocus(person.id)}
                  onUpdateName={(name) => updatePersonName(person.id, name)}
                  onUpdateAmount={(amount) => updatePersonAmount(person.id, amount)}
                  onRemove={() => removePerson(person.id)}
                />
              );
            })}
          </ul>

          {/* Add Person Button */}
          <button
            onClick={() => setShowPicker(true)}
            className={`w-full flex items-center gap-2 pl-4 pr-3 py-2.5 border-t border-separator text-sm font-medium text-terracotta hover:bg-cream-dark/40 transition-all ${inAssignmentMode ? "invisible" : ""}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Person
          </button>

          {showPicker && (
            <PersonPicker
              existingTelegramIds={new Set(people.map(p => p.telegramId).filter((id): id is number => id != null))}
              existingNames={new Set(people.filter(p => p.telegramId == null).map(p => p.name.toLowerCase()))}
              onAdd={(init) => addPerson(init)}
              onClose={() => setShowPicker(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
