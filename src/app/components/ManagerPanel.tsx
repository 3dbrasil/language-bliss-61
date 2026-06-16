import { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, Bot, Send, X, ChevronDown, FileText, Upload, CheckCircle, AlertTriangle, Sparkles, Eye, Lock, MessageSquare, Clock, Shield } from 'lucide-react';
import { Dialogue, UserStats } from '../types';

interface ManagerPanelProps {
  stats: UserStats;
  dialogues: Dialogue[];
  onImportDialogues: (dialogues: Dialogue[]) => void;
  onClose: () => void;
  shieldMode: boolean;
  onToggleShield: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'manager';
  content: string;
  timestamp: Date;
  type?: 'text' | 'success' | 'alert';
}

function generateManagerResponse(userMsg: string, stats: UserStats, dialogues: Dialogue[]): string {
  const msg = userMsg.toLowerCase();
  if (msg.includes('status') || msg.includes('progresso') || msg.includes('como estou')) {
    const pct = dialogues.length > 0 ? Math.round((stats.completedDialogues.length / dialogues.length) * 100) : 0;
    return `📊 **Relatório de Progresso**\n\n• XP: **${stats.xp}**\n• Ofensiva: **${stats.streak}** dia(s)\n• Lições: **${stats.completedDialogues.length}/${dialogues.length}** (${pct}%)\n• Badges: **${stats.badges.length}**\n• Níveis: **${stats.unlockedLevels.join(', ')}**\n\n${pct < 30 ? '⚠️ Foque nas lições A1 para construir base.' : pct < 70 ? '💡 Bom progresso! Use Repetição para fixar.' : '🌟 Excelente! Enfrente a Arena!'}`;
  }
  if (msg.includes('pdf') || msg.includes('importar') || msg.includes('enviar') || msg.includes('dialogo') || msg.includes('diálogo')) {
    return `📋 **Importação de Diálogos**\n\nVocê pode importar de duas formas:\n\n1. **PDF** — Faça upload do PDF na aba "📄 Importar". O Manager extrai o texto automaticamente e tenta converter.\n\n2. **JSON** — Cole JSON formatado diretamente.\n\n💡 Use a aba "📄 Importar" abaixo!`;
  }
  if (msg.includes('escudo') || msg.includes('shield')) {
    return `🛡️ **Modo Escudo**\n\n• 🔒 Oculta estatísticas\n• 👁️‍🗨️ Mascara progresso\n• 🔐 Previne exposição\n\nUse o botão no topo para ativar.`;
  }
  if (msg.includes('ajuda') || msg.includes('help')) {
    return `🤖 **Comandos**\n\n• **"status"** — Progresso\n• **"importar"** — Importar diálogos\n• **"sugestão"** — Próximos passos\n• **"verificar"** — Integridade dos dados\n• **"escudo"** — Modo proteção`;
  }
  if (msg.includes('sugestão') || msg.includes('próximo') || msg.includes('recomend')) {
    const incomplete = dialogues.filter(d => !stats.completedDialogues.includes(d.id));
    if (incomplete.length === 0) return `🏆 Todas as lições completas! Use Arena e Repetição.`;
    const next = incomplete[0];
    return `📋 **Próxima:** ${next.title} (${next.level})\n📝 ${next.situation}\n⏱️ ~${next.lines.length * 2} min`;
  }
  if (msg.includes('verificar') || msg.includes('checar')) {
    return `✅ **Verificação OK**\n\n• ✓ XP: ${stats.xp}\n• ✓ Streak: ${stats.streak}\n• ✓ ${stats.completedDialogues.length} completados\n• ✓ ${dialogues.length} diálogos\n\n🟢 Tudo em ordem.`;
  }
  return `Entendido! Tente: "status", "importar", "sugestão", "ajuda"`;
}

function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }

    const PDFJS_VERSION = '3.11.174';
    const CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;
    
    const script = document.createElement('script');
    script.src = `${CDN_BASE}/pdf.min.js`;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = `${CDN_BASE}/pdf.worker.min.js`;
        resolve(lib);
      } else {
        reject(new Error('pdf.js carregou mas pdfjsLib não foi encontrado'));
      }
    };

    script.onerror = () => {
      reject(new Error('Falha ao baixar pdf.js do CDN'));
    };

    document.head.appendChild(script);
  });
}

