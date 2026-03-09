import type { Bill, Env } from "../../../lib/types";
import { requireUser } from "../../../lib/auth";
import { billKey, putBill } from "../../../lib/kv";
import { sendTelegramMessage } from "../../../lib/telegram";
import { extractChat } from "../../../lib/verify";

export const onRequestPost: PagesFunction<Env> = async (context) => {
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
  const body = await context.request.json<{ chatId?: number }>();
  const chatId = body.chatId ?? extractChat(auth.initData)?.id;

  if (!chatId) {
    return new Response(JSON.stringify({ error: "No chat ID provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const appUrl = `${context.env.APP_URL}/new?billId=${id}`;
  const tgRes = await sendTelegramMessage(context.env.BOT_TOKEN, {
    chat_id: chatId,
    text: `${auth.user.first_name} is splitting a bill: *${bill.receiptTitle}*`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "Open Bill", web_app: { url: appUrl } }]],
    },
  });

  if (!tgRes.ok) {
    const detail = await tgRes.text();
    return new Response(JSON.stringify({ error: "Telegram API error", detail }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  bill.chatId = chatId;
  await putBill(context.env.SPLIT_BILLS, bill);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
