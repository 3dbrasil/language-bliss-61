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

export default function PhraseRepetition({ dialogues, completedDialogues, onAddXp }: Props) {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [idx, setIdx] = useState(0);
  const [showEn, setShowEn] = useState(false);
  const [showPt, setShowPt] = useState(false);
  const [spk, setSpk] = useState(false);
  const [rate, setRate] = useState(0.85);
  const [srsTick, setSrsTick] = useState(0);
  const [reviewed, setReviewed] = useState(0);

  // Build today's review queue: due (or never reviewed), ordered by nextReview
  useEffect(() => {
    const all: Phrase[] = [];
    const seen = new Set<string>();
    const add = (d: Dialogue) => d.lines.forEach(l => {
      if (seen.has(l.text)) return;
      seen.add(l.text);
      all.push({
        text: l.text, translation: l.translation, pronunciationGuide: l.pronunciationGuide,
        title: d.title, level: d.level, speaker: l.speaker,
      });
    });
    dialogues.forEach(d => { if (completedDialogues.includes(d.id)) add(d); });
    if (!all.length) dialogues.filter(d => d.level === 'A1').forEach(add);

    const now = Date.now();
    const due = all
      .map(p => ({ p, s: getState(p.text) }))
      .filter(x => x.s.nextReview <= now || !x.s.learned)
      .sort((a, b) => a.s.nextReview - b.s.nextReview)
      .map(x => x.p);
    setPhrases(due.length ? due : all);
  }, [dialogues, completedDialogues]);

  const cur = phrases[idx];

  // Auto-play audio when new card appears
  useEffect(() => {
    if (!cur) return;
    setShowEn(false);
    setShowPt(false);
    const t = setTimeout(async () => {
      setSpk(true);
      try { await speakAmericanEnglish(cur.text, undefined, rate); } catch (_) {}
      setSpk(false);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phrases.length]);

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

  if (!phrases.length) return (
    <div className="text-center py-20 animate-fade-in">
      <Brain className="w-10 h-10 text-slate-200 mx-auto" />
      <p className="text-sm text-slate-300 mt-3">Complete lições para desbloquear repetição.</p>
    </div>
  );

  const learnedCount = phrases.filter(p => getState(p.text).learned).length;
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
