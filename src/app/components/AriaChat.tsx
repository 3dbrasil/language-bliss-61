import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { X, Send, Sparkles, Loader2, LogIn } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "@tanstack/react-router";
import { Dialogue } from "../types";

interface Props {
  dialogue: Dialogue;
  onClose: () => void;
}

export default function AriaChat({ dialogue, onClose }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  // 2. Find or create thread for this lesson
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: existing } = await supabase
        .from("ai_threads").select("id")
        .eq("user_id", userId).eq("lesson_id", dialogue.id)
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();

      let id = existing?.id;
      if (!id) {
        const { data: created, error } = await supabase
          .from("ai_threads")
          .insert({ user_id: userId, lesson_id: dialogue.id, title: dialogue.title })
          .select("id").single();
        if (error) { console.error(error); return; }
        id = created.id;
      }
      setThreadId(id);

      // Load history
      const { data: rows } = await supabase
        .from("ai_messages").select("id, role, content")
        .eq("thread_id", id).order("created_at");
      const msgs: UIMessage[] = (rows ?? []).map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        parts: [{ type: "text", text: r.content }],
      }));
      setInitialMessages(msgs);
    })();
  }, [userId, dialogue.id, dialogue.title]);

  const ready = !!threadId;

  const { messages, sendMessage, status } = useChat({
    id: threadId ?? undefined,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: async (url, init) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const headers = new Headers(init?.headers);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        // Inject our metadata into the body
        const original = init?.body ? JSON.parse(init.body as string) : {};
        const body = JSON.stringify({
          ...original,
          threadId,
          lessonContext: { id: dialogue.id, title: dialogue.title, situation: dialogue.situation, level: dialogue.level },
        });
        return fetch(url, { ...init, headers, body });
      },
    }),
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);
  useEffect(() => { inputRef.current?.focus(); }, [ready, status]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full sm:max-w-lg h-[90vh] sm:h-[600px] bg-slate-950/95 sm:rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#2A7FFF]/10 to-[#00D4A0]/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2A7FFF] to-[#00D4A0] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Aria</p>
              <p className="text-[10px] text-slate-400">Praticando: {dialogue.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!authChecked && (
            <div className="text-center py-10"><Loader2 className="w-5 h-5 text-slate-500 animate-spin mx-auto" /></div>
          )}

          {authChecked && !userId && (
            <div className="text-center py-10 space-y-3">
              <Sparkles className="w-8 h-8 text-[#00D4A0] mx-auto" />
              <p className="text-sm text-slate-300">Entre para conversar com a Aria e salvar suas frases.</p>
              <Link to="/auth" className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] text-white font-bold px-4 py-2 rounded-lg text-xs">
                <LogIn className="w-3.5 h-3.5" /> Entrar / Cadastrar
              </Link>
            </div>
          )}

          {authChecked && userId && !ready && (
            <div className="text-center py-10"><Loader2 className="w-5 h-5 text-slate-500 animate-spin mx-auto" /></div>
          )}

          {ready && messages.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-400">
              Diga "olá" para a Aria 👋 — ela se baseia no diálogo desta lição.
            </div>
          )}

          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  isUser
                    ? "bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] text-white"
                    : "bg-slate-800/80 text-slate-100 border border-white/5"
                }`}>
                  {isUser ? text : (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-snug">
                      <ReactMarkdown>{text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(status === "submitted" || status === "streaming") && (
            <div className="flex justify-start">
              <div className="bg-slate-800/80 border border-white/5 rounded-2xl px-3.5 py-2 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "240ms" }} />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        {ready && (
          <form onSubmit={onSend} className="p-3 border-t border-white/10 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type in English..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#2A7FFF]/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || status === "submitted" || status === "streaming"}
              className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] text-white flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
