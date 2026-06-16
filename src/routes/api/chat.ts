import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider, embedText } from "@/lib/ai-gateway.server";

type Body = {
  messages?: UIMessage[];
  threadId?: string;
  lessonContext?: { id?: string; title?: string; situation?: string; level?: string };
};

function buildSystemPrompt(opts: {
  cefr: string;
  register: string;
  known: { text: string; cefr: string | null }[];
  lessonContext?: Body["lessonContext"];
}) {
  const knownList = opts.known.length
    ? opts.known.map((p) => `- "${p.text}"${p.cefr ? ` (${p.cefr})` : ""}`).join("\n")
    : "(no prior phrases yet — start with greetings/basics)";
  const lesson = opts.lessonContext
    ? `LESSON CONTEXT: ${opts.lessonContext.title ?? ""} — ${opts.lessonContext.situation ?? ""} (level ${opts.lessonContext.level ?? "?"}). Anchor the conversation to this scenario.`
    : "";

  return `You are "Dialogue AI" (Aria), a specialist English tutor focused on natural conversation. Your memory is PERSISTENT — you remember every phrase, vocabulary item, mistake, and the student's current level.
Target level: ${opts.cefr}. Register: ${opts.register}.
${lesson}

KNOWN PHRASES (the student's persistent memory bank — phrases they already master):
${knownList}

RULES
1. Before replying, consult the KNOWN PHRASES above. Reuse them naturally; only introduce NEW phrases when appropriate.
2. If the student uses a new phrase you didn't know, acknowledge it — it will be saved to memory automatically for future use.
3. Adapt complexity: if the student is doing well, introduce 1–2 new phrases per reply. If they're struggling, repeat phrases they already know.
4. Professional but friendly tone. Correct mistakes gently via implicit recast (repeat the correct form naturally), without breaking the flow.
5. Always reply in English. Keep replies short (max 2 sentences) and end with ONE open question.
6. If the student writes [TEACH] <phrase>, weave that phrase into your next 5 replies.
7. When the student writes "end lesson" / "fim da lição", produce a summary: "New phrases learned today: [list]. Total in your bank: ${opts.known.length}."
8. You NEVER forget. Every conversation expands your repertoire.`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization");
          if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
          const token = auth.slice(7);

          const body = (await request.json()) as Body;
          if (!Array.isArray(body.messages)) return new Response("Bad request", { status: 400 });

          const lovableKey = process.env.LOVABLE_API_KEY;
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabasePublishable = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!lovableKey || !supabaseUrl || !supabasePublishable) {
            return new Response("Server misconfigured", { status: 500 });
          }

          // Per-user supabase client (RLS enforced)
          const supabase = createClient(supabaseUrl, supabasePublishable, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: userData, error: userErr } = await supabase.auth.getUser(token);
          if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
          const userId = userData.user.id;

          // Profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("cefr_target, register")
            .eq("id", userId)
            .maybeSingle();

          // Last user message → semantic retrieval of known phrases
          const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
          const lastText =
            lastUser?.parts?.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim() ?? "";

          let known: { text: string; cefr: string | null }[] = [];
          if (lastText) {
            try {
              const queryVec = await embedText(lastText, lovableKey);
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              const { data: matches } = await supabaseAdmin.rpc("match_phrases", {
                query_embedding: queryVec as unknown as string,
                match_user_id: userId,
                match_count: 8,
                min_similarity: 0.4,
              });
              if (matches) known = matches.map((m: any) => ({ text: m.text, cefr: m.cefr }));
            } catch (e) {
              console.warn("retrieval failed", e);
            }
          }
          // Fallback: latest phrases by recency
          if (known.length === 0) {
            const { data: recent } = await supabase
              .from("ai_phrases")
              .select("text, cefr")
              .order("last_seen_at", { ascending: false })
              .limit(12);
            known = recent ?? [];
          }

          const system = buildSystemPrompt({
            cefr: profile?.cefr_target ?? "A2",
            register: profile?.register ?? "neutral",
            known,
            lessonContext: body.lessonContext,
          });

          const gateway = createLovableAiGatewayProvider(lovableKey);
          const model = gateway("google/gemini-3-flash-preview");

          const result = streamText({
            model,
            system,
            messages: await convertToModelMessages(body.messages),
            onFinish: async ({ text }) => {
              // Persist assistant reply + last user msg (best effort)
              try {
                if (!body.threadId) return;
                const rows: {
                  thread_id: string;
                  user_id: string;
                  role: "user" | "assistant";
                  content: string;
                }[] = [];
                if (lastUser && lastText) {
                  rows.push({
                    thread_id: body.threadId,
                    user_id: userId,
                    role: "user",
                    content: lastText,
                  });
                }
                rows.push({
                  thread_id: body.threadId,
                  user_id: userId,
                  role: "assistant",
                  content: text,
                });
                await supabase.from("ai_messages").insert(rows);
                await supabase
                  .from("ai_threads")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", body.threadId);
              } catch (e) {
                console.warn("persist failed", e);
              }
            },
          });

          return result.toUIMessageStreamResponse({ originalMessages: body.messages });
        } catch (e) {
          console.error("chat route error", e);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
