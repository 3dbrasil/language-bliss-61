import { createFileRoute } from "@tanstack/react-router";
import App from "@/app/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Speak Native — Inglês americano de uma vez por todas" },
      { name: "description", content: "Aprenda inglês americano com diálogos reais, prática de pronúncia e gamificação. Do A1 ao C2 no seu ritmo." },
      { property: "og:title", content: "Speak Native — Inglês americano" },
      { property: "og:description", content: "Diálogos reais, prática de pronúncia e progresso gamificado para dominar o inglês americano." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: App,
});
