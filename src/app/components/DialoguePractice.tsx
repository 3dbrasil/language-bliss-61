import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Volume2, BookOpen, Award, Sparkles, CheckCircle2, Play, Copy, Check } from 'lucide-react';
import { Dialogue, DialogueLine, PronunciationFeedback, UserStats } from '../types';
import { speakAmericanEnglish } from '../utils/speech';
import { fallbackCoverImage, isLikelyBrokenCoverImageUrl } from '../utils/imageSearch';
import { classifyDifficulty, getState, markLearned, setLevel, speakerAvatar, type SrsLevel } from '../utils/srs';
import AriaChat from './AriaChat';
import { translateLessonLines } from '@/lib/translations.functions';

interface Props {
  dialogue: Dialogue;
  stats: UserStats;
  cumulativePhrases?: { text: string; translation?: string; lesson?: string }[];
  onBack: () => void;
  onComplete: (xp: number, scores: Record<string, number>) => void;
}

export default function DialoguePractice({ dialogue, stats: _s, cumulativePhrases = [], onBack, onComplete }: Props) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [fbs] = useState<Record<string, PronunciationFeedback>>({});
  const [listened, setListened] = useState<string[]>([]);
  const [vocab, setVocab] = useState(false);
  const [rate, setRate] = useState(0.85);
  const [aria, setAria] = useState(false);
  const [srsTick, setSrsTick] = useState(0);
  const [lvlFilter, setLvlFilter] = useState<'all' | SrsLevel>('all');
  const [revealedTranslationIds, setRevealedTranslationIds] = useState<string[]>([]);
  const [autoplay, setAutoplay] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [generatedTranslations, setGeneratedTranslations] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const copyEnglish = useCallback(async () => {
    const text = dialogue.lines.map((l) => l.text).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    }
  }, [dialogue.lines]);
  const [visibleCount, setVisibleCount] = useState(80);
  const coverImage = !isLikelyBrokenCoverImageUrl(dialogue.imageUrl) && dialogue.imageUrl
    ? dialogue.imageUrl
    : fallbackCoverImage(dialogue.title, dialogue.situation, dialogue.id);
  const fallbackImage = fallbackCoverImage(dialogue.title, dialogue.situation, dialogue.id);

  const isStu = useCallback((l: DialogueLine) => /you|student/i.test(l.speaker), []);
  const missingTranslation = useCallback(
    (value?: string) => !value?.trim() || /^[•.\s]+$/.test(value.trim()),
    [],
  );

  const visibleLines = useMemo(
    () =>
      dialogue.lines.filter(
        (l) => lvlFilter === 'all' || (getState(l.text).level || classifyDifficulty(l.text)) === lvlFilter,
      ),
    [dialogue.lines, lvlFilter, srsTick],
  );
  const renderedLines = useMemo(() => visibleLines.slice(0, visibleCount), [visibleLines, visibleCount]);

  useEffect(() => {
    setVisibleCount(80);
    setRevealedTranslationIds([]);
  }, [dialogue.id, lvlFilter]);

  const speak = useCallback(
    async (l: DialogueLine) => {
      if (speakingId) return;
      setSpeakingId(l.id);
      try {
        await speakAmericanEnglish(l.text, undefined, rate);
        setListened((p) => (p.includes(l.id) ? p : [...p, l.id]));
      } catch (e) {
        console.error(e);
      }
      setSpeakingId(null);
    },
    [speakingId, rate],
  );

  /* autoplay */
  useEffect(() => {
    if (!autoplay) return;
    let cancelled = false;
    (async () => {
      for (const l of visibleLines) {
        if (cancelled) return;
        await speak(l);
        await new Promise((r) => setTimeout(r, 450));
      }
      if (!cancelled) setAutoplay(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  // Translate ONLY the line the user clicked on (on demand) — not the whole lesson.
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const translateOne = useCallback(async (line: DialogueLine) => {
    if (generatedTranslations[line.id] || translatingId) return;
    setTranslatingId(line.id);
    try {
      const out = await translateLessonLines({ data: { lines: [{ id: line.id, text: line.text }] } });
      if (out[line.id]) {
        setGeneratedTranslations((current) => ({ ...current, [line.id]: out[line.id] }));
      }
    } catch (error) {
      console.warn('translation failed', error);
    } finally {
      setTranslatingId(null);
    }
  }, [generatedTranslations, translatingId]);

  const finish = () => {
    setCelebrate(true);
    setTimeout(() => {
      const sc: Record<string, number> = {};
      Object.entries(fbs).forEach(([id, fb]) => sc[id] = fb.score);
      const avg = Object.values(sc).length > 0 ? Math.round(Object.values(sc).reduce((a, b) => a + b, 0) / Object.values(sc).length) : 0;
      onComplete(avg >= 80 ? 30 : avg >= 60 ? 25 : 15, sc);
    }, 1400);
  };

  const vocabList = useMemo(() => {
    const v: { word: string; translation: string }[] = [];
    const s = new Set<string>();
    dialogue.lines.forEach((l) =>
      l.keyVocabulary?.forEach((k) => {
        if (!s.has(k.word.toLowerCase())) {
          s.add(k.word.toLowerCase());
          v.push(k);
        }
      }),
    );
    return v;
  }, [dialogue.lines]);

  /* assign a stable bubble palette per non-student speaker */
  const speakerHues = useMemo(() => {
    const palettes = [
      { bg: 'from-[#00D4A0]/25 to-[#00D4A0]/10', border: 'border-[#00D4A0]/30', ring: 'shadow-[0_8px_30px_-10px_rgba(0,212,160,0.6)]', name: 'text-[#5EEAC4]' },
      { bg: 'from-[#A855F7]/25 to-[#A855F7]/10', border: 'border-[#A855F7]/30', ring: 'shadow-[0_8px_30px_-10px_rgba(168,85,247,0.6)]', name: 'text-[#C99BFF]' },
      { bg: 'from-[#F59E0B]/22 to-[#F59E0B]/8', border: 'border-[#F59E0B]/30', ring: 'shadow-[0_8px_30px_-10px_rgba(245,158,11,0.5)]', name: 'text-[#FBBF24]' },
      { bg: 'from-[#EC4899]/22 to-[#EC4899]/8', border: 'border-[#EC4899]/30', ring: 'shadow-[0_8px_30px_-10px_rgba(236,72,153,0.5)]', name: 'text-[#F9A8D4]' },
    ];
    const map: Record<string, typeof palettes[number]> = {};
    let i = 0;
    dialogue.lines.forEach((l) => {
      if (!isStu(l) && !map[l.speaker]) {
        map[l.speaker] = palettes[i % palettes.length];
        i++;
      }
    });
    return map;
  }, [dialogue.lines, isStu]);

  const studentHue = { bg: 'from-[#2A7FFF] to-[#1E6BFF]', border: 'border-[#2A7FFF]/40', ring: 'shadow-[0_10px_30px_-10px_rgba(42,127,255,0.7)]' };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in pb-10 relative">
      {/* Hero */}
      {coverImage ? (
        <div
          className="relative rounded-3xl overflow-hidden h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${fallbackImage})` }}
        >
          <img
            src={coverImage}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E17] via-[#0B0E17]/60 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-[0.2em]">{dialogue.level}</span>
            <h1 className="text-2xl font-extrabold text-white mt-1">{dialogue.title}</h1>
            <p className="text-xs text-slate-200/80 mt-1">{dialogue.situation}</p>
          </div>
          <button onClick={onBack} className="absolute top-3 right-3 w-9 h-9 bg-black/40 backdrop-blur rounded-xl flex items-center justify-center hover:scale-105 transition"><ArrowLeft className="w-4 h-4 text-white" /></button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-slate-200" /></button>
          <div><p className="text-xl font-extrabold text-slate-100">{dialogue.title}</p><p className="text-xs text-slate-300">{dialogue.situation}</p></div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-0.5 flex-1 min-w-[120px]">{dialogue.lines.map((l) => <div key={l.id} className={`h-1 flex-1 rounded-full ${isStu(l) ? 'bg-[#2A7FFF]' : 'bg-[#00D4A0]'}`} />)}</div>
        <button onClick={() => setAutoplay(a => !a)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${autoplay ? 'bg-[#2A7FFF] text-white' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}>
          <Play className="w-3 h-3" />{autoplay ? 'Tocando…' : 'Auto-play'}
        </button>
        <div className="flex items-center gap-0.5 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
          {[{ v: 0.6, l: '0.6x' }, { v: 0.85, l: '1x' }, { v: 1.1, l: '1.3x' }].map(o => (
            <button key={o.v} onClick={() => setRate(o.v)} className={`text-[9px] font-bold px-2 py-0.5 rounded ${rate === o.v ? 'bg-[#2A7FFF] text-white' : 'text-slate-300'}`}>{o.l}</button>
          ))}
        </div>
        <button onClick={() => setRevealedTranslationIds([])} className="text-[10px] font-bold px-2 py-1 rounded-lg transition bg-purple-500/20 text-purple-300 border border-purple-500/30">
          PT oculto
        </button>
        <button onClick={() => setVocab(!vocab)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${vocab ? 'bg-[#00D4A0] text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}><BookOpen className="w-3 h-3" />Vocab</button>
      </div>

      {/* Floating background words */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        {vocabList.slice(0, 8).map((v, i) => (
          <span key={i} className="absolute text-[#2A7FFF]/[0.06] font-bold select-none" style={{ top: `${(i * 53) % 90}%`, left: `${(i * 37) % 85}%`, fontSize: `${24 + (i % 4) * 8}px`, transform: `rotate(${(i % 2 ? -1 : 1) * (i * 3)}deg)` }}>{v.word}</span>
        ))}
      </div>

      {vocab && vocabList.length > 0 && (
        <div className="rounded-2xl p-3 bg-white/[0.03] backdrop-blur-xl border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {vocabList.map((v, i) => <div key={i} className="flex items-center gap-2 text-[11px] bg-white/[0.04] rounded-lg px-2.5 py-1.5 border border-white/5"><span className="font-bold text-[#5EEAC4]">{v.word}</span><span className="text-slate-500">→</span><span className="text-slate-200">{v.translation}</span></div>)}
        </div>
      )}

      {/* Difficulty filter */}
      <div className="flex items-center gap-1 bg-white/[0.03] backdrop-blur border border-white/10 rounded-xl p-1 w-fit">
        {([
          { v: 'all' as const, l: 'Todas', c: 'bg-slate-400' },
          { v: 'easy' as const, l: 'Fácil', c: 'bg-emerald-400' },
          { v: 'medium' as const, l: 'Médio', c: 'bg-amber-400' },
          { v: 'hard' as const, l: 'Difícil', c: 'bg-red-400' },
        ]).map(o => (
            <button key={o.v} onClick={() => setLvlFilter(o.v)} className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${lvlFilter === o.v ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${o.c}`} />{o.l}
          </button>
        ))}
      </div>

      {/* Chat bubbles */}
      <div className="space-y-5 pt-2">
        {renderedLines.map((l) => {
          const stu = isStu(l);
          const avatar = speakerAvatar(l.speaker);
          const hue = stu ? studentHue : speakerHues[l.speaker] || speakerHues[Object.keys(speakerHues)[0]];
          const spking = speakingId === l.id;
          const cur = getState(l.text).level || classifyDifficulty(l.text);
          const translationRevealed = revealedTranslationIds.includes(l.id);
          void srsTick;

          return (
            <div key={l.id} className={`flex items-end gap-2.5 ${stu ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
              {/* Avatar */}
              <div className={`relative shrink-0 ${spking ? 'scale-110' : ''} transition-transform`}>
                <div className={`w-10 h-10 rounded-full ${avatar.color} flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/10 ${spking ? 'ring-white/40' : ''}`}>{avatar.initial}</div>
                {spking && <div className="absolute -inset-1 rounded-full bg-white/20 blur-md -z-10 animate-pulse" />}
              </div>

              {/* Bubble */}
              <div className={`group max-w-[78%] ${stu ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`flex items-center gap-2 px-1 ${stu ? 'flex-row-reverse' : ''}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${stu ? 'text-[#7AB0FF]' : (hue as any).name || 'text-slate-300'}`}>{stu ? '🎙️ Você' : l.speaker}</span>
                  <div className="flex items-center gap-0.5">
                    {(['easy','medium','hard'] as SrsLevel[]).map((d) => {
                      const cls = d === 'easy' ? 'bg-emerald-400' : d === 'medium' ? 'bg-amber-400' : 'bg-red-400';
                      return <button key={d} onClick={() => { setLevel(l.text, d); setSrsTick(x => x + 1); }} className={`w-1.5 h-1.5 rounded-full ${cls} ${cur === d ? 'ring-1 ring-white/70 scale-125' : 'opacity-30 hover:opacity-70'} transition`} />;
                    })}
                  </div>
                </div>

                <div className={`relative rounded-3xl px-5 py-3.5 bg-gradient-to-br ${hue.bg} border ${hue.border} ${hue.ring} backdrop-blur-sm transition-colors
                  ${stu ? 'rounded-br-md text-white' : 'rounded-bl-md text-slate-100'}`}>
                  <p className={`text-[15px] font-bold leading-relaxed tracking-wide ${stu ? 'text-white' : 'text-white'}`}>
                    {l.text}
                  </p>
                  <p
                    onClick={() => {
                      setRevealedTranslationIds((ids) => (ids.includes(l.id) ? ids : [...ids, l.id]));
                      if (missingTranslation(l.translation) && !generatedTranslations[l.id]) {
                        translateOne(l);
                      }
                    }}
                    className={`text-[12px] text-slate-100/80 mt-1.5 italic transition cursor-pointer ${translationRevealed ? '' : 'blur-sm hover:blur-none select-none'}`}
                  >
                    {missingTranslation(l.translation)
                      ? (generatedTranslations[l.id] || (translatingId === l.id ? 'Traduzindo…' : 'Toque para traduzir'))
                      : l.translation}
                  </p>
                  {l.pronunciationGuide && <p className="text-[10px] text-white/40 font-mono mt-1">🔊 {l.pronunciationGuide}</p>}

                  {/* Play + learned buttons */}
                  <div className={`absolute -bottom-2 ${stu ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                    <button onClick={() => speak(l)} disabled={!!speakingId} className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur border border-white/15 transition ${spking ? 'bg-white text-slate-900 animate-pulse' : 'bg-slate-950/80 text-white hover:scale-110'}`}>
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    {(() => { const st = getState(l.text); return (
                      <button onClick={() => { markLearned(l.text, !st.learned); setSrsTick(x => x + 1); }} className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur border border-white/15 transition ${st.learned ? 'bg-emerald-400 text-slate-900' : 'bg-slate-950/80 text-slate-400 hover:text-white'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    ); })()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

      </div>

      {visibleLines.length > renderedLines.length && (
        <button
          onClick={() => setVisibleCount((count) => count + 80)}
          className="w-full py-3 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition"
        >
          Mostrar mais falas ({renderedLines.length}/{visibleLines.length})
        </button>
      )}

      {/* Aria CTA — at the END of the lesson */}
      {visibleLines.length > 0 && (
        <div className="space-y-3 pt-4 animate-fade-in">
          <button
            onClick={() => setAria(true)}
            className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#2A7FFF]/20 to-[#00D4A0]/20 border border-white/15 hover:border-white/30 hover:scale-[1.01] transition group backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2A7FFF] to-[#00D4A0] flex items-center justify-center shrink-0 group-hover:scale-110 transition shadow-[0_0_30px_-5px_rgba(42,127,255,0.6)]">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Praticar com a Aria</p>
                <p className="text-[11px] text-slate-300">Conversa livre baseada nesta lição · IA com memória</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#5EEAC4] uppercase tracking-wider">Beta</span>
          </button>

          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center space-y-3">
            <Award className="w-8 h-8 text-[#5EEAC4] mx-auto" />
            <p className="text-xs text-slate-300">Pronto para a próxima? Você ouviu o diálogo completo.</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={onBack} className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-200 px-5 py-3 rounded-full text-sm font-bold hover:bg-slate-800 transition">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <button onClick={finish} className="relative overflow-hidden bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] text-white px-7 py-3 rounded-full text-sm font-bold shadow-[0_10px_30px_-5px_rgba(42,127,255,0.5)] hover:scale-105 active:scale-95 transition">
                Concluir lição →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebrate burst */}
      {celebrate && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="absolute w-2 h-2 rounded-full animate-ping" style={{
              background: ['#2A7FFF','#00D4A0','#A855F7','#F59E0B','#EC4899'][i % 5],
              top: '50%', left: '50%',
              transform: `translate(-50%, -50%) rotate(${i * 15}deg) translateY(-${80 + (i % 5) * 20}px)`,
              animationDuration: '900ms',
            }} />
          ))}
          <div className="text-5xl animate-scale-in">🎉</div>
        </div>
      )}

      {aria && <AriaChat dialogue={dialogue} cumulativePhrases={cumulativePhrases} onClose={() => setAria(false)} />}
    </div>
  );
}
