import { useEffect, useRef, useState } from "react";
import { useBillStore, type ParsedReceipt } from "../store";

interface Props {
  onClose: () => void;
}

function authHeader(): string {
  const miniAppData = window.Telegram?.WebApp?.initData;
  if (miniAppData) return `TelegramInitData ${miniAppData}`;
  const session = localStorage.getItem("tg_session");
  if (session) return `TelegramSession ${session}`;
  return "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function resizeImage(file: File | Blob, maxWidth = 1500): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob ?? file),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export function ReceiptScanner({ onClose }: Props) {
  const applyParsedReceipt = useBillStore((s) => s.applyParsedReceipt);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const captureRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function processImage(file: File | Blob) {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setStatus("loading");
    setErrorMsg(null);

    try {
      const resized = await resizeImage(file);
      const base64 = await blobToBase64(resized);

      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { Authorization: authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: "image/jpeg" }),
      });

      const data = await res.json() as ParsedReceipt & { error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      applyParsedReceipt(data);
      setStatus("success");
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processImage(file);
    e.target.value = "";
  }

  async function handleClipboardPaste() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          void processImage(blob);
          return;
        }
      }
      setErrorMsg("No image found in clipboard");
      setStatus("error");
    } catch {
      setErrorMsg("Clipboard access denied");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-espresso/30 transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
      />

      {/* Hidden file inputs */}
      <input
        ref={captureRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Panel */}
      <div
        className={`relative max-w-sm w-full mx-auto bg-cream rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${mounted ? "translate-y-0" : "translate-y-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-espresso/20 rounded-full" />
        </div>

        <div className="px-4 pb-8">
          {status === "idle" && (
            <>
              <h2 className="text-base font-semibold text-espresso mb-4">Scan Receipt</h2>
              <div className="flex flex-col gap-2">
                <button
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-cream-dark/60 text-espresso text-sm font-medium hover:bg-cream-dark transition-colors"
                  onClick={() => captureRef.current?.click()}
                >
                  <svg className="w-5 h-5 text-espresso/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                  Take Photo
                </button>
                <button
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-cream-dark/60 text-espresso text-sm font-medium hover:bg-cream-dark transition-colors"
                  onClick={() => galleryRef.current?.click()}
                >
                  <svg className="w-5 h-5 text-espresso/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  Choose File / Gallery
                </button>
                <button
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-cream-dark/60 text-espresso text-sm font-medium hover:bg-cream-dark transition-colors"
                  onClick={() => void handleClipboardPaste()}
                >
                  <svg className="w-5 h-5 text-espresso/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Paste from Clipboard
                </button>
              </div>
            </>
          )}

          {(status === "loading" || status === "success") && (
            <div className="flex flex-col items-center gap-4 py-4">
              {preview && (
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="w-full max-h-48 object-contain rounded-lg"
                />
              )}
              {status === "loading" && (
                <div className="flex items-center gap-2 text-espresso/60 text-sm">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Parsing receipt…
                </div>
              )}
              {status === "success" && (
                <p className="text-sage text-sm font-medium">Receipt parsed</p>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-4">
              {preview && (
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="w-full max-h-48 object-contain rounded-lg opacity-50"
                />
              )}
              <p className="text-destructive text-sm text-center">{errorMsg}</p>
              <button
                className="px-4 py-2 rounded-lg bg-cream-dark/60 text-espresso text-sm font-medium hover:bg-cream-dark transition-colors"
                onClick={() => {
                  setStatus("idle");
                  setPreview(null);
                  setErrorMsg(null);
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
