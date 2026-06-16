import { useState, useEffect, useRef } from 'react';
import { Sparkles, Volume2, Mic, MicOff, Check, RotateCcw, Send, Award } from 'lucide-react';
import { Level, PronunciationFeedback, UserStats } from '../types';
import { speakAmericanEnglish, evaluatePronunciation } from '../utils/speech';

interface Props { stats: UserStats; learnedVocabulary: string[]; currentLevel: Level; onAddXp: (xp: number) => void; }
interface Ch { title: string; situation: string; targetLine: string; translation: string; level: Level; imageUrl?: string; }

const POOL: Ch[] = [
  { title: "Hotel check-in", situation: "Perguntando sobre café da manhã.", targetLine: "Excuse me, could you tell me what time breakfast is served and where the dining room is located?", translation: "Com licença, a que horas o café da manhã é servido?", level: "A2", imageUrl: "https://images.pexels.com/photos/6876590/pexels-photo-6876590.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=600" },
  { title: "Comprando ingresso", situation: "Bilheteria de museu.", targetLine: "Hi, I'd like to buy two adult tickets for today's exhibition, please.", translation: "Gostaria de dois ingressos para a exposição de hoje.", level: "A1" },
  { title: "Previsão do tempo", situation: "Conversando com vizinho.", targetLine: "It looks like it's going to rain this afternoon. I should probably bring an umbrella just in case.", translation: "Parece que vai chover. Deveria levar um guarda-chuva.", level: "A2" },
  { title: "Problema técnico", situation: "Ligando para suporte.", targetLine: "I've been having trouble with my laptop. The screen keeps freezing and I can't seem to fix it on my own.", translation: "Tenho problemas com meu laptop. A tela fica travando.", level: "B1" },
  { title: "Reunião de equipe", situation: "Apresentando resultados.", targetLine: "Based on our analysis, customer satisfaction has increased by fifteen percent compared to last quarter.", translation: "A satisfação do cliente aumentou 15%.", level: "B2", imageUrl: "https://images.pexels.com/photos/8190827/pexels-photo-8190827.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=600" },
  { title: "Pedindo Uber", situation: "Confirmando corrida.", targetLine: "Hi, are you my Uber driver? I'm going to the downtown convention center on Fifth Avenue.", translation: "Vou ao centro de convenções na Quinta Avenida.", level: "A1" },
  { title: "Negociando salário", situation: "Discutindo com recrutador.", targetLine: "I appreciate the offer, but given my experience and the market rate, I was hoping we could discuss a slightly higher compensation package.", translation: "Esperava discutir compensação um pouco maior.", level: "C1", imageUrl: "https://images.pexels.com/photos/7433851/pexels-photo-7433851.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=600" },
  { title: "Check-in aeroporto", situation: "Check-in no voo.", targetLine: "Good morning! I'd like to check in for the ten thirty flight to Los Angeles. Here's my passport and booking confirmation.", translation: "Gostaria de fazer check-in para o voo das 10:30 para LA.", level: "A2", imageUrl: "https://images.pexels.com/photos/6354991/pexels-photo-6354991.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=600" },
];

