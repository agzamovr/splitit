import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-cream">
      <Outlet />
      <TanStackRouterDevtools />
    </div>
  );
}
