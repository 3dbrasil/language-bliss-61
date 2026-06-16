import { useState, useMemo } from 'react';
import { Play, Lock, CheckCircle2, Volume2, ArrowRight, Lightbulb, Flame } from 'lucide-react';
import { Dialogue, Level, UserStats } from '../types';

interface Props { dialogues: Dialogue[]; stats: UserStats; onSelectDialogue: (d: Dialogue) => void; }

const META: Record<Level, { name: string; subtitle: string; tagline: string }> = {
  A1: { name: 'Iniciante', subtitle: 'Fundamentos do Oceano', tagline: 'Saudações, apresentações e estruturas essenciais.' },
  A2: { name: 'Básico+', subtitle: 'Correntes Superficiais', tagline: 'Expandindo seu vocabulário para situações cotidianas.' },
  B1: { name: 'Intermediário', subtitle: 'Mergulho Intermediário', tagline: 'Onde a gramática se torna instinto — opiniões, planos, futuro.' },
  B2: { name: 'Avançado-', subtitle: 'Águas Profundas', tagline: 'Argumentação, nuances e fluência profissional.' },
  C1: { name: 'Avançado', subtitle: 'Correntes Abissais', tagline: 'Sutilezas idiomáticas e pensamento crítico em inglês.' },
  C2: { name: 'Maestria', subtitle: 'Domínio Oceânico', tagline: 'Precisão nativa em qualquer contexto.' },
};

