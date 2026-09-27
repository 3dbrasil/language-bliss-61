import { createFileRoute } from "@tanstack/react-router";
import App from "@/app/App";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Dialogoo — Praticar" },
      { name: "description", content: "Pratique inglês com diálogos reais e IA de pronúncia." },
      { property: "og:title", content: "Dialogoo — Praticar" },
      { property: "og:description", content: "Pratique inglês com diálogos reais e IA de pronúncia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});
