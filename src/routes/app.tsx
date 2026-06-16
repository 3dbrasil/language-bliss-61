import { createFileRoute } from "@tanstack/react-router";
import App from "@/app/App";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Speak Native — Praticar" },
      { name: "description", content: "Pratique inglês com diálogos reais e IA de pronúncia." },
    ],
  }),
  component: App,
});
