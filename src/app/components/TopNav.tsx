import { Map, Sparkles, Settings, Brain, Flame, Zap, LogIn, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { UserStats } from '../types';

interface Props {
  stats: UserStats;
  activeTab: 'map' | 'cumulative' | 'repetition' | 'settings';
  setActiveTab: (tab: 'map' | 'cumulative' | 'repetition' | 'settings') => void;
}

export default function TopNav({ stats, activeTab, setActiveTab }: Props) {
  const lvl = Math.floor(stats.xp / 100) + 1;
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  const nav: { id: Props['activeTab']; label: string; icon: typeof Map }[] = [
    { id: 'map', label: 'Mapa', icon: Map },
    { id: 'repetition', label: 'Prática', icon: Brain },
    { id: 'cumulative', label: 'Arena', icon: Sparkles },
    { id: 'settings', label: 'Config', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0A0F1A]/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-400 shadow-[0_0_16px_rgba(6,182,212,0.45)]" />
          <h1 className="text-sm font-semibold tracking-tight text-white hidden sm:block" style={{ fontFamily: "'Playfair Display', serif" }}>
            Speak Native
          </h1>
        </div>

        <nav className="flex items-center gap-1 flex-1 justify-center sm:justify-start">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-label={item.label}
                title={item.label}
                className={`group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  active
                    ? 'bg-white/[0.06] text-white border border-white/10'
                    : 'text-slate-500 hover:text-white hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-cyan-400' : ''}`} strokeWidth={1.8} />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/5">
            <Flame className="w-3 h-3 text-cyan-400" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-slate-200">{stats.streak}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/5">
            <Zap className="w-3 h-3 text-teal-400" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-slate-200">{stats.xp}</span>
          </div>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-slate-500 font-medium">
            Lv {lvl}
          </span>
        </div>
      </div>
    </header>
  );
}
