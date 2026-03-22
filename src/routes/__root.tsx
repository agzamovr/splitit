import React, { Suspense, useEffect } from "react";
import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : React.lazy(() =>
      import("@tanstack/router-devtools").then((m) => ({
        default: m.TanStackRouterDevtools,
      }))
    );

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.expand();
    tg.setHeaderColor("bg_color");
    tg.setBackgroundColor("bg_color");
    if (tg.isVersionAtLeast("7.10")) {
      tg.setBottomBarColor("bg_color");
    }
    tg.ready();

    const applyScheme = () => {
      document.documentElement.style.colorScheme = tg.colorScheme;
    };
    applyScheme();
    tg.onEvent("themeChanged", applyScheme);

    const startParam = tg.initDataUnsafe?.start_param;
    if (!startParam) return;

    if (startParam.startsWith("newbill_")) {
      sessionStorage.setItem("group_chat_id", startParam.slice("newbill_".length));
      void navigate({ to: "/new" });
    } else if (startParam.startsWith("mybills_")) {
      sessionStorage.setItem("group_chat_id", startParam.slice("mybills_".length));
    } else {
      const sep = startParam.lastIndexOf("_");
      if (sep > 0) {
        const billId = startParam.slice(0, sep);
        const chatId = startParam.slice(sep + 1);
        sessionStorage.setItem("group_chat_id", chatId);
        void navigate({ to: "/new", search: { billId } });
      }
    }
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="bg-cream"
      style={{
        minHeight: "var(--tg-viewport-stable-height, 100svh)",
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
    >
      <Outlet />
      <Suspense fallback={null}>
        <TanStackRouterDevtools />
      </Suspense>
    </div>
  );
}
