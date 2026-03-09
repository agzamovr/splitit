import type { Env } from "./lib/types";
import { sendTelegramMessage } from "./lib/telegram";

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
            [{ text: "Open Bill", web_app: { url: `${context.env.APP_URL}/new?billId=${billId}` } }],
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
    await sendTelegramMessage(context.env.BOT_TOKEN, {
      chat_id: chatId,
      text: "Tap below to view your bills or create a new one:",
      reply_markup: {
        inline_keyboard: [
          [{ text: "My Bills", web_app: { url: `${context.env.APP_URL}/bills` } }],
          [{ text: "New Bill", web_app: { url: `${context.env.APP_URL}/new` } }],
        ],
      },
    });
  } else if (text === "/newbill") {
    await sendTelegramMessage(context.env.BOT_TOKEN, {
      chat_id: chatId,
      text: "Tap below to create a new bill:",
      reply_markup: {
        inline_keyboard: [[{ text: "New Bill", web_app: { url: `${context.env.APP_URL}/new` } }]],
      },
    });
  }

  return new Response("ok");
};
