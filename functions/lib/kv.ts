import type { Bill, Env } from "./types";

export interface KnownPerson {
  name: string;
  telegramId?: number;
  photoUrl?: string;
}

const MAX_KNOWN = 50;

export function peopleKey(userId: number, chatId?: number): string {
  return chatId != null ? `chat:${chatId}:people` : `user:${userId}:people`;
}

export async function getKnownPeople(kv: Env["SPLIT_BILLS"], key: string): Promise<KnownPerson[]> {
  const raw = await kv.get(key);
  return raw ? (JSON.parse(raw) as KnownPerson[]) : [];
}

export async function upsertKnownPerson(kv: Env["SPLIT_BILLS"], key: string, person: KnownPerson): Promise<void> {
  const existing = await getKnownPeople(kv, key);
  const filtered = existing.filter(p =>
    person.telegramId != null
      ? p.telegramId !== person.telegramId
      : !(p.telegramId == null && p.name.toLowerCase() === person.name.toLowerCase())
  );
  await kv.put(key, JSON.stringify([person, ...filtered].slice(0, MAX_KNOWN)));
}

export async function deleteKnownPerson(kv: Env["SPLIT_BILLS"], key: string, person: KnownPerson): Promise<void> {
  const existing = await getKnownPeople(kv, key);
  const filtered = existing.filter(p =>
    person.telegramId != null
      ? p.telegramId !== person.telegramId
      : !(p.telegramId == null && p.name.toLowerCase() === person.name.toLowerCase())
  );
  await kv.put(key, JSON.stringify(filtered));
}

export const BILL_TTL = 60 * 60 * 24 * 7;

export const billKey = (id: string) => `bill:${id}`;
const userBillsKey = (telegramId: number) => `user:${telegramId}:bills`;

export function putBill(kv: Env["SPLIT_BILLS"], bill: Bill): Promise<void> {
  return kv.put(billKey(bill.id), JSON.stringify(bill), { expirationTtl: BILL_TTL });
}

export async function addBillToUserIndex(kv: Env["SPLIT_BILLS"], telegramId: number, billId: string): Promise<void> {
  const raw = await kv.get(userBillsKey(telegramId));
  const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
  ids.unshift(billId);
  await kv.put(userBillsKey(telegramId), JSON.stringify(ids.slice(0, 100)));
}

export async function getUserBillIds(kv: Env["SPLIT_BILLS"], telegramId: number): Promise<string[]> {
  const raw = await kv.get(userBillsKey(telegramId));
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function removeBillFromUserIndex(kv: Env["SPLIT_BILLS"], telegramId: number, billId: string): Promise<void> {
  const raw = await kv.get(userBillsKey(telegramId));
  if (!raw) return;
  const ids = (JSON.parse(raw) as string[]).filter((id) => id !== billId);
  await kv.put(userBillsKey(telegramId), JSON.stringify(ids));
}

export function clearUserBillIndex(kv: Env["SPLIT_BILLS"], telegramId: number): Promise<void> {
  return kv.delete(userBillsKey(telegramId));
}
