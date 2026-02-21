import { useState, useEffect } from 'react';
import { COMMON_CURRENCIES } from '../currency';

interface CurrencySelectorProps {
  currency: string;
  localCurrency: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function CurrencySelector({ currency, localCurrency, onSelect, onClose }: CurrencySelectorProps) {
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const pinnedCodes = Array.from(new Set([localCurrency, 'USD', 'EUR', 'GBP']));
  const q = search.trim().toLowerCase();
  const filtered = COMMON_CURRENCIES.filter(
    (c) =>
      !pinnedCodes.includes(c.code) &&
      (q === '' || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
  );

  const CheckIcon = () => (
    <svg className="w-4 h-4 text-sage flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-espresso/30 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Panel */}
      <div
        className={`relative max-w-sm w-full mx-auto bg-cream rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${mounted ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-espresso/20 rounded-full" />
        </div>

        {/* Search input */}
        <div className="px-4 pb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search currency…"
            style={{ fontSize: '16px' }}
            className="w-full px-3 py-2 text-sm bg-cream-dark/60 border border-espresso/10 rounded-lg outline-none focus:border-terracotta/30 transition-colors placeholder:text-espresso/30"
          />
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto max-h-72 pb-6">
          {/* Pinned section — only shown when no search query */}
          {q === '' && (
            <>
              <div className="px-4 py-1">
                <span className="text-[10px] font-semibold text-espresso/40 uppercase tracking-wider">
                  Suggested
                </span>
              </div>
              {pinnedCodes.map((code) => {
                const info = COMMON_CURRENCIES.find((c) => c.code === code);
                const isSelected = code === currency;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onSelect(code)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      isSelected ? 'bg-sage/10' : 'hover:bg-cream-dark/60'
                    }`}
                  >
                    <span
                      className={`font-mono text-sm font-semibold w-10 text-left ${
                        isSelected ? 'text-sage' : 'text-espresso'
                      }`}
                    >
                      {code}
                    </span>
                    <span className="flex-1 text-sm text-left text-espresso/60">
                      {info?.name ?? ''}
                    </span>
                    {isSelected && <CheckIcon />}
                  </button>
                );
              })}
              <div className="mx-4 my-1 border-t border-espresso/8" />
            </>
          )}

          {/* Filtered list */}
          {filtered.length > 0 ? (
            filtered.map((c) => {
              const isSelected = c.code === currency;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => onSelect(c.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    isSelected ? 'bg-sage/10' : 'hover:bg-cream-dark/60'
                  }`}
                >
                  <span
                    className={`font-mono text-sm font-semibold w-10 text-left ${
                      isSelected ? 'text-sage' : 'text-espresso'
                    }`}
                  >
                    {c.code}
                  </span>
                  <span className="flex-1 text-sm text-left text-espresso/60">{c.name}</span>
                  {isSelected && <CheckIcon />}
                </button>
              );
            })
          ) : (
            <div className="px-4 py-6 text-center text-sm text-espresso/40">
              No currencies found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
