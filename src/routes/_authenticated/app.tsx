import { createFileRoute } from "@tanstack/react-router";
import App from "@/app/App";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Dialogoo — Praticar" },
      { name: "description", content: "Pratique inglês com diálogos reais e IA de pronúncia." },
    ],
  }),
  component: App,
});
