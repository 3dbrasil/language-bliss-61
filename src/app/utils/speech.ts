import { Dialogue, PronunciationFeedback } from '../types';
import { getApiConfig, unrealSpeechTTS, playAudioBuffer, geminiPronunciationFeedback } from './apiConfig';
import { supabase } from '@/integrations/supabase/client';

// Audio cache for Unreal Speech generated audio
const audioCache = new Map<string, ArrayBuffer>();

const CLOUD_BUCKET = 'lesson-audios';

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function cloudPath(text: string, voice: string): Promise<string> {
  const h = await sha1Hex(`${voice}::${text}`);
  return `${voice}/${h}.mp3`;
}

async function listExistingCloudPaths(voice: string): Promise<{ paths: Set<string>; checked: boolean }> {
  const existing = new Set<string>();
  try {
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase.storage.from(CLOUD_BUCKET).list(voice, {
        limit: pageSize,
        offset,
      });
      if (error || !data?.length) break;
      data.forEach((file) => {
        if (file.name) existing.add(`${voice}/${file.name}`);
      });
      if (data.length < pageSize) break;
    }
  } catch (e) {
    console.warn('Cloud audio list failed; generating without bulk skip check', e);
    return { paths: existing, checked: false };
  }
  return { paths: existing, checked: true };
}

async function downloadFromCloud(text: string, voice: string): Promise<ArrayBuffer | null> {
  try {
    const path = await cloudPath(text, voice);
    const { data, error } = await supabase.storage.from(CLOUD_BUCKET).download(path);
    if (error || !data) return null;
    return await data.arrayBuffer();
  } catch { return null; }
}

async function uploadToCloud(text: string, voice: string, buffer: ArrayBuffer): Promise<'uploaded' | 'exists' | 'failed'> {
  try {
    const path = await cloudPath(text, voice);
    const blob = new Blob([buffer], { type: 'audio/mpeg' });
    const { error } = await supabase.storage.from(CLOUD_BUCKET).upload(path, blob, {
      contentType: 'audio/mpeg',
      upsert: false,
    });
    if (!error) return 'uploaded';
    if ((error as any).statusCode === '409' || /already exists|duplicate/i.test(error.message || '')) return 'exists';
    console.warn('Cloud audio upload failed', error);
  } catch (e) { console.warn('Cloud audio upload failed', e); }
  return 'failed';
}

