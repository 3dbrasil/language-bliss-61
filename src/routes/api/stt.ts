import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("LOVABLE_API_KEY missing", { status: 500 });

          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File) || file.size === 0) {
            return new Response("No audio", { status: 400 });
          }
          if (file.size > 20 * 1024 * 1024) {
            return new Response("Audio too large", { status: 413 });
          }

          const type = file.type.split(";")[0] || "audio/webm";
          const ext =
            type === "audio/mp4" ? "mp4" :
            type === "audio/mpeg" ? "mp3" :
            type === "audio/wav" ? "wav" :
            "webm";

          const upstream = new FormData();
          upstream.append("file", file, `recording.${ext}`);
          upstream.append("model", "openai/gpt-4o-mini-transcribe");
          upstream.append("language", "en");

          const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}` },
            body: upstream,
          });

          if (!res.ok) {
            const msg = await res.text().catch(() => "");
            console.error("[stt] upstream", res.status, msg);
            return new Response("Transcription failed", { status: res.status });
          }

          const data = (await res.json()) as { text?: string };
          return Response.json({ text: data.text ?? "" });
        } catch (e) {
          console.error("stt route error", e);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
