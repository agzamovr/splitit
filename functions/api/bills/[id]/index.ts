import type { Bill, Env } from "../../../lib/types";
import { requireUser } from "../../../lib/auth";
import { billKey, putBill, removeBillFromUserIndex } from "../../../lib/kv";

const CREATOR_ONLY_FIELDS = new Set([
  "expenses",
  "manualTotal",
  "assignments",
  "splitMode",
  "currency",
  "receiptTitle",
]);

const IMMUTABLE_FIELDS = new Set(["id", "creatorTelegramId", "createdAt", "version"]);

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const raw = await context.env.SPLIT_BILLS.get(billKey(id));
  if (!raw) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(raw, { headers: { "Content-Type": "application/json" } });
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  const [auth, raw] = await Promise.all([
    requireUser(context),
    context.env.SPLIT_BILLS.get(billKey(id)),
  ]);

  if (!auth.ok) return auth.response;
  if (!raw) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const bill: Bill = JSON.parse(raw) as Bill;
  const patch = await context.request.json<Partial<Bill>>();
  const isCreator = bill.creatorTelegramId === auth.user.id;

  for (const key of Object.keys(patch) as (keyof Bill)[]) {
    if (IMMUTABLE_FIELDS.has(key)) continue;
    if (CREATOR_ONLY_FIELDS.has(key) && !isCreator) continue;
    (bill as unknown as Record<string, unknown>)[key] = patch[key];
  }

  bill.version += 1;

  await putBill(context.env.SPLIT_BILLS, bill);

  return new Response(JSON.stringify(bill), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  const [auth, raw] = await Promise.all([
    requireUser(context),
    context.env.SPLIT_BILLS.get(billKey(id)),
  ]);

  if (!auth.ok) return auth.response;
  if (!raw) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const bill: Bill = JSON.parse(raw) as Bill;
  if (bill.creatorTelegramId !== auth.user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  await Promise.all([
    context.env.SPLIT_BILLS.delete(billKey(id)),
    removeBillFromUserIndex(context.env.SPLIT_BILLS, auth.user.id, id),
  ]);

  return new Response("{}", { headers: { "Content-Type": "application/json" } });
};
