import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { text, voice } = (await request.json()) as { text?: string; voice?: string };
          const input = (text || "").trim().slice(0, 4000);
          if (!input) return new Response("Bad request", { status: 400 });

          const key = process.env.OPENAI_API_KEY;
          if (!key) return Response.json({ message: "Chave de voz não configurada." }, { status: 503 });

          const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini-tts",
              input,
              voice: voice || "shimmer",
              stream_format: "audio",
              response_format: "mp3",
            }),
          });

          if (!upstream.ok) {
            const msg = await upstream.text().catch(() => "");
            console.error("[tts] upstream", upstream.status, msg);
            return Response.json(
              {
                error: "TTS_FAILED",
                message: upstream.status === 429 ? "Limite de voz atingido. Tente novamente mais tarde." : "Não foi possível gerar o áudio online.",
              },
              { status: upstream.status },
            );
          }

          return new Response(upstream.body, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
            },
          });
        } catch (e) {
          console.error("tts route error", e);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
