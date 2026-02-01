import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">About</h1>
      <p className="mt-2 text-gray-600">About splitit.</p>
    </div>
  );
}
