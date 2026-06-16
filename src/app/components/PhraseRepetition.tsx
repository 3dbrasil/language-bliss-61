import { useState, useEffect, useRef } from 'react';
import { Brain, Volume2, Mic, MicOff, Check, RotateCcw, Send, ChevronRight } from 'lucide-react';
import { Dialogue, PronunciationFeedback } from '../types';
import { speakAmericanEnglish, evaluatePronunciation } from '../utils/speech';

interface Props { dialogues: Dialogue[]; completedDialogues: string[]; onAddXp: (xp: number) => void; }

export default function PhraseRepetition({ dialogues, completedDialogues, onAddXp }: Props) {
  const [phrases, setPhrases] = useState<{ text: string; translation: string; pronunciationGuide?: string; title: string; level: string }[]>([]);
  const [idx, setIdx] = useState(0);
  const [isRec, setIsRec] = useState(false);
  const [trans, setTrans] = useState('');
  const [fb, setFb] = useState<PronunciationFeedback | null>(null);
  const [evaling, setEvaling] = useState(false);
  const [showMan, setShowMan] = useState(false);
  const [manTxt, setManTxt] = useState('');
  const [spk, setSpk] = useState(false);
  const [rate, setRate] = useState(0.85);

  const [total, setTotal] = useState(0);
  const [score, setScore] = useState(0);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const all: typeof phrases = [];
    dialogues.forEach(d => { if (completedDialogues.includes(d.id)) d.lines.filter(l => /you|student/i.test(l.speaker)).forEach(l => all.push({ text: l.text, translation: l.translation, pronunciationGuide: l.pronunciationGuide, title: d.title, level: d.level })); });
    if (!all.length) dialogues.filter(d => d.level === 'A1').forEach(d => d.lines.forEach(l => all.push({ text: l.text, translation: l.translation, pronunciationGuide: l.pronunciationGuide, title: d.title, level: d.level })));
    setPhrases(all.sort(() => Math.random() - 0.5));
  }, [dialogues, completedDialogues]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) { const r = new SR(); r.continuous = false; r.interimResults = true; r.lang = 'en-US'; r.onstart = () => { setIsRec(true); setTrans(''); }; r.onresult = (e: any) => { let f = '', i2 = ''; for (let i = e.resultIndex; i < e.results.length; ++i) { if (e.results[i].isFinal) f += e.results[i][0].transcript; else i2 += e.results[i][0].transcript; } setTrans(f || i2); }; r.onerror = () => { setIsRec(false); setShowMan(true); }; r.onend = () => setIsRec(false); recRef.current = r; }
  }, []);

  const cur = phrases[idx];
  const speak = async () => { if (!cur || spk) return; setSpk(true); try { await speakAmericanEnglish(cur.text, undefined, rate); } catch (_) { } setSpk(false); };
  const toggleRec = () => { if (!recRef.current) { setShowMan(true); return; } if (isRec) recRef.current.stop(); else { setTrans(''); setFb(null); try { recRef.current.start(); } catch (_) { } } };
  const evaluate = async (t?: string) => { if (!cur) return; const s = t || trans; if (!s.trim()) return; setEvaling(true); const f = await evaluatePronunciation(cur.text, s); setFb(f); setScore(p => p + f.score); setTotal(p => p + 1); if (f.score >= 70) onAddXp(5); setEvaling(false); };
  const next = () => { setIdx(p => (p + 1) % phrases.length); setFb(null); setTrans(''); setManTxt(''); setShowMan(false); };

  if (!phrases.length) return <div className="text-center py-20 animate-fade-in"><Brain className="w-10 h-10 text-slate-200 mx-auto" /><p className="text-sm text-slate-300 mt-3">Complete lições para desbloquear repetição.</p></div>;

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">Repetição</h1>
        <p className="text-xs text-slate-300 mt-1">Frase {idx + 1} de {phrases.length} · Média: {total > 0 ? Math.round(score / total) : 0}%</p>
      </div>

      {cur && (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-300">{cur.level} · {cur.title}</span>
              <button onClick={speak} disabled={spk} className={`w-8 h-8 rounded-lg flex items-center justify-center ${spk ? 'bg-purple-500 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:text-white'}`}><Volume2 className="w-4 h-4" /></button>
            </div>
            <p className="text-lg font-bold text-slate-100 leading-relaxed">"{cur.text}"</p>
            <p className="text-xs text-slate-300">{cur.translation}</p>
            {cur.pronunciationGuide && <p className="text-[10px] text-purple-400/40 font-mono">🔊 {cur.pronunciationGuide}</p>}

            <div className="flex gap-1.5">
              <button onClick={toggleRec} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold ${isRec ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-600 text-white'}`}>
                {isRec ? <><MicOff className="w-3.5 h-3.5" />Parar</> : <><Mic className="w-3.5 h-3.5" />Gravar</>}
              </button>
              {trans && !isRec && <button onClick={() => evaluate()} disabled={evaling} className="px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1">{evaling ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Avaliar</button>}
            </div>
            <button onClick={() => setShowMan(!showMan)} className="text-[10px] text-slate-300 hover:text-slate-200">⌨️ {showMan ? 'Ocultar' : 'Digitar'}</button>
            {showMan && <div className="flex gap-1.5"><input value={manTxt} onChange={e => setManTxt(e.target.value)} placeholder="Type..." className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none" onKeyDown={e => { if (e.key === 'Enter' && manTxt.trim()) { setTrans(manTxt); evaluate(manTxt); } }} /><button onClick={() => { if (manTxt.trim()) { setTrans(manTxt); evaluate(manTxt); } }} className="w-7 h-7 bg-purple-600 text-white rounded-lg flex items-center justify-center"><Send className="w-3 h-3" /></button></div>}
            {trans && <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-800"><p className="text-[10px] text-slate-300">Você disse:</p><p className="text-xs text-slate-300">"{trans}"</p></div>}
            {fb && (
              <div className={`rounded-lg border p-3 space-y-1.5 ${fb.score >= 80 ? 'bg-emerald-500/5 border-emerald-500/15' : fb.score >= 60 ? 'bg-teal-500/5 border-teal-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                <span className={`text-xl font-extrabold ${fb.score >= 80 ? 'text-emerald-400' : fb.score >= 60 ? 'text-teal-400' : 'text-red-400'}`}>{fb.score}%</span>
                <div className="flex flex-wrap gap-0.5">{fb.words.map((w, i) => <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${w.isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{w.word}{w.isCorrect ? ' ✓' : ' ✗'}</span>)}</div>
                <p className="text-[11px] text-slate-300">{fb.generalVerdict}</p>
              </div>
            )}
          </div>
          <div className="border-t border-slate-800/60 px-5 py-3 flex justify-between">
            <button onClick={() => { setFb(null); setTrans(''); setManTxt(''); }} className="text-[10px] text-slate-300 hover:text-slate-200 flex items-center gap-1"><RotateCcw className="w-2.5 h-2.5" />Repetir</button>
            <button onClick={next} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700">Próxima<ChevronRight className="w-3 h-3" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
