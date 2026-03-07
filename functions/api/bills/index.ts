import type { Bill, Env } from "../../lib/types";
import { requireUser } from "../../lib/auth";
import { billKey, putBill, addBillToUserIndex, getUserBillIds, clearUserBillIndex } from "../../lib/kv";

function nanoid(size = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireUser(context);
  if (!auth.ok) return auth.response;

  const body = await context.request.json<Partial<Bill>>();
  const billId = nanoid(10);
  const bill: Bill = {
    id: billId,
    creatorTelegramId: auth.user.id,
    createdAt: Date.now(),
    receiptTitle: body.receiptTitle ?? "Bill",
    expenses: body.expenses ?? [],
    manualTotal: body.manualTotal ?? "",
    people: body.people ?? [],
    assignments: body.assignments ?? {},
    splitMode: body.splitMode ?? "equally",
    currency: body.currency ?? "USD",
    version: 1,
  };

  await Promise.all([
    putBill(context.env.SPLIT_BILLS, bill),
    addBillToUserIndex(context.env.SPLIT_BILLS, auth.user.id, billId),
  ]);

  return new Response(JSON.stringify({ billId }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireUser(context);
  if (!auth.ok) return auth.response;

  const ids = await getUserBillIds(context.env.SPLIT_BILLS, auth.user.id);
  const raws = await Promise.all(ids.map((id) => context.env.SPLIT_BILLS.get(billKey(id))));
  const bills = raws
    .filter((r): r is string => r !== null)
    .map((r) => JSON.parse(r) as Bill);

  return new Response(JSON.stringify(bills), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const auth = await requireUser(context);
  if (!auth.ok) return auth.response;

  const ids = await getUserBillIds(context.env.SPLIT_BILLS, auth.user.id);
  await Promise.all([
    ...ids.map((id) => context.env.SPLIT_BILLS.delete(billKey(id))),
    clearUserBillIndex(context.env.SPLIT_BILLS, auth.user.id),
  ]);

  return new Response("{}", { headers: { "Content-Type": "application/json" } });
};
