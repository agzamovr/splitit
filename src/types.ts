export type PricingMode = "total" | "each";
export type ViewMode = "consumption" | "settle";

export interface Expense {
  id: string;
  description: string;
  price: string;
}

export interface Person {
  id: string;
  name: string;
  amount: string;
  paid: string;
}

export type AssignmentMode =
  | null
  | { type: "item"; itemId: string }
  | { type: "person"; personId: string };

export const SAMPLE_PEOPLE: Person[] = [
  { id: "1", name: "Rus", amount: "", paid: "" },
  { id: "2", name: "Don", amount: "", paid: "" },
  { id: "3", name: "Art", amount: "", paid: "" },
  { id: "4", name: "Faz", amount: "", paid: "" },
];

let nextId = 0;
export const genId = () => `id-${++nextId}`;
