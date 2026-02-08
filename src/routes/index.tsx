import { createFileRoute } from "@tanstack/react-router";
import { ExpenseForm } from "@/components/ExpenseForm";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <ExpenseForm />;
}
