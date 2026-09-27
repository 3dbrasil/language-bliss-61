import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { text, voice } = (await request.json()) as { text?: string; voice?: string };
          const input = (text || "").trim().slice(0, 4000);
          if (!input) return new Response("Bad request", { status: 400 });

          return Response.json({ fallback: true, message: "A voz é gerada pelo aparelho." });
        } catch (e) {
          console.error("tts route error", e);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
