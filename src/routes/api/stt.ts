import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return Response.json({ fallback: true, message: "O reconhecimento de voz é feito pelo aparelho." });
        } catch (e) {
          console.error("stt route error", e);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
