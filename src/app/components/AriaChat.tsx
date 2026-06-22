import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { X, Send, Sparkles, Mic, Square, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Dialogue } from "../types";

interface Props {
  dialogue: Dialogue;
  cumulativePhrases: { text: string; translation?: string; lesson?: string }[];
  onClose: () => void;
}

export default function AriaChat({ dialogue, cumulativePhrases, onClose }: Props) {
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakOn, setSpeakOn] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());

  const { messages, sendMessage, status, error } = useChat({
    id: `lesson-${dialogue.id}`,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: async (url, init) => {
        const original = init?.body ? JSON.parse(init.body as string) : {};
        const body = JSON.stringify({
          ...original,
          lessonContext: {
            id: dialogue.id,
            title: dialogue.title,
            situation: dialogue.situation,
            level: dialogue.level,
          },
          cumulativePhrases,
        });
        return fetch(url, { ...init, body });
      },
    }),
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);
  useEffect(() => { inputRef.current?.focus(); }, [status]);

  // Auto-play TTS when a new assistant message finishes streaming
  useEffect(() => {
    if (!speakOn) return;
    if (status === "submitted" || status === "streaming") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenRef.current.has(last.id)) return;
    const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
    if (!text) return;
    spokenRef.current.add(last.id);

    (async () => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play().catch(() => {});
      } catch (e) {
        console.error("tts error", e);
      }
    })();
  }, [messages, status, speakOn]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    setInput("");
    await sendMessage({ text });
  };

  const toggleMic = useCallback(async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size < 1024) return;
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("file", blob, `rec.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
          const res = await fetch("/api/stt", { method: "POST", body: fd });
          if (res.ok) {
            const { text } = (await res.json()) as { text?: string };
            const t = (text || "").trim();
            if (t) {
              setInput("");
              await sendMessage({ text: t });
            }
          }
        } catch (e) {
          console.error("stt error", e);
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      setRecording(true);
    } catch (e) {
      console.error("mic error", e);
    }
  }, [recording, sendMessage]);

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
              <p className="text-[10px] text-slate-400">
                {dialogue.title} · {cumulativePhrases.length} frases na memória
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSpeakOn((v) => {
                  if (v) audioRef.current?.pause();
                  return !v;
                });
              }}
              title={speakOn ? "Silenciar voz da Aria" : "Ativar voz da Aria"}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
            >
              {speakOn ? <Volume2 className="w-4 h-4 text-slate-300" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center">
              <X className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-400">
              Diga "hi" para a Aria 👋 — fale pelo microfone ou digite.
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
          {error && (
            <div className="text-xs text-red-300 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
              ⚠️ {error.message || "Erro ao falar com a Aria."}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <form onSubmit={onSend} className="p-3 border-t border-white/10 flex gap-2">
          <button
            type="button"
            onClick={toggleMic}
            disabled={transcribing || status === "submitted" || status === "streaming"}
            title={recording ? "Parar gravação" : "Falar"}
            className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-white disabled:opacity-40 ${
              recording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={transcribing ? "Transcrevendo..." : "Type in English..."}
            disabled={transcribing}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#2A7FFF]/50 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || status === "submitted" || status === "streaming"}
            className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] text-white flex items-center justify-center disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