const LEVEL_ORDER: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function DuolingoMap({ dialogues, stats, onSelectDialogue }: Props) {
  const [sel, setSel] = useState<Level>('A1');

  const ordered = useMemo(() => {
    const o: Record<Level, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
    return [...dialogues].sort((a, b) =>
      o[a.level] !== o[b.level] ? o[a.level] - o[b.level] : a.order - b.order
    );
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
  const available = LEVEL_ORDER.filter(l => dialogues.some(d => d.level === l));
  const meta = META[sel];
  const doneInLvl = filtered.filter(d => stats.completedDialogues?.includes(d.id)).length;

  // Next recommended dialogue (first unlocked & not completed)
  const next = useMemo(() => {
    for (let i = 0; i < ordered.length; i++) {
      if (isUnlocked(i) && !stats.completedDialogues?.includes(ordered[i].id)) return ordered[i];
    }
    return null;
  }, [ordered, stats.completedDialogues]);

  return (
    <div className="space-y-10 pb-20 animate-fade-in relative">
      {/* Editorial header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.24em] uppercase text-cyan-500/80">
            Sua jornada
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-light text-white leading-[1.05]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Sua Jornada{' '}
            <span className="italic font-normal text-cyan-400">Premium</span>
          </h1>
          <p className="mt-3 text-slate-400 font-light tracking-wide max-w-md">
            De iniciante A1 a fluente C2 com precisão nativa.
          </p>
        </div>

        {next && (
          <button
            onClick={() => onSelectDialogue(next)}
            className="self-start sm:self-auto px-6 py-2.5 bg-white text-slate-950 rounded-full font-semibold text-sm hover:scale-[1.03] active:scale-[0.98] transition-transform duration-300 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.25)]"
          >
            Continuar Lição
          </button>
        )}
      </header>

      {/* Level tabs (refined chips) */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {available.map(l => {
          const active = sel === l;
          const ld = dialogues.filter(d => d.level === l);
          const lc = ld.filter(d => stats.completedDialogues?.includes(d.id)).length;
          return (
            <button
              key={l}
              onClick={() => setSel(l)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] whitespace-nowrap shrink-0 transition-all duration-300 border ${
                active
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : 'bg-transparent text-slate-500 border-slate-800/70 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <span>{l}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-cyan-500/15 text-cyan-300' : 'bg-slate-800/60 text-slate-500'}`}>
                {lc}/{ld.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bento overview */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 stagger">
        {/* Current level — large */}
        <div className="sm:col-span-8 group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative p-7 sm:p-8 rounded-3xl bg-slate-900/30 border border-slate-800/50 backdrop-blur-sm h-full flex flex-col justify-between hover:border-cyan-500/30 transition-all duration-500">
            <div>
              <div className="flex justify-between items-start gap-4">
                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase">
                  Nível {sel}
                </span>
                <div className="w-12 h-12 rounded-full border-2 border-teal-500/20 flex items-center justify-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-slate-950">
                    <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
              <h3
                className="text-2xl sm:text-3xl mt-6 text-white font-medium"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {meta.subtitle}
              </h3>
              <p className="text-slate-400 mt-2 max-w-md">{meta.tagline}</p>
            </div>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex-1 max-w-[220px]">
                <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-1.5">
                  <span>Progresso</span>
                  <span>{doneInLvl}/{filtered.length}</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all duration-700"
                    style={{ width: `${filtered.length > 0 ? (doneInLvl / filtered.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Streak / Total card */}
        <div className="sm:col-span-4 p-7 sm:p-8 rounded-3xl bg-gradient-to-br from-cyan-600 to-teal-600 text-white relative overflow-hidden group">
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
          <h4 className="text-xs font-medium opacity-80 uppercase tracking-[0.2em] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" strokeWidth={2} /> Ofensiva
          </h4>
          <p
            className="text-5xl sm:text-6xl font-bold mt-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {stats.streak}
          </p>
          <p className="text-sm mt-1 opacity-90">
            Dia{stats.streak !== 1 ? 's' : ''} seguidos praticando
          </p>
          <div className="mt-8 pt-5 border-t border-white/20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
              Progresso Total · {pct}%
            </p>
            <div className="flex gap-1.5 mt-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    i < Math.round(pct / 10) ? 'bg-white' : 'bg-white/25'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Mastery / tip strip */}
        <div className="sm:col-span-12 p-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent rounded-3xl">
          <div className="bg-[#020617] p-6 sm:p-7 rounded-[calc(1.5rem-1px)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                <Lightbulb className="w-6 h-6" strokeWidth={1.6} />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-medium text-white tracking-wide italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {done > 0 ? 'Você está no caminho certo' : 'Comece com Saudações & Apresentações'}
                </h4>
                <p className="text-slate-400 text-sm mt-0.5">
                  {done > 0
                    ? `${done} lições concluídas · próximo objetivo: completar nível ${sel}.`
                    : 'A pronúncia melhora 3× quando você pratica em voz alta todos os dias.'}
                </p>
              </div>
            </div>
            {next && (
              <button
                onClick={() => onSelectDialogue(next)}
                className="self-start sm:self-auto px-5 py-2 border border-slate-800 hover:border-cyan-500/40 hover:text-cyan-300 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300 transition-colors shrink-0"
              >
                Explorar Próxima
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lessons list */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2
            className="text-2xl text-white font-medium"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Lições do Nível {sel}
          </h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">
            {meta.name}
          </span>
        </div>

        <div className="space-y-2 stagger">
          {filtered.map(d => {
            const gIdx = ordered.findIndex(o => o.id === d.id);
            const unlocked = isUnlocked(gIdx);
            const completed = stats.completedDialogues?.includes(d.id);
            const score = stats.pronunciationAverages?.[d.id];

            return (
              <button
                key={d.id}
                onClick={() => unlocked && onSelectDialogue(d)}
                disabled={!unlocked}
                className={`group w-full text-left flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 border ${
                  completed
                    ? 'bg-cyan-500/[0.04] border-cyan-500/20 hover:border-cyan-400/40'
                    : unlocked
                      ? 'bg-slate-900/30 border-slate-800/60 hover:border-cyan-500/30 hover:bg-slate-900/50 cursor-pointer hover:-translate-y-px'
                      : 'bg-slate-950/40 border-slate-900/60 opacity-40 cursor-not-allowed'
                }`}
              >
                {d.imageUrl ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative ring-1 ring-slate-800/60">
                    <img
                      src={d.imageUrl}
                      alt=""
                      className={`w-full h-full object-cover ${!unlocked ? 'grayscale brightness-50' : ''}`}
                      loading="lazy"
                    />
                    {completed && (
                      <div className="absolute inset-0 bg-cyan-500/30 backdrop-blur-[1px] flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      completed
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : unlocked
                          ? 'bg-slate-800/60 text-slate-400 group-hover:text-cyan-400'
                          : 'bg-slate-900/60 text-slate-700'
                    }`}
                  >
                    {completed ? <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                      : unlocked ? <Play className="w-4 h-4 ml-0.5" strokeWidth={2} />
                      : <Lock className="w-4 h-4" strokeWidth={2} />}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${
                    completed ? 'text-cyan-200' : unlocked ? 'text-slate-100' : 'text-slate-600'
                  }`}>
                    {d.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1 font-light">
                    {d.situation}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {score !== undefined && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      score >= 80
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                        : score >= 60
                          ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                          : 'bg-red-500/10 text-red-300 border-red-500/20'
                    }`}>
                      {score}%
                    </span>
                  )}
                  <div className="hidden sm:flex items-center gap-1 text-slate-600">
                    <Volume2 className="w-3 h-3" />
                    <span className="text-[10px]">{d.lines.length}</span>
                  </div>
                  {unlocked && !completed && (
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" strokeWidth={1.8} />
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-slate-600 py-12 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              Nenhuma lição neste nível. Importe via Configurações.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
