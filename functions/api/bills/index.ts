import type { Bill, Env } from "../../lib/types";
import { requireUser } from "../../lib/auth";
import { billKey, putBill } from "../../lib/kv";

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

  await putBill(context.env.SPLIT_BILLS, bill);

  return new Response(JSON.stringify({ billId }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};
