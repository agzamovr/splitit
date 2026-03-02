import { type MutableRefObject } from "react";
import { type Expense } from "../types";
import { formatAmount, getCurrencySymbol } from "../currency";

interface ExpenseRowProps {
  expense: Expense;
  index: number;
  assignedCount: number;
  currency: string;
  isActiveItem: boolean;
  isDimmedItem: boolean;
  isPersonModeRow: boolean;
  isAssignedInPersonMode: boolean;
  focusNewId: MutableRefObject<string | null>;
  onToggleAssignment: () => void;
  onItemFocus: () => void;
  onUpdateDescription: (description: string) => void;
  onUpdatePrice: (price: string) => void;
  onRowFocus?: () => void;
  onRowBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
  onRemove: () => void;
}

export function ExpenseRow({
  expense,
  index,
  assignedCount,
  currency,
  isActiveItem,
  isDimmedItem,
  isPersonModeRow,
  isAssignedInPersonMode,
  focusNewId,
  onToggleAssignment,
  onItemFocus,
  onUpdateDescription,
  onUpdatePrice,
  onRowFocus,
  onRowBlur,
  onRemove,
}: ExpenseRowProps) {
  const sym = getCurrencySymbol(currency);
  const pricingMode = expense.pricingMode;
  const modeLabel = pricingMode === "each" ? "ea" : "tot";
  const priceChars = Math.max(5, expense.price?.length || 4) + 4;

  const PeopleIcon = () => (
    <span className="relative">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
      <span className="absolute -bottom-1.5 -right-1.5 text-[9px] font-bold leading-none">{assignedCount}</span>
    </span>
  );

  return (
    <li
      className={`animate-slide-up ${isDimmedItem ? "opacity-30" : ""} transition-opacity`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {isPersonModeRow ? (
        // Assignment-toggle row: description is a <span> so it can wrap freely.
        // Top-align everything so price stays pinned to the first line.
        <button
          type="button"
          onClick={onToggleAssignment}
          className={`w-full flex items-start gap-3 pl-4 pr-3 py-2.5 transition-colors ${
            isAssignedInPersonMode ? "bg-sage/8" : ""
          }`}
        >
          <span className="flex-shrink-0 mt-1 w-8 h-8 flex items-center justify-center text-sage">
            <PeopleIcon />
          </span>

          <span className="flex-1 min-w-0 px-3 py-1.5 border border-transparent text-left text-base sm:text-sm font-medium text-espresso break-words">
            {expense.description || "Untitled"}
          </span>

          {/* Price: fixed min-width so it never shrinks below what a large amount needs */}
          <div className="flex-shrink-0 min-w-[7rem]">
            <span className="block py-1.5 text-base sm:text-sm font-semibold text-right text-espresso whitespace-nowrap">
              <span className="text-[10px] font-bold text-espresso/35 tracking-tight">{modeLabel}</span>&thinsp;{formatAmount(parseFloat(expense.price) || 0, currency)}
            </span>
          </div>

          <div className={`flex-shrink-0 mt-1 w-8 h-8 rounded-lg flex items-center justify-center ${
            isAssignedInPersonMode
              ? "text-sage bg-sage/20"
              : "text-espresso/30 bg-espresso/5"
          }`}>
            {isAssignedInPersonMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="4" y="4" width="16" height="16" rx="3" />
              </svg>
            )}
          </div>
        </button>
      ) : (
        // Edit row: top-aligned so the per-item total label below the price box
        // never disturbs the description input, and the price box never shrinks.
        <div
          className={`flex items-start gap-3 pl-4 pr-3 py-2.5 transition-all ${
            isActiveItem
              ? "bg-sage/5 border-l-2 border-l-sage pl-[14px]"
              : ""
          }`}
          onFocus={onRowFocus}
          onBlur={onRowBlur}
        >
          <button
            type="button"
            onClick={onItemFocus}
            className="flex-shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center text-base font-bold transition-colors text-sage hover:text-sage/70"
            aria-label="Assign people to this expense"
            title={`${assignedCount} people assigned`}
          >
            <PeopleIcon />
          </button>

          <div className="flex-1 min-w-0 flex flex-wrap items-start gap-x-3 gap-y-1.5">
            <input
              ref={(el) => {
                if (el && focusNewId.current === expense.id) {
                  el.focus();
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  focusNewId.current = null;
                }
              }}
              type="text"
              enterKeyHint="go"
              value={expense.description}
              onChange={(e) => onUpdateDescription(e.target.value)}
              placeholder="Description"
              className="input-glow flex-[1_0_0%] min-w-[8rem] px-3 py-1.5 text-base sm:text-sm font-medium text-espresso bg-transparent border border-transparent rounded-lg focus:bg-white focus:border-espresso/10 outline-none transition-all placeholder:text-espresso/30"
            />

            {/* Price input: grows with content via clamp(), capped at 50% of
                the inner wrapper. Description wraps below on narrow screens
                when the price is large. */}
            <div
              className="ml-auto"
              style={{ width: `clamp(5.5rem, ${priceChars}ch, 50%)` }}
            >
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-espresso/35 tracking-tight leading-none">
                  {modeLabel}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  enterKeyHint="go"
                  value={expense.price}
                  onChange={(e) => onUpdatePrice(e.target.value)}
                  placeholder="0.00"
                  className="input-glow w-full pl-7 pr-2 py-1.5 text-base sm:text-sm font-semibold text-right text-espresso bg-white rounded-lg border border-espresso/10 focus:border-terracotta/30 outline-none transition-all placeholder:text-espresso/20"
                />
              </div>
              {pricingMode === "each" && assignedCount > 0 && (
                <div className="text-[10px] text-espresso/50 text-right pr-1 mt-0.5 whitespace-nowrap">
                  = {sym}&thinsp;{formatAmount((parseFloat(expense.price) || 0) * assignedCount, currency)}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="flex-shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center text-espresso/30 hover:text-terracotta hover:bg-terracotta/10 active:bg-terracotta/20 rounded-lg transition-colors"
            aria-label="Remove expense"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </li>
  );
}
