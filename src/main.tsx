import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
if (startParam) {
  if (startParam.startsWith("newbill_")) {
    sessionStorage.setItem("group_chat_id", startParam.slice("newbill_".length));
    window.history.replaceState(null, "", "/new");
  } else if (startParam.startsWith("mybills_")) {
    sessionStorage.setItem("group_chat_id", startParam.slice("mybills_".length));
  } else {
    const sep = startParam.lastIndexOf("_");
    if (sep > 0) {
      sessionStorage.setItem("group_chat_id", startParam.slice(sep + 1));
      window.history.replaceState(null, "", `/new?billId=${startParam.slice(0, sep)}`);
    }
  }
}

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
