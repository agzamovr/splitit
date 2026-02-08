import { useState } from "react";

interface Person {
  id: string;
  name: string;
  amount: string;
}

const SAMPLE_PEOPLE: Person[] = [
  { id: "1", name: "Alex", amount: "24.50" },
  { id: "2", name: "Jordan", amount: "18.00" },
  { id: "3", name: "Sam", amount: "32.75" },
  { id: "4", name: "Riley", amount: "" },
];

export function ExpenseForm() {
  const [totalAmount, setTotalAmount] = useState("120.00");
  const [people, setPeople] = useState<Person[]>(SAMPLE_PEOPLE);

  const coveredAmount = people.reduce((sum, person) => {
    const amount = parseFloat(person.amount) || 0;
    return sum + amount;
  }, 0);

  const total = parseFloat(totalAmount) || 0;
  const remaining = total - coveredAmount;
  const isBalanced = Math.abs(remaining) < 0.01;
  const isOver = remaining < -0.01;

  const updatePersonAmount = (id: string, amount: string) => {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, amount } : p))
    );
  };

  const updatePersonName = (id: string, name: string) => {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
  };

  const addPerson = () => {
    const newPerson: Person = {
      id: crypto.randomUUID(),
      name: "",
      amount: "",
    };
    setPeople((prev) => [...prev, newPerson]);
  };

  const removePerson = (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-cream px-4 py-6">
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold text-espresso tracking-tight">
          Split the Bill
        </h1>
        <p className="mt-1 text-sm text-espresso-light/70">
          Who's paying what?
        </p>
      </header>

      {/* Receipt Card */}
      <div className="receipt-paper rounded-2xl overflow-hidden">
        {/* Total Amount Section */}
        <div className="px-5 pt-5 pb-4 border-b border-dashed border-espresso/10">
          <label className="block text-xs font-medium text-espresso-light/60 uppercase tracking-wider mb-2">
            Total Bill
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-display font-semibold text-espresso/40">
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className="input-glow w-full pl-10 pr-4 py-3 text-3xl font-display font-bold text-espresso bg-cream-dark/50 rounded-xl border-2 border-transparent focus:border-terracotta/30 focus:bg-white outline-none transition-all"
            />
          </div>
        </div>

        {/* People List */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-espresso-light/60 uppercase tracking-wider">
              Split between
            </span>
            <span className="text-xs text-espresso-light/40">
              {people.length} {people.length === 1 ? "person" : "people"}
            </span>
          </div>

          <ul className="space-y-2">
            {people.map((person, index) => (
              <li
                key={person.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="group flex items-center gap-3 p-3 bg-cream/80 rounded-xl border border-espresso/5 hover:border-espresso/10 transition-colors">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-sage-light to-sage flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                    {person.name ? person.name[0].toUpperCase() : "?"}
                  </div>

                  {/* Name Input */}
                  <input
                    type="text"
                    value={person.name}
                    onChange={(e) => updatePersonName(person.id, e.target.value)}
                    placeholder="Name"
                    className="input-glow flex-1 min-w-0 px-3 py-2 text-sm font-medium text-espresso bg-transparent border border-transparent rounded-lg focus:bg-white focus:border-espresso/10 outline-none transition-all placeholder:text-espresso/30"
                  />

                  {/* Amount Input */}
                  <div className="relative flex-shrink-0 w-24">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-espresso/40">
                      $
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={person.amount}
                      onChange={(e) => updatePersonAmount(person.id, e.target.value)}
                      placeholder="0.00"
                      className="input-glow w-full pl-6 pr-2 py-2 text-sm font-semibold text-right text-espresso bg-white rounded-lg border border-espresso/10 focus:border-terracotta/30 outline-none transition-all placeholder:text-espresso/20"
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removePerson(person.id)}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-espresso/30 hover:text-terracotta hover:bg-terracotta/10 active:bg-terracotta/20 rounded-lg transition-colors"
                    aria-label="Remove person"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Add Person Button */}
          <button
            onClick={addPerson}
            className="mt-3 w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-terracotta bg-terracotta/5 hover:bg-terracotta/10 rounded-xl border-2 border-dashed border-terracotta/20 hover:border-terracotta/30 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Person
          </button>
        </div>

        {/* Summary Section */}
        <div className="px-5 py-4 bg-cream-dark/30 border-t border-dashed border-espresso/10">
          {/* Covered Amount */}
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-espresso-light/60">Covered</span>
            <span className="font-semibold text-sage">
              ${coveredAmount.toFixed(2)}
            </span>
          </div>

          {/* Remaining Amount */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-espresso-light/60">Remaining</span>
            <span
              className={`text-xl font-display font-bold transition-colors ${
                isBalanced
                  ? "text-sage"
                  : isOver
                    ? "text-terracotta pulse-attention"
                    : "text-amber pulse-attention"
              }`}
            >
              {isOver ? "+" : ""}${Math.abs(remaining).toFixed(2)}
            </span>
          </div>

          {/* Status Message */}
          <div className="mt-3 text-center">
            {isBalanced ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sage bg-sage/10 rounded-full">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Perfectly split!
              </span>
            ) : isOver ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-terracotta bg-terracotta/10 rounded-full">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3l9.5 16.5H2.5L12 3z" />
                </svg>
                Over by ${Math.abs(remaining).toFixed(2)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber bg-amber/10 rounded-full">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                </svg>
                ${remaining.toFixed(2)} left to cover
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        disabled={!isBalanced || people.length === 0}
        className="mt-6 w-full py-4 text-base font-semibold text-white bg-gradient-to-r from-terracotta to-terracotta-light rounded-2xl shadow-lg shadow-terracotta/25 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:shadow-xl hover:shadow-terracotta/30 active:scale-[0.98] transition-all"
      >
        Save Split
      </button>
    </div>
  );
}
