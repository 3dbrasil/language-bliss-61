import { useState } from 'react';
import { Map, Sparkles, Settings, Brain, Menu, X, Flame, Zap } from 'lucide-react';
import { UserStats } from '../types';

interface SidebarProps {
  stats: UserStats;
  activeTab: 'map' | 'cumulative' | 'repetition' | 'settings';
  setActiveTab: (tab: 'map' | 'cumulative' | 'repetition' | 'settings') => void;
}

export default function Sidebar({ stats, activeTab, setActiveTab }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const xpPct = Math.min(100, stats.xp % 100);
  const lvl = Math.floor(stats.xp / 100) + 1;
  const totalPct = xpPct; // mirrors header progress

  const nav: { id: SidebarProps['activeTab']; label: string; icon: typeof Map }[] = [
    { id: 'map', label: 'Mapa de Lições', icon: Map },
    { id: 'repetition', label: 'Prática de Diálogo', icon: Brain },
    { id: 'cumulative', label: 'Arena Cumulativa', icon: Sparkles },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const content = (
    <div className="flex flex-col h-full p-7">
      {/* Editorial logo */}
      <div className="mb-10">
        <h1
          className="text-[22px] font-semibold tracking-tight text-white flex items-center gap-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-400 shadow-[0_0_20px_rgba(6,182,212,0.45)]" />
          Speak Native
        </h1>
        <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-500/70 font-medium mt-2 ml-11">
          Ocean Premium
        </p>
      </div>

      {/* Nav */}
      <nav className="space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${
                active
                  ? 'bg-slate-800/40 text-white border border-slate-700/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/20 border border-transparent'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'}`} strokeWidth={1.5} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mini stats row */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-900/40 border border-slate-800/60 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Flame className="w-3 h-3 text-cyan-400" strokeWidth={1.8} />
            <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">Streak</span>
          </div>
          <p className="text-sm font-semibold text-slate-100">{stats.streak}d</p>
        </div>
        <div className="rounded-xl bg-slate-900/40 border border-slate-800/60 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Zap className="w-3 h-3 text-teal-400" strokeWidth={1.8} />
            <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">XP</span>
          </div>
          <p className="text-sm font-semibold text-slate-100">{stats.xp}</p>
        </div>
      </div>

      {/* Progress card */}
      <div className="mt-auto">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/60 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-cyan-500/10 blur-3xl group-hover:bg-cyan-500/20 transition-all duration-700" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-1">Nível {lvl}</p>
            <p className="text-xl font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              {totalPct}%
            </p>
            <div className="w-full h-1 bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all duration-700"
                style={{ width: `${totalPct}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-3">
              {stats.completedDialogues.length} lições concluídas
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg flex items-center justify-center"
        aria-label="Menu"
      >
        {open ? <X className="w-4 h-4 text-slate-300" /> : <Menu className="w-4 h-4 text-slate-300" />}
      </button>
      {open && <div className="lg:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setOpen(false)} />}
      <aside className="hidden lg:flex w-72 border-r border-slate-800/50 bg-[#020617]/80 backdrop-blur-xl flex-col shrink-0 sticky top-0 h-screen z-20">
        {content}
      </aside>
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-[#020617]/95 backdrop-blur-xl border-r border-slate-800/50 z-40 transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </aside>
    </>
  );
}
