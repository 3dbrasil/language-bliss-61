// Spaced Repetition System per phrase
export type SrsLevel = 'easy' | 'medium' | 'hard';

export interface PhraseState {
  id: string;
  level: SrsLevel;
  history: boolean[];
  consecutiveHits: number;
  nextReview: number;
  learned: boolean;
}

const STORAGE_KEY = 'srs_state_v1';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const INTERVALS: Record<SrsLevel, number[]> = {
  easy: [4 * HOUR, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY],
  medium: [2 * HOUR, 12 * HOUR, 2 * DAY, 5 * DAY, 10 * DAY],
  hard: [1 * HOUR, 6 * HOUR, 1 * DAY, 3 * DAY, 7 * DAY],
};

const RESET_ON_ERROR: Record<SrsLevel, number> = {
  easy: 4 * HOUR,
  medium: 2 * HOUR,
  hard: 1 * HOUR,
};

const TOP_500 = new Set(
  'the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us hello hi how are good morning night thanks please yes ok'.split(' ')
);

export function classifyDifficulty(text: string): SrsLevel {
  const t = text.toLowerCase().trim();
  const words = t.split(/\s+/).filter(Boolean);
  const len = words.length;

  // Hard grammar patterns
  if (/\b(had|have|has)\s+\w+(ed|en)\b/.test(t)) return 'hard';
  if (/\b(would|could|should|might)\s+have\b/.test(t)) return 'hard';
  if (/\bif\b.+\b(would|could)\b/.test(t)) return 'hard';
  if (len >= 9) return 'hard';

  // Medium
  if (/\bwill\b|\bgoing to\b/.test(t)) return 'medium';
  if (/\b\w+ed\b/.test(t) && len > 4) return 'medium';
  if (len >= 5) return 'medium';

  // Easy: short + top-500
  const known = words.filter(w => TOP_500.has(w.replace(/[^a-z]/g, ''))).length;
  if (len <= 4 && known / len >= 0.5) return 'easy';
  return 'easy';
}

export function hashId(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return 'p' + (h >>> 0).toString(36);
}

function loadAll(): Record<string, PhraseState> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function saveAll(map: Record<string, PhraseState>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
}

export function getState(text: string): PhraseState {
  const id = hashId(text);
  const all = loadAll();
  if (all[id]) return all[id];
  const level = classifyDifficulty(text);
  const s: PhraseState = { id, level, history: [], consecutiveHits: 0, nextReview: Date.now(), learned: false };
  all[id] = s;
  saveAll(all);
  return s;
}

export function recordResult(text: string, correct: boolean): PhraseState {
  const all = loadAll();
  const id = hashId(text);
  const s: PhraseState = all[id] || getState(text);
  s.history = [...s.history.slice(-9), correct];
  const now = Date.now();

  if (correct) {
    s.consecutiveHits += 1;
    const idx = Math.min(s.consecutiveHits - 1, INTERVALS[s.level].length - 1);
    s.nextReview = now + INTERVALS[s.level][idx];
    if (s.consecutiveHits >= 5) {
      s.learned = true;
      s.nextReview = now + 30 * DAY;
      // promote (less frequent)
      if (s.level === 'hard') s.level = 'medium';
      else if (s.level === 'medium') s.level = 'easy';
    }
  } else {
    s.consecutiveHits = 0;
    s.nextReview = now + RESET_ON_ERROR[s.level];
    const recentErrors = s.history.slice(-5).filter(x => !x).length;
    if (recentErrors >= 3) {
      if (s.level === 'hard') s.level = 'medium';
      else if (s.level === 'medium') s.level = 'easy';
      s.learned = false;
    }
  }
  all[id] = s;
  saveAll(all);
  return s;
}

export function markLearned(text: string, learned = true) {
  const all = loadAll();
  const id = hashId(text);
  const s = all[id] || getState(text);
  s.learned = learned;
  if (learned) {
    s.consecutiveHits = Math.max(s.consecutiveHits, 5);
    s.nextReview = Date.now() + 30 * DAY;
  }
  all[id] = s;
  saveAll(all);
  return s;
}

export function setLevel(text: string, level: SrsLevel) {
  const all = loadAll();
  const id = hashId(text);
  const s = all[id] || getState(text);
  s.level = level;
  all[id] = s;
  saveAll(all);
  return s;
}

export const LEVEL_META: Record<SrsLevel, { label: string; emoji: string; cls: string }> = {
  easy: { label: 'Fácil', emoji: '🟢', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  medium: { label: 'Médio', emoji: '🟡', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  hard: { label: 'Difícil', emoji: '🔴', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

export function speakerAvatar(speaker: string): { initial: string; color: string } {
  const s = (speaker || '?').trim();
  const initial = s.charAt(0).toUpperCase() || '?';
  const palette = [
    'bg-purple-500', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
  ];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return { initial, color: palette[h % palette.length] };
}
