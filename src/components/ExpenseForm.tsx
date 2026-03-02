import { useCallback, useEffect, useRef, useState } from "react";
import { useExpenseStore } from "../useExpenseStore";
import { ItemsSection } from "./ItemsSection";
import { PeopleSection } from "./PeopleSection";
import { SummarySection } from "./SummarySection";
import { CurrencySelector } from "./CurrencySelector";

export function ExpenseForm() {
  const store = useExpenseStore();
  const formRef = useRef<HTMLDivElement>(null);
  const localCurrencyRef = useRef(store.currency);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [settledDebtorIds, setSettledDebtorIds] = useState<Set<string>>(new Set());
  const [focusedExpenseId, setFocusedExpenseId] = useState<string | null>(null);
  const [settleSubMode, setSettleSubMode] = useState<"payer" | "own">("payer");

  useEffect(() => {
    setSettledDebtorIds(new Set());
  }, [store.payerId]);

  useEffect(() => {
    localCurrencyRef.current = store.currency;
  }, [store.currency]);

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
          coveredAmount={(() => {
            if (!isPaymentMode) return store.coveredAmount;
            if (settleSubMode === "own") {
              return store.people
                .filter(p => settledDebtorIds.has(p.id))
                .reduce((sum, p) => sum + (store.computedAmounts[p.id] || 0), 0);
            }
            return store.payerId ? (store.computedAmounts[store.payerId] || 0) : 0;
          })()}
          remaining={(() => {
            if (!isPaymentMode) return store.remaining;
            if (settleSubMode === "own") {
              return store.people
                .filter(p => !settledDebtorIds.has(p.id))
                .reduce((sum, p) => sum + (store.computedAmounts[p.id] || 0), 0);
            }
            if (!store.payerId) return store.total;
            return store.people
              .filter(p => p.id !== store.payerId && !settledDebtorIds.has(p.id))
              .reduce((sum, p) => sum + (store.computedAmounts[p.id] || 0), 0);
          })()}
          isBalanced={(() => {
            if (!isPaymentMode) return store.isBalanced;
            if (settleSubMode === "own") return store.people.every(p => settledDebtorIds.has(p.id));
            if (!store.payerId) return false;
            return store.people.filter(p => p.id !== store.payerId).every(p => settledDebtorIds.has(p.id));
          })()}
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
