import { formatAmount, getCurrencySymbol } from "../currency";
import { useBillStore, useComputedStore } from "../store";
import { ExpenseRow } from "./ExpenseRow";

interface ItemsSectionProps {
  focusedExpenseId: string | null;
  setFocusedExpenseId: (id: string | null) => void;
  setShowCurrencySelector: (show: boolean) => void;
}

export function ItemsSection({
  focusedExpenseId,
  setFocusedExpenseId,
  setShowCurrencySelector,
}: ItemsSectionProps) {
  const viewMode = useBillStore((s) => s.viewMode);
  const expenses = useBillStore((s) => s.expenses);
  const assignments = useBillStore((s) => s.assignments);
  const currency = useBillStore((s) => s.currency);
  const manualTotal = useBillStore((s) => s.manualTotal);
  const assignmentMode = useBillStore((s) => s.assignmentMode);
  const focusNewId = useBillStore((s) => s.focusNewId);
  const updateExpensePricingMode = useBillStore((s) => s.updateExpensePricingMode);
  const toggleAssignment = useBillStore((s) => s.toggleAssignment);
  const handleItemFocus = useBillStore((s) => s.handleItemFocus);
  const updateExpenseDescription = useBillStore((s) => s.updateExpenseDescription);
  const updateExpensePrice = useBillStore((s) => s.updateExpensePrice);
  const removeExpense = useBillStore((s) => s.removeExpense);
  const setManualTotal = useBillStore((s) => s.setManualTotal);
  const addExpense = useBillStore((s) => s.addExpense);
  const selectAllItems = useBillStore((s) => s.selectAllItems);

  const { hasItems, total, inItemMode, inPersonMode, inAssignmentMode } = useComputedStore();

  const isPaymentMode = viewMode === "settle";

  return (
    <div className="border-b border-separator">
      {!isPaymentMode && expenses.length > 0 && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          {inPersonMode ? (
            <button
              type="button"
              onClick={selectAllItems}
              className="text-xs font-medium text-sage hover:text-sage/80 uppercase tracking-wider transition-colors"
            >
              {expenses.every((e) => (assignments[e.id] || []).includes(assignmentMode!.type === "person" ? assignmentMode!.personId : ""))
                ? "Deselect All"
                : "Select All"}
            </button>
          ) : (
            <span className="text-xs font-medium text-espresso/50 uppercase tracking-wider">
              Items
            </span>
          )}
          {(() => {
            const visible = !inPersonMode && (inItemMode || focusedExpenseId !== null);
            const activeItemId = inItemMode
              ? (assignmentMode as { type: "item"; itemId: string }).itemId
              : focusedExpenseId;
            const activeExpense = activeItemId ? expenses.find(e => e.id === activeItemId) : undefined;
            const activeMode = activeExpense?.pricingMode ?? "total";
            return (
              <div className={`flex gap-0.5 bg-cream-dark/50 rounded-lg p-0.5 ${visible ? "" : "invisible"}`}>
                {(["total", "each"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => activeItemId && updateExpensePricingMode(activeItemId, mode)}
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

      {!isPaymentMode && expenses.length > 0 && (
        <ul className="divide-y divide-espresso/8">
          {expenses.map((expense, index) => {
            const assignedCount = (assignments[expense.id] || []).length;
            const isActiveItem = inItemMode && assignmentMode!.type === "item" && assignmentMode!.itemId === expense.id;
            const isDimmedItem = inItemMode && !isActiveItem;
            const isAssignedInPersonMode =
              inPersonMode &&
              assignmentMode!.type === "person" &&
              (assignments[expense.id] || []).includes(assignmentMode!.personId);

            return (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                index={index}
                assignedCount={assignedCount}
                currency={currency}
                isActiveItem={isActiveItem}
                isDimmedItem={isDimmedItem}
                isPersonModeRow={inPersonMode}
                isAssignedInPersonMode={isAssignedInPersonMode}
                focusNewId={focusNewId}
                onToggleAssignment={() =>
                  assignmentMode?.type === "person" &&
                  toggleAssignment(expense.id, assignmentMode.personId)
                }
                onItemFocus={() => { handleItemFocus(expense.id); setFocusedExpenseId(null); }}
                onUpdateDescription={(desc) => updateExpenseDescription(expense.id, desc)}
                onUpdatePrice={(price) => updateExpensePrice(expense.id, price)}
                onRowFocus={() => setFocusedExpenseId(expense.id)}
                onRowBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setFocusedExpenseId(null);
                  }
                }}
                onRemove={() => removeExpense(expense.id)}
              />
            );
          })}
        </ul>
      )}

      {/* Total + Add Button */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-separator">
        <span className="flex-shrink-0 text-sm font-medium text-espresso-light/60">
          Total
        </span>
        <div className="flex-1 flex items-center justify-end gap-2">
          {hasItems ? (
            <span className="text-xl font-display font-bold text-espresso flex items-baseline gap-0.5">
              <button
                type="button"
                onClick={() => setShowCurrencySelector(true)}
                className="text-xs font-body font-semibold text-espresso/40 border-b border-dashed border-espresso/30 hover:text-espresso/60 hover:border-espresso/50 transition-colors leading-none"
                title="Change currency"
              >
                {getCurrencySymbol(currency)}
              </button>
              {formatAmount(total, currency)}
            </span>
          ) : (() => {
            const sym = getCurrencySymbol(currency);
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
                  value={manualTotal}
                  onChange={(e) => setManualTotal(e.target.value)}
                  placeholder="0.00"
                  className={`input-glow w-full ${inputPl} pr-3 py-1.5 text-xl font-display font-bold text-right text-espresso bg-cream-dark/50 rounded-lg border border-transparent focus:border-terracotta/30 focus:bg-white outline-none transition-all placeholder:text-espresso/20`}
                />
              </div>
            );
          })()}
          {!isPaymentMode && (
            <button
              type="button"
              onClick={addExpense}
              className={`w-7 h-7 rounded-full bg-terracotta/10 text-terracotta hover:bg-terracotta/20 active:bg-terracotta/30 flex items-center justify-center transition-colors ${inAssignmentMode ? "invisible" : ""}`}
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
