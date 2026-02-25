import { useCallback, useEffect, useRef, useState } from "react";
import { detectCurrency, formatAmount, getCurrencySymbol } from "../currency";
import { useExpenseStore } from "../useExpenseStore";
import { ExpenseRow } from "./ExpenseRow";
import { PersonCard } from "./PersonCard";
import { SummarySection } from "./SummarySection";
import { CurrencySelector } from "./CurrencySelector";

export function ExpenseForm() {
  const store = useExpenseStore();
  const formRef = useRef<HTMLDivElement>(null);
  const localCurrencyRef = useRef(detectCurrency());
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [settledDebtorIds, setSettledDebtorIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSettledDebtorIds(new Set());
  }, [store.payerId]);

  const handleEnterNav = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement)) return;
    const inputs = formRef.current?.querySelectorAll<HTMLInputElement>("input:not([readonly])");
    if (!inputs) return;
    const list = Array.from(inputs);
    const idx = list.indexOf(e.target);
    e.preventDefault();
    if (idx >= 0 && idx < list.length - 1) {
      list[idx + 1].focus();
    } else {
      e.target.blur();
    }
  }, []);

  const isPaymentMode = store.viewMode === "settle";

  const payer = store.payerId ? store.people.find(p => p.id === store.payerId) ?? null : null;
  const payerName = payer?.name || "";
  const settleOrder = isPaymentMode && payer
    ? [payer, ...store.people.filter(p => p.id !== store.payerId)]
    : store.people;

  // Determine which component holds the last editable input
  const hasEditablePersonInputs = store.people.length > 0;
  const lastPersonIsLast = hasEditablePersonInputs;
  const lastExpenseIsLast = !hasEditablePersonInputs && store.expenses.length > 0;

  return (
    <div
      ref={formRef}
      className="min-h-screen bg-cream pt-3 pb-8"
      onKeyDown={handleEnterNav}
      onClick={(e) => {
        if (store.inAssignmentMode && e.target === e.currentTarget) {
          store.exitAssignmentMode();
        }
      }}
    >
      {/* Header – hidden inside Telegram Mini App (Telegram shows its own title bar) */}
      {!window.Telegram?.WebApp && (
        <header className="px-4 py-3 border-b border-espresso/8">
          <h1 className="text-base font-semibold text-espresso tracking-tight">
            Split the Bill
          </h1>
        </header>
      )}

      {/* Items Section */}
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
            <div className="flex gap-0.5 bg-cream-dark/50 rounded-lg p-0.5">
              {(["total", "each"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => store.setPricingMode(mode)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    store.pricingMode === mode
                      ? "bg-white text-espresso shadow-sm"
                      : "text-espresso/40 hover:text-espresso/60"
                  }`}
                >
                  {mode === "total" ? "Total" : "Each"}
                </button>
              ))}
            </div>
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
                  pricingMode={store.pricingMode}
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
                    enterKeyHint={hasEditablePersonInputs ? "next" : "done"}
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

      {/* People Section */}
      <div>
        {isPaymentMode ? (
          // ── Settle mode: single stable <ul>, headers injected as <li> siblings ──
          <>
            <div className="border-t border-espresso/8 px-4 py-2">
              <span className="text-xs font-medium text-espresso/40 uppercase tracking-wider">
                {store.payerId ? "Paid by" : "Who paid?"}
              </span>
            </div>
            <ul className="divide-y divide-espresso/8">
              {settleOrder.map((person, index) => {
                const isPayer = person.id === store.payerId;
                const settleVariant: "select" | "payer" | "debt" =
                  !store.payerId ? "select" : isPayer ? "payer" : "debt";
                // Inject "Who owes" header as a <li> before the first debtor,
                // keeping PersonCard keys stable so FLIP animation stays intact.
                const owesHeader = store.payerId && !isPayer && index === 1
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

      {/* Summary */}
      {!store.inAssignmentMode && (
        <SummarySection
          currency={store.currency}
          coveredAmount={(() => {
            if (!isPaymentMode) return store.coveredAmount;
            const payerShare = store.payerId ? (store.computedAmounts[store.payerId] || 0) : 0;
            return payerShare;
          })()}
          remaining={(() => {
            if (!isPaymentMode) return store.remaining;
            if (!store.payerId) return store.total;
            return store.people
              .filter(p => p.id !== store.payerId && !settledDebtorIds.has(p.id))
              .reduce((sum, p) => sum + (store.computedAmounts[p.id] || 0), 0);
          })()}
          isBalanced={(() => {
            if (!isPaymentMode) return store.isBalanced;
            if (!store.payerId) return false;
            return store.people
              .filter(p => p.id !== store.payerId)
              .every(p => settledDebtorIds.has(p.id));
          })()}
          isOver={isPaymentMode ? false : store.isOver}
          canSubmit={store.isBalanced && store.people.length > 0 && store.total > 0}
          viewMode={store.viewMode}
          setViewMode={store.setViewMode}
          payerName={isPaymentMode ? payerName : undefined}
        />
      )}

      {/* Currency Selector */}
      {showCurrencySelector && (
        <CurrencySelector
          currency={store.currency}
          localCurrency={localCurrencyRef.current}
          onSelect={(code) => {
            store.setCurrency(code);
            setShowCurrencySelector(false);
          }}
          onClose={() => setShowCurrencySelector(false)}
        />
      )}
    </div>
  );
}
