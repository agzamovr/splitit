import { useCallback, useEffect, useRef, useState } from "react";
import { useExpenseStore } from "../useExpenseStore";
import { ItemsSection } from "./ItemsSection";
import { PeopleSection } from "./PeopleSection";
import { SummarySection } from "./SummarySection";
import { CurrencySelector } from "./CurrencySelector";

export function ExpenseForm() {
  const store = useExpenseStore();
  const formRef = useRef<HTMLDivElement>(null);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [settledDebtorIds, setSettledDebtorIds] = useState<Set<string>>(new Set());
  const [focusedExpenseId, setFocusedExpenseId] = useState<string | null>(null);
  const [settleSubMode, setSettleSubMode] = useState<"payer" | "own">("payer");

  useEffect(() => {
    setSettledDebtorIds(new Set());
  }, [store.payerId]);

  const handleSettleSubModeChange = (mode: "payer" | "own") => {
    if (mode === settleSubMode) return;
    setSettleSubMode(mode);
    setSettledDebtorIds(new Set());
    if (mode === "own" && store.payerId) {
      store.setPayerId(store.payerId);
    }
  };

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

  const summaryCoveredAmount = !isPaymentMode
    ? store.coveredAmount
    : settleSubMode === "own"
      ? store.people.filter(p => settledDebtorIds.has(p.id)).reduce((sum, p) => sum + (store.computedAmounts[p.id] || 0), 0)
      : store.payerId ? (store.computedAmounts[store.payerId] || 0) : 0;

  const summaryRemaining = !isPaymentMode
    ? store.remaining
    : settleSubMode === "own"
      ? store.people.filter(p => !settledDebtorIds.has(p.id)).reduce((sum, p) => sum + (store.computedAmounts[p.id] || 0), 0)
      : !store.payerId
        ? store.total
        : store.people.filter(p => p.id !== store.payerId && !settledDebtorIds.has(p.id)).reduce((sum, p) => sum + (store.computedAmounts[p.id] || 0), 0);

  const summaryIsBalanced = !isPaymentMode
    ? store.isBalanced
    : settleSubMode === "own"
      ? store.people.every(p => settledDebtorIds.has(p.id))
      : !!store.payerId && store.people.filter(p => p.id !== store.payerId).every(p => settledDebtorIds.has(p.id));

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

      {/* Receipt title */}
      <div className="px-4 py-3 border-b border-espresso/8">
        <input
          type="text"
          value={store.receiptTitle}
          onChange={(e) => store.setReceiptTitle(e.target.value)}
          placeholder="Receipt title"
          className="w-full bg-transparent text-base font-semibold text-espresso tracking-tight outline-none placeholder:text-espresso/30 focus:placeholder:text-espresso/20"
        />
      </div>

      <ItemsSection
        store={store}
        focusedExpenseId={focusedExpenseId}
        setFocusedExpenseId={setFocusedExpenseId}
        setShowCurrencySelector={setShowCurrencySelector}
      />

      <PeopleSection
        store={store}
        settledDebtorIds={settledDebtorIds}
        setSettledDebtorIds={setSettledDebtorIds}
        settleSubMode={settleSubMode}
        handleSettleSubModeChange={handleSettleSubModeChange}
      />

      {/* Summary */}
      {!store.inAssignmentMode && (
        <SummarySection
          currency={store.currency}
          isSettleMode={isPaymentMode}
          payerName={isPaymentMode && settleSubMode === "payer" ? payerName : undefined}
          coveredAmount={summaryCoveredAmount}
          remaining={summaryRemaining}
          isBalanced={summaryIsBalanced}
          isOver={isPaymentMode ? false : store.isOver}
          canSubmit={store.isBalanced && store.people.length > 0 && store.total > 0}
          viewMode={store.viewMode}
          setViewMode={store.setViewMode}
        />
      )}

      {/* Currency Selector */}
      {showCurrencySelector && (
        <CurrencySelector
          currency={store.currency}
          localCurrency={store.currency}
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
