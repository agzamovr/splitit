import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getConfig, exchangeCode, saveSessionToken, isWebAuthenticated } from "@/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

async function generatePKCE() {
  const array = crypto.getRandomValues(new Uint8Array(32));
  const code_verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
  const code_challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return { code_verifier, code_challenge };
}

function LoginPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "exchanging" | "error">("idle");

  const { data: config } = useQuery({ queryKey: ["config"], queryFn: getConfig });

  useEffect(() => {
    if (isWebAuthenticated()) {
      void navigate({ to: "/bills" });
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const verifier = sessionStorage.getItem("pkce_verifier");
    if (!code || !verifier) return;

    setStatus("exchanging");
    sessionStorage.removeItem("pkce_verifier");
    window.history.replaceState({}, "", window.location.pathname);

    exchangeCode(code, verifier)
      .then(({ sessionToken }) => {
        saveSessionToken(sessionToken);
        void navigate({ to: "/bills" });
      })
      .catch(() => setStatus("error"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogin() {
    if (!config) return;
    const { code_verifier, code_challenge } = await generatePKCE();
    sessionStorage.setItem("pkce_verifier", code_verifier);

    const url = new URL("https://oauth.telegram.org/auth");
    url.searchParams.set("bot_id", config.botId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid profile");
    url.searchParams.set("redirect_uri", window.location.origin + "/login");
    url.searchParams.set("origin", window.location.origin);
    url.searchParams.set("state", crypto.randomUUID());
    url.searchParams.set("code_challenge", code_challenge);
    url.searchParams.set("code_challenge_method", "S256");
    window.location.href = url.toString();
  }

  if (status === "exchanging") {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sm text-espresso/40">Signing in…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold text-espresso mb-2">splitit</h1>
        <p className="text-sm text-espresso/60">Sign in with Telegram to access your bills</p>
      </div>
      {status === "error" && (
        <p className="text-sm text-red-500">Sign-in failed. Please try again.</p>
      )}
      <button
        onClick={() => void handleLogin()}
        disabled={!config}
        className="px-6 py-3 rounded-xl bg-terracotta text-white font-medium text-sm hover:bg-terracotta/90 active:bg-terracotta/80 transition-colors disabled:opacity-40"
      >
        Continue with Telegram
      </button>
    </div>
  );
}
