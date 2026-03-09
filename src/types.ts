export type PricingMode = "total" | "each";
export type ViewMode = "consumption" | "settle";

export interface Expense {
  id: string;
  description: string;
  price: string;
  pricingMode: PricingMode;
}

export interface Person {
  id: string;
  name: string;
  amount: string;
  paid: string;
  telegramId?: number;
  photoUrl?: string;
}

export type AssignmentMode =
  | null
  | { type: "item"; itemId: string }
  | { type: "person"; personId: string };

let nextId = 0;
export const genId = () => `id-${++nextId}`;
