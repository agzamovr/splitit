import { requireUser } from "../../lib/auth";
import { extractChat } from "../../lib/verify";
import type { Env } from "../../lib/types";
import { getKnownPeople, upsertKnownPerson, deleteKnownPerson, peopleKey, type KnownPerson } from "../../lib/kv";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireUser(context);
  if (!auth.ok) return auth.response;

  const chat = extractChat(auth.initData);
  const key = peopleKey(auth.user.id, chat?.id);
  const people = await getKnownPeople(context.env.SPLIT_BILLS, key);
  return new Response(JSON.stringify({ people }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireUser(context);
  if (!auth.ok) return auth.response;

  const chat = extractChat(auth.initData);
  const key = peopleKey(auth.user.id, chat?.id);
  const person = await context.request.json<KnownPerson>();
  await upsertKnownPerson(context.env.SPLIT_BILLS, key, person);
  return new Response("{}", { headers: { "Content-Type": "application/json" } });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const auth = await requireUser(context);
  if (!auth.ok) return auth.response;

  const chat = extractChat(auth.initData);
  const key = peopleKey(auth.user.id, chat?.id);
  const person = await context.request.json<KnownPerson>();
  await deleteKnownPerson(context.env.SPLIT_BILLS, key, person);
  return new Response("{}", { headers: { "Content-Type": "application/json" } });
};
