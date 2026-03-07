import type { Bill, Env } from "./lib/types";
import { sendTelegramMessage } from "./lib/telegram";
import { billKey, getUserBillIds } from "./lib/kv";

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; first_name: string; username?: string };
    text?: string;
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const update = await context.request.json<TelegramUpdate>();
  const message = update.message;
  if (!message?.text) return new Response("ok");

  const chatId = message.chat.id;
  const text = message.text.trim();

  if (text.startsWith("/start")) {
    const billId = text.split(" ")[1]?.trim();
    if (billId) {
      await sendTelegramMessage(context.env.BOT_TOKEN, {
        chat_id: chatId,
        text: "Tap below to open the bill:",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Open Bill", web_app: { url: `${context.env.APP_URL}/?billId=${billId}` } }],
          ],
        },
      });
    } else {
      await sendTelegramMessage(context.env.BOT_TOKEN, {
        chat_id: chatId,
        text: "Add me to a group to split bills!",
      });
    }
  } else if (text === "/mybills") {
    const userId = message.from?.id;
    if (!userId) return new Response("ok");

    const ids = await getUserBillIds(context.env.SPLIT_BILLS, userId);
    const recent = ids.slice(0, 10);

    if (recent.length === 0) {
      await sendTelegramMessage(context.env.BOT_TOKEN, {
        chat_id: chatId,
        text: "You have no saved bills yet.",
        reply_markup: {
          inline_keyboard: [[{ text: "New Bill", web_app: { url: context.env.APP_URL } }]],
        },
      });
    } else {
      const raws = await Promise.all(recent.map((id) => context.env.SPLIT_BILLS.get(billKey(id))));
      const bills = raws.filter((r): r is string => r !== null).map((r) => JSON.parse(r) as Bill);
      await sendTelegramMessage(context.env.BOT_TOKEN, {
        chat_id: chatId,
        text: bills.length === 1 ? "Your most recent bill:" : `Your ${bills.length} most recent bills:`,
        reply_markup: {
          inline_keyboard: [
            ...bills.map((bill) => [
              { text: bill.receiptTitle || "Untitled", web_app: { url: `${context.env.APP_URL}/?billId=${bill.id}` } },
            ]),
            [{ text: "View All Bills", web_app: { url: `${context.env.APP_URL}/bills` } }],
          ],
        },
      });
    }
  } else if (text === "/newbill") {
    await sendTelegramMessage(context.env.BOT_TOKEN, {
      chat_id: chatId,
      text: "Tap below to create a new bill:",
      reply_markup: {
        inline_keyboard: [[{ text: "New Bill", web_app: { url: context.env.APP_URL } }]],
      },
    });
  }

  return new Response("ok");
};