// Get audio: memory cache → cloud → generate via Unreal (and upload)
async function getOrGenerateAudio(text: string, voice: string, apiKey: string): Promise<ArrayBuffer> {
  const cacheKey = `${text}_${voice}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  const fromCloud = await downloadFromCloud(text, voice);
  if (fromCloud) {
    audioCache.set(cacheKey, fromCloud);
    return fromCloud;
  }

  if (!apiKey) throw new Error('Unreal Speech API key required');
  const buffer = await unrealSpeechTTS(text, { apiKey, voice });
  audioCache.set(cacheKey, buffer);
  // Fire-and-forget upload so playback isn't delayed
  uploadToCloud(text, voice, buffer);
  return buffer;
}

const PORTUGUESE_WORD_RE = /\b(você|voce|vocês|voces|não|nao|sim|estou|está|esta|sou|ser|ter|tenho|preciso|comprar|quero|queria|gostaria|obrigad[oa]|bom|boa|dia|noite|tarde|com|para|por|que|como|onde|quando|porque|também|tambem|tudo|bem|aqui|ali|isso|isto|aquilo|fazer|tem|temos|posso|pode|ajuda|encontrar|ficar|chegar|pedido|frase|tradu[cç][aã]o|licença|licenca|café|cafe|manhã|manha|ingresso|aeroporto|voo|chuva|guarda-chuva)\b/gi;
const ENGLISH_WORD_RE = /\b(the|is|are|you|i|i'm|i'd|i'll|we|they|he|she|have|has|do|does|can|could|will|would|should|with|for|from|that|this|what|where|when|how|why|hello|hi|thanks|thank|good|morning|please|like|need|want|going|tell|time|breakfast|ticket|driver|today)\b/gi;

function matchCount(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0;
}

function isLikelyPortuguese(text: string): boolean {
  const pt = matchCount(text, PORTUGUESE_WORD_RE);
  const en = matchCount(text, ENGLISH_WORD_RE);
  return /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(text) || (pt >= 2 && pt > en) || (pt >= 1 && en === 0);
}

function englishSpeechText(text: string): string | null {
  const candidates = text
    .split(/\s+\|\s+|[\n\r]+/)
    .map((part) => part.replace(/^(english|ingl[eê]s|fala|texto)\s*[:\-–]\s*/i, '').trim())
    .filter(Boolean);
  const english = candidates.find((part) => !isLikelyPortuguese(part));
  return english || null;
}

export function getAudioCache(): Map<string, ArrayBuffer> {
  return audioCache;
}

// Speak text — uses Unreal Speech if configured, otherwise browser TTS
export async function speakAmericanEnglish(text: string, voiceName?: string, rate: number = 0.85): Promise<void> {
  const speechText = englishSpeechText(text);
  if (!speechText) {
    console.warn('Portuguese text detected; skipping English-only playback.');
    return;
  }
  const config = getApiConfig();

  // Always try cloud first — áudios pré-gerados pelo Unreal ficam disponíveis
  // independente do ttsProvider escolhido pelo aluno.
  try {
    const cacheKey = `${speechText}_${config.unrealSpeechVoice}`;
    let buffer = audioCache.get(cacheKey) || null;
    if (!buffer) buffer = await downloadFromCloud(speechText, config.unrealSpeechVoice);
    if (buffer) {
      audioCache.set(cacheKey, buffer);
      const pbRate = rate / 0.85;
      await playAudioBuffer(buffer.slice(0), pbRate);
      return;
    }
  } catch (e) {
    console.warn('Cloud audio fetch failed:', e);
  }

  if (config.ttsProvider === 'unreal' && config.unrealSpeechApiKey) {
    try {
      const buffer = await getOrGenerateAudio(speechText, config.unrealSpeechVoice, config.unrealSpeechApiKey);
      const pbRate = rate / 0.85;
      await playAudioBuffer(buffer.slice(0), pbRate);
      return;
    } catch (e) {
      console.warn('Unreal audio failed, falling back to browser TTS:', e);
    }
  }

  // Browser TTS fallback — force English voice; abort if none available
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const pickEnglishVoice = (): SpeechSynthesisVoice | null => {
      const voices = window.speechSynthesis.getVoices();
      const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
      if (!enVoices.length) return null;
      if (voiceName) {
        const named = enVoices.find(v => v.name.includes(voiceName));
        if (named) return named;
      }
      return enVoices.find(v => v.lang === 'en-US') || enVoices[0];
    };

    const start = (voice: SpeechSynthesisVoice | null) => {
      if (!voice) {
        // Never speak with a non-English voice — would pronounce in Portuguese
        console.warn('No English TTS voice available; skipping playback.');
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.voice = voice;
      utterance.lang = voice.lang || 'en-US';
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);
      window.speechSynthesis.speak(utterance);
    };

    const initial = pickEnglishVoice();
    if (initial) {
      start(initial);
    } else {
      // Voices not loaded yet — wait once for voiceschanged
      const handler = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        start(pickEnglishVoice());
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler);
      // Trigger load
      window.speechSynthesis.getVoices();
      // Safety timeout
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        start(pickEnglishVoice());
      }, 1500);
    }
  });
}



// Get a map of speaker -> voice variation  
export function getSpeakerVoiceMap(dialogue: Dialogue, _userCoachVoice: string): { [speaker: string]: string } {
  const speakers = [...new Set(dialogue.lines.map(l => l.speaker))];
  const map: { [speaker: string]: string } = {};
  speakers.forEach((s, i) => {
    map[s] = i % 2 === 0 ? 'male' : 'female';
  });
  return map;
}

// Evaluate pronunciation — uses Gemini if configured, otherwise local comparison
export async function evaluatePronunciation(expectedText: string, spokenText: string): Promise<PronunciationFeedback> {
  const config = getApiConfig();

  if (config.pronunciationProvider === 'gemini' && config.geminiApiKey) {
    try {
      const result = await geminiPronunciationFeedback(expectedText, spokenText);
      return result as PronunciationFeedback;
    } catch (e) {
      console.warn('Gemini evaluation failed, using local:', e);
    }
  }

  return evaluateLocal(expectedText, spokenText);
}

// Local pronunciation evaluation (fallback)
function evaluateLocal(expectedText: string, spokenText: string): PronunciationFeedback {
  const normalizeText = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const expected = normalizeText(expectedText);
  const spoken = normalizeText(spokenText);

  const expectedWords = expected.split(/\s+/);
  const spokenWords = spoken.split(/\s+/);

  let correctCount = 0;
  const wordResults = expectedWords.map((word) => {
    const isCorrect = spokenWords.some(sw => {
      return sw === word || levenshteinDistance(sw, word) <= Math.max(1, Math.floor(word.length * 0.3));
    });
    if (isCorrect) correctCount++;
    return {
      word,
      score: isCorrect ? 100 : 20,
      isCorrect,
      suggestion: isCorrect ? undefined : `Tente pronunciar "${word}" mais claramente`
    };
  });

  const score = Math.round((correctCount / Math.max(expectedWords.length, 1)) * 100);

  let accuracy: PronunciationFeedback['accuracy'];
  if (score >= 90) accuracy = 'excellent';
  else if (score >= 70) accuracy = 'good';
  else if (score >= 50) accuracy = 'average';
  else accuracy = 'needs_improvement';

  let generalVerdict: string;
  if (score >= 90) generalVerdict = 'Excelente pronúncia! Você está quase como um nativo! 🎉';
  else if (score >= 70) generalVerdict = 'Boa pronúncia! Continue praticando para melhorar ainda mais. 👍';
  else if (score >= 50) generalVerdict = 'Pronúncia razoável. Foque nas palavras destacadas em vermelho. 💪';
  else generalVerdict = 'Precisa de mais prática. Ouça o áudio novamente e tente repetir devagar. 🎧';

  return { score, accuracy, words: wordResults, generalVerdict };
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

// Pre-load voices
export function preloadVoices(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }
}

// Generate all dialogue audios via Unreal Speech and return as downloadable ZIP
export async function generateAllAudios(
  dialogues: Dialogue[],
  onProgress: (current: number, total: number, label: string) => void
): Promise<Blob> {
  const config = getApiConfig();
  if (!config.unrealSpeechApiKey) throw new Error('Configure a API Key do Unreal Speech primeiro');

  const allLines: { dialogueTitle: string; speaker: string; text: string; id: string }[] = [];
  dialogues.forEach(d => {
    d.lines.forEach(l => {
      allLines.push({ dialogueTitle: d.title, speaker: l.speaker, text: l.text, id: l.id });
    });
  });

  const files: { name: string; data: ArrayBuffer }[] = [];
  
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    onProgress(i + 1, allLines.length, `${line.dialogueTitle} — ${line.speaker}`);
    
    const buffer = await getOrGenerateAudio(line.text, config.unrealSpeechVoice, config.unrealSpeechApiKey);
    
    const safeName = line.dialogueTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    files.push({
      name: `${safeName}/${line.id}.mp3`,
      data: buffer,
    });

    // Rate limiting — small delay between requests
    if (i < allLines.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // Create a simple concatenated download (individual MP3s in a zip-like structure)
  // Since we can't use JSZip without adding a dependency, we'll create individual files
  // and package them as a tar-like blob, or just download them individually
  // For simplicity: create a JSON manifest + individual audio blobs
  
  const manifest = {
    generated: new Date().toISOString(),
    voice: config.unrealSpeechVoice,
    totalFiles: files.length,
    files: files.map(f => f.name),
  };

  // We'll create a simple downloadable package
  // Since true ZIP requires a library, we create a self-contained HTML player
  const htmlContent = generateAudioPlayerHTML(files, manifest);
  return new Blob([htmlContent], { type: 'text/html' });
}

function generateAudioPlayerHTML(
  files: { name: string; data: ArrayBuffer }[],
  manifest: any
): string {
  const audioEntries = files.map(f => {
    const base64 = arrayBufferToBase64(f.data);
    return `{ name: "${f.name}", src: "data:audio/mpeg;base64,${base64}" }`;
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Speak Native — Áudios Offline</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, sans-serif; background: #0f1117; color: #e2e8f0; padding: 20px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .sub { color: #64748b; font-size: 12px; margin-bottom: 20px; }
  .card { background: #161824; border: 1px solid #2a2e3f; border-radius: 12px; padding: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; }
  .card:hover { border-color: #f97316; }
  .name { font-size: 12px; font-weight: 700; flex: 1; }
  .play-btn { background: #f97316; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; }
  .play-btn:hover { background: #ea580c; }
  audio { height: 32px; flex: 1; }
  .stats { background: #1a1d2e; border-radius: 8px; padding: 8px 12px; font-size: 11px; color: #94a3b8; margin-bottom: 16px; }
</style>
</head>
<body>
<h1>🔊 Speak Native — Áudios Offline</h1>
<p class="sub">Gerado em ${manifest.generated} • Voz: ${manifest.voice} • ${manifest.totalFiles} áudios</p>
<div class="stats">💡 Salve este arquivo HTML para ouvir os áudios offline a qualquer momento.</div>
<div id="list"></div>
<script>
const audios = [${audioEntries.join(',\n')}];
const list = document.getElementById('list');
audios.forEach((a, i) => {
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = '<span class="name">' + (i+1) + '. ' + a.name + '</span><audio controls src="' + a.src + '"></audio>';
  list.appendChild(div);
});
</script>
</body>
</html>`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Pre-generate unique dialogue line audios and upload them to Supabase Storage
export async function pregenerateAndUploadDialogueAudios(
  dialogues: Dialogue[],
  voice: string,
  apiKey: string,
  onProgress: (current: number, total: number, label: string) => void
): Promise<{ success: number; failed: number; skipped: number }> {
  let success = 0;
  let failed = 0;
  let skipped = 0;
  
  const allLines: { text: string; id: string; path: string }[] = [];
  const seenTexts = new Set<string>();
  
  dialogues.forEach(d => {
    d.lines.forEach(l => {
      const speechText = englishSpeechText(l.text);
      if (speechText && !seenTexts.has(speechText)) {
        seenTexts.add(speechText);
        allLines.push({ text: speechText, id: l.id, path: '' });
      }
    });
  });

  await Promise.all(allLines.map(async (line) => {
    line.path = await cloudPath(line.text, voice);
  }));

  const { paths: existingPaths, checked: bulkChecked } = await listExistingCloudPaths(voice);

  const total = allLines.length;
  let done = 0;
  const CONCURRENCY = 10;

  const worker = async (startIdx: number) => {
    for (let i = startIdx; i < total; i += CONCURRENCY) {
      const line = allLines[i];
      try {
        const alreadyInCloud = existingPaths.has(line.path) || (!bulkChecked && await downloadFromCloud(line.text, voice));
        if (alreadyInCloud) {
          skipped++;
        } else {
          if (!apiKey) throw new Error('Unreal Speech API key missing');
          const buffer = await unrealSpeechTTS(line.text, { apiKey, voice, bitrate: '64k' });
          const uploadResult = await uploadToCloud(line.text, voice, buffer);
          if (uploadResult === 'uploaded') {
            existingPaths.add(line.path);
            success++;
          } else if (uploadResult === 'exists') {
            existingPaths.add(line.path);
            skipped++;
          } else {
            failed++;
          }
        }
      } catch (e) {
        console.warn(`Failed audio: "${line.text}"`, e);
        failed++;
      } finally {
        done++;
        onProgress(done, total, `Áudio ${done}/${total}: "${line.text.substring(0, 30)}..."`);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, (_, k) => worker(k)));
  
  return { success, failed, skipped };
}

