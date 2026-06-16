import { useState, useEffect, useMemo } from 'react';
import { Brain, Volume2, ChevronRight, CheckCircle2, X } from 'lucide-react';
import { Dialogue } from '../types';
import { speakAmericanEnglish } from '../utils/speech';
import {
  classifyDifficulty, getState, recordResult, markLearned, setLevel,
  speakerAvatar, type SrsLevel,
} from '../utils/srs';

interface Phrase {
  text: string;
  translation: string;
  pronunciationGuide?: string;
  title: string;
  level: string;
  speaker: string;
}

interface Props { dialogues: Dialogue[]; completedDialogues: string[]; onAddXp: (xp: number) => void; }

type LevelFilter = 'all' | SrsLevel;

export default function PhraseRepetition({ dialogues, completedDialogues, onAddXp }: Props) {
  const [started, setStarted] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [idx, setIdx] = useState(0);
  const [showEn, setShowEn] = useState(false);
  const [showPt, setShowPt] = useState(false);
  const [spk, setSpk] = useState(false);
  const [rate, setRate] = useState(0.85);
  const [srsTick, setSrsTick] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [filter, setFilter] = useState<LevelFilter>('all');
  const [learnedCount, setLearnedCount] = useState(0);

  // Build today's review queue: due (or never reviewed), ordered by nextReview
  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

    const buildQueue = async () => {
      setPreparing(true);
      const all: Phrase[] = [];
      const seen = new Set<string>();
      const source = completedDialogues.length
        ? dialogues.filter(d => completedDialogues.includes(d.id))
        : dialogues.filter(d => d.level === 'A1');

      for (let i = 0; i < source.length; i++) {
        for (const l of source[i].lines) {
          if (seen.has(l.text)) continue;
          seen.add(l.text);
          all.push({
            text: l.text, translation: l.translation, pronunciationGuide: l.pronunciationGuide,
            title: source[i].title, level: source[i].level, speaker: l.speaker,
          });
        }
        if (i % 12 === 0) await yieldToBrowser();
        if (cancelled) return;
      }

      const now = Date.now();
      const evaluated: { p: Phrase; s: ReturnType<typeof getState> }[] = [];
      for (let i = 0; i < all.length; i++) {
        const p = all[i];
        const s = getState(p.text);
        const level = s.level || classifyDifficulty(p.text);
        if (filter === 'all' || level === filter) evaluated.push({ p, s });
        if (i % 250 === 0) await yieldToBrowser();
        if (cancelled) return;
      }

      const due = evaluated
        .filter(x => x.s.nextReview <= now || !x.s.learned)
        .sort((a, b) => a.s.nextReview - b.s.nextReview);
      const queue = due.length ? due : evaluated;
      setPhrases(queue.map(x => x.p));
      setLearnedCount(queue.filter(x => x.s.learned).length);
      setIdx(0);
      setShowEn(false);
      setShowPt(false);
      setPreparing(false);
    };

    buildQueue();
    return () => {
      cancelled = true;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [started, dialogues, completedDialogues, filter]);

  useEffect(() => {
    if (!started) {
      setPhrases([]);
      setIdx(0);
      setReviewed(0);
      setLearnedCount(0);
    }
  }, [started]);

  const cur = phrases[idx];

  // Reset card reveal only. Do not auto-play: browser TTS on mount was
  // freezing the UI until speech finished on some devices.
  useEffect(() => {
    setShowEn(false);
    setShowPt(false);
    setSpk(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [idx]);

  const replay = async () => {
    if (!cur || spk) return;
    setSpk(true);
    try { await speakAmericanEnglish(cur.text, undefined, rate); } catch (_) {}
    setSpk(false);
  };

  const srs = useMemo(() => cur ? getState(cur.text) : null, [cur, srsTick]);
  const avatar = cur ? speakerAvatar(cur.speaker) : { initial: '?', color: 'bg-slate-600' };
  const curLevel: SrsLevel = srs?.level ?? (cur ? classifyDifficulty(cur.text) : 'easy');

  const grade = (correct: boolean) => {
    if (!cur) return;
    recordResult(cur.text, correct);
    setSrsTick(x => x + 1);
    setReviewed(r => r + 1);
    if (correct) onAddXp(5);
    setTimeout(() => setIdx(p => (p + 1) % Math.max(phrases.length, 1)), 200);
  };

  const dots: { v: SrsLevel; c: string; t: string }[] = [
    { v: 'easy', c: 'bg-emerald-400', t: 'Fácil' },
    { v: 'medium', c: 'bg-amber-400', t: 'Médio' },
    { v: 'hard', c: 'bg-red-400', t: 'Difícil' },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">Repetições do dia</h1>
        <p className="text-xs text-slate-300 mt-1">
          Card {idx + 1} de {phrases.length} · Revisadas: {reviewed} · Aprendidas: {learnedCount}
        </p>
      </div>

      {/* Difficulty filter */}
      <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg p-1 w-fit">
        {([
          { v: 'all' as LevelFilter, l: 'Todas', c: 'bg-slate-500' },
          { v: 'easy' as LevelFilter, l: 'Fácil', c: 'bg-emerald-400' },
          { v: 'medium' as LevelFilter, l: 'Médio', c: 'bg-amber-400' },
          { v: 'hard' as LevelFilter, l: 'Difícil', c: 'bg-red-400' },
        ]).map(o => (
          <button key={o.v} onClick={() => setFilter(o.v)} className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md transition ${filter === o.v ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <span className={`w-2 h-2 rounded-full ${o.c}`} />{o.l}
          </button>
        ))}
      </div>


      {cur && srs && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-9 h-9 rounded-full ${avatar.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {avatar.initial}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-200 truncate">{cur.speaker}</p>
                  <p className="text-[9px] text-slate-400 truncate">{cur.level} · {cur.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {dots.map(d => (
                    <button
                      key={d.v}
                      title={d.t}
                      onClick={() => { setLevel(cur.text, d.v); setSrsTick(x => x + 1); }}
                      className={`w-2.5 h-2.5 rounded-full ${d.c} transition ${curLevel === d.v ? 'ring-2 ring-white/70 scale-110' : 'opacity-30 hover:opacity-70'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => { markLearned(cur.text, !srs.learned); setSrsTick(x => x + 1); }}
                  title={srs.learned ? 'Aprendida' : 'Marcar como aprendida'}
                  className={`w-7 h-7 rounded-full flex items-center justify-center border ${srs.learned ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Audio card */}
            <button
              onClick={replay}
              disabled={spk}
              className={`w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition ${spk ? 'border-purple-400 bg-purple-500/10' : 'border-slate-700 hover:border-purple-500 bg-slate-900/40'}`}
            >
              <Volume2 className={`w-10 h-10 ${spk ? 'text-purple-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="text-[11px] text-slate-400">{spk ? 'Tocando...' : 'Tocar novamente'}</span>
            </button>

            {/* Speed */}
            <div className="flex items-center justify-center gap-0.5 bg-slate-800/60 rounded-md p-0.5 border border-slate-700 w-fit mx-auto">
              {[
                { v: 0.6, l: '0.6x' },
                { v: 0.75, l: '0.8x' },
                { v: 0.85, l: '1x' },
                { v: 1.1, l: '1.3x' },
              ].map(o => (
                <button key={o.v} onClick={() => setRate(o.v)} className={`text-[10px] font-bold px-2 py-1 rounded ${rate === o.v ? 'bg-purple-500 text-white' : 'text-slate-300 hover:text-white'}`}>{o.l}</button>
              ))}
            </div>

            {/* English reveal */}
            {!showEn ? (
              <button
                onClick={() => setShowEn(true)}
                className="w-full py-4 rounded-xl bg-slate-800/60 border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                👆 Toque para ver o inglês
              </button>
            ) : (
              <div className="rounded-xl bg-slate-800/40 border border-slate-700 p-4">
                <p className="text-lg font-bold text-slate-100 leading-relaxed text-center">"{cur.text}"</p>
                {cur.pronunciationGuide && (
                  <p className="text-[10px] text-purple-400/60 font-mono mt-2 text-center">🔊 {cur.pronunciationGuide}</p>
                )}
              </div>
            )}

            {/* Portuguese reveal */}
            {showEn && (
              !showPt ? (
                <button
                  onClick={() => setShowPt(true)}
                  className="w-full py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  👆 Toque para ver o português
                </button>
              ) : (
                <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-4">
                  <p className="text-sm text-cyan-200 text-center">{cur.translation}</p>
                </div>
              )
            )}

            {/* Grade buttons */}
            {showEn && showPt && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => grade(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 font-bold text-sm hover:bg-red-500/25"
                >
                  <X className="w-4 h-4" /> Não sabia
                </button>
                <button
                  onClick={() => grade(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-sm hover:bg-emerald-500/25"
                >
                  <CheckCircle2 className="w-4 h-4" /> Acertei
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/60 px-5 py-2.5 flex items-center justify-between text-[10px] text-slate-400">
            <span>Acertos seguidos: {srs.consecutiveHits}</span>
            <button onClick={() => setIdx(p => (p + 1) % phrases.length)} className="flex items-center gap-1 text-slate-300 hover:text-white">
              Pular <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
