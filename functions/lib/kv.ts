import type { Bill, Env } from "./types";

export const BILL_TTL = 60 * 60 * 24 * 7;

export const billKey = (id: string) => `bill:${id}`;

export function putBill(kv: Env["SPLIT_BILLS"], bill: Bill): Promise<void> {
  return kv.put(billKey(bill.id), JSON.stringify(bill), { expirationTtl: BILL_TTL });
}
