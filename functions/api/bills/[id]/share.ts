import type { Bill, Env } from "../../../lib/types";
import { requireUser } from "../../../lib/auth";
import { billKey, putBill, getChatTitle } from "../../../lib/kv";
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
  const body = await context.request.json<{ chatId?: number; chatTitle?: string }>();
  const chat = extractChat(auth.initData);
  const chatId = body.chatId ?? chat?.id ?? bill.chatId;
  const chatTitle =
    body.chatTitle ??
    chat?.title ??
    (chatId ? (await getChatTitle(context.env.SPLIT_BILLS, chatId)) ?? undefined : undefined);

  if (!chatId) {
    return new Response(JSON.stringify({ error: "No chat ID provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const appPath = `/new?billId=${id}`;
  const button =
    chatId < 0
      ? { text: "Open Bill", url: `https://t.me/${context.env.BOT_USERNAME}/${context.env.BOT_APP_NAME}?startapp=${id}_${chatId}` }
      : { text: "Open Bill", web_app: { url: `${context.env.APP_URL}${appPath}` } };

  const tgRes = await sendTelegramMessage(context.env.BOT_TOKEN, {
    chat_id: chatId,
    text: `${auth.user.first_name} is splitting a bill: *${bill.receiptTitle}*`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[button]],
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
  bill.chatTitle = chatTitle;
  await putBill(context.env.SPLIT_BILLS, bill);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
