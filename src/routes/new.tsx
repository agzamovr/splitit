import { createFileRoute } from "@tanstack/react-router";
import { ExpenseForm } from "@/components/ExpenseForm";

export const Route = createFileRoute("/new")({ component: ExpenseForm });
