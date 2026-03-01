import { formatAmount, getCurrencySymbol } from "../currency";
import { useExpenseStore } from "../useExpenseStore";
import { ExpenseRow } from "./ExpenseRow";

interface ItemsSectionProps {
  store: ReturnType<typeof useExpenseStore>;
  focusedExpenseId: string | null;
  setFocusedExpenseId: (id: string | null) => void;
  setShowCurrencySelector: (show: boolean) => void;
  lastExpenseIsLast: boolean;
}

export function ItemsSection({
  store,
  focusedExpenseId,
  setFocusedExpenseId,
  setShowCurrencySelector,
  lastExpenseIsLast,
}: ItemsSectionProps) {
  const isPaymentMode = store.viewMode === "settle";

  return (
    <div className="border-b border-espresso/8">
      {!isPaymentMode && store.expenses.length > 0 && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          {store.inPersonMode ? (
            <button
              type="button"
              onClick={store.selectAllItems}
              className="text-xs font-medium text-sage hover:text-sage/80 uppercase tracking-wider transition-colors"
            >
              {store.expenses.every((e) => (store.assignments[e.id] || []).includes(store.assignmentMode!.type === "person" ? store.assignmentMode!.personId : ""))
                ? "Deselect All"
                : "Select All"}
            </button>
          ) : (
            <span className="text-xs font-medium text-espresso/50 uppercase tracking-wider">
              Items
            </span>
          )}
          {(() => {
            const visible = !store.inPersonMode && (store.inItemMode || focusedExpenseId !== null);
            const activeItemId = store.inItemMode
              ? (store.assignmentMode as { type: "item"; itemId: string }).itemId
              : focusedExpenseId;
            const activeExpense = activeItemId ? store.expenses.find(e => e.id === activeItemId) : undefined;
            const activeMode = activeExpense?.pricingMode ?? "total";
            return (
              <div className={`flex gap-0.5 bg-cream-dark/50 rounded-lg p-0.5 ${visible ? "" : "invisible"}`}>
                {(["total", "each"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => activeItemId && store.updateExpensePricingMode(activeItemId, mode)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md ${visible ? "transition-all duration-200 ease-out" : ""} ${
                      activeMode === mode
                        ? "bg-white text-espresso shadow-sm"
                        : "text-espresso/40 hover:text-espresso/60"
                    }`}
                  >
                    {mode === "total" ? "Total" : "Each"}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {!isPaymentMode && store.expenses.length > 0 && (
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
                currency={store.currency}
                isActiveItem={isActiveItem}
                isDimmedItem={isDimmedItem}
                isPersonModeRow={store.inPersonMode}
                isAssignedInPersonMode={isAssignedInPersonMode}
                isLastInput={lastExpenseIsLast && index === store.expenses.length - 1}
                focusNewId={store.focusNewId}
                onToggleAssignment={() =>
                  store.assignmentMode?.type === "person" &&
                  store.toggleAssignment(expense.id, store.assignmentMode.personId)
                }
                onItemFocus={() => { store.handleItemFocus(expense.id); setFocusedExpenseId(null); }}
                onUpdateDescription={(desc) => store.updateExpenseDescription(expense.id, desc)}
                onUpdatePrice={(price) => store.updateExpensePrice(expense.id, price)}
                onRowFocus={() => setFocusedExpenseId(expense.id)}
                onRowBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setFocusedExpenseId(null);
                  }
                }}
                onRemove={() => store.removeExpense(expense.id)}
              />
            );
          })}
        </ul>
      )}

      {/* Total + Add Button */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-espresso/8">
        <span className="flex-shrink-0 text-sm font-medium text-espresso-light/60">
          Total
        </span>
        <div className="flex-1 flex items-center justify-end gap-2">
          {store.hasItems ? (
            <span className="text-xl font-display font-bold text-espresso flex items-baseline gap-0.5">
              <button
                type="button"
                onClick={() => setShowCurrencySelector(true)}
                className="text-xs font-body font-semibold text-espresso/40 border-b border-dashed border-espresso/30 hover:text-espresso/60 hover:border-espresso/50 transition-colors leading-none"
                title="Change currency"
              >
                {getCurrencySymbol(store.currency)}
              </button>
              {formatAmount(store.total, store.currency)}
            </span>
          ) : (() => {
            const sym = getCurrencySymbol(store.currency);
            const symTextClass = 'text-xs font-semibold';
            const inputPl = sym.length <= 1 ? 'pl-8' : sym.length <= 2 ? 'pl-9' : 'pl-10';
            return (
              <div className="relative flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowCurrencySelector(true)}
                  className={`absolute left-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-espresso/8 text-espresso/50 hover:bg-espresso/12 hover:text-espresso/70 active:bg-espresso/16 transition-colors z-10 ${symTextClass}`}
                  title="Change currency"
                >
                  {sym}
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  enterKeyHint="go"
                  value={store.manualTotal}
                  onChange={(e) => store.setManualTotal(e.target.value)}
                  placeholder="0.00"
                  className={`input-glow w-full ${inputPl} pr-3 py-1.5 text-xl font-display font-bold text-right text-espresso bg-cream-dark/50 rounded-lg border border-transparent focus:border-terracotta/30 focus:bg-white outline-none transition-all placeholder:text-espresso/20`}
                />
              </div>
            );
          })()}
          {!isPaymentMode && (
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
          )}
        </div>
      </div>

    </div>
  );
}
