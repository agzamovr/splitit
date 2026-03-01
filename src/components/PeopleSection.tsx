import { useExpenseStore } from "../useExpenseStore";
import { PersonCard } from "./PersonCard";

interface PeopleSectionProps {
  store: ReturnType<typeof useExpenseStore>;
  settledDebtorIds: Set<string>;
  setSettledDebtorIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  settleSubMode: "payer" | "own";
  handleSettleSubModeChange: (mode: "payer" | "own") => void;
  lastPersonIsLast: boolean;
}

export function PeopleSection({
  store,
  settledDebtorIds,
  setSettledDebtorIds,
  settleSubMode,
  handleSettleSubModeChange,
  lastPersonIsLast,
}: PeopleSectionProps) {
  const isPaymentMode = store.viewMode === "settle";
  const payer = store.payerId ? store.people.find(p => p.id === store.payerId) ?? null : null;
  const settleOrder = isPaymentMode && payer
    ? [payer, ...store.people.filter(p => p.id !== store.payerId)]
    : store.people;

  return (
    <div>
      {isPaymentMode ? (
        // ── Settle mode: single stable <ul>, headers injected as <li> siblings ──
        <>
          <div className="flex items-center justify-between border-t border-espresso/8 px-4 py-2">
            <span className="text-xs font-medium text-espresso/40 uppercase tracking-wider">
              {settleSubMode === "own"
                ? "Who owes"
                : store.payerId ? "Paid by" : "Who paid?"}
            </span>
            <div className="flex gap-0.5 bg-cream-dark/50 rounded-lg p-0.5">
              {(["payer", "own"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSettleSubModeChange(mode)}
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
              const isPayer = person.id === store.payerId;
              const settleVariant: "select" | "payer" | "debt" =
                settleSubMode === "own"
                  ? "debt"
                  : !store.payerId ? "select" : isPayer ? "payer" : "debt";
              // Inject "Who owes" header as a <li> before the first debtor,
              // keeping PersonCard keys stable so FLIP animation stays intact.
              const owesHeader = settleSubMode === "payer" && store.payerId && !isPayer && index === 1
                ? <li key="h-owes" className="px-4 py-2"><span className="text-xs font-medium text-espresso/40 uppercase tracking-wider">Who owes</span></li>
                : null;
              return [
                owesHeader,
                <PersonCard
                  key={person.id}
                  settleVariant={settleVariant}
                  person={person}
                  index={index}
                  currency={store.currency}
                  computedAmount={isPayer ? store.total : (store.computedAmounts[person.id] || 0)}
                  onSelectPayer={() => store.setPayerId(person.id)}
                  isSettled={settledDebtorIds.has(person.id)}
                  onToggleSettled={() => setSettledDebtorIds(prev => {
                    const next = new Set(prev);
                    next.has(person.id) ? next.delete(person.id) : next.add(person.id);
                    return next;
                  })}
                />,
              ];
            })}
          </ul>
        </>
      ) : (
        // ── Consumption mode ──────────────────────────
        <>
          <div className="flex items-center justify-between px-4 py-2 border-t border-espresso/8">
            {store.inItemMode ? (
              <button
                type="button"
                onClick={store.selectAllPeople}
                className="text-xs font-medium text-sage hover:text-sage/80 uppercase tracking-wider transition-colors"
              >
                {store.assignmentMode!.type === "item" && (store.assignments[store.assignmentMode!.itemId] || []).length === store.people.length
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
                  onClick={() => store.setSplitMode(mode)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    store.splitMode === mode
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
            {store.people.map((person, index) => {
              const isEqual = store.splitMode === "equally";
              const personAmount = store.computedAmounts[person.id] || 0;
              const displayedAmount = isEqual
                ? personAmount > 0
                  ? personAmount.toFixed(2)
                  : ""
                : person.amount;

              const isActivePerson = store.inPersonMode && store.assignmentMode!.type === "person" && store.assignmentMode!.personId === person.id;
              const isDimmedPerson = store.inPersonMode && !isActivePerson;
              const isAssignedInItemMode =
                store.inItemMode &&
                store.assignmentMode!.type === "item" &&
                (store.assignments[store.assignmentMode!.itemId] || []).includes(person.id);
              const itemCount = store.expenses.filter(e =>
                (store.assignments[e.id] || []).includes(person.id)
              ).length;

              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  index={index}
                  currency={store.currency}
                  computedAmount={store.computedAmounts[person.id] || 0}
                  displayedAmount={displayedAmount}
                  isEqual={isEqual}
                  isActivePerson={isActivePerson}
                  isDimmedPerson={isDimmedPerson}
                  isItemModeRow={store.inItemMode}
                  isAssignedInItemMode={isAssignedInItemMode}
                  isLastInput={lastPersonIsLast && index === store.people.length - 1}
                  focusNewId={store.focusNewId}
                  itemCount={itemCount}
                  onToggleAssignment={() =>
                    store.assignmentMode?.type === "item" &&
                    store.toggleAssignment(store.assignmentMode.itemId, person.id)
                  }
                  onPersonFocus={() => store.handlePersonFocus(person.id)}
                  onUpdateName={(name) => store.updatePersonName(person.id, name)}
                  onUpdateAmount={(amount) => store.updatePersonAmount(person.id, amount)}
                  onRemove={() => store.removePerson(person.id)}
                />
              );
            })}
          </ul>

          {/* Add Person Button */}
          <button
            onClick={store.addPerson}
            className={`w-full flex items-center gap-2 pl-4 pr-3 py-2.5 border-t border-espresso/8 text-sm font-medium text-terracotta hover:bg-cream-dark/40 transition-all ${store.inAssignmentMode ? "invisible" : ""}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Person
          </button>
        </>
      )}
    </div>
  );
}
