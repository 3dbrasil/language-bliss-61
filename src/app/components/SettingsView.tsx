import { useState, useEffect, useRef } from 'react';
import { Download, Upload, Trash2, CheckCircle, AlertTriangle, Key, Volume2, Brain, Cloud, Loader2, ExternalLink, Eye, EyeOff, FileText, Sparkles } from 'lucide-react';
import { Dialogue, UserStats, Badge } from '../types';
import { getApiConfig, saveApiConfig, ApiConfig } from '../utils/apiConfig';
import { generateAllAudios, prepareDialogueAudioCache } from '../utils/speech';
import { findCoverImage } from '../utils/imageSearch';
import { fillMissingLineTranslations, hasMissingTranslations } from '../utils/translations';

interface Props { stats: UserStats; dialogues: Dialogue[]; onImportDialogues: (d: Dialogue[]) => void | Promise<void>; onDeleteDialogue: (id: string) => void; onResetProgress: () => void; isAdmin?: boolean; }

// PDF extraction
function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) { resolve((window as any).pdfjsLib); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = () => { const lib = (window as any).pdfjsLib; if (lib) { lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; resolve(lib); } else reject(new Error('pdf.js não carregou')); };
    s.onerror = () => reject(new Error('Falha ao baixar pdf.js'));
    document.head.appendChild(s);
  });
}

async function extractPDF(file: File): Promise<string> {
  const lib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
  const yTolerance = 3;
  const columnGap = 40;

  const pages = await Promise.all(Array.from({ length: pdf.numPages }, async (_, pageIndex) => {
    const i = pageIndex + 1;
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const rowMap = new Map<number, any[]>();

    for (const item of content.items as any[]) {
      const str = String(item.str || '').trim();
      if (!str) continue;
      const y = Math.round(item.transform[5] / yTolerance) * yTolerance;
      if (!rowMap.has(y)) rowMap.set(y, []);
      rowMap.get(y)!.push(item);
    }

    const rows = Array.from(rowMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => items.sort((a, b) => a.transform[4] - b.transform[4]));

    const pt = rows.map(row => {
      let line = '';
      let lastRight = -Infinity;
      row.forEach((item) => {
        const str = String(item.str || '').trim();
        const x = item.transform[4];
        if (!str) return;
        if (line && x - lastRight > columnGap) line += ' | ';
        else if (line && !line.endsWith(' ')) line += ' ';
        line += str;
        lastRight = x + (item.width || str.length * 5);
      });
      return line.replace(/\s+\|\s+/g, ' | ').trim();
    }).filter(Boolean).join('\n');

    return pt.trim();
  }));

  return pages.filter(Boolean).join('\n\n').trim();
}

/* Detect Portuguese line (translation) vs English (original) */
function isPortuguese(s: string): boolean {
  if (/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(s)) return true;
  const pt = /\b(você|voce|eu|não|nao|sim|estou|está|esta|sou|ser|ter|tenho|preciso|comprar|quero|gostaria|obrigad[oa]|bom|boa|dia|noite|tarde|com|para|por|que|como|onde|quando|porque|também|tambem|tudo|bem|aqui|ali|isso|isto|aquilo|fazer|tem|temos|posso|pode|gosto|amigo|amiga|hoje|ontem|amanhã|amanha|ajuda|encontrar|ficar|chegar|pedido|frase|tradu[cç][aã]o)\b/i;
  const en = /\b(the|is|are|you|i|we|they|he|she|have|has|do|does|can|will|would|with|for|from|that|this|what|where|when|how|why|hello|hi|thanks|thank|good|please)\b/i;
  return pt.test(s) && !en.test(s);
}

function normalizeStudentSpeaker(speaker: string): string {
  return /^(you|student|aluno|aluna|você|voce)$/i.test(speaker.trim()) ? 'You (Student)' : speaker.trim();
}

