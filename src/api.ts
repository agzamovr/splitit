import type { Expense, Person } from "./types";

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

export interface BillPayload {
  receiptTitle: string;
  expenses: Expense[];
  manualTotal: string;
  people: Person[];
  assignments: Record<string, string[]>;
  splitMode: "equally" | "amounts";
  currency: string;
}

function authHeader(): string {
  return `TelegramInitData ${window.Telegram?.WebApp?.initData ?? ""}`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function createBill(data: BillPayload): Promise<{ billId: string }> {
  return apiFetch("/api/bills", { method: "POST", body: JSON.stringify(data) });
}

export function getBill(id: string): Promise<Bill> {
  return apiFetch(`/api/bills/${id}`);
}

export function patchBill(id: string, partial: Partial<BillPayload>): Promise<Bill> {
  return apiFetch(`/api/bills/${id}`, { method: "PATCH", body: JSON.stringify(partial) });
}

export function shareBill(id: string, chatId?: number): Promise<void> {
  return apiFetch(`/api/bills/${id}/share`, { method: "POST", body: JSON.stringify({ chatId }) });
}

export function listBills(): Promise<Bill[]> {
  return apiFetch("/api/bills");
}
