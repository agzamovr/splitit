import { type MutableRefObject } from "react";
import { type Person, formatPrice } from "../types";

interface PersonCardProps {
  person: Person;
  index: number;
  computedAmount: number;
  displayedAmount: string;
  isEqual: boolean;
  isActivePerson: boolean;
  isDimmedPerson: boolean;
  isItemModeRow: boolean;
  isAssignedInItemMode: boolean;
  isLastInput?: boolean;
  focusNewId: MutableRefObject<string | null>;
  onToggleAssignment: () => void;
  onPersonFocus: () => void;
  onUpdateName: (name: string) => void;
  onUpdateAmount: (amount: string) => void;
  onRemove: () => void;
}

export function PersonCard({
  person,
  index,
  computedAmount,
  displayedAmount,
  isEqual,
  isActivePerson,
  isDimmedPerson,
  isItemModeRow,
  isAssignedInItemMode,
  isLastInput,
  focusNewId,
  onToggleAssignment,
  onPersonFocus,
  onUpdateName,
  onUpdateAmount,
  onRemove,
}: PersonCardProps) {
  return (
    <li
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
          <div className="relative flex-shrink-0 w-24">
            <span className="block pl-6 pr-2 py-1.5 border border-transparent text-base sm:text-sm font-semibold text-right text-espresso/50 tabular-nums">
              ${formatPrice(computedAmount)}
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
              if (el && focusNewId.current === person.id) {
                el.focus();
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                focusNewId.current = null;
              }
            }}
            type="text"
            enterKeyHint={isEqual && isLastInput ? "done" : "next"}
            value={person.name}
            onChange={(e) => onUpdateName(e.target.value)}
            placeholder="Name"
            className="input-glow flex-1 min-w-0 px-3 py-1.5 text-base sm:text-sm font-medium text-espresso bg-transparent border border-transparent rounded-lg focus:bg-white focus:border-espresso/10 outline-none transition-all placeholder:text-espresso/30"
          />

          <div className="relative flex-shrink-0 w-24">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-espresso/40">
              $
            </span>
            {isActivePerson ? (
              <input
                type="text"
                value={formatPrice(computedAmount)}
                readOnly
                className="w-full pl-6 pr-2 py-1.5 text-base sm:text-sm font-semibold text-right text-espresso rounded-lg border outline-none transition-all bg-sage/10 border-sage/20 text-espresso/60"
              />
            ) : (
              <input
                type="number"
                inputMode="decimal"
                enterKeyHint={isLastInput ? "done" : "next"}
                value={displayedAmount}
                onChange={(e) => onUpdateAmount(e.target.value)}
                readOnly={isEqual}
                placeholder="0.00"
                className={`w-full pl-6 pr-2 py-1.5 text-base sm:text-sm font-semibold text-right text-espresso rounded-lg border outline-none transition-all placeholder:text-espresso/20 ${
                  isEqual
                    ? "bg-cream-dark/40 border-espresso/5 text-espresso/60"
                    : "input-glow bg-white border-espresso/10 focus:border-terracotta/30"
                }`}
              />
            )}
          </div>

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
