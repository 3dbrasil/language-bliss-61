import { useState, useEffect, useCallback } from 'react';
import { defaultDialogues } from './data/defaultDialogues';
import { Dialogue, UserStats, Level, Badge } from './types';
import Sidebar from './components/Sidebar';
import DuolingoMap from './components/DuolingoMap';
import DialoguePractice from './components/DialoguePractice';
import CumulativeArena from './components/CumulativeArena';
import SettingsView from './components/SettingsView';
import PhraseRepetition from './components/PhraseRepetition';
import { Sparkles, Trophy } from 'lucide-react';
import { preloadVoices } from './utils/speech';

const INIT: UserStats = { xp: 0, streak: 1, lastActive: null, badges: [], completedDialogues: [], unlockedLevels: ['A1'], pronunciationAverages: {} };

export default function App() {
  const [dialogues, setDialogues] = useState<Dialogue[]>(defaultDialogues);
  const [stats, setStats] = useState<UserStats>(INIT);
  const [tab, setTab] = useState<'map' | 'cumulative' | 'repetition' | 'settings'>('map');
  const [selected, setSelected] = useState<Dialogue | null>(null);
  const [showCeleb, setShowCeleb] = useState(false);
  const [celeb, setCeleb] = useState<{ title: string; desc: string; xp: number } | null>(null);

  useEffect(() => { preloadVoices(); setTimeout(preloadVoices, 500); }, []);

  useEffect(() => {
    const saved = localStorage.getItem('speak_native_user_stats_v2');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        const s: UserStats = {
          xp: typeof p.xp === 'number' ? p.xp : 0,
          streak: typeof p.streak === 'number' ? p.streak : 1,
          lastActive: typeof p.lastActive === 'string' ? p.lastActive : null,
          badges: Array.isArray(p.badges) ? p.badges : [],
          completedDialogues: Array.isArray(p.completedDialogues) ? p.completedDialogues : [],
          unlockedLevels: Array.isArray(p.unlockedLevels) ? p.unlockedLevels : ['A1'],
          pronunciationAverages: p.pronunciationAverages && typeof p.pronunciationAverages === 'object' ? p.pronunciationAverages : {}
        };
        const today = new Date().toISOString().split('T')[0];
        if (s.lastActive && s.lastActive !== today) {
          const diff = Math.ceil(Math.abs(new Date(today).getTime() - new Date(s.lastActive).getTime()) / 86400000);
          if (diff === 1) s.streak += 1; else if (diff > 1) s.streak = 1;
        }
        setStats(s);
      } catch (_) { setStats(INIT); }
    }
    // Custom dialogues
    let custom: Dialogue[] = [];
    try { const c = localStorage.getItem('speak_native_custom_dialogues_v2'); if (c) { const p = JSON.parse(c); if (Array.isArray(p)) custom = p; } } catch (_) {}
    let deleted: string[] = [];
    try { const d = localStorage.getItem('speak_native_deleted_dialogues_v2'); if (d) { const p = JSON.parse(d); if (Array.isArray(p)) deleted = p; } } catch (_) {}
    const ids = new Set(defaultDialogues.map(d => d.id));
    const merged = [...defaultDialogues, ...custom.filter(d => d?.id && !ids.has(d.id))].filter(d => d?.id && !deleted.includes(d.id));
    setDialogues(merged);
  }, []);

  const save = useCallback((s: UserStats) => { setStats(s); localStorage.setItem('speak_native_user_stats_v2', JSON.stringify(s)); }, []);

  const handleReset = () => {
    localStorage.removeItem('speak_native_user_stats_v2');
    localStorage.removeItem('speak_native_custom_dialogues_v2');
    localStorage.removeItem('speak_native_deleted_dialogues_v2');
    setStats(INIT); setDialogues(defaultDialogues); setSelected(null); setTab('map');
  };

  const handleDelete = (id: string) => {
    let custom: Dialogue[] = []; try { const c = localStorage.getItem('speak_native_custom_dialogues_v2'); if (c) custom = JSON.parse(c); } catch (_) {}
    localStorage.setItem('speak_native_custom_dialogues_v2', JSON.stringify(custom.filter(d => d.id !== id)));
    let del: string[] = []; try { const d = localStorage.getItem('speak_native_deleted_dialogues_v2'); if (d) del = JSON.parse(d); } catch (_) {}
    if (!del.includes(id)) del.push(id);
    localStorage.setItem('speak_native_deleted_dialogues_v2', JSON.stringify(del));
    setDialogues(p => p.filter(d => d.id !== id));
  };

  const handleImport = (imported: Dialogue[]) => {
    let custom: Dialogue[] = []; try { const c = localStorage.getItem('speak_native_custom_dialogues_v2'); if (c) custom = JSON.parse(c); } catch (_) {}
    const ids = new Set(custom.map(d => d.id));
    const updated = [...custom, ...imported.filter(d => !ids.has(d.id))];
    localStorage.setItem('speak_native_custom_dialogues_v2', JSON.stringify(updated));
    const allIds = new Set(dialogues.map(d => d.id));
    setDialogues(p => [...p, ...imported.filter(d => !allIds.has(d.id))]);
  };

  const handleComplete = (xp: number, scores: Record<string, number>) => {
    if (!selected) return;
    const s = { ...stats };
    s.lastActive = new Date().toISOString().split('T')[0];
    s.xp += xp;
    if (!s.completedDialogues.includes(selected.id)) s.completedDialogues.push(selected.id);
    const vals = Object.values(scores);
    s.pronunciationAverages[selected.id] = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const lvls: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const li = lvls.indexOf(selected.level);
    if (li < lvls.length - 1) {
      const next = lvls[li + 1];
      const cur = dialogues.filter(d => d.level === selected.level);
      if (cur.every(d => s.completedDialogues.includes(d.id)) && !s.unlockedLevels.includes(next)) s.unlockedLevels.push(next);
    }
    const avg = s.pronunciationAverages[selected.id];
    const chk = (id: string, t: string, d: string, ic: string, cond: boolean) => { if (cond && !s.badges.find(b => b.id === id)) s.badges.push({ id, title: t, description: d, icon: ic, unlockedAt: s.lastActive! } as Badge); };
    chk('first', 'Primeira Lição', 'Completou sua primeira lição', '🎓', s.completedDialogues.length >= 1);
    chk('five', 'Dedicado', 'Completou 5 lições', '📚', s.completedDialogues.length >= 5);
    chk('perfect', 'Perfeito', '100% em uma lição', '🌟', avg >= 100);
    chk('streak3', 'Consistente', '3 dias seguidos', '🔥', s.streak >= 3);
    chk('xp100', 'Centurião', '100 XP', '⚡', s.xp >= 100);
    save(s);
    setCeleb({ title: avg >= 80 ? 'Excelente! 🌟' : avg >= 60 ? 'Bom trabalho! 👍' : 'Concluído! 💪', desc: selected.title, xp });
    setShowCeleb(true);
    setSelected(null);
  };

  const handleAddXp = (xp: number) => { const s = { ...stats }; s.xp += xp; s.lastActive = new Date().toISOString().split('T')[0]; save(s); };
  const vocab = dialogues.filter(d => stats.completedDialogues.includes(d.id)).flatMap(d => d.lines.flatMap(l => l.keyVocabulary?.map(v => v.word) || []));
  const curLvl: Level = stats.unlockedLevels.length > 0 ? stats.unlockedLevels[stats.unlockedLevels.length - 1] : 'A1';

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-300 relative">
      <Sidebar stats={stats} activeTab={tab} setActiveTab={t => { setTab(t); setSelected(null); }} />

      <main className="flex-1 overflow-y-auto min-h-screen relative">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-12">
          <div className="lg:hidden h-10" />
          {selected ? <DialoguePractice dialogue={selected} stats={stats} onBack={() => setSelected(null)} onComplete={handleComplete} />
            : tab === 'map' ? <DuolingoMap dialogues={dialogues} stats={stats} onSelectDialogue={setSelected} />
            : tab === 'cumulative' ? <CumulativeArena stats={stats} learnedVocabulary={vocab} currentLevel={curLvl} onAddXp={handleAddXp} />
            : tab === 'repetition' ? <PhraseRepetition dialogues={dialogues} completedDialogues={stats.completedDialogues} onAddXp={handleAddXp} />
            : <SettingsView stats={stats} dialogues={dialogues} onImportDialogues={handleImport} onDeleteDialogue={handleDelete} onResetProgress={handleReset} />}
        </div>
      </main>

      {showCeleb && celeb && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowCeleb(false)}>
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full text-center space-y-5 border border-slate-800/60 ocean-glow" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(6,182,212,0.4)]"><Trophy className="w-8 h-8 text-white" /></div>
            <div>
              <h3 className="text-2xl font-medium text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{celeb.title}</h3>
              <p className="text-xs text-slate-500 mt-1.5">{celeb.desc}</p>
            </div>
            <div className="bg-cyan-500/10 rounded-2xl p-4 border border-cyan-500/20">
              <div className="flex items-center justify-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-cyan-400" /><span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.18em]">Você ganhou</span></div>
              <p className="text-3xl font-bold text-cyan-400 mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>+{celeb.xp} XP</p>
            </div>
            <button onClick={() => setShowCeleb(false)} className="w-full bg-white text-slate-950 py-3 rounded-full text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] transition-transform">Continuar</button>
          </div>
        </div>
      )}
    </div>
  );
}
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCeleb(false)}>
          <div className="bg-slate-900 rounded-2xl p-6 max-w-xs w-full text-center space-y-4 border border-slate-800 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20"><Trophy className="w-7 h-7 text-white" /></div>
            <div><h3 className="text-lg font-extrabold text-slate-100">{celeb.title}</h3><p className="text-xs text-slate-500 mt-0.5">{celeb.desc}</p></div>
            <div className="bg-cyan-500/10 rounded-xl p-3 border border-cyan-500/15"><div className="flex items-center justify-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-cyan-400" /><span className="text-xs font-bold text-cyan-400">Você ganhou</span></div><p className="text-xl font-extrabold text-cyan-400 mt-0.5">+{celeb.xp} XP</p></div>
            <button onClick={() => setShowCeleb(false)} className="w-full bg-cyan-500 text-white py-2 rounded-xl text-xs font-bold">Continuar</button>
          </div>
        </div>
      )}
    </div>
  );
}
