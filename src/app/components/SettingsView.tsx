import { useState, useEffect } from 'react';
import { Download, Upload, Trash2, CheckCircle, AlertTriangle, Key, Volume2, Brain, Cloud, Loader2, ExternalLink, Eye, EyeOff, FileText, Sparkles } from 'lucide-react';
import { Dialogue, UserStats, Badge } from '../types';
import { getApiConfig, saveApiConfig, ApiConfig } from '../utils/apiConfig';
import { generateAllAudios } from '../utils/speech';

interface Props { stats: UserStats; dialogues: Dialogue[]; onImportDialogues: (d: Dialogue[]) => void; onDeleteDialogue: (id: string) => void; onResetProgress: () => void; }

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
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY = -1; let pt = '';
    for (const item of content.items as any[]) {
      if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) pt += '\n';
      pt += item.str; if (item.str && !item.str.endsWith(' ')) pt += ' ';
      lastY = item.transform[5];
    }
    text += pt.trim() + '\n\n';
  }
  return text.trim();
}

function parseTextToDialogues(text: string): Dialogue[] {
  try { const p = JSON.parse(text); if (Array.isArray(p)) return p; } catch (_) {}
  const m = text.match(/\[[\s\S]*\]/); if (m) { try { const p = JSON.parse(m[0]); if (Array.isArray(p)) return p; } catch (_) {} }
  const dialogues: Dialogue[] = []; const clean = text.replace(/\r\n/g, '\n');
  const sections = clean.split(/\n{3,}|(?:^|\n)(?:#{1,3}\s|Diálogo\s*\d*\s*[:\-]?\s*|Dialogue\s*\d*\s*[:\-]?\s*|Lesson\s*\d*\s*[:\-]?\s*)/gi).filter(s => s.trim().length > 20);
  (sections.length ? sections : [clean]).forEach((sec, idx) => {
    const lines = sec.split('\n').map(l => l.trim()).filter(l => l);
    let title = ''; let start = 0;
    for (let i = 0; i < Math.min(3, lines.length); i++) { if (!/^[A-Za-zÀ-ÿ\s().,]+?\s*[:\-–]\s*.+/.test(lines[i]) && lines[i].length > 3 && lines[i].length < 120) { title = lines[i].replace(/^[#\-*•]+\s*/, ''); start = i + 1; break; } }
    if (!title) title = `Diálogo ${idx + 1}`;
    const dLines: any[] = []; let pending = false;
    for (let i = start; i < lines.length; i++) {
      const l = lines[i]; const sm = l.match(/^([A-Za-zÀ-ÿ\s(),.]+?)\s*[:\-–]\s*(.{5,})/);
      if (sm) { dLines.push({ id: `pdf-${idx}-${dLines.length}`, speaker: sm[1].trim(), text: sm[2].trim(), translation: '' }); pending = true; }
      else if (pending && dLines.length > 0 && !dLines[dLines.length - 1].translation && l.length > 5) { dLines[dLines.length - 1].translation = l; pending = false; }
      else pending = false;
    }
    let level: any = 'A1'; const lw = sec.toLowerCase();
    if (lw.includes('c2')) level = 'C2'; else if (lw.includes('c1')) level = 'C1'; else if (lw.includes('b2')) level = 'B2'; else if (lw.includes('b1')) level = 'B1'; else if (lw.includes('a2')) level = 'A2';
    if (dLines.length > 0) dialogues.push({ id: `pdf-${Date.now()}-${idx}`, title: title.substring(0, 80), situation: `Importado — ${dLines.length} falas`, level, order: idx + 1, lines: dLines });
  });
  return dialogues;
}

export default function SettingsView({ stats, dialogues, onImportDialogues, onDeleteDialogue, onResetProgress }: Props) {
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMsg, setImportMsg] = useState('');
  const [pdfPreview, setPdfPreview] = useState('');
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

  useEffect(() => { setApi(getApiConfig()); }, []);
  const save = () => { saveApiConfig(api); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const builtinIds = ['a1-coffee', 'a1-office', 'a1-grocery', 'a2-directions', 'a2-restaurant', 'b1-doctor', 'b2-interview', 'c1-negotiation', 'c2-debate'];
  const custom = dialogues.filter(d => !builtinIds.includes(d.id));
  const totalLines = dialogues.reduce((s, d) => s + d.lines.length, 0);
  const pct = dialogues.length > 0 ? Math.round((stats.completedDialogues.length / dialogues.length) * 100) : 0;

  const handlePDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.name.endsWith('.json') || file.type === 'application/json') { const r = new FileReader(); r.onload = ev => { setImportText(ev.target?.result as string || ''); setImportStatus('idle'); setPdfPreview(''); }; r.readAsText(file); return; }
    if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
      setParsing(true); setImportStatus('idle'); setImportMsg('');
      try {
        const txt = await extractPDF(file);
        setPdfPreview(txt.substring(0, 800) + (txt.length > 800 ? '\n...' : ''));
        const parsed = parseTextToDialogues(txt);
        if (parsed.length > 0) { setImportText(JSON.stringify(parsed, null, 2)); setImportMsg(`✅ ${parsed.length} diálogo(s) extraído(s). Revise e confirme.`); setImportStatus('success'); }
        else { setImportText(txt); setImportMsg(`⚠️ Texto extraído (${txt.length} chars). Edite para JSON e importe.`); setImportStatus('error'); }
      } catch (err: any) { setImportMsg(`❌ ${err.message}`); setImportStatus('error'); }
      setParsing(false); return;
    }
    const r = new FileReader(); r.onload = ev => { setImportText(ev.target?.result as string || ''); setImportStatus('idle'); setPdfPreview(''); }; r.readAsText(file);
  };

  const handleImport = () => {
    try {
      let parsed: Dialogue[];
      try { parsed = JSON.parse(importText); } catch (_) { parsed = parseTextToDialogues(importText); }
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('Nenhum diálogo válido');
      parsed.forEach((d: any, i: number) => { if (!d.id) d.id = `imp-${Date.now()}-${i}`; if (!d.title) d.title = `Importado ${i + 1}`; if (!d.lines?.length) throw new Error(`"${d.title}" sem linhas`); if (!d.level) d.level = 'A1'; if (!d.order) d.order = i + 1; if (!d.situation) d.situation = `${d.lines.length} falas`; });
      onImportDialogues(parsed); setImportStatus('success'); setImportMsg(`✅ ${parsed.length} diálogo(s) importado(s)!`); setImportText(''); setPdfPreview('');
    } catch (e: any) { setImportStatus('error'); setImportMsg(`❌ ${e.message}`); }
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
      <Section>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <Label>Importar Diálogos (PDF / JSON)</Label>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">Faça upload de um <strong className="text-cyan-400">PDF</strong> com diálogos ou um <strong className="text-cyan-400">JSON</strong>. O texto do PDF é extraído e convertido automaticamente.</p>

        <div className="flex gap-2">
          <label className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition border ${parsing ? 'bg-teal-500/10 text-teal-400 border-teal-500/20 animate-pulse' : 'bg-red-500/5 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10'}`}>
            <FileText className="w-3.5 h-3.5" />{parsing ? 'Processando...' : '📄 Upload PDF'}
            <input type="file" accept=".pdf" onChange={handlePDF} className="hidden" disabled={parsing} />
          </label>
          <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 text-slate-400 rounded-lg text-xs font-semibold cursor-pointer border border-slate-800 hover:text-slate-300">
            <Upload className="w-3 h-3" />JSON / TXT
            <input type="file" accept=".json,.txt" onChange={handlePDF} className="hidden" />
          </label>
        </div>

        {pdfPreview && <div><p className="text-[10px] text-slate-600 font-semibold mb-1">Texto extraído do PDF:</p><pre className="text-[10px] text-slate-500 bg-slate-950 rounded-lg p-2 max-h-24 overflow-y-auto font-mono border border-slate-800 whitespace-pre-wrap">{pdfPreview}</pre></div>}

        <textarea value={importText} onChange={e => { setImportText(e.target.value); setImportStatus('idle'); }} placeholder="Cole JSON ou faça upload acima..." className="w-full h-24 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 resize-none outline-none focus:border-slate-700 placeholder:text-slate-700" />
        <button onClick={handleImport} disabled={!importText.trim() || parsing} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 text-white rounded-lg text-xs font-bold disabled:opacity-30"><Sparkles className="w-3.5 h-3.5" />Importar</button>
        {importStatus !== 'idle' && <div className={`flex items-start gap-1.5 p-2 rounded-lg text-[11px] ${importStatus === 'success' ? 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/15' : 'bg-red-500/5 text-red-400 border border-red-500/15'}`}>{importStatus === 'success' ? <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />}<span>{importMsg}</span></div>}
      </Section>

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

      {/* Custom dialogues */}
      {custom.length > 0 && <Section>
        <Label>Diálogos Importados ({custom.length})</Label>
        {custom.map(d => <div key={d.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-2 border border-slate-800"><div><p className="text-xs font-semibold text-slate-300">{d.title}</p><p className="text-[10px] text-slate-600">{d.level} · {d.lines.length} falas</p></div>{showDel === d.id ? <div className="flex gap-1"><button onClick={() => { onDeleteDialogue(d.id); setShowDel(null); }} className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded font-bold">Sim</button><button onClick={() => setShowDel(null)} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold">Não</button></div> : <button onClick={() => setShowDel(d.id)} className="text-slate-700 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}</div>)}
      </Section>}

      {/* Danger */}
      <Section className="!border-red-500/15">
        <Label>Zona de Perigo</Label>
        {resetStage === 'idle' ? <button onClick={() => setResetStage('confirming')} className="px-3 py-1.5 bg-red-500/5 text-red-400 rounded-lg text-[11px] font-semibold border border-red-500/15 hover:bg-red-500/10"><Trash2 className="w-3 h-3 inline mr-1" />Resetar tudo</button>
          : <div className="space-y-2"><p className="text-xs text-red-400 font-semibold">⚠️ Ação irreversível</p><div className="flex gap-2"><button onClick={() => { onResetProgress(); setResetStage('idle'); }} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold">Confirmar</button><button onClick={() => setResetStage('idle')} className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold">Cancelar</button></div></div>}
      </Section>
    </div>
  );
}
