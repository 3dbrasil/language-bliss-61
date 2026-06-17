import { Suspense, lazy, useState, useEffect, useCallback, useMemo } from 'react';
import { defaultDialogues } from './data/defaultDialogues';
import { Dialogue, UserStats, Level, Badge } from './types';
import TopNav from './components/TopNav';
import DuolingoMap from './components/DuolingoMap';
import CumulativeArena from './components/CumulativeArena';
import { Sparkles, Trophy } from 'lucide-react';
import { preloadVoices } from './utils/speech';
import { isLikelyBrokenCoverImageUrl } from './utils/imageSearch';
import { supabase } from '@/integrations/supabase/client';


const DialoguePractice = lazy(() => import('./components/DialoguePractice'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const PhraseRepetition = lazy(() => import('./components/PhraseRepetition'));

const INIT: UserStats = { xp: 0, streak: 1, lastActive: null, badges: [], completedDialogues: [], unlockedLevels: ['A1'], pronunciationAverages: {} };

function isLevel(value: unknown): value is Level {
  return value === 'A1' || value === 'A2' || value === 'B1' || value === 'B2' || value === 'C1' || value === 'C2';
}

function enrichImportedLine(line: Dialogue['lines'][number], idx: number): Dialogue['lines'][number] {
  let speaker = (typeof line.speaker === 'string' && line.speaker.trim() ? line.speaker : 'You (Student)').trim();
  let text = (typeof line.text === 'string' ? line.text : '').trim();
  let translation = (typeof line.translation === 'string' ? line.translation : '').trim();
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
  const guide = typeof line.pronunciationGuide === 'string' && line.pronunciationGuide.trim()
    ? line.pronunciationGuide
    : cleanText.toLowerCase().replace(/\bhello\b/g, 'he-lou').replace(/\byou\b/g, 'iu').replace(/\bplease\b/g, 'pliz');
  const importedVocabulary = Array.isArray(line.keyVocabulary)
    ? line.keyVocabulary
      .map((item) => ({
        word: typeof item?.word === 'string' ? item.word.trim() : '',
        translation: typeof item?.translation === 'string' ? item.translation.trim() : cleanTranslation || 'ver tradução da frase',
      }))
      .filter((item) => item.word)
    : [];
  const keyVocabulary = importedVocabulary.length ? importedVocabulary : (cleanText.match(/\b[A-Za-z][A-Za-z'-]{3,}\b/g) || []).slice(0, 2).map(word => ({ word, translation: cleanTranslation || 'ver tradução da frase' }));
  return { ...line, id: line.id || `imported-line-${idx}`, speaker, text: cleanText, translation: cleanTranslation, pronunciationGuide: guide, keyVocabulary };
}

function normalizeImportedDialogue(dialogue: Partial<Dialogue> | null | undefined): Dialogue | null {
  if (!dialogue || typeof dialogue !== 'object') return null;
  const rawLines = Array.isArray(dialogue.lines) ? dialogue.lines : [];
  const lines = rawLines
    .filter((line): line is Dialogue['lines'][number] => !!line && typeof line === 'object')
    .map(enrichImportedLine)
    .filter(l => l.text);
  if (!lines.length) return null;
  const safeDialogue: Dialogue = {
    id: typeof dialogue.id === 'string' && dialogue.id.trim() ? dialogue.id.trim() : `imported-${lines[0].id}`,
    title: typeof dialogue.title === 'string' && dialogue.title.trim() ? dialogue.title.trim() : 'Diálogo importado',
    situation: typeof dialogue.situation === 'string' && dialogue.situation.trim() ? dialogue.situation.trim() : `${lines.length} falas`,
    level: isLevel(dialogue.level) ? dialogue.level : 'A1',
    order: typeof dialogue.order === 'number' && Number.isFinite(dialogue.order) ? dialogue.order : 1,
    lines,
  };
  // Leave imageUrl undefined when missing/broken so DuolingoMap fetches a real Unsplash cover.
  if (typeof dialogue.imageUrl === 'string' && !isLikelyBrokenCoverImageUrl(dialogue.imageUrl)) {
    safeDialogue.imageUrl = dialogue.imageUrl;
  }
  const hasStudent = lines.some(l => /you|student/i.test(l.speaker));
  if (!hasStudent) {
    const speakers = Array.from(new Set(lines.map(l => l.speaker).filter(Boolean)));
    const studentSpeaker = speakers[1];
    if (studentSpeaker) {
      return { ...safeDialogue, lines: lines.map(l => l.speaker === studentSpeaker ? { ...l, speaker: 'You (Student)' } : l) };
    }
  }
  return safeDialogue;
}

function normalizeImportedDialogues(value: unknown): Dialogue[] {
  if (!Array.isArray(value)) return [];
  return value.map((dialogue) => normalizeImportedDialogue(dialogue as Partial<Dialogue>)).filter((dialogue): dialogue is Dialogue => Boolean(dialogue));
}

// Strip heavy fields (base64 data URLs) before persisting to avoid quota errors.
function slimForStorage(dialogues: Dialogue[]): Dialogue[] {
  return dialogues.map((d) => {
    const copy: Dialogue = { ...d };
    if (typeof copy.imageUrl === 'string' && copy.imageUrl.startsWith('data:')) {
      delete (copy as Partial<Dialogue>).imageUrl;
    }
    return copy;
  });
}

const LS_CUSTOM = 'speak_native_custom_dialogues_v2';
const LS_DELETED = 'speak_native_deleted_dialogues_v2';

function LoadingPanel() {
  return (
    <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
      Carregando…
    </div>
  );
}

// Legacy localStorage cleanup (one-time; old shared-account remnants)
function cleanupLegacyLocal(): void {
  try { localStorage.removeItem('speak_native_custom_dialogues_v2'); } catch {}
  try { localStorage.removeItem(LS_DELETED); } catch {}
}

export default function App() {
  const [dialogues, setDialogues] = useState<Dialogue[]>(defaultDialogues);
  const [stats, setStats] = useState<UserStats>(INIT);
  const [tab, setTab] = useState<'map' | 'cumulative' | 'repetition' | 'settings'>('map');
  const [selected, setSelected] = useState<Dialogue | null>(null);
  const [showCeleb, setShowCeleb] = useState(false);
  const [celeb, setCeleb] = useState<{ title: string; desc: string; xp: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { preloadVoices(); setTimeout(preloadVoices, 500); }, []);

  // Load user identity + per-user stats + shared dialogues + own hide-list
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      const email = userData.user?.email ?? null;
      setUserId(uid);
      setIsAdmin(email === 'ric570683@gmail.com');

      // 1) Stats from cloud (per user); fall back to localStorage once
      let nextStats: UserStats = INIT;
      if (uid) {
        const { data: row } = await supabase
          .from('user_stats')
          .select('data')
          .eq('user_id', uid)
          .maybeSingle();
        const cloud = (row?.data ?? null) as Partial<UserStats> | null;
        const local = (() => {
          try { const raw = localStorage.getItem('speak_native_user_stats_v2'); return raw ? JSON.parse(raw) as Partial<UserStats> : null; } catch { return null; }
        })();
        const p = cloud ?? local ?? {};
        nextStats = {
          xp: typeof p.xp === 'number' ? p.xp : 0,
          streak: typeof p.streak === 'number' ? p.streak : 1,
          lastActive: typeof p.lastActive === 'string' ? p.lastActive : null,
          badges: Array.isArray(p.badges) ? p.badges : [],
          completedDialogues: Array.isArray(p.completedDialogues) ? p.completedDialogues : [],
          unlockedLevels: Array.isArray(p.unlockedLevels) ? p.unlockedLevels : ['A1'],
          pronunciationAverages: p.pronunciationAverages && typeof p.pronunciationAverages === 'object' ? p.pronunciationAverages : {},
        };
        const today = new Date().toISOString().split('T')[0];
        if (nextStats.lastActive && nextStats.lastActive !== today) {
          const diff = Math.ceil(Math.abs(new Date(today).getTime() - new Date(nextStats.lastActive).getTime()) / 86400000);
          if (diff === 1) nextStats.streak += 1; else if (diff > 1) nextStats.streak = 1;
        }
        // One-time migration of local stats into cloud
        if (!cloud && local) {
          await supabase.from('user_stats').upsert({ user_id: uid, data: nextStats as never }, { onConflict: 'user_id' });
          try { localStorage.removeItem('speak_native_user_stats_v2'); } catch {}
        }
        setStats(nextStats);
      }

      // 2) Shared dialogues (everyone reads), per-user hide-list
      let custom: Dialogue[] = [];
      let deleted: string[] = [];
      if (uid) {
        const [{ data: cRows }, { data: dRows }] = await Promise.all([
          supabase.from('user_custom_dialogues').select('data'),
          supabase.from('user_deleted_dialogues').select('dialogue_id').eq('user_id', uid),
        ]);
        custom = normalizeImportedDialogues((cRows ?? []).map((r: { data: unknown }) => r.data));
        deleted = (dRows ?? []).map((r: { dialogue_id: string }) => r.dialogue_id);
      }
      const ids = new Set(defaultDialogues.map(d => d.id));
      const merged = [...defaultDialogues, ...custom.filter(d => d?.id && !ids.has(d.id))].filter(d => d?.id && !deleted.includes(d.id));
      setDialogues(merged);
    })();
  }, []);

  const save = useCallback((s: UserStats) => {
    setStats(s);
    if (userId) {
      supabase.from('user_stats').upsert({ user_id: userId, data: s as never }, { onConflict: 'user_id' }).then(({ error }) => {
        if (error) console.error('save stats', error);
      });
    }
  }, [userId]);

  const handleReset = async () => {
    if (userId) {
      await Promise.all([
        supabase.from('user_stats').delete().eq('user_id', userId),
        supabase.from('user_deleted_dialogues').delete().eq('user_id', userId),
      ]);
    }
    setStats(INIT); setSelected(null); setTab('map');
    // Re-fetch dialogues so admin's shared list reappears
    const { data: cRows } = await supabase.from('user_custom_dialogues').select('data');
    const custom = normalizeImportedDialogues((cRows ?? []).map((r: { data: unknown }) => r.data));
    const ids = new Set(defaultDialogues.map(d => d.id));
    setDialogues([...defaultDialogues, ...custom.filter(d => d?.id && !ids.has(d.id))]);
  };

  const handleDelete = async (id: string) => {
    setDialogues(p => p.filter(d => d.id !== id));
    if (isAdmin) {
      // Admin removes the lesson for everyone
      await supabase.from('user_custom_dialogues').delete().eq('dialogue_id', id);
    } else if (userId) {
      // Regular user just hides it for themselves
      await supabase.from('user_deleted_dialogues').upsert(
        [{ user_id: userId, dialogue_id: id }],
        { onConflict: 'user_id,dialogue_id' },
      );
    }
  };

  const handleImport = async (imported: Dialogue[]) => {
    if (!isAdmin || !userId) {
      console.warn('Only the admin can import dialogues');
      return;
    }
    const normalized = normalizeImportedDialogues(imported);
    const allIds = new Set(dialogues.map(d => d.id));
    const fresh = normalized.filter(d => !allIds.has(d.id));
    setDialogues(p => [...p, ...fresh]);
    const { error } = await supabase.from('user_custom_dialogues').upsert(
      normalized.map(d => ({ user_id: userId, dialogue_id: d.id, data: d as never })),
      { onConflict: 'user_id,dialogue_id' },
    );
    if (error) console.error('Failed to save dialogues to cloud', error);
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
  const vocab = useMemo(
    () => dialogues.filter(d => stats.completedDialogues.includes(d.id)).flatMap(d => d.lines.flatMap(l => l.keyVocabulary?.map(v => v.word) || [])),
    [dialogues, stats],
  );
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
          {selected ? (
            <Suspense fallback={<LoadingPanel />}>
              <DialoguePractice dialogue={selected} stats={stats} onBack={() => setSelected(null)} onComplete={handleComplete} />
            </Suspense>
          ) : tab === 'map' ? <DuolingoMap dialogues={dialogues} stats={stats} onSelectDialogue={setSelected} />
            : tab === 'cumulative' ? <CumulativeArena stats={stats} learnedVocabulary={vocab} currentLevel={curLvl} onAddXp={handleAddXp} />
            : tab === 'repetition' ? <Suspense fallback={<LoadingPanel />}><PhraseRepetition dialogues={dialogues} completedDialogues={stats.completedDialogues} onAddXp={handleAddXp} /></Suspense>
            : <Suspense fallback={<LoadingPanel />}><SettingsView stats={stats} dialogues={dialogues} onImportDialogues={handleImport} onDeleteDialogue={handleDelete} onResetProgress={handleReset} /></Suspense>}
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

