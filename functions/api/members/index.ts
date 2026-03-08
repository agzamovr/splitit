import { requireUser } from "../../lib/auth";
import { extractChat } from "../../lib/verify";
import type { Env } from "../../lib/types";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireUser(context);
  if (!auth.ok) return auth.response;

  const chat = extractChat(auth.initData);
  if (!chat) return new Response(JSON.stringify({ members: [] }), {
    headers: { "Content-Type": "application/json" },
  });

  const res = await fetch(
    `https://api.telegram.org/bot${context.env.BOT_TOKEN}/getChatAdministrators`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat.id }),
    }
  );

  if (!res.ok) return new Response(JSON.stringify({ members: [] }), {
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json<{ result: { user: { id: number; is_bot: boolean; first_name: string; last_name?: string; username?: string } }[] }>();
  const members = data.result
    .map(m => m.user)
    .filter(u => !u.is_bot)
    .map(u => ({ id: u.id, first_name: u.first_name, last_name: u.last_name, username: u.username }));

  return new Response(JSON.stringify({ members }), {
    headers: { "Content-Type": "application/json" },
  });
};
