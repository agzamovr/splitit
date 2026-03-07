import type { Bill, Env } from "./types";

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
