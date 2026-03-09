import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useExpenseStore } from "../useExpenseStore";
import { useBillSync } from "../useBillSync";
import { shareBill } from "../api";
import { ItemsSection } from "./ItemsSection";
import { PeopleSection } from "./PeopleSection";
import { SummarySection } from "./SummarySection";
import { CurrencySelector } from "./CurrencySelector";
import { ReceiptScanner } from "./ReceiptScanner";

export function ExpenseForm() {
  const store = useExpenseStore();
  const { billId, loading, error, isCreator, saveStatus } = useBillSync({
    store,
    onBillLoaded: store.loadBill,
  });
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "sending" | "sent" | "error" | "no-chat">("idle");
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

  const tg = window.Telegram?.WebApp ?? null;

  useEffect(() => {
    if (!tg) return;
    tg.setHeaderColor('secondary_bg_color');
    tg.setBackgroundColor('bg_color');
    tg.setBottomBarColor('secondary_bg_color');
  }, []);

  // When a specific bill is opened from the bills list, show Telegram back button → /bills
  useEffect(() => {
    if (!tg) return;
    const openedFromList = !!new URLSearchParams(window.location.search).get("billId");
    if (!openedFromList) return;
    tg.BackButton.show();
    const goBack = () => void navigate({ to: "/" });
    tg.BackButton.onClick(goBack);
    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick(goBack);
    };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-espresso/60 text-sm">Loading bill…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <p className="text-destructive text-sm text-center">{error}</p>
      </div>
    );
  }

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
      {!tg && (
        <header className="px-4 py-3 border-b border-separator">
          <h1 className="text-base font-semibold text-espresso tracking-tight">
            Split the Bill
          </h1>
        </header>
      )}

      {/* Receipt title with breadcrumb */}
      <div className="px-4 py-3 border-b border-separator">
        <div className="flex items-center gap-1.5 mb-0.5">
          <button
            className="text-xs text-espresso/40 hover:text-espresso/60 transition-colors shrink-0"
            onClick={() => void navigate({ to: "/" })}
          >
            My Bills
          </button>
          <svg className="w-3 h-3 text-espresso/25 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={store.receiptTitle}
            onChange={(e) => store.setReceiptTitle(e.target.value)}
            placeholder="Receipt title"
            className="flex-1 bg-transparent text-base font-semibold text-espresso tracking-tight outline-none placeholder:text-espresso/30 focus:placeholder:text-espresso/20"
          />
          {saveStatus === "error" && (
            <span className="text-xs text-destructive shrink-0">Save failed</span>
          )}
          <button
            onClick={() => setShowReceiptScanner(true)}
            aria-label="Scan receipt"
            className="shrink-0 p-1 text-espresso/40 hover:text-espresso/60 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </button>
        </div>
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
          hasPeople={store.people.length > 0}
          canSubmit={store.isBalanced && store.people.length > 0 && store.total > 0}
          viewMode={store.viewMode}
          setViewMode={store.setViewMode}
        />
      )}

      {/* Share button — Telegram only, creator only, not in assignment mode */}
      {tg && billId && isCreator && !store.inAssignmentMode && !!tg.initDataUnsafe?.chat && (
        <div className="px-4 pt-2 pb-4">
          <button
            disabled={shareStatus === "sending"}
            className="w-full py-3 rounded-xl bg-button text-button-text font-semibold text-sm disabled:opacity-60"
            onClick={() => {
              const chatId = tg?.initDataUnsafe?.chat?.id;
              setShareStatus("sending");
              shareBill(billId, chatId)
                .then(() => {
                  setShareStatus("sent");
                  setTimeout(() => setShareStatus("idle"), 2000);
                })
                .catch((err: Error) => {
                  setShareStatus(err.message.includes("400") ? "no-chat" : "error");
                });
            }}
          >
            {shareStatus === "sending" ? "Sharing…" : shareStatus === "sent" ? "Shared!" : "Share with Group"}
          </button>
          {shareStatus === "no-chat" && (
            <p className="mt-2 text-xs text-center text-espresso/50">Open from a group chat to share</p>
          )}
          {shareStatus === "error" && (
            <p className="mt-2 text-xs text-center text-destructive">Failed to share</p>
          )}
        </div>
      )}

      {/* Receipt Scanner */}
      {showReceiptScanner && (
        <ReceiptScanner
          store={store}
          onClose={() => setShowReceiptScanner(false)}
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