function stripWrappingQuotes(s: string): string {
  return s.trim().replace(/^["“”'‘’]+|["“”'‘’]+$/g, '').trim();
}

function makePronunciationGuide(text: string): string {
  return text
    .toLowerCase()
    .replace(/\bhello\b/g, 'he-lou')
    .replace(/\bhi\b/g, 'hai')
    .replace(/\byou\b/g, 'iu')
    .replace(/\bthanks?\b/g, 'thénks')
    .replace(/\bplease\b/g, 'pliz')
    .replace(/\bhow are you\b/g, 'hau ar iu')
    .replace(/\bwhat\b/g, 'uát')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractVocabulary(text: string, translation: string) {
  const ignored = new Set(['the', 'and', 'you', 'for', 'that', 'this', 'with', 'are', 'can', 'have', 'will', 'your', 'today', 'hello', 'thanks', 'please']);
  const words = Array.from(new Set(text.match(/\b[A-Za-z][A-Za-z'-]{3,}\b/g) || []))
    .filter(w => !ignored.has(w.toLowerCase()))
    .slice(0, 2);
  return words.map(word => ({ word, translation: translation || 'ver tradução da frase' }));
}

function splitMixedEnPt(raw: string): { en: string; pt: string } {
  const text = raw.trim();
  if (!text) return { en: '', pt: '' };
  const ptStart = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]|\b(você|voce|não|nao|olá|ola|obrigad[oa]|por favor|bom dia|boa (tarde|noite)|tudo bem|como (está|esta|vai)|onde|quando|porque|também|tambem|gostaria|preciso|quero|tradu[cç][aã]o)\b/i.exec(text);
  if (!ptStart || ptStart.index === 0) {
    return isPortuguese(text) ? { en: '', pt: text } : { en: text, pt: '' };
  }
  let cut = ptStart.index;
  const boundary = text.slice(0, cut).search(/[.!?|]\s+[^.!?|]*$/);
  if (boundary > 0) cut = boundary + 1;
  return {
    en: text.slice(0, cut).replace(/[|\-–]\s*$/, '').trim(),
    pt: text.slice(cut).replace(/^[|\-–]\s*/, '').trim(),
  };
}

function pushDialogueLine(target: Dialogue['lines'], dialogueIdx: number, speaker: string, text: string, translation: string) {
  let cleanText = stripWrappingQuotes(text);
  let cleanTranslation = stripWrappingQuotes(translation);
  // If translation is empty and the text mixes English + Portuguese (common in PDF imports), split them
  if (!cleanTranslation && cleanText) {
    const split = splitMixedEnPt(cleanText);
    if (split.en && split.pt) {
      cleanText = split.en;
      cleanTranslation = split.pt;
    }
  } else if (cleanText && cleanTranslation) {
    // Even when translation exists, strip a trailing PT chunk that bled into the English line
    const split = splitMixedEnPt(cleanText);
    if (split.en && split.pt) cleanText = split.en;
  }
  if (!speaker.trim() || !cleanText) return;
  target.push({
    id: `pdf-${dialogueIdx}-${target.length}`,
    speaker: normalizeStudentSpeaker(speaker),
    text: cleanText,
    translation: cleanTranslation,
    pronunciationGuide: makePronunciationGuide(cleanText),
    keyVocabulary: extractVocabulary(cleanText, cleanTranslation),
  });
}

function parseTextToDialogues(text: string): Dialogue[] {
  try { const p = JSON.parse(text); if (Array.isArray(p)) return p; } catch (_) {}
  const m = text.match(/\[[\s\S]*\]/); if (m) { try { const p = JSON.parse(m[0]); if (Array.isArray(p)) return p; } catch (_) {} }
  const dialogues: Dialogue[] = []; const clean = text.replace(/\r\n/g, '\n').replace(/[\t ]+/g, ' ');
  const sections = clean.split(/\n{3,}|(?:^|\n)(?:#{1,3}\s*|Diálogo\s*\d*\s*[:-]?\s*|Dialogue\s*\d*\s*[:-]?\s*|Lesson\s*\d*\s*[:-]?\s*|Lição\s*\d*\s*[:-]?\s*)/gi).filter(s => s.trim().length > 20);

  const speakerOnly = /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{0,30}?)\s*:\s*$/;
  const speakerInline = /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{0,30}?)\s*[:\-–]\s*(.{2,})$/;
  const twoColumnLine = /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{0,30}?)\s*[:\-–]\s*(.+?)\s+\|\s+(.+)$/;
  const pipeRow = /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{0,30}?)\s+\|\s+(.+?)(?:\s+\|\s+(.+))?$/;
  const numberedLine = /^\d+[.)]\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{0,30}?)\s*[:\-–]\s*(.+)$/;
  const skipLine = /^(speaker|personagem|personagem\s*\/\s*speaker|english|ingl[eê]s|portugu[eê]s|translation|tradu[cç][aã]o|fala|texto|frase|pron[uú]ncia|vocabul[aá]rio)\b/i;

  (sections.length ? sections : [clean]).forEach((sec, idx) => {
    const lines = sec.split('\n').map(l => l.trim()).filter(l => l);
    let title = ''; let start = 0;
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      if (!speakerInline.test(lines[i]) && !speakerOnly.test(lines[i]) && !twoColumnLine.test(lines[i]) && !pipeRow.test(lines[i]) && lines[i].length > 3 && lines[i].length < 120) {
        title = lines[i].replace(/^[#\-*•]+\s*/, ''); start = i + 1; break;
      }
    }
    if (!title) title = `Diálogo ${idx + 1}`;

    const dLines: Dialogue['lines'] = [];
    let currentSpeaker = ''; let pendingText = ''; let pendingTranslation = '';

    const flush = () => {
      pushDialogueLine(dLines, idx, currentSpeaker, pendingText, pendingTranslation);
      pendingText = ''; pendingTranslation = '';
    };

    for (let i = start; i < lines.length; i++) {
      const l = lines[i].replace(/^[-*•]\s*/, '').replace(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{0,30}?):\s*\|\s*/, '$1 | ').trim();
      if (!l || skipLine.test(l)) continue;
      const mTwoCol = l.match(twoColumnLine);
      const mPipeRow = !mTwoCol ? l.match(pipeRow) : null;
      const mNumbered = !mTwoCol && !mPipeRow ? l.match(numberedLine) : null;
      const mOnly = l.match(speakerOnly);
      const mInline = !mTwoCol && !mPipeRow && !mNumbered && !mOnly ? l.match(speakerInline) : null;

      if (mTwoCol) {
        flush();
        pushDialogueLine(dLines, idx, mTwoCol[1], mTwoCol[2], mTwoCol[3]);
        currentSpeaker = '';
      } else if (mPipeRow) {
        flush();
        pushDialogueLine(dLines, idx, mPipeRow[1], mPipeRow[2], mPipeRow[3] || '');
        currentSpeaker = '';
      } else if (mNumbered) {
        flush();
        currentSpeaker = mNumbered[1].trim();
        const rest = mNumbered[2].trim();
        if (isPortuguese(rest)) pendingTranslation = rest; else pendingText = rest;
      } else if (mOnly) {
        flush();
        currentSpeaker = mOnly[1].trim();
      } else if (mInline) {
        flush();
        currentSpeaker = mInline[1].trim();
        const rest = mInline[2].trim();
        if (isPortuguese(rest)) pendingTranslation = rest; else pendingText = rest;
      } else if (currentSpeaker) {
        if (!pendingText) pendingText = l;
        else if (!pendingTranslation && isPortuguese(l)) pendingTranslation = l;
        else if (isPortuguese(l)) pendingTranslation += ' ' + l;
        else pendingText += ' ' + l;
      }
    }
    flush();

    let level: any = 'A1'; const lw = sec.toLowerCase();
    if (lw.includes('c2')) level = 'C2'; else if (lw.includes('c1')) level = 'C1'; else if (lw.includes('b2')) level = 'B2'; else if (lw.includes('b1')) level = 'B1'; else if (lw.includes('a2')) level = 'A2';
    if (dLines.length > 0) dialogues.push({ id: `pdf-${Date.now()}-${idx}`, title: title.substring(0, 80), situation: `Importado — ${dLines.length} falas`, level, order: idx + 1, lines: dLines });
  });
  return dialogues;
}

export default function SettingsView({ stats, dialogues, onImportDialogues, onDeleteDialogue, onResetProgress, isAdmin = false }: Props) {
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMsg, setImportMsg] = useState('');
  const [pdfPreview, setPdfPreview] = useState('');
  const [pregenerateAudio, setPregenerateAudio] = useState(true);
  const [pregenProg, setPregenProg] = useState<{ c: number; t: number; msg: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [showDel, setShowDel] = useState<string | null>(null);
  const [resetStage, setResetStage] = useState<'idle' | 'confirming'>('idle');
  const [api, setApi] = useState<ApiConfig>(getApiConfig());
  const [showGK, setShowGK] = useState(false);
  const [showUK, setShowUK] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState('');
  const [testRes, setTestRes] = useState<{ ok: boolean; msg: string } | null>(null);
  const [dling, setDling] = useState(false);
  const [dlProg, setDlProg] = useState({ c: 0, t: 0, l: '' });
  const dialogueListRef = useRef<HTMLDivElement>(null);
  const audioJobRef = useRef(0);

  useEffect(() => { setApi(getApiConfig()); }, []);
  const save = () => { saveApiConfig(api); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const builtinIds = ['a1-coffee', 'a1-office', 'a1-grocery', 'a2-directions', 'a2-restaurant', 'b1-doctor', 'b2-interview', 'c1-negotiation', 'c2-debate'];
  const custom = dialogues.filter(d => !builtinIds.includes(d.id));
  const totalLines = dialogues.reduce((s, d) => s + d.lines.length, 0);
  const pct = dialogues.length > 0 ? Math.round((stats.completedDialogues.length / dialogues.length) * 100) : 0;

  const [batchProg, setBatchProg] = useState<{ c: number; t: number; name: string } | null>(null);
  const [uploadLevel, setUploadLevel] = useState<'auto' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('auto');

  const keepScroll = (action: () => void) => {
    const windowY = window.scrollY;
    const listY = dialogueListRef.current?.scrollTop ?? 0;
    action();
    const restore = () => {
      window.scrollTo({ top: windowY, left: 0, behavior: 'auto' });
      if (dialogueListRef.current) dialogueListRef.current.scrollTop = listY;
    };
    requestAnimationFrame(restore);
    setTimeout(restore, 0);
  };

  const handlePDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setImportStatus('idle'); setImportMsg(''); setPdfPreview('');

    // JSON / TXT path (one file at a time keeps it simple)
    if (files.length === 1 && (files[0].name.endsWith('.json') || files[0].name.endsWith('.txt'))) {
      const r = new FileReader();
      r.onload = ev => { setImportText(ev.target?.result as string || ''); };
      r.readAsText(files[0]);
      e.target.value = ''; return;
    }

    setParsing(true);
    const all: Dialogue[] = []; const errors: string[] = [];
    let firstPreview = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBatchProg({ c: i + 1, t: files.length, name: file.name });
      try {
        if (file.name.endsWith('.json')) {
          const txt = await file.text();
          const parsed = JSON.parse(txt);
          if (Array.isArray(parsed)) {
            if (uploadLevel !== 'auto') parsed.forEach((d: any) => { d.level = uploadLevel; });
            all.push(...parsed);
          }
          continue;
        }
        const txt = await extractPDF(file);
        if (!firstPreview) firstPreview = txt.substring(0, 600) + (txt.length > 600 ? '\n...' : '');
        const parsed = parseTextToDialogues(txt);
        if (parsed.length) {
          parsed.forEach((d, k) => {
            d.id = `pdf-${Date.now()}-${i}-${k}`;
            if (uploadLevel !== 'auto') d.level = uploadLevel;
          });
          all.push(...parsed);
        } else {
          errors.push(`${file.name}: nenhum diálogo extraído`);
        }
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    setPdfPreview(firstPreview);

    // Busca imagem de capa para cada diálogo importado (paralelo, com fallback)
    if (all.length) {
      setBatchProg({ c: 0, t: all.length, name: '🖼️ Buscando imagens...' });
      const usedImageUrls = new Set(dialogues.map(d => d.imageUrl).filter(Boolean) as string[]);
      for (let i = 0; i < all.length; i++) {
        const d = all[i];
        if (d.imageUrl) {
          usedImageUrls.add(d.imageUrl);
          continue;
        }
        try {
          d.imageUrl = await findCoverImage(d.title, d.situation, d.id, [...usedImageUrls]);
          if (d.imageUrl) usedImageUrls.add(d.imageUrl);
        } catch (_) {}
        setBatchProg({ c: i + 1, t: all.length, name: `🖼️ ${d.title.substring(0, 40)}` });
      }
    }

    setParsing(false); setBatchProg(null);
    e.target.value = '';

    if (all.length) {
      setImportText(JSON.stringify(all, null, 2));
      setImportMsg(`✅ ${all.length} diálogo(s) extraído(s) de ${files.length} arquivo(s).${errors.length ? ` ${errors.length} com problema.` : ''} Revise e clique Importar.`);
      setImportStatus('success');
    } else {
      setImportMsg(`❌ Nada extraído. ${errors.join(' • ')}`);
      setImportStatus('error');
    }
  };

  const handleImport = async () => {
    const audioJobId = ++audioJobRef.current;
    let backgroundAudioStarted = false;
    setIsImporting(true);
    setImportStatus('idle');
    setImportMsg('');
    setPregenProg(null);
    try {
      let parsed: Dialogue[];
      try { parsed = JSON.parse(importText); } catch (_) { parsed = parseTextToDialogues(importText); }
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('Nenhum diálogo válido');
      parsed.forEach((d: any, i: number) => { 
        if (!d.id) d.id = `imp-${Date.now()}-${i}`; 
        if (!d.title) d.title = `Importado ${i + 1}`; 
        if (!d.lines?.length) throw new Error(`"${d.title}" sem linhas`); 
        if (!d.level) d.level = 'A1'; 
        if (!d.order) d.order = i + 1; 
        if (!d.situation) d.situation = `${d.lines.length} falas`; 
      });

      // 1. Save the lessons first. Expensive work must not block the PDF import.
      const needsTranslation = hasMissingTranslations(parsed);
      const savedParsed = parsed;

      setImportMsg('⏳ Salvando aulas na nuvem...');
      await onImportDialogues(savedParsed);

      setImportStatus('success');
      setImportMsg(`✅ ${savedParsed.length} aula(s) importada(s) na nuvem!${needsTranslation ? ' Traduções faltantes serão completadas em segundo plano.' : ''}`);
      setImportText('');
      setPdfPreview('');
      setIsImporting(false);

      // 2. Translation — run in background only when the PDF/JSON did not bring translations.
      if (hasMissingTranslations(parsed)) {
        void fillMissingLineTranslations(parsed)
          .then((translated) => onImportDialogues(translated))
          .catch((err: any) => console.warn('Background translation failed', err));
      }

      let audioSummary = '';
      // 3. Audio cache check — do not generate hundreds of MP3s during PDF import.
      if (pregenerateAudio) {
        if (!api.unrealSpeechApiKey) {
          audioSummary = ' ⚠️ Unreal Speech sem chave; os áudios usarão o fallback do aparelho.';
        } else {
          saveApiConfig(api);
          backgroundAudioStarted = true;
          setPregenProg({ c: 0, t: 1, msg: 'Conferindo áudios que já estão na nuvem...' });
          setTimeout(() => {
            void prepareDialogueAudioCache(
              savedParsed,
              api.unrealSpeechVoice,
              (c, t, msg) => {
                if (audioJobRef.current === audioJobId) setPregenProg({ c, t, msg });
              }
            ).then((res) => {
              if (audioJobRef.current !== audioJobId) return;
              setPregenProg(null);
              setImportStatus('success');
              setImportMsg(`✅ Aulas prontas: ${res.available} áudios já estão na nuvem. Os ${res.missing} restantes serão criados automaticamente pelo Unreal ao abrir/ouvir cada aula.`);
            }).catch((err: any) => {
              if (audioJobRef.current !== audioJobId) return;
              setPregenProg(null);
              setImportStatus('success');
              setImportMsg(`✅ Aulas importadas. A checagem de áudio ficou para a reprodução automática: ${err.message}`);
            });
          }, 800);
          audioSummary = ' 🎙️ Unreal preparado: áudio é criado automaticamente quando a aula for ouvida.';
        }
      }

      if (audioSummary) setImportMsg(`✅ ${savedParsed.length} aula(s) importada(s) na nuvem!${audioSummary}`);
    } catch (e: any) {
      setImportStatus('error');
      setImportMsg(`❌ ${e.message}`);
    } finally {
      setIsImporting(false);
      if (!backgroundAudioStarted) setPregenProg(null);
    }
  };

  const testApi = async (which: 'gemini' | 'unreal') => {
    setTesting(which); setTestRes(null);
    try {
      if (which === 'gemini') {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${api.geminiModel}:generateContent?key=${api.geminiApiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: 'Say hello' }] }], generationConfig: { maxOutputTokens: 10 } }) });
        setTestRes(r.ok ? { ok: true, msg: '✅ Gemini conectado!' } : { ok: false, msg: `❌ Erro ${r.status}` });
      } else {
        const r = await fetch('https://api.v7.unrealspeech.com/stream', { method: 'POST', headers: { 'Authorization': `Bearer ${api.unrealSpeechApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ Text: 'Hello', VoiceId: api.unrealSpeechVoice, Bitrate: '64k', Speed: '0', Pitch: '1.0', Codec: 'libmp3lame' }) });
        setTestRes(r.ok ? { ok: true, msg: '✅ Unreal Speech OK!' } : { ok: false, msg: `❌ Erro ${r.status}` });
      }
    } catch (e: any) { setTestRes({ ok: false, msg: `❌ ${e.message}` }); }
    setTesting('');
  };

  const downloadAudios = async () => {
    if (!api.unrealSpeechApiKey) { setTestRes({ ok: false, msg: '❌ Configure Unreal Speech primeiro' }); return; }
    setDling(true);
    try {
      const blob = await generateAllAudios(dialogues, (c, t, l) => setDlProg({ c, t, l }));
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `speak-native-audios.html`; a.click(); URL.revokeObjectURL(url);
    } catch (e: any) { setTestRes({ ok: false, msg: `❌ ${e.message}` }); }
    setDling(false);
  };

  const Section = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-slate-900/50 rounded-xl border border-slate-800/60 p-4 space-y-3 ${className}`}>{children}</div>
  );
  const Label = ({ children }: { children: React.ReactNode }) => <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{children}</p>;

  return (
    <div className="max-w-xl mx-auto space-y-4 animate-fade-in pb-20">
      <h1 className="text-2xl font-extrabold text-slate-100">Configurações</h1>

      {/* Progress */}
      <Section>
        <Label>Progresso</Label>
        <div className="grid grid-cols-4 gap-2">
          {[{ v: stats.xp, l: 'XP', c: 'text-cyan-400' }, { v: stats.streak, l: 'Streak', c: 'text-red-400' }, { v: stats.completedDialogues.length, l: 'Feitas', c: 'text-emerald-400' }, { v: `${pct}%`, l: 'Total', c: 'text-blue-400' }].map((s, i) => (
            <div key={i} className="bg-slate-800/40 rounded-lg p-2 text-center border border-slate-800"><p className={`text-base font-extrabold ${s.c}`}>{s.v}</p><p className="text-[8px] font-semibold text-slate-600 uppercase">{s.l}</p></div>
          ))}
        </div>
      </Section>

      {/* Badges */}
      {stats.badges.length > 0 && <Section>
        <Label>Conquistas ({stats.badges.length})</Label>
        <div className="grid grid-cols-2 gap-1.5">{stats.badges.map((b: Badge) => <div key={b.id} className="bg-slate-800/40 rounded-lg p-2 flex items-center gap-2 border border-slate-800"><span className="text-base">{b.icon}</span><div><p className="text-[11px] font-bold text-slate-200">{b.title}</p><p className="text-[9px] text-slate-600">{b.description}</p></div></div>)}</div>
      </Section>}

      {/* ===== IMPORT PDF/JSON ===== */}
      {isAdmin && (
      <Section>
        <p className="text-[10px] uppercase tracking-widest text-amber-400/80 font-bold">👑 Admin</p>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <Label>Importar Diálogos (PDF / JSON)</Label>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">Selecione <strong className="text-cyan-400">vários PDFs de uma vez</strong> (segure Ctrl/Cmd) ou um JSON. Cada PDF é processado em sequência.</p>

        <div>
          <Label>Nível dos PDFs</Label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(['auto', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map(lv => (
              <button
                key={lv}
                onClick={() => setUploadLevel(lv)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                  uploadLevel === lv
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                {lv === 'auto' ? 'Auto-detectar' : lv}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-1">
            {uploadLevel === 'auto' ? 'O nível é inferido do conteúdo de cada PDF.' : `Todos os diálogos serão classificados como ${uploadLevel}.`}
          </p>
        </div>


        <div className="flex gap-2">
          <label className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition border ${parsing ? 'bg-teal-500/10 text-teal-400 border-teal-500/20 animate-pulse' : 'bg-red-500/5 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10'}`}>
            <FileText className="w-3.5 h-3.5" />{parsing ? 'Processando...' : '📄 Upload PDFs (vários)'}
            <input type="file" accept=".pdf" multiple onChange={handlePDF} className="hidden" disabled={parsing} />
          </label>
          <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 text-slate-400 rounded-lg text-xs font-semibold cursor-pointer border border-slate-800 hover:text-slate-300">
            <Upload className="w-3 h-3" />JSON / TXT
            <input type="file" accept=".json,.txt" onChange={handlePDF} className="hidden" />
          </label>
        </div>

        {batchProg && (
          <div className="text-[11px] text-cyan-300 bg-cyan-500/5 border border-cyan-500/15 rounded-lg p-2">
            Processando {batchProg.c}/{batchProg.t} — <span className="font-mono text-cyan-400">{batchProg.name}</span>
          </div>
        )}

        {pdfPreview && <div><p className="text-[10px] text-slate-600 font-semibold mb-1">Prévia (primeiro PDF):</p><pre className="text-[10px] text-slate-500 bg-slate-950 rounded-lg p-2 max-h-24 overflow-y-auto font-mono border border-slate-800 whitespace-pre-wrap">{pdfPreview}</pre></div>}

        <textarea value={importText} onChange={e => { setImportText(e.target.value); setImportStatus('idle'); }} placeholder="Cole JSON ou faça upload acima..." className="w-full h-24 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 resize-none outline-none focus:border-slate-700 placeholder:text-slate-700" />
        
        <div className="flex items-start gap-2.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
          <input
            id="pregenerateAudio"
            type="checkbox"
            checked={pregenerateAudio}
            onChange={e => setPregenerateAudio(e.target.checked)}
            disabled={isImporting}
            className="w-4 h-4 mt-0.5 text-cyan-500 rounded border-slate-850 bg-slate-950 focus:ring-cyan-500/30 accent-cyan-500"
          />
          <div className="min-w-0 flex-1">
            <label htmlFor="pregenerateAudio" className="text-xs font-bold text-slate-200 cursor-pointer block select-none">
              🎙️ Pré-gerar áudios na nuvem
            </label>
            <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
              Gera e salva os arquivos MP3 para cada diálogo na nuvem usando Unreal Speech. Os alunos não consomem sua cota de API ao treinar!
            </p>
          </div>
        </div>

        {pregenProg && (
          <div className="space-y-2 p-3 bg-purple-500/10 text-slate-200 border border-purple-550/20 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 bg-purple-500/5 transition-all duration-300" style={{ width: pregenProg.t > 0 ? `${(pregenProg.c / pregenProg.t) * 100}%` : '0%' }} />
            <div className="flex items-center justify-between text-xs font-semibold relative z-10">
              <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> Pré-gerando áudios na nuvem...</span>
              <span className="text-purple-400 font-mono font-bold">{pregenProg.c} / {pregenProg.t} ({Math.round(pregenProg.t > 0 ? (pregenProg.c / pregenProg.t) * 100 : 0)}%)</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate relative z-10 font-mono">{pregenProg.msg}</p>
          </div>
        )}

        <button 
          onClick={handleImport} 
          disabled={!importText.trim() || parsing || isImporting} 
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 text-white rounded-lg text-xs font-bold disabled:opacity-30 hover:opacity-90 transition-all shadow-lg shadow-cyan-500/10 active:scale-95"
        >
          {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {isImporting ? 'Processando importação...' : 'Importar diálogos'}
        </button>

        {importStatus !== 'idle' && (
          <div className={`flex items-start gap-1.5 p-3 rounded-xl border text-[11px] leading-relaxed ${importStatus === 'success' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' : 'bg-red-500/5 text-red-400 border-red-500/10'}`}>
            {importStatus === 'success' ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
            <span className="whitespace-pre-wrap">{importMsg}</span>
          </div>
        )}
      </Section>
      )}

      {/* ===== GEMINI ===== */}
      <Section>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-blue-400" /><Label>Google Gemini</Label></div>
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5">Obter chave<ExternalLink className="w-2.5 h-2.5" /></a>
        </div>
        <p className="text-[11px] text-slate-600">Feedback avançado de pronúncia com IA. Sem chave = avaliação local.</p>
        <div><Label>API Key</Label><div className="relative mt-1"><input type={showGK ? 'text' : 'password'} value={api.geminiApiKey} onChange={e => setApi(p => ({ ...p, geminiApiKey: e.target.value }))} placeholder="AIzaSy..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono outline-none focus:border-slate-700 pr-8" /><button onClick={() => setShowGK(!showGK)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">{showGK ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div>
        <div><Label>Modelo</Label><select value={api.geminiModel} onChange={e => setApi(p => ({ ...p, geminiModel: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none"><option value="gemini-2.0-flash">2.0 Flash (rápido)</option><option value="gemini-1.5-flash">1.5 Flash</option><option value="gemini-1.5-pro">1.5 Pro (preciso)</option></select></div>
        <div><Label>Avaliação</Label><div className="flex gap-1.5 mt-1">{(['local', 'gemini'] as const).map(p => <button key={p} onClick={() => setApi(a => ({ ...a, pronunciationProvider: p }))} className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition ${api.pronunciationProvider === p ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-950 text-slate-600 border-slate-800'}`}>{p === 'local' ? '🖥️ Local' : '🤖 Gemini'}</button>)}</div></div>
        <button onClick={() => testApi('gemini')} disabled={!api.geminiApiKey || testing === 'gemini'} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-blue-400 bg-blue-500/5 border border-blue-500/15 rounded-lg disabled:opacity-30 hover:bg-blue-500/10">{testing === 'gemini' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}Testar Conexão</button>
        {testRes && testing === '' && <div className={`text-[11px] p-2 rounded-lg ${testRes.ok ? 'text-emerald-400 bg-emerald-500/5' : 'text-red-400 bg-red-500/5'}`}>{testRes.msg}</div>}
      </Section>

      {/* ===== UNREAL SPEECH ===== */}
      <Section>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Volume2 className="w-4 h-4 text-purple-400" /><Label>Unreal Speech</Label></div>
          <a href="https://unrealspeech.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-400 hover:underline flex items-center gap-0.5">Obter chave<ExternalLink className="w-2.5 h-2.5" /></a>
        </div>
        <p className="text-[11px] text-slate-600">Vozes ultra-realistas. Sem chave = sintetizador do navegador.</p>
        <div><Label>API Key</Label><div className="relative mt-1"><input type={showUK ? 'text' : 'password'} value={api.unrealSpeechApiKey} onChange={e => setApi(p => ({ ...p, unrealSpeechApiKey: e.target.value }))} placeholder="Bearer token..." className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono outline-none focus:border-slate-700 pr-8" /><button onClick={() => setShowUK(!showUK)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">{showUK ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div>
        <div><Label>Voz</Label><select value={api.unrealSpeechVoice} onChange={e => setApi(p => ({ ...p, unrealSpeechVoice: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none"><option value="Scarlett">Scarlett ♀</option><option value="Dan">Dan ♂</option><option value="Liv">Liv ♀</option><option value="Will">Will ♂</option><option value="Amy">Amy ♀</option></select></div>
        <div><Label>TTS</Label><div className="flex gap-1.5 mt-1">{(['browser', 'unreal'] as const).map(p => <button key={p} onClick={() => setApi(a => ({ ...a, ttsProvider: p }))} className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition ${api.ttsProvider === p ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-950 text-slate-600 border-slate-800'}`}>{p === 'browser' ? '🖥️ Navegador' : '🎙️ Unreal'}</button>)}</div></div>
        <button onClick={() => testApi('unreal')} disabled={!api.unrealSpeechApiKey || testing === 'unreal'} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-purple-400 bg-purple-500/5 border border-purple-500/15 rounded-lg disabled:opacity-30 hover:bg-purple-500/10">{testing === 'unreal' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}Testar Voz</button>
      </Section>

      {/* Unsplash — imagens das aulas */}
      <Section>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-amber-400" /><Label>Unsplash API</Label></div>
          <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5">Obter chave<ExternalLink className="w-2.5 h-2.5" /></a>
        </div>
        <p className="text-[11px] text-slate-600">A chave agora fica protegida no backend como <span className="font-mono text-amber-300">UNSPLASH_ACCESS_KEY</span>. As imagens escolhidas são salvas no banco para não repetir entre aulas.</p>
      </Section>

      {/* Save */}
      <button onClick={save} className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-cyan-500 text-white hover:bg-cyan-600'}`}>{saved ? '✅ Salvo!' : 'Salvar Configurações'}</button>

      {/* ===== DOWNLOAD AUDIOS ===== */}
      <Section>
        <div className="flex items-center gap-2"><Cloud className="w-4 h-4 text-cyan-400" /><Label>Baixar Áudios Offline</Label></div>
        <p className="text-[11px] text-slate-600">Gera {totalLines} áudios via Unreal Speech em um HTML offline com player embutido.</p>
        {dling ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-cyan-400"><Loader2 className="w-3.5 h-3.5 animate-spin" />{dlProg.c}/{dlProg.t}</div>
            <p className="text-[10px] text-slate-600 truncate">{dlProg.l}</p>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: dlProg.t > 0 ? `${(dlProg.c / dlProg.t) * 100}%` : '0%' }} /></div>
          </div>
        ) : (
          <button onClick={downloadAudios} disabled={!api.unrealSpeechApiKey} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold disabled:opacity-30 hover:bg-cyan-700"><Cloud className="w-3.5 h-3.5" />Baixar {totalLines} Áudios</button>
        )}
      </Section>

      {/* Export */}
      <Section>
        <Label>Exportar Dados</Label>
        <div className="flex gap-2">
          <button onClick={() => { const b = new Blob([JSON.stringify(dialogues, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'dialogues.json'; a.click(); URL.revokeObjectURL(u); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/60 text-slate-400 rounded-lg text-[11px] font-semibold border border-slate-800 hover:text-slate-300"><Download className="w-3 h-3" />Diálogos</button>
          <button onClick={() => { const b = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'stats.json'; a.click(); URL.revokeObjectURL(u); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/60 text-slate-400 rounded-lg text-[11px] font-semibold border border-slate-800 hover:text-slate-300"><Download className="w-3 h-3" />Progresso</button>
        </div>
      </Section>

      {/* All dialogues — remove any */}
      <Section>
        <Label>Gerenciar Diálogos ({dialogues.length})</Label>
        <p className="text-[11px] text-slate-600">Remova diálogos que você não quer praticar. Você pode resetar tudo na Zona de Perigo para restaurar os padrões.</p>
        <div ref={dialogueListRef} className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
          {(['A1','A2','B1','B2','C1','C2'] as const).map(lvl => {
            const items = dialogues.filter(d => d.level === lvl);
            if (!items.length) return null;
            const importedItems = items.filter(d => !builtinIds.includes(d.id));
            const bulkKey = `bulk-${lvl}`;
            return (
              <div key={lvl}>
                <div className="flex items-center justify-between mt-2 mb-1 gap-2">
                  <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">{lvl} · {items.length}</p>
                  {items.length > 0 && (
                    showDel === bulkKey ? (
                      <div className="flex gap-1">
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); e.stopPropagation(); keepScroll(() => { items.forEach(d => onDeleteDialogue(d.id)); setShowDel(null); }); }} className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded font-bold">Excluir todos ({items.length})</button>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); e.stopPropagation(); keepScroll(() => setShowDel(null)); }} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold">Cancelar</button>
                      </div>
                    ) : (
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); e.stopPropagation(); keepScroll(() => setShowDel(bulkKey)); }} className="text-[9px] text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded border border-red-500/20 hover:bg-red-500/10">
                        <Trash2 className="w-2.5 h-2.5" /> Excluir todos do {lvl} ({items.length})
                      </button>
                    )
                  )}
                </div>
                {items.map(d => {
                  const isCustom = !builtinIds.includes(d.id);
                  return (
                    <div key={d.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-2 border border-slate-800">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-300 truncate">{d.title} {isCustom && <span className="text-[9px] text-cyan-500">(importado)</span>}</p>
                        <p className="text-[10px] text-slate-600">{d.lines.length} falas</p>
                      </div>
                      {showDel === d.id ? (
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              keepScroll(() => {
                                onDeleteDialogue(d.id);
                                setShowDel(null);
                              });
                            }}
                            className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded font-bold"
                          >
                            Remover
                          </button>
                          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); e.stopPropagation(); keepScroll(() => setShowDel(null)); }} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold">Cancelar</button>
                        </div>
                      ) : (
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.preventDefault(); e.stopPropagation(); keepScroll(() => setShowDel(d.id)); }} className="text-slate-700 hover:text-red-400 shrink-0 p-1" aria-label="Remover diálogo">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Danger */}
      <Section className="!border-red-500/15">
        <Label>Zona de Perigo</Label>
        {resetStage === 'idle' ? <button onClick={() => setResetStage('confirming')} className="px-3 py-1.5 bg-red-500/5 text-red-400 rounded-lg text-[11px] font-semibold border border-red-500/15 hover:bg-red-500/10"><Trash2 className="w-3 h-3 inline mr-1" />Resetar tudo</button>
          : <div className="space-y-2"><p className="text-xs text-red-400 font-semibold">⚠️ Ação irreversível</p><div className="flex gap-2"><button onClick={() => { onResetProgress(); setResetStage('idle'); }} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold">Confirmar</button><button onClick={() => setResetStage('idle')} className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold">Cancelar</button></div></div>}
      </Section>
    </div>
  );
}
