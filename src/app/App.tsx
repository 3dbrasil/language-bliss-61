import { useState, useEffect, useCallback } from 'react';
import { defaultDialogues } from './data/defaultDialogues';
import { Dialogue, UserStats, Level, Badge } from './types';
import TopNav from './components/TopNav';
import DuolingoMap from './components/DuolingoMap';
import DialoguePractice from './components/DialoguePractice';
import CumulativeArena from './components/CumulativeArena';
import SettingsView from './components/SettingsView';
import PhraseRepetition from './components/PhraseRepetition';
import { Sparkles, Trophy } from 'lucide-react';
import { preloadVoices } from './utils/speech';
import { findCoverImage } from './utils/imageSearch';

const INIT: UserStats = { xp: 0, streak: 1, lastActive: null, badges: [], completedDialogues: [], unlockedLevels: ['A1'], pronunciationAverages: {} };

function imageIdentity(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('images.unsplash.com') || parsed.hostname.includes('images.pexels.com')) {
      return `${parsed.origin}${parsed.pathname}`;
    }
    parsed.searchParams.delete('ixid');
    return parsed.toString();
  } catch (_) {
    return url;
  }
}

function enrichImportedLine(line: Dialogue['lines'][number], idx: number): Dialogue['lines'][number] {
  let speaker = (line.speaker || 'You (Student)').trim();
  let text = (line.text || '').trim();
  let translation = (line.translation || '').trim();
  const inline = text.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{1,30}?)\s*[:\-–]\s*(.+)$/);
  if (inline) { speaker = inline[1].trim(); text = inline[2].trim(); }
  if (text.includes(' | ')) {
    const parts = text.split(/\s+\|\s+/);
    text = parts[0].trim();
    if (!translation && parts[1]) translation = parts.slice(1).join(' ').trim();
  }
  if (/^(you|student|aluno|aluna|você|voce)$/i.test(speaker)) speaker = 'You (Student)';
  const cleanText = text.replace(/^["“”'‘’]+|["“”'‘’]+$/g, '').trim();
  const cleanTranslation = translation.replace(/^["“”'‘’]+|["“”'‘’]+$/g, '').trim();
  const guide = line.pronunciationGuide || cleanText.toLowerCase().replace(/\bhello\b/g, 'he-lou').replace(/\byou\b/g, 'iu').replace(/\bplease\b/g, 'pliz');
  const keyVocabulary = line.keyVocabulary?.length ? line.keyVocabulary : (cleanText.match(/\b[A-Za-z][A-Za-z'-]{3,}\b/g) || []).slice(0, 2).map(word => ({ word, translation: cleanTranslation || 'ver tradução da frase' }));
  return { ...line, id: line.id || `imported-line-${idx}`, speaker, text: cleanText, translation: cleanTranslation, pronunciationGuide: guide, keyVocabulary };
}

function normalizeImportedDialogue(dialogue: Dialogue): Dialogue {
  return { ...dialogue, lines: (dialogue.lines || []).map(enrichImportedLine).filter(l => l.text) };
}

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
    repairRepeatedImages(merged, custom, deleted);
  }, []);

  const repairRepeatedImages = async (merged: Dialogue[], custom: Dialogue[], deleted: string[]) => {
    const seen = new Set<string>();
    const avoid = new Set<string>();
    const fixedCustom = [...custom];
    let changed = false;

    for (const d of merged) {
      if (!d.imageUrl) continue;
      const identity = imageIdentity(d.imageUrl);
      if (seen.has(identity)) {
        const idx = fixedCustom.findIndex(c => c.id === d.id);
        if (idx >= 0) {
          try {
            const imageUrl = await findCoverImage(d.title, d.situation, d.id, [...avoid]);
            fixedCustom[idx] = { ...fixedCustom[idx], imageUrl };
            avoid.add(imageIdentity(imageUrl));
            changed = true;
          } catch (_) {}
        }
        continue;
      }
      seen.add(identity);
      avoid.add(identity);
    }

    if (!changed) return;
    const builtinIds = new Set(defaultDialogues.map(d => d.id));
    const repaired = [...defaultDialogues, ...fixedCustom.filter(d => d?.id && !builtinIds.has(d.id))].filter(d => d?.id && !deleted.includes(d.id));
    localStorage.setItem('speak_native_custom_dialogues_v2', JSON.stringify(fixedCustom));
    setDialogues(repaired);
  };

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
    <div className="flex flex-col min-h-screen bg-[#0A0F1A] text-slate-300 relative overflow-hidden">
      {/* Ambient ocean orbs — same DNA as the landing */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[#2A7FFF]/12 blur-[140px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#00D4A0]/10 blur-[140px]" />
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] rounded-full bg-[#7C5CFF]/6 blur-[120px]" />
      </div>

      <TopNav stats={stats} activeTab={tab} setActiveTab={(t) => { setTab(t); setSelected(null); }} />

      <main className="flex-1 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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

