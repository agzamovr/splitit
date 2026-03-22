import type { Env } from "./lib/types";
import { sendTelegramMessage } from "./lib/telegram";

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; first_name: string; username?: string };
    text?: string;
  };
}

function appButton(chatType: string, env: Env, webAppPath: string, label: string, startParam?: string) {
  if (chatType === "private") {
    return { text: label, web_app: { url: `${env.APP_URL}${webAppPath}` } };
  }
  const tmeUrl = `https://t.me/${env.BOT_USERNAME}/${env.BOT_APP_NAME}`;
  return { text: label, url: startParam ? `${tmeUrl}?startapp=${startParam}` : tmeUrl };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const update = await context.request.json<TelegramUpdate>();
  const message = update.message;
  if (!message?.text) return new Response("ok");

  const chatId = message.chat.id;
  const chatType = message.chat.type;
  const text = message.text.trim().replace(/@\S+/, "");
  const { BOT_TOKEN } = context.env;

  if (text.startsWith("/start")) {
    const billId = text.split(" ")[1]?.trim();
    if (billId) {
      await sendTelegramMessage(BOT_TOKEN, {
        chat_id: chatId,
        text: "Tap below to open the bill:",
        reply_markup: {
          inline_keyboard: [[appButton(chatType, context.env, `/new?billId=${billId}`, "Open Bill", billId)]],
        },
      });
    } else {
      await sendTelegramMessage(BOT_TOKEN, {
        chat_id: chatId,
        text: "Add me to a group to split bills!",
      });
    }
  } else if (text === "/mybills") {
    await sendTelegramMessage(BOT_TOKEN, {
      chat_id: chatId,
      text: "Tap below to view your bills or create a new one:",
      reply_markup: {
        inline_keyboard: [
          [appButton(chatType, context.env, "/bills", "My Bills")],
          [appButton(chatType, context.env, "/new", "New Bill")],
        ],
      },
    });
  } else if (text === "/newbill") {
    await sendTelegramMessage(BOT_TOKEN, {
      chat_id: chatId,
      text: "Tap below to create a new bill:",
      reply_markup: {
        inline_keyboard: [[appButton(chatType, context.env, "/new", "New Bill")]],
      },
    });
  }

  return new Response("ok");
};