async function extractTextFromPDF(file: File): Promise<string> {
  let pdfjsLib: any;
  
  try {
    pdfjsLib = await loadPdfJs();
  } catch (_e) {
    throw new Error('Não foi possível carregar o leitor de PDF. Verifique sua conexão ou cole o texto manualmente.');
  }
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as any[];
    
    // Better text extraction: preserve line breaks based on Y position
    let lastY = -1;
    let pageText = '';
    for (const item of items) {
      if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += '\n';
      }
      pageText += item.str;
      if (item.str && !item.str.endsWith(' ')) {
        pageText += ' ';
      }
      lastY = item.transform[5];
    }
    fullText += pageText.trim() + '\n\n';
  }
  return fullText.trim();
}

function tryParseDialoguesFromText(text: string): Dialogue[] {
  // 1. Try direct JSON parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch (_e) { /* not JSON */ }

  // 2. Try to find JSON arrays embedded in text
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch (_e) { /* not valid JSON */ }
  }

  // 3. Smart text parser — handles multiple common formats
  const dialogues: Dialogue[] = [];
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Try to split by common section markers
  const sectionPatterns = [
    /(?:^|\n)(?:#{1,3}\s*|Dialogue\s*\d*\s*[:\-–]?\s*|Dialog(?:ue)?\s*\d*\s*[:\-–]?\s*|Diálogo\s*\d*\s*[:\-–]?\s*|Lição\s*\d*\s*[:\-–]?\s*|Lesson\s*\d*\s*[:\-–]?\s*|Unit\s*\d*\s*[:\-–]?\s*|Unidade\s*\d*\s*[:\-–]?\s*|Chapter\s*\d*\s*[:\-–]?\s*|Capítulo\s*\d*\s*[:\-–]?\s*)/gi,
    /\n{3,}/g, // 3+ blank lines as separator
  ];

  let sections: string[] = [];
  for (const pattern of sectionPatterns) {
    sections = cleanText.split(pattern).filter(s => s.trim().length > 20);
    if (sections.length >= 1) break;
  }

  // If no sections found, treat entire text as one dialogue
  if (sections.length === 0) {
    sections = [cleanText];
  }

  sections.forEach((section, idx) => {
    const lines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 1) return;

    // Find title: first line that's NOT a speaker line
    let title = '';
    let startIdx = 0;
    
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const isSpeaker = /^[A-Za-zÀ-ÿ\s().,]+?\s*[:–\-]\s*.+/.test(lines[i]);
      if (!isSpeaker && lines[i].length > 3 && lines[i].length < 120) {
        title = lines[i].replace(/^[#\-*•]+\s*/, '').trim();
        startIdx = i + 1;
        break;
      }
    }
    if (!title) title = `Diálogo ${idx + 1}`;

    // Parse speaker lines with multiple patterns
    const dialogueLines: any[] = [];
    let pendingTranslation = false;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];

      // Pattern 1: "Speaker: English text"  or  "Speaker - English text"
      const m1 = line.match(/^([A-Za-zÀ-ÿ\s(),.]+?)\s*[:–\-]\s*(.{5,})/);
      // Pattern 2: Quoted text like Speaker: "Hello there"
      const m2 = line.match(/^([A-Za-zÀ-ÿ\s(),.]+?)\s*[:–\-]\s*["""](.+?)["""]/);
      // Pattern 3: Bold/marked speaker **Speaker**: text
      const m3 = line.match(/^\*\*(.+?)\*\*\s*[:–\-]?\s*(.{5,})/);

      const match = m2 || m3 || m1;
      if (match) {
        const speaker = match[1].trim().replace(/^\*+|\*+$/g, '');
        const text = match[2].trim().replace(/^["""]|["""]$/g, '');

        if (text.length >= 3 && speaker.length < 40) {
          dialogueLines.push({
            id: `pdf-${idx}-${dialogueLines.length}`,
            speaker,
            text,
            translation: '',
          });
          pendingTranslation = true;
          continue;
        }
      }

      // If previous line was a speaker line, this might be translation
      // (typically Portuguese text after English text)
      if (pendingTranslation && dialogueLines.length > 0 && !dialogueLines[dialogueLines.length - 1].translation) {
        // Check if this line looks like it could be a translation (has Portuguese chars or is clearly different)
        const lastText = dialogueLines[dialogueLines.length - 1].text;
        if (line.length > 5 && line !== lastText) {
          dialogueLines[dialogueLines.length - 1].translation = line.replace(/^["""]|["""]$/g, '').replace(/^Tradução:\s*/i, '').trim();
          pendingTranslation = false;
          continue;
        }
      }

      pendingTranslation = false;
    }

    // Detect level from text content
    let level: any = 'A1';
    const textLower = section.toLowerCase();
    if (textLower.includes('c2') || textLower.includes('mastery')) level = 'C2';
    else if (textLower.includes('c1') || textLower.includes('advanced')) level = 'C1';
    else if (textLower.includes('b2') || textLower.includes('upper intermediate')) level = 'B2';
    else if (textLower.includes('b1') || textLower.includes('intermediate')) level = 'B1';
    else if (textLower.includes('a2') || textLower.includes('elementary')) level = 'A2';

    if (dialogueLines.length > 0) {
      dialogues.push({
        id: `pdf-${Date.now()}-${idx}`,
        title: title.substring(0, 80),
        situation: `Importado — ${dialogueLines.length} falas`,
        level,
        order: idx + 1,
        lines: dialogueLines,
      });
    }
  });

  return dialogues;
}

