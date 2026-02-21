import { type MutableRefObject, useLayoutEffect, useRef } from "react";
import { type Person } from "../types";
import { formatAmount, getCurrencySymbol, getCurrencySymbolClass } from "../currency";

interface PersonCardProps {
  person: Person;
  index: number;
  currency: string;
  computedAmount: number;
  settleVariant?: "select" | "payer" | "debt";
  onSelectPayer?: () => void;
  isSettled?: boolean;
  onToggleSettled?: () => void;
  displayedAmount?: string;
  isEqual?: boolean;
  isActivePerson?: boolean;
  isDimmedPerson?: boolean;
  isItemModeRow?: boolean;
  isAssignedInItemMode?: boolean;
  isLastInput?: boolean;
  focusNewId?: MutableRefObject<string | null>;
  onToggleAssignment?: () => void;
  onPersonFocus?: () => void;
  onUpdateName?: (name: string) => void;
  onUpdateAmount?: (amount: string) => void;
  onRemove?: () => void;
}

export function PersonCard({
  person,
  index,
  currency,
  computedAmount,
  settleVariant,
  onSelectPayer,
  isSettled = false,
  onToggleSettled,
  displayedAmount = "",
  isEqual = false,
  isActivePerson = false,
  isDimmedPerson = false,
  isItemModeRow = false,
  isAssignedInItemMode = false,
  isLastInput,
  focusNewId,
  onToggleAssignment,
  onPersonFocus,
  onUpdateName,
  onUpdateAmount,
  onRemove,
}: PersonCardProps) {
  const sym = getCurrencySymbol(currency);
  const symTextClass = getCurrencySymbolClass(sym);
  const inputPl = sym.length <= 1 ? 'pl-6' : sym.length <= 2 ? 'pl-8' : 'pl-10';
  const amountChars = Math.max(5, displayedAmount?.length || 4) + sym.length + 2;

  const liRef = useRef<HTMLLIElement>(null);
  const prevRectRef = useRef<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!settleVariant) return;
    const el = liRef.current;
    if (!el) return;
    const newRect = el.getBoundingClientRect();
    const oldRect = prevRectRef.current;
    prevRectRef.current = newRect;
    if (!oldRect) return;
    const dy = oldRect.top - newRect.top;
    if (Math.abs(dy) < 1) return;
    el.style.transition = 'none';
    el.style.transform = `translateY(${dy}px)`;
    el.getBoundingClientRect(); // force reflow
    el.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)';
    el.style.transform = '';
    const cleanup = () => { el.style.transition = ''; };
    el.addEventListener('transitionend', cleanup, { once: true });
  }, [settleVariant, index]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <li
      ref={liRef}
      className={`animate-slide-up ${isDimmedPerson ? "opacity-30" : ""} transition-opacity`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {isItemModeRow ? (
        <button
          type="button"
          onClick={onToggleAssignment}
          className={`w-full flex items-center gap-3 pl-4 pr-3 py-2 transition-colors ${
            isAssignedInItemMode ? "bg-sage/8" : ""
          }`}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sage-light to-sage flex items-center justify-center text-white font-semibold text-xs shadow-sm">
            {person.name ? person.name[0].toUpperCase() : "?"}
          </div>
          <span className="flex-1 text-left text-base sm:text-sm font-medium text-espresso truncate min-w-0 px-3 py-1.5 border border-transparent">
            {person.name || "Unnamed"}
          </span>
          <div className="flex-shrink-0">
            <span className="block pl-2 pr-2 py-1.5 text-base sm:text-sm font-semibold text-right text-espresso/50 tabular-nums whitespace-nowrap">
              <span className={`font-semibold text-espresso/25 ${symTextClass}`}>{sym}</span>&thinsp;{formatAmount(computedAmount, currency)}
            </span>
          </div>
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
            isAssignedInItemMode ? "text-sage" : "text-espresso/30"
          }`}>
            {isAssignedInItemMode ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="4" y="4" width="16" height="16" rx="3" />
              </svg>
            )}
          </div>
        </button>
      ) : settleVariant === "select" ? (
        <button type="button" onClick={onSelectPayer}
          className="w-full flex items-center gap-3 pl-4 pr-3 py-3.5 text-left transition-colors hover:bg-cream-dark/40 active:bg-cream-dark/60">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sage-light to-sage flex items-center justify-center text-white font-semibold text-xs shadow-sm">
            {person.name ? person.name[0].toUpperCase() : "?"}
          </div>
          <span className="flex-1 text-base sm:text-sm font-medium text-espresso truncate min-w-0">
            {person.name || "Unnamed"}
          </span>
          <span className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold text-sage bg-sage/10 rounded-full whitespace-nowrap">
            Set as Payer
          </span>
        </button>
      ) : settleVariant === "payer" ? (
        <button type="button" onClick={onSelectPayer}
          className="w-full flex items-center gap-3 pl-[14px] pr-3 py-3 text-left bg-sage/8 border-l-2 border-l-sage transition-colors hover:bg-sage/12 active:bg-sage/16">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sage-light to-sage text-white flex items-center justify-center font-semibold text-xs shadow-sm ring-2 ring-sage/30">
            {person.name ? person.name[0].toUpperCase() : "?"}
          </div>
          <span className="flex-1 text-base sm:text-sm font-medium text-espresso truncate min-w-0">
            {person.name || "Unnamed"}
          </span>
          <span className="flex-shrink-0 text-sm font-semibold text-sage tabular-nums whitespace-nowrap">
            <span className={`opacity-60 ${symTextClass}`}>{sym}</span>&thinsp;{formatAmount(computedAmount, currency)}
          </span>
        </button>
      ) : settleVariant === "debt" ? (
        <button type="button" onClick={onToggleSettled}
          className="w-full flex items-center gap-3 pl-4 pr-3 py-3 text-left transition-colors hover:bg-cream-dark/40 active:bg-cream-dark/60">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sage-light to-sage flex items-center justify-center text-white font-semibold text-xs shadow-sm opacity-70">
            {person.name ? person.name[0].toUpperCase() : "?"}
          </div>
          <span className="flex-1 text-base sm:text-sm font-medium text-espresso truncate min-w-0">
            {person.name || "Unnamed"}
          </span>
          <span className={`flex-shrink-0 text-sm font-semibold tabular-nums whitespace-nowrap transition-colors ${isSettled ? "text-sage" : "text-terracotta"}`}>
            <span className="text-xs font-medium opacity-75">{isSettled ? "paid" : "owes"}&thinsp;</span>{formatAmount(computedAmount, currency)}
          </span>
        </button>
      ) : (
        <div className={`group flex items-center gap-3 pl-4 pr-3 py-2 transition-all ${
          isActivePerson
            ? "bg-sage/5 border-l-2 border-l-sage pl-[14px]"
            : ""
        }`}>
          <button
            type="button"
            onClick={onPersonFocus}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sage-light to-sage flex items-center justify-center text-white font-semibold text-xs shadow-sm hover:ring-2 hover:ring-sage/50 transition-all cursor-pointer"
            aria-label="Assign expenses to this person"
          >
            {person.name ? person.name[0].toUpperCase() : "?"}
          </button>

          <input
            ref={(el) => {
              if (el && focusNewId?.current === person.id) {
                el.focus();
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                focusNewId.current = null;
              }
            }}
            type="text"
            enterKeyHint={isEqual && isLastInput ? "done" : "next"}
            value={person.name}
            onChange={(e) => onUpdateName?.(e.target.value)}
            placeholder="Name"
            className="input-glow flex-1 min-w-0 px-3 py-1.5 text-base sm:text-sm font-medium text-espresso bg-transparent border border-transparent rounded-lg focus:bg-white focus:border-espresso/10 outline-none transition-all placeholder:text-espresso/30"
          />

          {!isEqual && !isActivePerson ? (
            <div
              className="relative"
              style={{ width: `clamp(5.5rem, ${amountChars}ch, 50%)` }}
            >
              <span className={`absolute left-2 top-1/2 -translate-y-1/2 font-semibold text-espresso/25 ${symTextClass}`}>
                {sym}
              </span>
              <input
                type="number"
                inputMode="decimal"
                enterKeyHint={isLastInput ? "done" : "next"}
                value={displayedAmount}
                onChange={(e) => onUpdateAmount?.(e.target.value)}
                placeholder="0.00"
                className={`input-glow w-full ${inputPl} pr-2 py-1.5 text-base sm:text-sm font-semibold text-right text-espresso rounded-lg border outline-none transition-all placeholder:text-espresso/20 bg-white border-espresso/10 focus:border-terracotta/30`}
              />
            </div>
          ) : (
            <span className={`flex-shrink-0 text-base sm:text-sm font-semibold tabular-nums whitespace-nowrap ${
              isActivePerson ? "text-sage" : "text-espresso/50"
            }`}>
              {computedAmount > 0
                ? <><span className={`font-semibold ${symTextClass} ${isActivePerson ? "opacity-60" : "text-espresso/25"}`}>{sym}</span>&thinsp;{formatAmount(computedAmount, currency)}</>
                : "—"}
            </span>
          )}

          <button
            type="button"
            onClick={onRemove}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-espresso/30 hover:text-terracotta hover:bg-terracotta/10 active:bg-terracotta/20 rounded-lg transition-colors"
            aria-label="Remove person"
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
