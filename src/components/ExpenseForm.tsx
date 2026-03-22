import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useBillSync } from "../useBillSync";
import { useBillStore, useComputedStore } from "../store";
import { shareBill } from "../api";
import { ItemsSection } from "./ItemsSection";
import { PeopleSection } from "./PeopleSection";
import { SummarySection } from "./SummarySection";
import { CurrencySelector } from "./CurrencySelector";
import { ReceiptScanner } from "./ReceiptScanner";

export function ExpenseForm() {
  const { billId, loading, error, isCreator, saveStatus } = useBillSync();
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "sending" | "sent" | "error" | "no-chat">("idle");
  const [focusedExpenseId, setFocusedExpenseId] = useState<string | null>(null);

  const receiptTitle = useBillStore((s) => s.receiptTitle);
  const setReceiptTitle = useBillStore((s) => s.setReceiptTitle);
  const viewMode = useBillStore((s) => s.viewMode);
  const setViewMode = useBillStore((s) => s.setViewMode);
  const exitAssignmentMode = useBillStore((s) => s.exitAssignmentMode);
  const payerId = useBillStore((s) => s.payerId);
  const people = useBillStore((s) => s.people);
  const currency = useBillStore((s) => s.currency);
  const setCurrency = useBillStore((s) => s.setCurrency);
  const initCurrencyDetection = useBillStore((s) => s.initCurrencyDetection);
  const settleSubMode = useBillStore((s) => s.settleSubMode);

  const computed = useComputedStore();

  useEffect(() => {
    initCurrencyDetection();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [tg]);

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
  }, [tg, navigate]);

  const isPaymentMode = viewMode === "settle";
  const payer = payerId ? people.find(p => p.id === payerId) ?? null : null;
  const payerName = payer?.name || "";

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
        if (computed.inAssignmentMode && e.target === e.currentTarget) {
          exitAssignmentMode();
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
            value={receiptTitle}
            onChange={(e) => setReceiptTitle(e.target.value)}
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
        focusedExpenseId={focusedExpenseId}
        setFocusedExpenseId={setFocusedExpenseId}
        setShowCurrencySelector={setShowCurrencySelector}
      />

      <PeopleSection />

      {/* Summary */}
      {!computed.inAssignmentMode && (
        <SummarySection
          currency={currency}
          isSettleMode={isPaymentMode}
          payerName={isPaymentMode && settleSubMode === "payer" ? payerName : undefined}
          coveredAmount={computed.summaryCoveredAmount}
          remaining={computed.summaryRemaining}
          isBalanced={computed.summaryIsBalanced}
          isOver={isPaymentMode ? false : computed.isOver}
          hasPeople={people.length > 0}
          canSubmit={computed.isBalanced && people.length > 0 && computed.total > 0}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}

      {/* Share button — Telegram only, creator only, not in assignment mode */}
      {tg && billId && isCreator && !computed.inAssignmentMode &&
        !!(tg.initDataUnsafe?.chat?.id ?? sessionStorage.getItem("group_chat_id")) && (
        <div className="px-4 pt-2 pb-4">
          <button
            disabled={shareStatus === "sending"}
            className="w-full py-3 rounded-xl bg-button text-button-text font-semibold text-sm disabled:opacity-60"
            onClick={() => {
              const rawGroupChatId = sessionStorage.getItem("group_chat_id");
              const sessionChatId = rawGroupChatId ? parseInt(rawGroupChatId, 10) : NaN;
              const chatId = tg?.initDataUnsafe?.chat?.id ?? (Number.isFinite(sessionChatId) ? sessionChatId : undefined);
              const chatTitle = tg?.initDataUnsafe?.chat?.title;
              setShareStatus("sending");
              shareBill(billId, chatId, chatTitle)
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
          onClose={() => setShowReceiptScanner(false)}
        />
      )}

      {/* Currency Selector */}
      {showCurrencySelector && (
        <CurrencySelector
          currency={currency}
          localCurrency={currency}
          onSelect={(code) => {
            setCurrency(code);
            setShowCurrencySelector(false);
          }}
          onClose={() => setShowCurrencySelector(false)}
        />
      )}
    </div>
  );
}
