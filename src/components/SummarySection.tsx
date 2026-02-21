import { formatAmount, getCurrencySymbol, getCurrencySymbolClass } from "../currency";

interface SummarySectionProps {
  currency: string;
  coveredAmount: number;
  remaining: number;
  isBalanced: boolean;
  isOver: boolean;
  canSubmit: boolean;
}

export function SummarySection({
  currency,
  coveredAmount,
  remaining,
  isBalanced,
  isOver,
  canSubmit,
}: SummarySectionProps) {
  const sym = getCurrencySymbol(currency);
  const symTextClass = getCurrencySymbolClass(sym);
  return (
    <>
      <div className="border-t border-espresso/8">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-espresso/8">
          <span className="text-sm text-espresso-light/60">Covered</span>
          <span className="text-sm font-semibold text-sage">
            <span className={`opacity-60 ${symTextClass}`}>{sym}</span>&thinsp;{formatAmount(coveredAmount, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-sm text-espresso-light/60">Remaining</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold transition-colors ${
                isBalanced
                  ? "text-sage"
                  : isOver
                    ? "text-terracotta pulse-attention"
                    : "text-amber pulse-attention"
              }`}
            >
              {isOver ? "+" : ""}<span className={`opacity-60 ${symTextClass}`}>{sym}</span>&thinsp;{formatAmount(Math.abs(remaining), currency)}
            </span>
            {isBalanced ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-sage bg-sage/10 rounded-full">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Balanced
              </span>
            ) : isOver ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-terracotta bg-terracotta/10 rounded-full">
                Over
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber bg-amber/10 rounded-full">
                Remaining
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <button
          disabled={!canSubmit}
          className="w-full py-3 text-base font-semibold text-white bg-gradient-to-r from-terracotta to-terracotta-light rounded-xl shadow-md shadow-terracotta/25 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:shadow-xl hover:shadow-terracotta/30 active:scale-[0.98] transition-all"
        >
          Save Split
        </button>
      </div>
    </>
  );
}
