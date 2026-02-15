import { type MutableRefObject } from "react";
import { type Expense, type PricingMode, formatPrice } from "../types";

interface ExpenseRowProps {
  expense: Expense;
  index: number;
  assignedCount: number;
  pricingMode: PricingMode;
  isActiveItem: boolean;
  isDimmedItem: boolean;
  isPersonModeRow: boolean;
  isAssignedInPersonMode: boolean;
  isLastInput?: boolean;
  focusNewId: MutableRefObject<string | null>;
  onToggleAssignment: () => void;
  onItemFocus: () => void;
  onUpdateDescription: (description: string) => void;
  onUpdatePrice: (price: string) => void;
  onRemove: () => void;
}

export function ExpenseRow({
  expense,
  index,
  assignedCount,
  pricingMode,
  isActiveItem,
  isDimmedItem,
  isPersonModeRow,
  isAssignedInPersonMode,
  isLastInput,
  focusNewId,
  onToggleAssignment,
  onItemFocus,
  onUpdateDescription,
  onUpdatePrice,
  onRemove,
}: ExpenseRowProps) {
  return (
    <li
      className={`animate-slide-up ${isDimmedItem ? "opacity-30" : ""} transition-opacity`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {isPersonModeRow ? (
        <button
          type="button"
          onClick={onToggleAssignment}
          className={`w-full flex items-center gap-2 pl-4 pr-3 py-2.5 transition-colors ${
            isAssignedInPersonMode ? "bg-sage/8" : ""
          }`}
        >
          <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-sage">
            <span className="relative">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
              <span className="absolute -bottom-1.5 -right-1.5 text-[9px] font-bold leading-none">{assignedCount}</span>
            </span>
          </span>
          <span className="flex-1 min-w-0 px-3 py-1.5 border border-transparent text-left text-base sm:text-sm font-medium text-espresso truncate">
            {expense.description || "Untitled"}
          </span>
          <div className="flex-shrink-0 w-24">
            <span className="block pl-6 pr-2 py-1.5 border border-transparent text-base sm:text-sm font-semibold text-right text-espresso">
              ${formatPrice(parseFloat(expense.price) || 0)}
            </span>
          </div>
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
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
        <div className={`flex items-center gap-2 pl-4 pr-3 py-2.5 transition-all ${
          pricingMode === "each" && assignedCount > 0 ? "pb-5" : ""
        } ${
          isActiveItem
            ? "bg-sage/5 border-l-2 border-l-sage pl-[14px]"
            : ""
        }`}>
          <button
            type="button"
            onClick={onItemFocus}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-base font-bold transition-colors text-sage hover:text-sage/70"
            aria-label="Assign people to this expense"
            title={`${assignedCount} people assigned`}
          >
            <span className="relative">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
              <span className="absolute -bottom-1.5 -right-1.5 text-[9px] font-bold leading-none">{assignedCount}</span>
            </span>
          </button>
          <input
            ref={(el) => {
              if (el && focusNewId.current === expense.id) {
                el.focus();
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                focusNewId.current = null;
              }
            }}
            type="text"
            enterKeyHint="next"
            value={expense.description}
            onChange={(e) => onUpdateDescription(e.target.value)}
            placeholder="Description"
            className="input-glow flex-1 min-w-0 px-3 py-1.5 text-base sm:text-sm font-medium text-espresso bg-transparent border border-transparent rounded-lg focus:bg-white focus:border-espresso/10 outline-none transition-all placeholder:text-espresso/30"
          />
          <div className="flex-shrink-0 relative">
            <div className="relative w-24">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-espresso/40">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                enterKeyHint={isLastInput ? "done" : "next"}
                value={expense.price}
                onChange={(e) => onUpdatePrice(e.target.value)}
                placeholder="0.00"
                className="input-glow w-full pl-6 pr-2 py-1.5 text-base sm:text-sm font-semibold text-right text-espresso bg-white rounded-lg border border-espresso/10 focus:border-terracotta/30 outline-none transition-all placeholder:text-espresso/20"
              />
            </div>
            {pricingMode === "each" && assignedCount > 0 && (
              <div className="absolute top-full right-0 text-[10px] text-espresso/50 text-right pr-1 mt-0.5">
                = ${formatPrice((parseFloat(expense.price) || 0) * assignedCount)}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-espresso/30 hover:text-terracotta hover:bg-terracotta/10 active:bg-terracotta/20 rounded-lg transition-colors"
            aria-label="Remove expense"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </li>
  );
}
