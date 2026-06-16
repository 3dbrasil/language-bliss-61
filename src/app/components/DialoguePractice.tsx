import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, Mic, MicOff, Check, RotateCcw, Star, BookOpen, Award, Send, Sparkles, CheckCircle2 } from 'lucide-react';
import { Dialogue, DialogueLine, PronunciationFeedback, UserStats } from '../types';
import { speakAmericanEnglish, evaluatePronunciation } from '../utils/speech';
import { classifyDifficulty, getState, markLearned, recordResult, LEVEL_META, speakerAvatar } from '../utils/srs';
import AriaChat from './AriaChat';


interface Props { dialogue: Dialogue; stats: UserStats; onBack: () => void; onComplete: (xp: number, scores: Record<string, number>) => void; }

export default function DialoguePractice({ dialogue, stats: _s, onBack, onComplete }: Props) {
  const [active, setActive] = useState<DialogueLine | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [rec, setRec] = useState(false);
  const [trans, setTrans] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState(false);
  const [manTxt, setManTxt] = useState('');
  const [fbs, setFbs] = useState<Record<string, PronunciationFeedback>>({});
  const [curFb, setCurFb] = useState<PronunciationFeedback | null>(null);
  const [listened, setListened] = useState<string[]>([]);
  const [vocab, setVocab] = useState(false);
  const [rate, setRate] = useState(0.85);
  const [aria, setAria] = useState(false);
  const [srsTick, setSrsTick] = useState(0);


  const recRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR(); r.continuous = false; r.interimResults = true; r.lang = 'en-US';
      r.onstart = () => { setRec(true); setTrans(''); setErr(''); };
      r.onresult = (e: any) => { let f = '', i2 = ''; for (let i = e.resultIndex; i < e.results.length; ++i) { if (e.results[i].isFinal) f += e.results[i][0].transcript; else i2 += e.results[i][0].transcript; } setTrans(f || i2); };
      r.onerror = () => { setRec(false); setManual(true); setErr('Microfone indisponível. Use entrada manual.'); };
      r.onend = () => setRec(false);
      recRef.current = r;
    }
    return () => { recRef.current?.abort(); };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active, curFb]);

  const stuLines = dialogue.lines.filter(l => /you|student/i.test(l.speaker));
  const allDone = stuLines.every(l => fbs[l.id]?.score >= 60);
  const vocabList = (() => { const v: { word: string; translation: string }[] = []; const s = new Set<string>(); dialogue.lines.forEach(l => l.keyVocabulary?.forEach(k => { if (!s.has(k.word.toLowerCase())) { s.add(k.word.toLowerCase()); v.push(k); } })); return v; })();

  const speak = async (l: DialogueLine) => { if (speakingId) return; setSpeakingId(l.id); try { await speakAmericanEnglish(l.text, undefined, rate); if (!listened.includes(l.id)) setListened(p => [...p, l.id]); } catch (e) { console.error(e); } setSpeakingId(null); };
  const toggleRec = () => { if (!recRef.current) { setManual(true); return; } if (rec) recRef.current.stop(); else { setTrans(''); setErr(''); setManual(false); try { recRef.current.start(); } catch (e) { console.error(e); } } };
  const evalSpoken = async (t?: string) => { if (!active) return; const s = t || trans; if (!s.trim()) return; setEvaluating(true); setErr(''); const fb = await evaluatePronunciation(active.text, s); setCurFb(fb); setFbs(p => ({ ...p, [active.id]: fb })); setEvaluating(false); };
  const finish = () => { const sc: Record<string, number> = {}; Object.entries(fbs).forEach(([id, fb]) => sc[id] = fb.score); const avg = Object.values(sc).length > 0 ? Math.round(Object.values(sc).reduce((a, b) => a + b, 0) / Object.values(sc).length) : 0; onComplete(avg >= 80 ? 30 : avg >= 60 ? 25 : 15, sc); };
  const isStu = (l: DialogueLine) => /you|student/i.test(l.speaker);
  const scoreClr = (s: number) => s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-teal-400' : 'text-red-400';

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in pb-8">
      {/* Hero */}
      {dialogue.imageUrl ? (
        <div className="relative rounded-2xl overflow-hidden h-44">
          <img src={dialogue.imageUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">{dialogue.level}</span>
            <h1 className="text-xl font-extrabold text-white mt-0.5">{dialogue.title}</h1>
            <p className="text-[11px] text-slate-200 mt-1">{dialogue.situation}</p>
          </div>
          <button onClick={onBack} className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur rounded-lg flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-white" /></button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-slate-200" /></button>
          <div><p className="text-lg font-extrabold text-slate-100">{dialogue.title}</p><p className="text-[11px] text-slate-300">{dialogue.situation}</p></div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5 flex-1">{dialogue.lines.map(l => <div key={l.id} className={`h-1 flex-1 rounded-full ${fbs[l.id] ? fbs[l.id].score >= 80 ? 'bg-emerald-500' : fbs[l.id].score >= 60 ? 'bg-teal-400' : 'bg-red-400' : listened.includes(l.id) ? 'bg-blue-500/40' : isStu(l) ? 'bg-cyan-500/20' : 'bg-slate-800'}`} />)}</div>
        <div className="flex items-center gap-0.5 bg-slate-900 rounded-md p-0.5 border border-slate-800">
          {[
            { v: 0.6, l: '0.6x' },
            { v: 0.75, l: '0.8x' },
            { v: 0.85, l: '1x' },
            { v: 1.1, l: '1.3x' },
          ].map(o => (
            <button key={o.v} onClick={() => setRate(o.v)} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rate === o.v ? 'bg-cyan-500 text-white' : 'text-slate-300 hover:text-white'}`}>{o.l}</button>
          ))}
        </div>
        <button onClick={() => setVocab(!vocab)} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition ${vocab ? 'bg-cyan-500 text-white' : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-slate-300'}`}><BookOpen className="w-3 h-3" />Vocab</button>
      </div>

      {/* Aria CTA */}
      <button
        onClick={() => setAria(true)}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-[#2A7FFF]/15 to-[#00D4A0]/15 border border-white/10 hover:border-white/20 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2A7FFF] to-[#00D4A0] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Praticar com a Aria</p>
            <p className="text-[10px] text-slate-400">Conversa livre baseada nesta lição · IA com memória</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-[#00D4A0] uppercase tracking-wider">Beta</span>
      </button>




      {vocab && vocabList.length > 0 && (
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-1">
          {vocabList.map((v, i) => <div key={i} className="flex items-center gap-2 text-[11px] bg-slate-800/50 rounded-md px-2.5 py-1.5"><span className="font-bold text-cyan-400">{v.word}</span><span className="text-slate-300">→</span><span className="text-slate-200">{v.translation}</span></div>)}
        </div>
      )}

      {/* Lines */}
      <div className="space-y-1.5">
        {dialogue.lines.map(l => {
          const stu = isStu(l);
          const fb = fbs[l.id];
          const isAct = active?.id === l.id;
          const spking = speakingId === l.id;
          return (
            <div key={l.id} className={`rounded-xl border transition-all ${isAct ? 'ring-1 ring-cyan-500/40' : ''} ${
              fb ? fb.score >= 80 ? 'bg-emerald-500/[0.04] border-emerald-500/15' : fb.score >= 60 ? 'bg-teal-500/[0.04] border-teal-500/15' : 'bg-red-500/[0.04] border-red-500/15'
              : stu ? 'bg-blue-500/[0.03] border-blue-500/10' : 'bg-slate-900/40 border-slate-800/60'}`}>
              <div className="px-3.5 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-semibold ${stu ? 'text-blue-400' : 'text-slate-300'}`}>{stu ? '🎙️ Você' : l.speaker}</span>
                    {fb && <span className={`text-[10px] font-bold ${scoreClr(fb.score)}`}>{fb.score}%</span>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => speak(l)} disabled={!!speakingId} className={`w-6 h-6 rounded flex items-center justify-center ${spking ? 'bg-cyan-500 text-white animate-pulse' : 'text-slate-300 hover:text-slate-300 hover:bg-slate-800'}`}><Volume2 className="w-3.5 h-3.5" /></button>
                    {stu && <button onClick={() => { setActive(isAct ? null : l); setCurFb(null); setTrans(''); setErr(''); setManual(false); setManTxt(''); }}
                      className={`w-6 h-6 rounded flex items-center justify-center ${isAct ? 'bg-cyan-500 text-white' : 'text-cyan-300 hover:text-cyan-400 hover:bg-slate-800'}`}><Mic className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
                <p className="text-[13px] font-medium text-slate-200 leading-relaxed">{l.text}</p>
                <p className="text-[11px] text-slate-300 mt-0.5">{l.translation}</p>
                {l.pronunciationGuide && <p className="text-[10px] text-purple-300 font-mono mt-1">🔊 {l.pronunciationGuide}</p>}
              </div>

              {isAct && stu && (
                <div className="border-t border-slate-800/40 px-3.5 py-2.5 space-y-2">
                  <div className="flex gap-1.5">
                    <button onClick={toggleRec} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold ${rec ? 'bg-red-500 text-white animate-pulse' : 'bg-cyan-500 text-white'}`}>
                      {rec ? <><MicOff className="w-3.5 h-3.5" />Parar</> : <><Mic className="w-3.5 h-3.5" />Gravar</>}
                    </button>
                    {trans && !rec && <button onClick={() => evalSpoken()} disabled={evaluating} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1">
                      {evaluating ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Avaliar</button>}
                  </div>
                  <button onClick={() => setManual(!manual)} className="text-[10px] text-slate-300 hover:text-slate-200">⌨️ {manual ? 'Ocultar' : 'Digitar'}</button>
                  {manual && <div className="flex gap-1.5"><input value={manTxt} onChange={e => setManTxt(e.target.value)} placeholder="Type in English..." className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none focus:border-slate-700" onKeyDown={e => { if (e.key === 'Enter' && manTxt.trim()) { setTrans(manTxt); evalSpoken(manTxt); } }} /><button onClick={() => { if (manTxt.trim()) { setTrans(manTxt); evalSpoken(manTxt); } }} className="w-7 h-7 bg-cyan-500 text-white rounded-lg flex items-center justify-center"><Send className="w-3 h-3" /></button></div>}
                  {trans && <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800"><p className="text-[10px] text-slate-300">Sua fala:</p><p className="text-xs text-slate-300">"{trans}"</p></div>}
                  {err && <p className="text-[10px] text-red-400">{err}</p>}
                  {curFb && (
                    <div className={`rounded-lg border p-2.5 space-y-1.5 ${curFb.score >= 80 ? 'bg-emerald-500/5 border-emerald-500/15' : curFb.score >= 60 ? 'bg-teal-500/5 border-teal-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                      <div className="flex items-center gap-1.5"><Star className={`w-4 h-4 ${scoreClr(curFb.score)}`} /><span className={`text-base font-extrabold ${scoreClr(curFb.score)}`}>{curFb.score}%</span></div>
                      <div className="flex flex-wrap gap-0.5">{curFb.words.map((w, i) => <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${w.isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{w.word}{w.isCorrect ? ' ✓' : ' ✗'}</span>)}</div>
                      <p className="text-[11px] text-slate-300">{curFb.generalVerdict}</p>
                      <button onClick={() => { setCurFb(null); setTrans(''); setManTxt(''); }} className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1"><RotateCcw className="w-2.5 h-2.5" />Repetir</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div ref={endRef} />

      {allDone && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center space-y-3">
          <Award className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="text-base font-extrabold text-emerald-300">Lição Completa! 🎉</p>
          <button onClick={finish} className="bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-bold">Ganhar XP</button>
        </div>
      )}

      {aria && <AriaChat dialogue={dialogue} onClose={() => setAria(false)} />}
    </div>
  );
}

