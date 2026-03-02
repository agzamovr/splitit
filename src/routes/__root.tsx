import React, { Suspense, useEffect } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";

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
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
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
    }
  }, []);

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
