export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface VocabularyItem {
  word: string;
  translation: string;
  context: string;
  level: Level;
  dialogueId: string;
  dateAcquired: string;
}

export interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
  translation: string;
  pronunciationGuide?: string;
  keyVocabulary?: Array<{
    word: string;
    translation: string;
  }>;
}

export interface Dialogue {
  id: string;
  title: string;
  situation: string;
  level: Level;
  order: number;
  lines: DialogueLine[];
  imagePrompt?: string;
  imageUrl?: string;
  hasCompleted?: boolean;
}

export interface UserStats {
  xp: number;
  streak: number;
  lastActive: string | null;
  badges: Badge[];
  completedDialogues: string[];
  unlockedLevels: Level[];
  pronunciationAverages: { [dialogueId: string]: number };
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface PronunciationFeedback {
  score: number;
  accuracy: 'excellent' | 'good' | 'average' | 'needs_improvement';
  words: Array<{
    word: string;
    score: number;
    isCorrect: boolean;
    suggestion?: string;
  }>;
  generalVerdict: string;
}
