import { Dialogue, PronunciationFeedback } from '../types';
import { getApiConfig, unrealSpeechTTS, playAudioBuffer, geminiPronunciationFeedback } from './apiConfig';

// Audio cache for Unreal Speech generated audio
const audioCache = new Map<string, ArrayBuffer>();

export function getAudioCache(): Map<string, ArrayBuffer> {
  return audioCache;
}

// Speak text — uses Unreal Speech if configured, otherwise browser TTS
export async function speakAmericanEnglish(text: string, voiceName?: string, rate: number = 0.85): Promise<void> {
  const config = getApiConfig();

  if (config.ttsProvider === 'unreal' && config.unrealSpeechApiKey) {
    try {
      const cacheKey = `${text}_${config.unrealSpeechVoice}`;
      let buffer = audioCache.get(cacheKey);
      if (!buffer) {
        buffer = await unrealSpeechTTS(text);
        audioCache.set(cacheKey, buffer);
      }
      // Map our rate (0.85 baseline) to playbackRate
      const pbRate = rate / 0.85;
      await playAudioBuffer(buffer.slice(0), pbRate);
      return;
    } catch (e) {
      console.warn('Unreal Speech failed, falling back to browser TTS:', e);
      // Fall through to browser TTS
    }
  }

  // Browser TTS fallback
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    if (voiceName) {
      const voice = voices.find(v => v.name.includes(voiceName) && v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
    } else {
      const enVoice = voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
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
    
    const cacheKey = `${line.text}_${config.unrealSpeechVoice}`;
    let buffer = audioCache.get(cacheKey);
    if (!buffer) {
      buffer = await unrealSpeechTTS(line.text);
      audioCache.set(cacheKey, buffer);
    }
    
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
