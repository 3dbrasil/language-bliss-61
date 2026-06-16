import { useState, useMemo, useEffect } from 'react';
import { Play, Lock, CheckCircle2, Volume2, ArrowRight, Lightbulb, Flame, Sparkles, Waves } from 'lucide-react';
import { Dialogue, Level, UserStats } from '../types';
import { findCoverImage } from '../utils/imageSearch';
import bannerImg from '@/assets/map-banner.jpg';
import catConversation from '@/assets/cat-conversation.jpg';
import catPronunciation from '@/assets/cat-pronunciation.jpg';
import catAchievement from '@/assets/cat-achievement.jpg';

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
  const [images, setImages] = useState<Record<string, string>>({});

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

  useEffect(() => {
    let cancelled = false;
    const missing = filtered.filter(d => !d.imageUrl && !images[d.id]);
    if (missing.length === 0) return;
    (async () => {
      for (const d of missing) {
        try {
          const url = await findCoverImage(d.title, d.situation, d.id);
          if (cancelled) return;
          if (url) setImages(prev => (prev[d.id] ? prev : { ...prev, [d.id]: url }));
        } catch (_) { /* ignore — fallback handled in render */ }
      }
    })();
    return () => { cancelled = true; };
  }, [filtered, images]);
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
      {/* Cinematic banner — landing aesthetic */}
      <div className="relative -mx-5 sm:-mx-10 lg:-mx-12 -mt-8 sm:-mt-12 mb-2">
        <div className="relative h-56 sm:h-72 overflow-hidden">
          <img
            src={bannerImg}
            alt=""
            width={1920}
            height={640}
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1A]/30 via-[#0A0F1A]/60 to-[#0A0F1A]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F1A] via-transparent to-[#0A0F1A]/40" />

          <div className="relative h-full max-w-6xl mx-auto px-5 sm:px-10 lg:px-12 flex flex-col justify-end pb-8">
            <div className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md text-[10px] font-medium text-slate-200 mb-3">
              <Waves className="w-3 h-3 text-[#00D4A0]" />
              <span className="uppercase tracking-[0.2em]">Sua jornada</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[0.95] text-white">
              Domine inglês,{' '}
              <span className="bg-gradient-to-r from-[#2A7FFF] via-[#5BA0FF] to-[#00D4A0] bg-clip-text text-transparent">
                conversa por conversa
              </span>
            </h1>
          </div>
        </div>
      </div>

      {/* CTA row */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-400 max-w-md text-sm leading-relaxed">
          De iniciante A1 a fluente C2 — diálogos reais com IA de pronúncia que escuta cada sílaba.
        </p>
        {next && (
          <button
            onClick={() => onSelectDialogue(next)}
            className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-white overflow-hidden self-start sm:self-auto"
          >
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0]" />
            <span className="absolute inset-0 rounded-2xl shadow-[0_10px_40px_-10px_rgba(42,127,255,0.7)] group-hover:shadow-[0_15px_50px_-10px_rgba(42,127,255,0.9)] transition-shadow" />
            <Sparkles className="relative w-4 h-4" />
            <span className="relative">Continuar lição</span>
          </button>
        )}
      </header>




      {/* Bento with imagery */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 stagger">
        {/* Current level — large with conversation art */}
        <div className="sm:col-span-8 relative rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden">
          <img
            src={catConversation}
            alt=""
            loading="lazy"
            width={768}
            height={768}
            className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-25 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F1A] via-[#0A0F1A]/85 to-transparent" />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#2A7FFF]/20 blur-3xl" />
          <div className="relative p-7 sm:p-9 h-full flex flex-col justify-between min-h-[280px]">
            <div>
              <div className="flex justify-between items-start gap-4">
                <span className="px-3 py-1 bg-gradient-to-r from-[#2A7FFF]/20 to-[#00D4A0]/20 text-white border border-white/10 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase backdrop-blur-md">
                  Nível {sel}
                </span>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2A7FFF] to-[#00D4A0] flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(42,127,255,0.4)]">
                  <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-3xl sm:text-4xl mt-6 text-white font-bold tracking-tight leading-tight">
                {meta.subtitle}
              </h3>
              <p className="text-slate-400 mt-3 max-w-md text-sm leading-relaxed">{meta.tagline}</p>
            </div>
            <div className="mt-8">
              <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">
                <span>Progresso</span>
                <span className="text-[#00D4A0]">{doneInLvl}/{filtered.length}</span>
              </div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden max-w-[280px]">
                <div
                  className="h-full bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] shadow-[0_0_14px_rgba(0,212,160,0.5)] transition-all duration-700"
                  style={{ width: `${filtered.length > 0 ? (doneInLvl / filtered.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Streak card — gradient + trophy art */}
        <div className="sm:col-span-4 relative rounded-3xl overflow-hidden group min-h-[280px]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2A7FFF] to-[#00D4A0]" />
          <img
            src={catAchievement}
            alt=""
            loading="lazy"
            width={768}
            height={768}
            className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
          />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/15 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          <div className="relative p-7 sm:p-8 h-full flex flex-col justify-between text-white">
            <div>
              <h4 className="text-[10px] font-bold opacity-90 uppercase tracking-[0.22em] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" strokeWidth={2.2} /> Ofensiva
              </h4>
              <p className="text-6xl sm:text-7xl font-bold mt-3 tracking-tight">{stats.streak}</p>
              <p className="text-xs mt-1 opacity-90">
                Dia{stats.streak !== 1 ? 's' : ''} seguidos
              </p>
            </div>
            <div className="pt-5 border-t border-white/20">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-90">
                Total · {pct}%
              </p>
              <div className="flex gap-1 mt-2">
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
        </div>

        {/* Tip strip — with mic art */}
        <div className="sm:col-span-12 relative rounded-3xl overflow-hidden bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <img
            src={catPronunciation}
            alt=""
            loading="lazy"
            width={768}
            height={768}
            className="absolute right-0 top-0 h-full w-56 object-cover opacity-25 mix-blend-luminosity hidden sm:block"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0A0F1A]/70 to-[#0A0F1A]" />
          <div className="relative p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2A7FFF]/20 to-[#00D4A0]/20 border border-white/10 flex items-center justify-center text-[#5BA0FF] shrink-0 backdrop-blur-md">
                <Lightbulb className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold text-white">
                  {done > 0 ? 'Você está no caminho certo' : 'Comece com Saudações & Apresentações'}
                </h4>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                  {done > 0
                    ? `${done} lições concluídas · próximo objetivo: completar nível ${sel}.`
                    : 'A pronúncia melhora 3× quando você pratica em voz alta todos os dias.'}
                </p>
              </div>
            </div>
            {next && (
              <button
                onClick={() => onSelectDialogue(next)}
                className="self-start sm:self-auto px-5 py-2.5 border border-white/10 hover:border-[#2A7FFF]/40 hover:text-white rounded-full text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300 transition-colors shrink-0 bg-white/[0.02] backdrop-blur-md"
              >
                Explorar próxima
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

        {/* Level tabs — acima das lições */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {available.map(l => {
            const active = sel === l;
            const ld = dialogues.filter(d => d.level === l);
            const lc = ld.filter(d => stats.completedDialogues?.includes(d.id)).length;
            return (
              <button
                key={l}
                onClick={() => setSel(l)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] whitespace-nowrap shrink-0 transition-all duration-300 border backdrop-blur-md ${
                  active
                    ? 'bg-gradient-to-r from-[#2A7FFF]/15 to-[#00D4A0]/15 text-white border-[#2A7FFF]/40 shadow-[0_0_20px_rgba(42,127,255,0.25)]'
                    : 'bg-white/[0.02] text-slate-500 border-white/5 hover:border-white/15 hover:text-slate-200'
                }`}
              >
                <span>{l}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/15 text-white' : 'bg-white/[0.04] text-slate-500'}`}>
                  {lc}/{ld.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {filtered.map(d => {
            const gIdx = ordered.findIndex(o => o.id === d.id);
            const unlocked = isUnlocked(gIdx);
            const completed = stats.completedDialogues?.includes(d.id);
            const score = stats.pronunciationAverages?.[d.id];
            const image = d.imageUrl || images[d.id];
            const lessonPct = completed ? 100 : score ?? 0;

            return (
              <button
                key={d.id}
                onClick={() => unlocked && onSelectDialogue(d)}
                disabled={!unlocked}
                className={`group relative text-left overflow-hidden transition-all duration-300 w-full ${
                  unlocked ? 'hover:-translate-y-1 cursor-pointer' : 'opacity-60 cursor-not-allowed grayscale'
                }`}
                style={{
                  borderRadius: 24,
                  height: 130,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                }}
              >
                {image ? (
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 animate-pulse" />
                )}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 100%)' }}
                />

                <div className="absolute top-3 right-3 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md ${
                    completed ? 'bg-[#00D4A0] text-white' : unlocked ? 'bg-white/25 text-white' : 'bg-black/40 text-white/70'
                  }`}>
                    {completed ? <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                      : unlocked ? <Play className="w-3.5 h-3.5 ml-0.5" strokeWidth={2.5} />
                      : <Lock className="w-3.5 h-3.5" strokeWidth={2.5} />}
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-4 text-left">
                  <h3 className="font-bold text-white text-[17px] leading-tight line-clamp-2 drop-shadow">
                    {d.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/80">
                      <Volume2 className="w-3 h-3" />
                      {d.lines.length} linhas
                    </span>
                    {score !== undefined && (
                      <span className="text-[11px] font-semibold text-white/90">· {score}%</span>
                    )}
                  </div>
                  <div className="mt-2 h-1 bg-white/25 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${lessonPct}%`,
                        background: completed
                          ? 'linear-gradient(90deg, #00D4A0, #5BE3C1)'
                          : 'linear-gradient(90deg, #2A7FFF, #00D4A0)',
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-slate-600 py-12 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              Nenhuma lição neste nível. Importe via Configurações.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