export default function CumulativeArena({ stats: _s, learnedVocabulary: _v, currentLevel: _l, onAddXp }: Props) {
  const [ch, setCh] = useState<Ch | null>(null);
  const [isRec, setIsRec] = useState(false);
  const [trans, setTrans] = useState('');
  const [evaling, setEvaling] = useState(false);
  const [fb, setFb] = useState<PronunciationFeedback | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [showMan, setShowMan] = useState(false);
  const [manTxt, setManTxt] = useState('');
  const [spk, setSpk] = useState(false);
  const [cnt, setCnt] = useState(0);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) { const r = new SR(); r.continuous = false; r.interimResults = true; r.lang = 'en-US'; r.onstart = () => { setIsRec(true); setTrans(''); }; r.onresult = (e: any) => { let f = '', i2 = ''; for (let i = e.resultIndex; i < e.results.length; ++i) { if (e.results[i].isFinal) f += e.results[i][0].transcript; else i2 += e.results[i][0].transcript; } setTrans(f || i2); }; r.onerror = () => { setIsRec(false); setShowMan(true); }; r.onend = () => setIsRec(false); recRef.current = r; }
  }, []);

  const gen = () => { setCh(POOL[Math.floor(Math.random() * POOL.length)]); setFb(null); setTrans(''); setClaimed(false); setShowMan(false); setManTxt(''); setCnt(p => p + 1); };
  const speak = async () => { if (!ch || spk) return; setSpk(true); try { await speakAmericanEnglish(ch.targetLine); } catch (_) { } setSpk(false); };
  const toggleRec = () => { if (!recRef.current) { setShowMan(true); return; } if (isRec) recRef.current.stop(); else { setTrans(''); setFb(null); try { recRef.current.start(); } catch (_) { } } };
  const evaluate = async (t?: string) => { if (!ch) return; const s = t || trans; if (!s.trim()) return; setEvaling(true); const r = await evaluatePronunciation(ch.targetLine, s); setFb(r); setEvaling(false); };
  const claim = () => { if (claimed || !fb) return; onAddXp(20); setClaimed(true); };

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">Arena</h1>
        <p className="text-xs text-slate-500 mt-1">Desafios aleatórios de pronúncia · {cnt} tentativas</p>
      </div>

      {!ch ? (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-10 text-center space-y-4">
          <Sparkles className="w-8 h-8 text-teal-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-400">Gere um desafio aleatório e pratique a frase.</p>
          <button onClick={gen} className="bg-cyan-500 text-white px-5 py-2 rounded-lg text-xs font-bold">Iniciar Desafio</button>
        </div>
      ) : (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
          {ch.imageUrl && (
            <div className="relative h-32"><img src={ch.imageUrl} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" /></div>
          )}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div><span className="text-[10px] font-semibold text-slate-500">{ch.level} · Desafio #{cnt}</span><h2 className="text-sm font-bold text-slate-200 mt-0.5">{ch.title}</h2><p className="text-[11px] text-slate-600">{ch.situation}</p></div>
              <button onClick={speak} disabled={spk} className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${spk ? 'bg-cyan-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500 hover:text-white'}`}><Volume2 className="w-4 h-4" /></button>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-800"><p className="text-[13px] font-medium text-slate-200 leading-relaxed">"{ch.targetLine}"</p><p className="text-[11px] text-slate-600 mt-1">{ch.translation}</p></div>
            <div className="flex gap-1.5">
              <button onClick={toggleRec} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold ${isRec ? 'bg-red-500 text-white animate-pulse' : 'bg-cyan-500 text-white'}`}>{isRec ? <><MicOff className="w-3.5 h-3.5" />Parar</> : <><Mic className="w-3.5 h-3.5" />Gravar</>}</button>
              {trans && !isRec && <button onClick={() => evaluate()} disabled={evaling} className="px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1">{evaling ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Avaliar</button>}
            </div>
            <button onClick={() => setShowMan(!showMan)} className="text-[10px] text-slate-600 hover:text-slate-400">⌨️ {showMan ? 'Ocultar' : 'Digitar'}</button>
            {showMan && <div className="flex gap-1.5"><input value={manTxt} onChange={e => setManTxt(e.target.value)} placeholder="Type..." className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none" onKeyDown={e => { if (e.key === 'Enter' && manTxt.trim()) { setTrans(manTxt); evaluate(manTxt); } }} /><button onClick={() => { if (manTxt.trim()) { setTrans(manTxt); evaluate(manTxt); } }} className="w-7 h-7 bg-cyan-500 text-white rounded-lg flex items-center justify-center"><Send className="w-3 h-3" /></button></div>}
            {trans && <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-800"><p className="text-[10px] text-slate-600">Você disse:</p><p className="text-xs text-slate-300">"{trans}"</p></div>}
            {fb && (
              <div className={`rounded-lg border p-3 space-y-1.5 ${fb.score >= 80 ? 'bg-emerald-500/5 border-emerald-500/15' : fb.score >= 60 ? 'bg-teal-500/5 border-teal-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                <span className={`text-xl font-extrabold ${fb.score >= 80 ? 'text-emerald-400' : fb.score >= 60 ? 'text-teal-400' : 'text-red-400'}`}>{fb.score}%</span>
                <div className="flex flex-wrap gap-0.5">{fb.words.map((w, i) => <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${w.isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{w.word}{w.isCorrect ? ' ✓' : ' ✗'}</span>)}</div>
                <p className="text-[11px] text-slate-500">{fb.generalVerdict}</p>
                {!claimed && fb.score >= 50 && <button onClick={claim} className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"><Award className="w-3.5 h-3.5" />+20 XP</button>}
                {claimed && <span className="text-[10px] text-emerald-400 font-semibold">✅ +20 XP!</span>}
              </div>
            )}
          </div>
          <div className="border-t border-slate-800/60 px-5 py-3 flex justify-end"><button onClick={gen} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"><RotateCcw className="w-3 h-3" />Novo</button></div>
        </div>
      )}
    </div>
  );
}
