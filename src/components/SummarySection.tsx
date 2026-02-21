import { formatAmount, getCurrencySymbol, getCurrencySymbolClass } from "../currency";

interface SummarySectionProps {
  currency: string;
  coveredAmount: number;
  remaining: number;
  isBalanced: boolean;
  isOver: boolean;
  canSubmit: boolean;
  viewMode: "consumption" | "settle";
  setViewMode: (mode: "consumption" | "settle") => void;
  payerName?: string;
}

export function SummarySection({
  currency,
  coveredAmount,
  remaining,
  isBalanced,
  isOver,
  canSubmit,
  viewMode,
  setViewMode,
  payerName,
}: SummarySectionProps) {
  const sym = getCurrencySymbol(currency);
  const symTextClass = getCurrencySymbolClass(sym);
  return (
    <>
      <div className="border-t border-espresso/8">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-espresso/8">
          <span className="text-sm text-espresso-light/60">
            {payerName ? `${payerName}'s Share` : "Covered"}
          </span>
          <span className="text-sm font-semibold text-sage">
            <span className={`opacity-60 ${symTextClass}`}>{sym}</span>&thinsp;{formatAmount(coveredAmount, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-sm text-espresso-light/60">
            {payerName ? "To Collect" : "Remaining"}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold transition-colors ${
                payerName
                  ? "text-sage"
                  : isBalanced
                    ? "text-sage"
                    : isOver
                      ? "text-terracotta pulse-attention"
                      : "text-amber pulse-attention"
              }`}
            >
              {isOver && !payerName ? "+" : ""}<span className={`opacity-60 ${symTextClass}`}>{sym}</span>&thinsp;{formatAmount(Math.abs(remaining), currency)}
            </span>
            {isBalanced ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-sage bg-sage/10 rounded-full">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {payerName ? "Collected" : "Balanced"}
              </span>
            ) : isOver && !payerName ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-terracotta bg-terracotta/10 rounded-full">
                Over
              </span>
            ) : !payerName ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber bg-amber/10 rounded-full">
                Remaining
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="flex gap-0.5 bg-cream-dark/50 rounded-lg p-0.5">
          {(["consumption", "settle"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={mode === "settle" && !canSubmit}
              onClick={() => setViewMode(mode)}
              className={`flex-1 px-2.5 py-2.5 text-sm font-medium rounded-md transition-all ${
                viewMode === mode
                  ? "bg-white text-espresso shadow-sm"
                  : "text-espresso/40 hover:text-espresso/60 disabled:opacity-30 disabled:cursor-not-allowed"
              }`}
            >
              {mode === "consumption" ? "Consumption" : "Settle"}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
