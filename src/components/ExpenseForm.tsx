import { formatPrice } from "../types";
import { useExpenseStore } from "../useExpenseStore";
import { ExpenseRow } from "./ExpenseRow";
import { PersonCard } from "./PersonCard";
import { SummarySection } from "./SummarySection";

export function ExpenseForm() {
  const store = useExpenseStore();

  return (
    <div
      className="min-h-screen bg-cream pt-3 pb-8"
      onClick={(e) => {
        if (store.inAssignmentMode && e.target === e.currentTarget) {
          store.exitAssignmentMode();
        }
      }}
    >
      {/* Header */}
      <header className="px-4 py-3 border-b border-espresso/8">
        <h1 className="text-base font-semibold text-espresso tracking-tight">
          Split the Bill
        </h1>
      </header>

      {/* Items Section */}
      <div className="border-b border-espresso/8">
        {store.inPersonMode ? (
          <button
            type="button"
            onClick={store.selectAllItems}
            className="block px-4 pt-3 pb-1 text-xs font-medium text-sage hover:text-sage/80 uppercase tracking-wider transition-colors"
          >
            {store.expenses.every((e) => (store.assignments[e.id] || []).includes(store.assignmentMode!.type === "person" ? store.assignmentMode!.personId : ""))
              ? "Deselect All"
              : "Select All"}
          </button>
        ) : (
          <span className="block px-4 pt-3 pb-1 text-xs font-medium text-espresso/50 uppercase tracking-wider">
            Items
          </span>
        )}

        {store.expenses.length > 0 && (
          <ul className="divide-y divide-espresso/8">
            {store.expenses.map((expense, index) => {
              const assignedCount = (store.assignments[expense.id] || []).length;
              const isActiveItem = store.inItemMode && store.assignmentMode!.type === "item" && store.assignmentMode!.itemId === expense.id;
              const isDimmedItem = store.inItemMode && !isActiveItem;
              const isAssignedInPersonMode =
                store.inPersonMode &&
                store.assignmentMode!.type === "person" &&
                (store.assignments[expense.id] || []).includes(store.assignmentMode!.personId);

              return (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  index={index}
                  assignedCount={assignedCount}
                  isActiveItem={isActiveItem}
                  isDimmedItem={isDimmedItem}
                  isPersonModeRow={store.inPersonMode}
                  isAssignedInPersonMode={isAssignedInPersonMode}
                  focusNewId={store.focusNewId}
                  onToggleAssignment={() =>
                    store.assignmentMode?.type === "person" &&
                    store.toggleAssignment(expense.id, store.assignmentMode.personId)
                  }
                  onItemFocus={() => store.handleItemFocus(expense.id)}
                  onUpdateDescription={(desc) => store.updateExpenseDescription(expense.id, desc)}
                  onUpdatePrice={(price) => store.updateExpensePrice(expense.id, price)}
                  onRemove={() => store.removeExpense(expense.id)}
                />
              );
            })}
          </ul>
        )}

        {/* Total + Add Button */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-espresso/8">
          <span className="text-sm font-medium text-espresso-light/60">
            Total
          </span>
          <div className="flex items-center gap-2">
            {store.hasItems ? (
              <span className="text-xl font-display font-bold text-espresso">
                ${formatPrice(store.total)}
              </span>
            ) : (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-display font-semibold text-espresso/40">
                  $
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={store.manualTotal}
                  onChange={(e) => store.setManualTotal(e.target.value)}
                  placeholder="0.00"
                  className="input-glow w-28 pl-7 pr-3 py-1.5 text-xl font-display font-bold text-right text-espresso bg-cream-dark/50 rounded-lg border border-transparent focus:border-terracotta/30 focus:bg-white outline-none transition-all placeholder:text-espresso/20"
                />
              </div>
            )}
            <button
              type="button"
              onClick={store.addExpense}
              className={`w-7 h-7 rounded-full bg-terracotta/10 text-terracotta hover:bg-terracotta/20 active:bg-terracotta/30 flex items-center justify-center transition-colors ${store.inAssignmentMode ? "invisible" : ""}`}
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
          </div>
        </div>
      </div>

      {/* People Section */}
      <div>
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

            return (
              <PersonCard
                key={person.id}
                person={person}
                index={index}
                computedAmount={store.computedAmounts[person.id] || 0}
                displayedAmount={displayedAmount}
                isEqual={isEqual}
                isActivePerson={isActivePerson}
                isDimmedPerson={isDimmedPerson}
                isItemModeRow={store.inItemMode}
                isAssignedInItemMode={isAssignedInItemMode}
                focusNewId={store.focusNewId}
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
      </div>

      {/* Summary */}
      {!store.inAssignmentMode && (
        <SummarySection
          coveredAmount={store.coveredAmount}
          remaining={store.remaining}
          isBalanced={store.isBalanced}
          isOver={store.isOver}
          canSubmit={store.isBalanced && store.people.length > 0 && store.total > 0}
        />
      )}
    </div>
  );
}
