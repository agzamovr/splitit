import type { Env } from "../../lib/types";

export const onRequestGet: PagesFunction<Env> = (context) => {
  return new Response(
    JSON.stringify({ botId: context.env.BOT_ID, botUsername: context.env.BOT_USERNAME }),
    { headers: { "Content-Type": "application/json" } },
  );
};
