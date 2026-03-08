export interface Expense {
  id: string;
  description: string;
  price: string;
  pricingMode: "total" | "each";
}

export interface Person {
  id: string;
  name: string;
  amount: string;
  paid: string;
  telegramId?: number;
  photoUrl?: string;
}

export interface Bill {
  id: string;
  creatorTelegramId: number;
  chatId?: number;
  createdAt: number;
  receiptTitle: string;
  expenses: Expense[];
  manualTotal: string;
  people: Person[];
  assignments: Record<string, string[]>;
  splitMode: "equally" | "amounts";
  currency: string;
  version: number;
}

export interface Env {
  SPLIT_BILLS: KVNamespace;
  BOT_TOKEN: string;
  BOT_ID: string;
  BOT_USERNAME: string;
  APP_URL: string;
}
