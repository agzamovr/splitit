import type { Expense, Person } from "./types";

export interface Bill {
  id: string;
  creatorTelegramId: number;
  chatId?: number;
  chatTitle?: string;
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

const SESSION_KEY = "tg_session";

export function saveSessionToken(token: string): void {
  localStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isWebAuthenticated(): boolean {
  return !!localStorage.getItem(SESSION_KEY);
}

function authHeader(): string {
  const miniAppData = window.Telegram?.WebApp?.initData;
  if (miniAppData) return `TelegramInitData ${miniAppData}`;
  const session = localStorage.getItem(SESSION_KEY);
  if (session) return `TelegramSession ${session}`;
  return "";
}

export function getConfig(): Promise<{ botId: string; botUsername: string }> {
  return fetch("/api/config").then((r) => r.json() as Promise<{ botId: string; botUsername: string }>);
}

export function exchangeWidgetAuth(authData: Record<string, unknown>): Promise<{ sessionToken: string }> {
  return fetch("/api/auth/widget", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authData),
  }).then((r) => {
    if (!r.ok) throw new Error("Exchange failed");
    return r.json() as Promise<{ sessionToken: string }>;
  });
}

export function exchangeCode(code: string, code_verifier: string, redirect_uri: string): Promise<{ sessionToken: string }> {
  return fetch("/api/auth/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier, redirect_uri }),
  }).then((r) => {
    if (!r.ok) throw new Error("Exchange failed");
    return r.json() as Promise<{ sessionToken: string }>;
  });
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

export function deleteBill(id: string): Promise<void> {
  return apiFetch(`/api/bills/${id}`, { method: "DELETE" });
}

export function deleteAllBills(): Promise<void> {
  return apiFetch("/api/bills", { method: "DELETE" });
}

export interface ChatMember {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export function getChatMembers(): Promise<{ members: ChatMember[] }> {
  return apiFetch("/api/members");
}

export interface KnownPerson {
  name: string;
  telegramId?: number;
  photoUrl?: string;
}

export function getKnownPeople(): Promise<{ people: KnownPerson[] }> {
  return apiFetch("/api/people");
}

export function saveKnownPerson(person: KnownPerson): Promise<void> {
  return apiFetch("/api/people", { method: "POST", body: JSON.stringify(person) });
}

export function deleteKnownPerson(person: KnownPerson): Promise<void> {
  return apiFetch("/api/people", { method: "DELETE", body: JSON.stringify(person) });
}