export default function ManagerPanel({ stats, dialogues, onImportDialogues, onClose, shieldMode, onToggleShield }: ManagerPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome', role: 'manager',
    content: `👋 **Olá! Sou seu Manager.**\n\n• 📊 Monitoro seu progresso\n• 📄 Importo diálogos (PDF/JSON)\n• 🛡️ Gerencio Modo Escudo\n\nDigite **"ajuda"** para ver comandos.`,
    timestamp: new Date(), type: 'text'
  }]);
  const [input, setInput] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'import' | 'tasks'>('chat');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [pdfPreview, setPdfPreview] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    setMessages(p => [...p, { id: `u-${Date.now()}`, role: 'user', content: input, timestamp: new Date(), type: 'text' }]);
    const userInput = input;
    setInput(''); setIsTyping(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 500));
    setMessages(p => [...p, { id: `m-${Date.now()}`, role: 'manager', content: generateManagerResponse(userInput, stats, dialogues), timestamp: new Date(), type: 'text' }]);
    setIsTyping(false);
  }, [input, stats, dialogues]);

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.json') || file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (ev) => { setImportText(ev.target?.result as string || ''); setImportStatus('idle'); setPdfPreview(''); };
      reader.readAsText(file);
      return;
    }

    if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
      setIsParsing(true);
      setImportStatus('idle');
      setImportMessage('');
      try {
        const text = await extractTextFromPDF(file);
        setPdfPreview(text.substring(0, 1000) + (text.length > 1000 ? '\n\n...[texto truncado]' : ''));
        
        const parsed = tryParseDialoguesFromText(text);
        if (parsed.length > 0) {
          setImportText(JSON.stringify(parsed, null, 2));
          setImportMessage(`✅ PDF processado! ${parsed.length} diálogo(s) encontrado(s). Revise e confirme a importação.`);
          setImportStatus('success');
        } else {
          setImportText(text);
          setImportMessage(`⚠️ PDF lido com sucesso (${text.length} chars), mas não foi possível extrair diálogos automaticamente. O texto extraído está abaixo — você pode editá-lo para formato JSON e importar.`);
          setImportStatus('error');
        }
      } catch (err: any) {
        setImportMessage(`❌ Erro ao ler PDF: ${err.message || 'formato não suportado'}`);
        setImportStatus('error');
      }
      setIsParsing(false);
      return;
    }

    // Plain text
    const reader = new FileReader();
    reader.onload = (ev) => { setImportText(ev.target?.result as string || ''); setImportStatus('idle'); setPdfPreview(''); };
    reader.readAsText(file);
  };

  const handleImport = () => {
    try {
      let parsed: Dialogue[];
      try {
        parsed = JSON.parse(importText);
      } catch (_e) {
        parsed = tryParseDialoguesFromText(importText);
      }
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Nenhum diálogo válido encontrado');
      parsed.forEach((d: any, i: number) => {
        if (!d.id) d.id = `import-${Date.now()}-${i}`;
        if (!d.title) d.title = `Diálogo Importado ${i + 1}`;
        if (!d.lines || !Array.isArray(d.lines)) throw new Error(`Diálogo "${d.title}" sem linhas`);
        if (!d.level) d.level = 'A1';
        if (!d.order) d.order = i + 1;
        if (!d.situation) d.situation = `Importado - ${d.lines.length} falas`;
      });
      onImportDialogues(parsed);
      setImportStatus('success');
      setImportMessage(`✅ ${parsed.length} diálogo(s) importado(s) e verificado(s)!`);
      setImportText(''); setPdfPreview('');
      setMessages(p => [...p, { id: `m-imp-${Date.now()}`, role: 'manager', content: `✅ **Importação concluída:** ${parsed.length} diálogo(s) adicionados.`, timestamp: new Date(), type: 'success' }]);
    } catch (e: any) {
      setImportStatus('error');
      setImportMessage(`❌ ${e.message || 'Erro ao importar'}`);
    }
  };

  const tasks = [
    { title: 'Completar lições A1', status: dialogues.filter(d => d.level === 'A1' && stats.completedDialogues.includes(d.id)).length === dialogues.filter(d => d.level === 'A1').length ? 'done' : 'active', detail: `${dialogues.filter(d => d.level === 'A1' && stats.completedDialogues.includes(d.id)).length}/${dialogues.filter(d => d.level === 'A1').length}` },
    { title: 'Ofensiva de 3 dias', status: stats.streak >= 3 ? 'done' : 'active', detail: `${stats.streak}/3` },
    { title: 'Acumular 100 XP', status: stats.xp >= 100 ? 'done' : 'active', detail: `${stats.xp}/100` },
    { title: 'Importar diálogos', status: dialogues.length > 9 ? 'done' : 'pending', detail: `${dialogues.length} carregados` },
  ];

  const formatContent = (content: string) => content.split('\n').map((line, i) => {
    const rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
    return <p key={i} className="mb-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-[#12141e] rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in border border-[#2a2e3f]">
        {/* Header */}
        <div className="bg-[#0f1117] px-4 py-3 flex items-center justify-between shrink-0 border-b border-[#2a2e3f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center relative">
              <Bot className="w-4 h-4 text-white" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0f1117] animate-pulse" />
            </div>
            <div>
              <h2 className="text-white font-black text-xs">Manager</h2>
              <p className="text-slate-500 text-[9px] font-semibold">Technical Lead</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onToggleShield} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              shieldMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#1a1d2e] text-slate-500 border border-[#2a2e3f]'}`}>
              {shieldMode ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              {shieldMode ? 'ON' : 'OFF'}
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {shieldMode && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-3 py-1.5 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-400" /><span className="text-[10px] text-emerald-400 font-semibold">Escudo ativo</span>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-[#2a2e3f] px-3 py-1.5 flex gap-1 shrink-0">
          {[{ id: 'chat', label: 'Chat', icon: MessageSquare }, { id: 'import', label: 'Importar', icon: FileText }, { id: 'tasks', label: 'Tarefas', icon: CheckCircle }].map(tab => (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              activeSubTab === tab.id ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-[#1a1d2e]'}`}>
              <tab.icon className="w-3 h-3" />{tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeSubTab === 'chat' && (
            <div className="p-3 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user' ? 'bg-orange-500/20 text-orange-200 rounded-xl rounded-br-sm'
                    : msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-slate-300 rounded-xl rounded-bl-sm'
                    : 'bg-[#1a1d2e] border border-[#2a2e3f] text-slate-300 rounded-xl rounded-bl-sm'
                  }`}>
                    {msg.role === 'manager' && (
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-4 h-4 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded flex items-center justify-center"><Bot className="w-2.5 h-2.5 text-white" /></div>
                        <span className="text-[8px] font-black text-slate-500 uppercase">Manager</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{formatContent(msg.content)}</div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1d2e] border border-[#2a2e3f] rounded-xl rounded-bl-sm px-3 py-2">
                    <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {activeSubTab === 'import' && (
            <div className="p-3 space-y-3">
              <div className="bg-[#1a1d2e] rounded-xl p-4 border border-[#2a2e3f] space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-400" />
                  <h3 className="font-black text-white text-xs">Importar Diálogos (PDF ou JSON)</h3>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Faça upload de um <strong className="text-orange-400">PDF</strong> com seus diálogos ou um <strong className="text-orange-400">arquivo JSON</strong>. O Manager extrai o texto do PDF e tenta converter automaticamente.
                </p>

                <div className="flex gap-2 flex-wrap">
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                    isParsing 
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse cursor-wait'
                      : 'bg-gradient-to-r from-red-500/20 to-orange-500/20 text-orange-300 border-orange-500/30 hover:from-red-500/30 hover:to-orange-500/30 hover:text-orange-200'
                  }`}>
                    <FileText className="w-4 h-4" />
                    {isParsing ? '⏳ Processando PDF...' : '📄 Upload PDF'}
                    <input type="file" accept=".pdf" onChange={handlePDFUpload} className="hidden" disabled={isParsing} />
                  </label>
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-[#0f1117] text-slate-400 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-500/10 hover:text-blue-400 transition-all border border-[#2a2e3f]">
                    <Upload className="w-3.5 h-3.5" />
                    JSON / TXT
                    <input type="file" accept=".json,.txt" onChange={handlePDFUpload} className="hidden" disabled={isParsing} />
                  </label>
                </div>

                {isParsing && (
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    Extraindo texto do PDF...
                  </div>
                )}

                {pdfPreview && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 font-bold">📄 Preview do PDF extraído:</p>
                    <pre className="text-[10px] text-slate-400 bg-[#0f1117] rounded-lg p-2.5 max-h-28 overflow-y-auto font-mono border border-[#2a2e3f] whitespace-pre-wrap">{pdfPreview}</pre>
                  </div>
                )}

                <textarea value={importText} onChange={e => { setImportText(e.target.value); setImportStatus('idle'); }}
                  placeholder="Cole JSON aqui ou faça upload de PDF acima..."
                  className="w-full h-28 px-3 py-2 rounded-lg bg-[#0f1117] border border-[#2a2e3f] text-xs font-mono text-slate-300 resize-none focus:ring-1 focus:ring-orange-500/50 outline-none placeholder:text-slate-600" />

                <button onClick={handleImport} disabled={!importText.trim() || isParsing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-xs font-bold disabled:opacity-40 shadow-lg shadow-orange-500/20">
                  <Sparkles className="w-3.5 h-3.5" />Verificar & Importar
                </button>

                {importStatus !== 'idle' && (
                  <div className={`flex items-start gap-1.5 p-2.5 rounded-lg text-[11px] ${
                    importStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {importStatus === 'success' ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                    <span>{importMessage}</span>
                  </div>
                )}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-black text-amber-400">Formato JSON esperado</span>
                </div>
                <pre className="text-[9px] text-amber-300/70 font-mono bg-[#0f1117] rounded-lg p-2 overflow-x-auto">{`[{
  "id": "meu-dialogo",
  "title": "Título",
  "situation": "Contexto...",
  "level": "A1",
  "order": 1,
  "lines": [{
    "id": "l1",
    "speaker": "Person",
    "text": "English text",
    "translation": "Tradução"
  }]
}]`}</pre>
              </div>
            </div>
          )}

          {activeSubTab === 'tasks' && (
            <div className="p-3 space-y-2">
              {tasks.map((task, i) => (
                <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${
                  task.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/20' : task.status === 'active' ? 'bg-[#1a1d2e] border-orange-500/20' : 'bg-[#161824] border-[#2a2e3f]'}`}>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    task.status === 'done' ? 'bg-emerald-500' : task.status === 'active' ? 'bg-orange-500' : 'bg-[#2a2e3f]'}`}>
                    {task.status === 'done' ? <CheckCircle className="w-3 h-3 text-white" /> : task.status === 'active' ? <Clock className="w-3 h-3 text-white" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${task.status === 'done' ? 'text-emerald-400 line-through' : 'text-white'}`}>{task.title}</p>
                    <p className="text-[10px] text-slate-500">{task.detail}</p>
                  </div>
                </div>
              ))}

              <div className="mt-3 bg-[#0f1117] rounded-xl p-3 border border-[#2a2e3f]">
                <div className="flex items-center gap-1.5 mb-2"><Eye className="w-3 h-3 text-slate-500" /><span className="text-[9px] font-black text-slate-500 uppercase">Visão Geral</span></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center"><p className="text-lg font-black text-white">{shieldMode ? '•••' : stats.xp}</p><p className="text-[9px] text-slate-500">XP</p></div>
                  <div className="text-center"><p className="text-lg font-black text-white">{shieldMode ? '•••' : stats.completedDialogues.length}</p><p className="text-[9px] text-slate-500">FEITAS</p></div>
                  <div className="text-center"><p className="text-lg font-black text-white">{shieldMode ? '•••' : `${stats.streak}d`}</p><p className="text-[9px] text-slate-500">STREAK</p></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {activeSubTab === 'chat' && (
          <div className="border-t border-[#2a2e3f] p-3 shrink-0">
            <div className="flex gap-1.5">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                placeholder="Fale com o Manager..." className="flex-1 px-3 py-2 rounded-lg bg-[#1a1d2e] border border-[#2a2e3f] text-xs text-white focus:ring-1 focus:ring-orange-500/50 outline-none placeholder:text-slate-600" />
              <button onClick={sendMessage} disabled={!input.trim() || isTyping}
                className="w-8 h-8 bg-orange-500 text-white rounded-lg flex items-center justify-center disabled:opacity-40"><Send className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
