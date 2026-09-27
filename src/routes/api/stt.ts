import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const key = process.env.OPENAI_API_KEY;
          if (!key) return Response.json({ message: "Chave de transcrição não configurada." }, { status: 503 });

          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File) || file.size === 0) {
            return Response.json({ error: "NO_AUDIO", message: "Nenhum áudio foi recebido." }, { status: 400 });
          }
          if (file.size > 20 * 1024 * 1024) {
            return Response.json({ error: "AUDIO_TOO_LARGE", message: "Áudio muito grande para transcrever." }, { status: 413 });
          }

          const type = file.type.split(";")[0] || "audio/webm";
          const ext =
            type === "audio/mp4" ? "mp4" :
            type === "audio/mpeg" ? "mp3" :
            type === "audio/wav" ? "wav" :
            "webm";

          const upstream = new FormData();
          upstream.append("file", file, `recording.${ext}`);
          upstream.append("model", "gpt-4o-mini-transcribe");
          upstream.append("language", "en");

          const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
            },
            body: upstream,
          });

          if (!res.ok) {
            const msg = await res.text().catch(() => "");
            console.error("[stt] upstream", res.status, msg);
            return Response.json(
              {
                error: "TRANSCRIPTION_FAILED",
                message: res.status === 429 ? "Limite de transcrição atingido. Tente novamente mais tarde." : "Não foi possível transcrever o áudio online.",
              },
              { status: res.status },
            );
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
