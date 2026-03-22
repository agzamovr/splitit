const encoder = new TextEncoder();

async function hmac(keyBytes: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", key, encoder.encode(data));
}

export async function verifyInitData(initData: string, botToken: string): Promise<boolean> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKeyBytes = await hmac(encoder.encode("WebAppData"), botToken);
  const signatureBytes = await hmac(secretKeyBytes, dataCheckString);

  const signature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === hash;
}

export function extractUser(
  initData: string,
): { id: number; first_name: string; last_name?: string; username?: string } | null {
  try {
    const userStr = new URLSearchParams(initData).get("user");
    return userStr ? (JSON.parse(userStr) as { id: number; first_name: string; last_name?: string; username?: string }) : null;
  } catch {
    return null;
  }
}

export function extractChat(initData: string): { id: number; type: string; title?: string } | null {
  try {
    const chatStr = new URLSearchParams(initData).get("chat");
    return chatStr ? (JSON.parse(chatStr) as { id: number; type: string; title?: string }) : null;
  } catch {
    return null;
  }
}
