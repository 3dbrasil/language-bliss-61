import { useState, useMemo } from 'react';
import { Play, Lock, CheckCircle2, Volume2 } from 'lucide-react';
import { Dialogue, Level, UserStats } from '../types';

interface Props { dialogues: Dialogue[]; stats: UserStats; onSelectDialogue: (d: Dialogue) => void; }

const META: Record<Level, { name: string; gradient: string; icon: string; dot: string }> = {
  A1: { name: 'Iniciante', gradient: 'from-emerald-500 to-teal-500', icon: '🌱', dot: 'bg-emerald-500' },
  A2: { name: 'Urbano', gradient: 'from-teal-500 to-cyan-500', icon: '🏙️', dot: 'bg-teal-500' },
  B1: { name: 'Prático', gradient: 'from-teal-500 to-cyan-500', icon: '🩺', dot: 'bg-teal-500' },
  B2: { name: 'Profissional', gradient: 'from-cyan-500 to-red-500', icon: '💼', dot: 'bg-cyan-500' },
  C1: { name: 'Avançado', gradient: 'from-rose-500 to-pink-500', icon: '📜', dot: 'bg-rose-500' },
  C2: { name: 'Expert', gradient: 'from-purple-500 to-violet-500', icon: '👑', dot: 'bg-purple-500' },
};

export default function DuolingoMap({ dialogues, stats, onSelectDialogue }: Props) {
  const levels: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const [sel, setSel] = useState<Level>('A1');

  const ordered = useMemo(() => {
    const o: Record<Level, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
    return [...dialogues].sort((a, b) => o[a.level] !== o[b.level] ? o[a.level] - o[b.level] : a.order - b.order);
  }, [dialogues]);

  const isUnlocked = (idx: number) => {
    const d = ordered[idx]; if (!d) return false;
    if (d.level === 'A1' || idx === 0) return true;
    const prev = ordered[idx - 1];
    return prev ? !!stats.completedDialogues?.includes(prev.id) : true;
  };

  const done = stats.completedDialogues?.length ?? 0;
  const total = dialogues.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const filtered = dialogues.filter(d => d.level === sel).sort((a, b) => a.order - b.order);
  const available = levels.filter(l => dialogues.some(d => d.level === l));
  const m = META[sel];
  const doneInLvl = filtered.filter(d => stats.completedDialogues?.includes(d.id)).length;

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Suas Lições</h1>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 max-w-xs">
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="text-xs text-slate-500 font-semibold">{done}/{total} completas · {pct}%</span>
        </div>
      </div>

      {/* Level tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
        {available.map(l => {
          const lm = META[l];
          const active = sel === l;
          const ld = dialogues.filter(d => d.level === l);
          const lc = ld.filter(d => stats.completedDialogues?.includes(d.id)).length;
          return (
            <button key={l} onClick={() => setSel(l)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all border ${
                active ? `bg-gradient-to-r ${lm.gradient} text-white border-transparent shadow-md` : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
              }`}>
              <span>{lm.icon}</span>
              <span>{l}</span>
              <span className={`text-[9px] font-bold px-1 rounded ${active ? 'bg-white/20' : 'bg-slate-800 text-slate-500'}`}>{lc}/{ld.length}</span>
            </button>
          );
        })}
      </div>

      {/* Level info */}
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${m.dot}`} />
        <span className="text-sm font-bold text-slate-300">{m.name}</span>
        <span className="text-xs text-slate-600">{doneInLvl}/{filtered.length} concluídas</span>
      </div>

      {/* Cards */}
      <div className="space-y-1.5">
        {filtered.map(d => {
          const gIdx = ordered.findIndex(o => o.id === d.id);
          const unlocked = isUnlocked(gIdx);
          const completed = stats.completedDialogues?.includes(d.id);
          const score = stats.pronunciationAverages?.[d.id];

          return (
            <button key={d.id} onClick={() => unlocked && onSelectDialogue(d)} disabled={!unlocked}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border group ${
                completed ? 'bg-emerald-500/[0.06] border-emerald-500/20 hover:border-emerald-500/40'
                : unlocked ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 cursor-pointer'
                : 'bg-slate-950/50 border-slate-900 opacity-40 cursor-not-allowed'
              }`}>

              {/* Thumb */}
              {d.imageUrl ? (
                <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 relative">
                  <img src={d.imageUrl} alt="" className={`w-full h-full object-cover ${!unlocked ? 'grayscale brightness-50' : ''}`} loading="lazy" />
                  {completed && <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-white" /></div>}
                </div>
              ) : (
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                  completed ? 'bg-emerald-500/10' : unlocked ? 'bg-slate-800' : 'bg-slate-900'}`}>
                  {completed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : unlocked ? <Play className="w-4 h-4 text-slate-500 ml-0.5" /> : <Lock className="w-4 h-4 text-slate-700" />}
                </div>
              )}

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-semibold leading-tight ${completed ? 'text-emerald-300' : unlocked ? 'text-slate-200 group-hover:text-white' : 'text-slate-600'}`}>{d.title}</p>
                <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">{d.situation}</p>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 shrink-0">
                {score !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    score >= 80 ? 'bg-emerald-500/10 text-emerald-400' : score >= 60 ? 'bg-teal-500/10 text-teal-400' : 'bg-red-500/10 text-red-400'}`}>{score}%</span>
                )}
                <div className="flex items-center gap-1 text-slate-600"><Volume2 className="w-3 h-3" /><span className="text-[10px]">{d.lines.length}</span></div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-sm text-slate-600 py-10">Nenhuma lição neste nível. Importe via Configurações.</p>}
      </div>
    </div>
  );
}
