// API Configuration stored in localStorage

export interface ApiConfig {
  geminiApiKey: string;
  geminiModel: string;
  unrealSpeechApiKey: string;
  unrealSpeechVoice: string;
  ttsProvider: 'browser' | 'unreal';
  pronunciationProvider: 'local' | 'gemini';
  unsplashAccessKey: string;
}

const STORAGE_KEY = 'speak_native_api_config';

const DEFAULT_CONFIG: ApiConfig = {
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  unrealSpeechApiKey: '',
  unrealSpeechVoice: 'Scarlett',
  ttsProvider: 'browser',
  pronunciationProvider: 'local',
  unsplashAccessKey: '',
};

export function getApiConfig(): ApiConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (_e) { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}

export function saveApiConfig(config: Partial<ApiConfig>): ApiConfig {
  const current = getApiConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function getGeminiHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}

export function getGeminiUrl(endpoint: string): string {
  const config = getApiConfig();
  const base = 'https://generativelanguage.googleapis.com/v1beta';
  return `${base}/models/${config.geminiModel}:${endpoint}?key=${config.geminiApiKey}`;
}

// Call Gemini API for pronunciation feedback
export async function geminiPronunciationFeedback(
  textToRead: string,
  transcribedText: string
): Promise<any> {
  const config = getApiConfig();
  if (!config.geminiApiKey) throw new Error('Chave Gemini não configurada');

  const prompt = `You are an English pronunciation coach for Brazilian Portuguese speakers.
Compare the expected text with what the student said.
Give a JSON response with this exact structure:
{
  "score": <number 0-100>,
  "accuracy": "<excellent|good|average|needs_improvement>",
  "words": [{"word": "<word>", "score": <0-100>, "isCorrect": <boolean>, "suggestion": "<optional tip>"}],
  "generalVerdict": "<feedback in Portuguese>"
}

Expected text: "${textToRead}"
Student said: "${transcribedText}"

Respond ONLY with valid JSON.`;

  const res = await fetch(getGeminiUrl('generateContent'), {
    method: 'POST',
    headers: getGeminiHeaders(),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Resposta do Gemini não contém JSON válido');
  
  return JSON.parse(jsonMatch[0]);
}

// Unreal Speech TTS
export async function unrealSpeechTTS(text: string): Promise<ArrayBuffer> {
  const config = getApiConfig();
  if (!config.unrealSpeechApiKey) throw new Error('Chave Unreal Speech não configurada');

  const res = await fetch('https://api.v7.unrealspeech.com/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.unrealSpeechApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Text: text,
      VoiceId: config.unrealSpeechVoice,
      Bitrate: '192k',
      Speed: '-0.1',
      Pitch: '1.0',
      Codec: 'libmp3lame',
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Unreal Speech error: ${res.status} - ${err}`);
  }

  return res.arrayBuffer();
}

// Play audio from ArrayBuffer
export function playAudioBuffer(buffer: ArrayBuffer, rate: number = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = rate;
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    audio.play().catch(reject);
  });
}

