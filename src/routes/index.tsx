import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mic, Play, ArrowRight, Sparkles, MessageSquare, Headphones,
  Briefcase, Plane, Users, GraduationCap, Coffee, Globe,
  Check, Star, Waves, Zap, Brain, Trophy,
} from "lucide-react";
import heroImg from "@/assets/landing-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Speak Native — Inglês de uma vez por todas" },
      { name: "description", content: "O laboratório de idiomas do futuro: domine inglês com diálogos reais, IA de pronúncia e progresso gamificado. Comece grátis." },
      { property: "og:title", content: "Speak Native — Inglês fluente com diálogos reais" },
      { property: "og:description", content: "Aprenda inglês como nativo. Diálogos profissionais, IA de pronúncia, do A1 ao C2." },
      { property: "og:image", content: heroImg },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

const dialogues = [
  { icon: Briefcase, title: "Entrevista de emprego", desc: "Tell me about yourself...", color: "from-[#2A7FFF] to-[#5BA0FF]" },
  { icon: Plane, title: "Aeroporto & Viagens", desc: "I have a connecting flight...", color: "from-[#00D4A0] to-[#3FE5BC]" },
  { icon: Users, title: "Reunião de negócios", desc: "Let's circle back to the Q3 numbers...", color: "from-[#2A7FFF] to-[#00D4A0]" },
  { icon: Coffee, title: "Small talk casual", desc: "How was your weekend?", color: "from-[#7C5CFF] to-[#2A7FFF]" },
  { icon: GraduationCap, title: "Acadêmico", desc: "Could you elaborate on your thesis?", color: "from-[#00D4A0] to-[#2A7FFF]" },
  { icon: Globe, title: "Networking global", desc: "Nice to finally meet in person.", color: "from-[#FF6B9D] to-[#7C5CFF]" },
];

const testimonials = [
  { name: "Marina S.", role: "Product Designer", text: "Em 3 meses passei de gaguejar em reuniões para liderar apresentações em inglês. A IA de pronúncia mudou o jogo.", rating: 5 },
  { name: "Rafael T.", role: "Engenheiro Sênior", text: "Os diálogos são absurdamente realistas. Parece que estou conversando com um americano de verdade, não decorando frases.", rating: 5 },
  { name: "Júlia M.", role: "Consultora", text: "Já tentei 4 apps diferentes. Speak Native é o único que me fez sentir que realmente aprendi a *conversar*.", rating: 5 },
];

