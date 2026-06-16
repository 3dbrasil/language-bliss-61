import { useState, useEffect, useRef, useMemo } from 'react';
import { Brain, Volume2, Mic, MicOff, Check, RotateCcw, Send, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Dialogue, PronunciationFeedback } from '../types';
import { speakAmericanEnglish, evaluatePronunciation } from '../utils/speech';
import {
  classifyDifficulty, getState, recordResult, markLearned,
  LEVEL_META, speakerAvatar, hashId, type PhraseState,
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

type Mode = 'recognize' | 'write' | 'produce';

export default function PhraseRepetition({ dialogues, completedDialogues, onAddXp }: Props) {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [idx, setIdx] = useState(0);
  const [isRec, setIsRec] = useState(false);
  const [trans, setTrans] = useState('');
  const [fb, setFb] = useState<PronunciationFeedback | null>(null);
  const [evaling, setEvaling] = useState(false);
  const [showMan, setShowMan] = useState(false);
  const [manTxt, setManTxt] = useState('');
  const [spk, setSpk] = useState(false);
  const [rate, setRate] = useState(0.85);
  const [mode, setMode] = useState<Mode>('produce');
  const [srsTick, setSrsTick] = useState(0); // re-read state after record

  // recognize mode
  const [recogChoice, setRecogChoice] = useState<string | null>(null);
  // write mode
  const [writeTxt, setWriteTxt] = useState('');
  const [writeResult, setWriteResult] = useState<'ok' | 'no' | null>(null);

  const [total, setTotal] = useState(0);
  const [score, setScore] = useState(0);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const all: Phrase[] = [];
    dialogues.forEach(d => {
      if (completedDialogues.includes(d.id)) {
        d.lines.filter(l => /you|student/i.test(l.speaker)).forEach(l => all.push({
          text: l.text, translation: l.translation, pronunciationGuide: l.pronunciationGuide,
          title: d.title, level: d.level, speaker: l.speaker,
        }));
      }
    });
    if (!all.length) {
      dialogues.filter(d => d.level === 'A1').forEach(d => d.lines.forEach(l => all.push({
        text: l.text, translation: l.translation, pronunciationGuide: l.pronunciationGuide,
        title: d.title, level: d.level, speaker: l.speaker,
      })));
    }
    // sort by SRS due time, learned phrases last
    const sorted = all.map(p => ({ p, s: getState(p.text) }))
      .sort((a, b) => {
        if (a.s.learned !== b.s.learned) return a.s.learned ? 1 : -1;
        return a.s.nextReview - b.s.nextReview;
      })
      .map(x => x.p);
    setPhrases(sorted);
  }, [dialogues, completedDialogues]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = false; r.interimResults = true; r.lang = 'en-US';
      r.onstart = () => { setIsRec(true); setTrans(''); };
      r.onresult = (e: any) => {
        let f = '', i2 = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) f += e.results[i][0].transcript;
          else i2 += e.results[i][0].transcript;
        }
        setTrans(f || i2);
      };
      r.onerror = () => { setIsRec(false); setShowMan(true); };
      r.onend = () => setIsRec(false);
      recRef.current = r;
    }
  }, []);

  const cur = phrases[idx];
  const srs: PhraseState | null = useMemo(() => cur ? getState(cur.text) : null, [cur, srsTick]);
  const lvl = cur ? classifyDifficulty(cur.text) : 'easy';
  const meta = LEVEL_META[srs?.level ?? lvl];
  const avatar = cur ? speakerAvatar(cur.speaker) : { initial: '?', color: 'bg-slate-600' };

  // recognize: build 3 distractors
  const recogOptions = useMemo(() => {
    if (!cur || mode !== 'recognize') return [];
    const others = phrases.filter(p => p.text !== cur.text);
    const distractors = others.sort(() => Math.random() - 0.5).slice(0, 2).map(p => p.text);
    return [cur.text, ...distractors].sort(() => Math.random() - 0.5);
  }, [cur, mode, phrases]);

  const handleRecord = (correct: boolean) => {
    if (!cur) return;
    recordResult(cur.text, correct);
    setSrsTick(t => t + 1);
    if (correct) onAddXp(5);
  };

  const speak = async () => {
    if (!cur || spk) return;
    setSpk(true);
    try { await speakAmericanEnglish(cur.text, undefined, rate); } catch (_) {}
    setSpk(false);
  };

  const toggleRec = () => {
    if (!recRef.current) { setShowMan(true); return; }
    if (isRec) recRef.current.stop();
    else { setTrans(''); setFb(null); try { recRef.current.start(); } catch (_) {} }
  };

  const evaluate = async (t?: string) => {
    if (!cur) return;
    const s = t || trans;
    if (!s.trim()) return;
    setEvaling(true);
    const f = await evaluatePronunciation(cur.text, s);
    setFb(f);
    setScore(p => p + f.score);
    setTotal(p => p + 1);
    handleRecord(f.score >= 70);
    setEvaling(false);
  };

  const checkWrite = () => {
    if (!cur) return;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const ok = norm(writeTxt) === norm(cur.text);
    setWriteResult(ok ? 'ok' : 'no');
    handleRecord(ok);
  };

  const pickRecog = (choice: string) => {
    if (!cur || recogChoice) return;
    setRecogChoice(choice);
    handleRecord(choice === cur.text);
  };

  const next = () => {
    setIdx(p => (p + 1) % Math.max(phrases.length, 1));
    setFb(null); setTrans(''); setManTxt(''); setShowMan(false);
    setRecogChoice(null); setWriteTxt(''); setWriteResult(null);
  };

  if (!phrases.length) return (
    <div className="text-center py-20 animate-fade-in">
      <Brain className="w-10 h-10 text-slate-200 mx-auto" />
      <p className="text-sm text-slate-300 mt-3">Complete lições para desbloquear repetição.</p>
    </div>
  );

  const learnedCount = phrases.filter(p => getState(p.text).learned).length;

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">Repetição Espaçada</h1>
        <p className="text-xs text-slate-300 mt-1">
          Frase {idx + 1} de {phrases.length} · Aprendidas: {learnedCount} · Média: {total > 0 ? Math.round(score / total) : 0}%
        </p>
      </div>

      {cur && srs && (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-5 space-y-4">
            {/* Header: avatar + level badge + learned check + controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-9 h-9 rounded-full ${avatar.color} flex items-center justify-center text-white font-bold text-sm shadow`}>
                  {avatar.initial}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-200 truncate">{cur.speaker}</p>
                  <p className="text-[9px] text-slate-400 truncate">{cur.level} · {cur.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.cls}`}>
                  {meta.emoji} {meta.label}
                </span>
                <button
                  onClick={() => { markLearned(cur.text, !srs.learned); setSrsTick(t => t + 1); }}
                  title={srs.learned ? 'Marcar como não aprendida' : 'Marcar como aprendida'}
                  className={`w-7 h-7 rounded-full flex items-center justify-center border ${srs.learned ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode selector */}
            <div className="flex gap-1 bg-slate-800/40 p-0.5 rounded-lg border border-slate-800">
              {([
                { v: 'recognize', l: '1. Reconhecer' },
                { v: 'write', l: '2. Escrever' },
                { v: 'produce', l: '3. Produzir' },
              ] as { v: Mode; l: string }[]).map(o => (
                <button
                  key={o.v}
                  onClick={() => { setMode(o.v); setRecogChoice(null); setWriteTxt(''); setWriteResult(null); setFb(null); setTrans(''); }}
                  className={`flex-1 text-[10px] font-bold py-1.5 rounded ${mode === o.v ? 'bg-purple-600 text-white' : 'text-slate-300 hover:text-white'}`}
                >
                  {o.l}
                </button>
              ))}
            </div>

            {/* Speed + speaker (always available) */}
            <div className="flex items-center justify-end gap-1.5">
              <div className="flex items-center gap-0.5 bg-slate-800/60 rounded-md p-0.5 border border-slate-700">
                {[
                  { v: 0.6, l: '0.6x' },
                  { v: 0.75, l: '0.8x' },
                  { v: 0.85, l: '1x' },
                  { v: 1.1, l: '1.3x' },
                ].map(o => (
                  <button key={o.v} onClick={() => setRate(o.v)} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rate === o.v ? 'bg-purple-500 text-white' : 'text-slate-300 hover:text-white'}`}>{o.l}</button>
                ))}
              </div>
              <button onClick={speak} disabled={spk} className={`w-8 h-8 rounded-lg flex items-center justify-center ${spk ? 'bg-purple-500 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:text-white'}`}>
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* MODE: RECOGNIZE */}
            {mode === 'recognize' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">Ouça o áudio e escolha a frase correta:</p>
                <div className="space-y-1.5">
                  {recogOptions.map((opt, i) => {
                    const isPicked = recogChoice === opt;
                    const isRight = opt === cur.text;
                    const reveal = recogChoice !== null;
                    return (
                      <button
                        key={i}
                        onClick={() => pickRecog(opt)}
                        disabled={reveal}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition ${
                          reveal
                            ? isRight
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                              : isPicked
                                ? 'bg-red-500/15 border-red-500/40 text-red-200'
                                : 'bg-slate-800/40 border-slate-800 text-slate-400'
                            : 'bg-slate-800/40 border-slate-800 text-slate-200 hover:border-purple-500/50'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {recogChoice && (
                  <p className="text-[11px] text-slate-300">Tradução: {cur.translation}</p>
                )}
              </div>
            )}

            {/* MODE: WRITE */}
            {mode === 'write' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-300">Ouça e digite a frase completa:</p>
                <input
                  value={writeTxt}
                  onChange={e => setWriteTxt(e.target.value)}
                  placeholder="Digite o que ouviu..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-100 outline-none focus:border-purple-500"
                  onKeyDown={e => { if (e.key === 'Enter') checkWrite(); }}
                />
                <button onClick={checkWrite} className="w-full py-2 bg-purple-600 text-white rounded-lg text-xs font-bold">
                  Verificar
                </button>
                {writeResult && (
                  <div className={`rounded-lg p-2 border text-xs ${writeResult === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                    {writeResult === 'ok' ? '✓ Perfeito!' : <>✗ Resposta: <strong>"{cur.text}"</strong></>}
                  </div>
                )}
              </div>
            )}

            {/* MODE: PRODUCE (existing flow) */}
            {mode === 'produce' && (
              <>
                <p className="text-lg font-bold text-slate-100 leading-relaxed">"{cur.text}"</p>
                <p className="text-xs text-slate-300">{cur.translation}</p>
                {cur.pronunciationGuide && <p className="text-[10px] text-purple-400/40 font-mono">🔊 {cur.pronunciationGuide}</p>}

                <div className="flex gap-1.5">
                  <button onClick={toggleRec} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold ${isRec ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-600 text-white'}`}>
                    {isRec ? <><MicOff className="w-3.5 h-3.5" />Parar</> : <><Mic className="w-3.5 h-3.5" />Gravar</>}
                  </button>
                  {trans && !isRec && (
                    <button onClick={() => evaluate()} disabled={evaling} className="px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1">
                      {evaling ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Avaliar
                    </button>
                  )}
                </div>
                <button onClick={() => setShowMan(!showMan)} className="text-[10px] text-slate-300 hover:text-slate-200">
                  ⌨️ {showMan ? 'Ocultar' : 'Digitar'}
                </button>
                {showMan && (
                  <div className="flex gap-1.5">
                    <input
                      value={manTxt}
                      onChange={e => setManTxt(e.target.value)}
                      placeholder="Type..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none"
                      onKeyDown={e => { if (e.key === 'Enter' && manTxt.trim()) { setTrans(manTxt); evaluate(manTxt); } }}
                    />
                    <button onClick={() => { if (manTxt.trim()) { setTrans(manTxt); evaluate(manTxt); } }} className="w-7 h-7 bg-purple-600 text-white rounded-lg flex items-center justify-center">
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {trans && (
                  <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-800">
                    <p className="text-[10px] text-slate-300">Você disse:</p>
                    <p className="text-xs text-slate-300">"{trans}"</p>
                  </div>
                )}
                {fb && (
                  <div className={`rounded-lg border p-3 space-y-1.5 ${fb.score >= 80 ? 'bg-emerald-500/5 border-emerald-500/15' : fb.score >= 60 ? 'bg-teal-500/5 border-teal-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                    <span className={`text-xl font-extrabold ${fb.score >= 80 ? 'text-emerald-400' : fb.score >= 60 ? 'text-teal-400' : 'text-red-400'}`}>{fb.score}%</span>
                    <div className="flex flex-wrap gap-0.5">
                      {fb.words.map((w, i) => (
                        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${w.isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {w.word}{w.isCorrect ? ' ✓' : ' ✗'}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-300">{fb.generalVerdict}</p>
                  </div>
                )}
              </>
            )}

            {/* SRS info */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
              <span>Acertos seguidos: {srs.consecutiveHits}</span>
              <span>Próxima revisão: {srs.nextReview > Date.now() ? new Date(srs.nextReview).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'agora'}</span>
            </div>
          </div>

          <div className="border-t border-slate-800/60 px-5 py-3 flex justify-between">
            <button onClick={() => { setFb(null); setTrans(''); setManTxt(''); setRecogChoice(null); setWriteTxt(''); setWriteResult(null); }} className="text-[10px] text-slate-300 hover:text-slate-200 flex items-center gap-1">
              <RotateCcw className="w-2.5 h-2.5" />Repetir
            </button>
            <button onClick={next} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700">
              Próxima<ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
