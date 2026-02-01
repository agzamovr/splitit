import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">splitit</h1>
      <p className="mt-2 text-gray-600">Welcome to splitit.</p>
    </div>
  );
}