function Landing() {
  const [hoveredDialogue, setHoveredDialogue] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-slate-100 overflow-x-hidden">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[#2A7FFF]/15 blur-[140px]" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[700px] h-[700px] rounded-full bg-[#00D4A0]/12 blur-[140px]" />
        <div className="absolute top-[40%] left-[30%] w-[500px] h-[500px] rounded-full bg-[#7C5CFF]/8 blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="relative z-30 mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2A7FFF] to-[#00D4A0] shadow-[0_0_24px_rgba(42,127,255,0.5)] flex items-center justify-center">
            <Waves className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight">Speak Native</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Recursos</a>
          <a href="#dialogues" className="hover:text-white transition-colors">Diálogos</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Depoimentos</a>
        </nav>
        <Link
          to="/app"
          className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white overflow-hidden"
        >
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] opacity-90 group-hover:opacity-100 transition-opacity" />
          <span className="absolute inset-0 rounded-full shadow-[0_0_30px_rgba(42,127,255,0.5)] group-hover:shadow-[0_0_45px_rgba(42,127,255,0.7)] transition-shadow" />
          <span className="relative">Abrir app</span>
          <ArrowRight className="relative w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-24 md:pt-20 md:pb-32 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-8 items-center">
        <div className="space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4A0] animate-pulse" />
            Novo: IA de pronúncia em tempo real
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight">
            Inglês fluente,{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-[#2A7FFF] via-[#5BA0FF] to-[#00D4A0] bg-clip-text text-transparent">
                de uma vez
              </span>
            </span>
            <br />por todas.
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-xl">
            O laboratório de idiomas do futuro. Diálogos reais de profissões, viagens e negócios — com IA que ouve sua pronúncia e te corrige como um tutor nativo faria.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/app"
              className="group relative inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-sm font-semibold text-white overflow-hidden"
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0]" />
              <span className="absolute inset-0 rounded-2xl shadow-[0_10px_40px_-10px_rgba(42,127,255,0.7)] group-hover:shadow-[0_15px_50px_-10px_rgba(42,127,255,0.9)] transition-shadow" />
              <Sparkles className="relative w-4 h-4" />
              <span className="relative">Começar grátis</span>
            </Link>
            <a
              href="#dialogues"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-sm font-semibold border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md transition-colors"
            >
              <Play className="w-4 h-4 text-[#00D4A0]" />
              Ver demonstração
            </a>
          </div>

          <div className="flex items-center gap-6 pt-4 text-xs text-slate-500">
            <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#00D4A0]" /> Sem cartão</div>
            <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#00D4A0]" /> Do A1 ao C2</div>
            <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#00D4A0]" /> IA nativa</div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 bg-gradient-to-br from-[#2A7FFF]/20 to-[#00D4A0]/20 blur-3xl rounded-full" />
          <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
            <img
              src={heroImg}
              alt="App Speak Native mostrando diálogos com IA de pronúncia"
              width={1536}
              height={1152}
              className="w-full h-auto"
            />
          </div>
          {/* Floating stats */}
          <div className="absolute -left-4 top-1/4 hidden md:block animate-fade-in">
            <div className="px-4 py-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00D4A0]/20 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-[#00D4A0]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Pronúncia</div>
                  <div className="text-sm font-semibold text-white">96% nativa</div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 bottom-1/4 hidden md:block">
            <div className="px-4 py-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2A7FFF]/20 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-[#2A7FFF]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Streak</div>
                  <div className="text-sm font-semibold text-white">47 dias 🔥</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Brain, title: "IA de pronúncia", desc: "Análise fonética em tempo real, score de 0 a 100 por sílaba." },
            { icon: MessageSquare, title: "Diálogos reais", desc: "Situações profissionais escritas por nativos americanos." },
            { icon: Zap, title: "Arena cumulativa", desc: "Vocabulário ganho se acumula em desafios crescentes." },
          ].map((f, i) => (
            <div key={i} className="group relative p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl hover:bg-white/[0.05] transition-all">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#2A7FFF]/0 to-[#00D4A0]/0 group-hover:from-[#2A7FFF]/10 group-hover:to-[#00D4A0]/10 transition-all" />
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2A7FFF]/20 to-[#00D4A0]/20 border border-white/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[#5BA0FF]" strokeWidth={1.8} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dialogue demo grid */}
      <section id="dialogues" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D4A0]/10 border border-[#00D4A0]/20 text-xs font-medium text-[#00D4A0] mb-4">
            <Headphones className="w-3 h-3" />
            Biblioteca de diálogos
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Cada conversa que você <span className="bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] bg-clip-text text-transparent">vai ter na vida real</span>
          </h2>
          <p className="text-slate-400">Passe o mouse para ouvir uma prévia.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dialogues.map((d, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredDialogue(i)}
              onMouseLeave={() => setHoveredDialogue(null)}
              className="group relative p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl hover:border-white/20 transition-all cursor-pointer overflow-hidden"
            >
              <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${d.color} opacity-0 group-hover:opacity-20 blur-3xl transition-opacity`} />
              <div className="relative">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${d.color} shadow-lg flex items-center justify-center mb-5`}>
                  <d.icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{d.title}</h3>
                <p className="text-sm text-slate-400 italic">"{d.desc}"</p>

                {/* Hover audio waveform */}
                <div className={`flex items-center gap-1 mt-5 h-6 transition-opacity ${hoveredDialogue === i ? "opacity-100" : "opacity-30"}`}>
                  {Array.from({ length: 28 }).map((_, k) => (
                    <span
                      key={k}
                      className="w-0.5 bg-gradient-to-t from-[#2A7FFF] to-[#00D4A0] rounded-full"
                      style={{
                        height: `${hoveredDialogue === i ? 20 + Math.sin(k * 0.7 + i) * 18 + Math.random() * 8 : 4 + Math.sin(k) * 2}px`,
                        transition: `height 0.${3 + (k % 5)}s ease`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile app showcase */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="relative rounded-[2.5rem] p-10 md:p-16 bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 backdrop-blur-xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#2A7FFF]/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00D4A0]/15 blur-[120px] rounded-full" />
          <div className="relative grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">
                Seu tutor nativo, <span className="bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] bg-clip-text text-transparent">no bolso</span>
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Toque para falar. Solte para escutar a análise. A IA mede sua entonação, fluência e clareza fonética — e te mostra exatamente onde melhorar.
              </p>
              <ul className="space-y-3 mb-8">
                {["Gravação com efeito pulsante e cancelamento de ruído", "Comparação visual: você vs. nativo", "Cards de vocabulário com tradução contextual"].map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-[#00D4A0] mt-0.5 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                to="/app"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#5BA0FF] hover:text-white transition-colors"
              >
                Experimente agora <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mock phone */}
            <div className="relative flex justify-center">
              <div className="relative w-[280px] aspect-[9/19] rounded-[2.8rem] bg-gradient-to-br from-slate-900 to-[#0A0F1A] border-[3px] border-slate-800 shadow-[0_30px_80px_-20px_rgba(42,127,255,0.4)] p-3">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-10" />
                <div className="w-full h-full rounded-[2.2rem] bg-[#0A0F1A] overflow-hidden p-5 flex flex-col">
                  <div className="text-[10px] text-slate-500 mb-3">Entrevista de emprego · A2</div>
                  <div className="space-y-2.5 flex-1">
                    <div className="ml-auto max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#2A7FFF] to-[#5BA0FF] text-white text-[11px]">
                      Tell me a little about yourself.
                    </div>
                    <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/10 text-[11px] text-slate-200">
                      I'm a designer with 5 years of experience...
                    </div>
                    <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-[#00D4A0]/10 border border-[#00D4A0]/20">
                      {Array.from({ length: 18 }).map((_, k) => (
                         <span key={k} className="w-0.5 bg-[#00D4A0] rounded-full" style={{ height: `${6 + Math.abs(Math.sin(k * 1.3)) * 14}px` }} />
                       ))}
                      <span className="ml-auto text-[10px] text-[#00D4A0] font-semibold">96%</span>
                    </div>
                  </div>
                  {/* Pulse mic */}
                  <div className="flex justify-center pt-3">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#2A7FFF] animate-ping opacity-30" />
                      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#2A7FFF] to-[#00D4A0] shadow-[0_0_30px_rgba(42,127,255,0.6)] flex items-center justify-center">
                        <Mic className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Quem aprendeu, <span className="bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] bg-clip-text text-transparent">conta</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="p-7 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:bg-white/[0.06] transition-colors">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, k) => (
                  <Star key={k} className="w-3.5 h-3.5 text-[#00D4A0] fill-[#00D4A0]" />
                ))}
              </div>
              <p className="text-sm text-slate-200 leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2A7FFF] to-[#00D4A0] flex items-center justify-center text-sm font-semibold text-white">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-28">
        <div className="relative rounded-[2.5rem] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2A7FFF] via-[#3F8AFF] to-[#00D4A0]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
          <div className="absolute inset-[1px] rounded-[calc(2.5rem-1px)] bg-[#0A0F1A]/40 backdrop-blur-xl" />
          <div className="relative p-12 md:p-16 text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-5">
              Comece sua próxima conversa em inglês.
            </h2>
            <p className="text-slate-200/90 max-w-xl mx-auto mb-8">
              Grátis para sempre nos primeiros níveis. Cancele quando quiser. Sem cartão.
            </p>
            <Link
              to="/app"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#0A0F1A] text-sm font-semibold hover:scale-[1.03] active:scale-[0.98] transition-transform shadow-[0_20px_60px_-10px_rgba(255,255,255,0.4)]"
            >
              <Sparkles className="w-4 h-4" />
              Entrar no Speak Native
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#2A7FFF] to-[#00D4A0]" />
            <span>© {new Date().getFullYear()} Speak Native</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
