import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { exchangeWidgetAuth, saveSessionToken } from "@/api";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#tgAuthResult=")) return;

    // Clean up hash from URL immediately
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    // Only process if we initiated the login flow
    if (!sessionStorage.getItem("tg_login_pending")) return;
    sessionStorage.removeItem("tg_login_pending");

    let authData: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(atob(hash.slice("#tgAuthResult=".length)));
      if (!parsed || typeof parsed !== "object" || !("id" in parsed)) {
        window.location.href = "/login";
        return;
      }
      authData = parsed as Record<string, unknown>;
    } catch {
      window.location.href = "/login";
      return;
    }

    exchangeWidgetAuth(authData)
      .then(({ sessionToken }) => {
        saveSessionToken(sessionToken);
        window.location.href = "/bills";
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  return <ExpenseForm />;
}
