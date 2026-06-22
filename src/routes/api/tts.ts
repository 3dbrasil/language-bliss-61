import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { text, voice } = (await request.json()) as { text?: string; voice?: string };
          const input = (text || "").trim().slice(0, 4000);
          if (!input) return new Response("Bad request", { status: 400 });

          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("LOVABLE_API_KEY missing", { status: 500 });

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
            method: "POST",
            headers: {
              "Lovable-API-Key": key,
              "X-Lovable-AIG-SDK": "vercel-ai-sdk",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini-tts",
              input,
              voice: voice || "shimmer",
              response_format: "mp3",
            }),
          });

          if (!upstream.ok) {
            const msg = await upstream.text().catch(() => "");
            console.error("[tts] upstream", upstream.status, msg);
            return Response.json(
              {
                error: upstream.status === 402 ? "AI_CREDITS_EXHAUSTED" : "TTS_FAILED",
                message: upstream.status === 402
                  ? "Créditos de IA esgotados para gerar áudio."
                  : "Não foi possível gerar o áudio online.",
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
