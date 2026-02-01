import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link to="/" className="text-lg font-bold">
            splitit
          </Link>
          <Link
            to="/"
            className="text-sm text-gray-600 hover:text-gray-900 [&.active]:font-semibold [&.active]:text-gray-900"
          >
            Home
          </Link>
          <Link
            to="/about"
            className="text-sm text-gray-600 hover:text-gray-900 [&.active]:font-semibold [&.active]:text-gray-900"
          >
            About
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </div>
  );
}
