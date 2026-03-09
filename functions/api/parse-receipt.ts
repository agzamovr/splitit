import type { Env } from "../lib/types";
import { requireUser } from "../lib/auth";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const PROMPT = `Parse this receipt image. Extract:
- receiptTitle: merchant name and optional date (e.g. "Starbucks · Mar 9")
- currency: ISO 4217 code (e.g. "USD", "EUR")
- expenses: all visible line items including tax and fees, each with description and price as a positive decimal string (no currency symbols, e.g. "12.50")
- manualTotal: the grand total as a decimal string

If individual line items are visible, include them as expenses. If only a grand total is legible (no items), leave expenses empty and set manualTotal. Leave fields empty/omitted if not determinable.`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireUser(context);
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return json({ error: "Invalid multipart form data" }, 400);
  }

  const file = formData.get("image");
  if (!(file instanceof Blob)) {
    return json({ error: "Missing image field" }, 400);
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return json({ error: "Image too large (max 10 MB)" }, 413);
  }

  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const mimeType = file.type || "image/jpeg";

  const geminiBody = {
    contents: [
      {
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          receiptTitle: { type: "STRING" },
          currency: { type: "STRING" },
          manualTotal: { type: "STRING" },
          expenses: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                description: { type: "STRING" },
                price: { type: "STRING" },
              },
              required: ["description", "price"],
            },
          },
        },
      },
    },
  };

  let geminiRes: Response;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${context.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      }
    );
  } catch (err) {
    return json({ error: "Failed to reach Gemini API" }, 502);
  }

  if (!geminiRes.ok) {
    const text = await geminiRes.text().catch(() => "");
    return json({ error: `Gemini error: ${geminiRes.status}`, detail: text }, 502);
  }

  const geminiData = await geminiRes.json<{
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  }>();

  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return json({ error: "Empty response from Gemini" }, 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return json({ error: "Failed to parse Gemini response as JSON" }, 502);
  }

  return json(parsed);
};
