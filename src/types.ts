export interface Expense {
  id: string;
  description: string;
  price: string;
}

export interface Person {
  id: string;
  name: string;
  amount: string;
}

export type AssignmentMode =
  | null
  | { type: "item"; itemId: string }
  | { type: "person"; personId: string };

export const SAMPLE_PEOPLE: Person[] = [
  { id: "1", name: "Rus", amount: "" },
  { id: "2", name: "Don", amount: "" },
  { id: "3", name: "Art", amount: "" },
  { id: "4", name: "Faz", amount: "" },
];

let nextId = 0;
export const genId = () => `id-${++nextId}`;

export const formatPrice = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
