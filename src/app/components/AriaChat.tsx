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

// Short silent mp3 used to "unlock" the audio element inside a user gesture.
const SILENT_MP3 =
  "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAACVAA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PP////8AAAA5TEFNRTMuMTAwAaUAAAAAAAAAABQgJAUHQQAB4AAAAlSDpf//AAAAAAAAAAAAAAAAAAAA";

type BrowserSpeechRecognitionResultEvent = Event & {
  results?: ArrayLike<{ 0?: { transcript?: string }; isFinal?: boolean }>;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type MicMode = "recording" | "browser" | "none";

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getBrowserSpeechRecognition() {
  if (typeof window === "undefined") return null;
  const win = window as typeof window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function selectEnglishVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang === "en-US") || voices.find((voice) => voice.lang.startsWith("en")) || null;
}

function primeBrowserSpeechSynthesis() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const utterance = new SpeechSynthesisUtterance("hi");
    utterance.lang = "en-US";
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.resume();
  } catch { /* browser does not allow priming here */ }
}

function speakWithBrowserEnglish(text: string) {
  return new Promise<boolean>((resolve) => {
    const cleanText = text.trim();
    if (!cleanText || typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve(false);
      return;
    }

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      window.speechSynthesis.onvoiceschanged = null;
      resolve(ok);
    };

    const start = () => {
      if (settled) return;
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.voice = selectEnglishVoice();
      utterance.lang = utterance.voice?.lang || "en-US";
      utterance.rate = 0.9;
      utterance.pitch = 1.03;
      utterance.onstart = () => done(true);
      utterance.onend = () => done(true);
      utterance.onerror = () => done(false);
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
        timer = setTimeout(() => done(window.speechSynthesis.speaking || window.speechSynthesis.pending), 700);
      } catch {
        done(false);
      }
    };

    if (window.speechSynthesis.getVoices().length) start();
    else {
      window.speechSynthesis.onvoiceschanged = start;
      timer = setTimeout(start, 600);
    }
  });
}

export default function AriaChat({ dialogue, cumulativePhrases, onClose }: Props) {
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [speakOn, setSpeakOn] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const browserTranscriptRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const micModeRef = useRef<MicMode>("none");

  // Create a single <audio> element and "unlock" it inside a user gesture.
  // After this, .play() can be called later (after async fetch) without
  // being rejected by the browser's autoplay policy.
  const unlockAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    const a = audioRef.current;
    try {
      a.muted = true;
      a.src = SILENT_MP3;
      primeBrowserSpeechSynthesis();
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(() => { a.pause(); a.muted = false; }).catch(() => { a.muted = false; });
      }
    } catch { /* ignore */ }
  }, []);

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
        setAudioError(null);
        const usedBrowserVoice = await speakWithBrowserEnglish(text);
        if (!usedBrowserVoice) setAudioError("Voz indisponível neste aparelho. Verifique as opções de voz do navegador.");
        return;
      } catch (e) {
        console.error("browser speech error", e);
        setAudioError("Não consegui reproduzir a voz neste aparelho.");
      }
    })();
  }, [messages, status, speakOn]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort?.();
    };
  }, []);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    unlockAudio();
    setInput("");
    await sendMessage({ text });
  };

  const startBrowserRecognitionOnly = useCallback(() => {
    const Recognition = getBrowserSpeechRecognition();
    if (!Recognition) return false;

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) {
        browserTranscriptRef.current = transcript;
        setInput(transcript);
      }
    };
    recognition.onerror = (event) => {
      recognitionRef.current = null;
      micModeRef.current = "none";
      setRecording(false);
      setMicError(event.error === "not-allowed" ? "Permissão negada para reconhecimento de voz." : "Reconhecimento de voz do navegador falhou.");
    };
    recognition.onend = async () => {
      recognitionRef.current = null;
      if (micModeRef.current !== "browser") return;
      micModeRef.current = "none";
      setRecording(false);
      const transcript = browserTranscriptRef.current.trim();
      if (transcript) {
        setInput("");
        await sendMessage({ text: transcript });
      } else {
        setMicError("Não captei sua voz. Tente falar mais perto do microfone.");
      }
    };

    browserTranscriptRef.current = "";
    recognitionRef.current = recognition;
    micModeRef.current = "browser";
    try { recognition.start(); } catch {
      recognitionRef.current = null;
      micModeRef.current = "none";
      return false;
    }
    setRecording(true);
    return true;
  }, [sendMessage]);

  const toggleMic = useCallback(async () => {
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    setMicError(null);
    unlockAudio();
    if (startBrowserRecognitionOnly()) return;
    setMicError("Reconhecimento de voz indisponível neste navegador. Pode digitar a mensagem.");
  }, [recording, startBrowserRecognitionOnly, unlockAudio]);

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
                  else unlockAudio();
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
          {/* audio/mic warnings hidden por solicitação do usuário */}
          {false && audioError}
          {false && micError}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <form onSubmit={onSend} className="p-3 border-t border-white/10 flex gap-2">
          <button
            type="button"
            onClick={toggleMic}
            disabled={status === "submitted" || status === "streaming"}
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
            placeholder="Type in English..."
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
