import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { exchangeInitData, saveSessionToken, isWebAuthenticated } from "@/api";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  useEffect(() => {
    const pending = sessionStorage.getItem("tg_login_pending");
    const initData = window.Telegram?.WebApp?.initData;
    if (pending && initData && !isWebAuthenticated()) {
      sessionStorage.removeItem("tg_login_pending");
      exchangeInitData(initData)
        .then(({ sessionToken }) => {
          saveSessionToken(sessionToken);
          window.location.href = "/bills";
        })
        .catch(() => {
          // initData exchange failed — user stays on homepage
        });
    }
  }, []);

  return <ExpenseForm />;
}
