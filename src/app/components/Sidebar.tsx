import { useState } from 'react';
import { Flame, Zap, Map, Sparkles, Settings, Brain, Menu, X } from 'lucide-react';
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

  const nav = [
    { id: 'map', label: 'Lições', icon: Map },
    { id: 'repetition', label: 'Repetição', icon: Brain },
    { id: 'cumulative', label: 'Arena', icon: Sparkles },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-cyan-500/20">S</div>
          <div>
            <p className="text-sm font-extrabold text-slate-100 tracking-tight">Speak Native</p>
            <p className="text-[10px] text-slate-500 font-medium">Inglês americano</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <div className="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-800">
          <div className="flex items-center gap-1.5 mb-0.5"><Flame className="w-3 h-3 text-cyan-400" /><span className="text-[9px] text-slate-500 font-semibold uppercase">Streak</span></div>
          <p className="text-sm font-extrabold text-slate-200">{stats.streak} dia{stats.streak !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-800">
          <div className="flex items-center gap-1.5 mb-0.5"><Zap className="w-3 h-3 text-teal-400" /><span className="text-[9px] text-slate-500 font-semibold uppercase">XP</span></div>
          <p className="text-sm font-extrabold text-slate-200">{stats.xp}</p>
        </div>
      </div>

      {/* XP bar */}
      <div className="px-4 pb-4">
        <div className="flex justify-between text-[9px] text-slate-500 font-semibold mb-1">
          <span>Nível {lvl}</span><span>{xpPct}/100</span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      <div className="h-px bg-slate-800/80 mx-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {nav.map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => { setActiveTab(item.id as any); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                active ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
              }`}>
              <Icon className={`w-[18px] h-[18px] ${active ? 'text-cyan-400' : 'text-slate-600'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-800/80">
        <p className="text-[9px] text-slate-600 text-center">v2.0 • {stats.completedDialogues.length} lições completas</p>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(!open)} className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center">
        {open ? <X className="w-4 h-4 text-slate-300" /> : <Menu className="w-4 h-4 text-slate-300" />}
      </button>
      {open && <div className="lg:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setOpen(false)} />}
      <aside className="hidden lg:flex w-52 bg-slate-950 border-r border-slate-800/60 flex-col shrink-0">{content}</aside>
      <aside className={`lg:hidden fixed inset-y-0 left-0 w-56 bg-slate-950 z-40 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>{content}</aside>
    </>
  );
}
