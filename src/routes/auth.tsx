import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Loader2 } from "lucide-react";
import logo from "@/assets/dialogoo-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        nav({ to: "/app" });
        return;
      }
      try {
        if (localStorage.getItem('dialogoo_bypass_session')) {
          nav({ to: "/app" });
        }
      } catch {}
    });
  }, [nav]);

  const handleBypassSignIn = (type: 'admin' | 'student') => {
    setLoading(true);
    const mockUser = type === 'admin'
      ? { id: 'bypass-admin-id-123', email: 'inovamundoprinter@gmail.com' }
      : { id: 'bypass-student-id-456', email: 'aluno-teste@dialogoo.com' };

    try {
      localStorage.setItem('dialogoo_bypass_session', JSON.stringify(mockUser));
      setInfo(`Entrada rápida: conectando como ${type === 'admin' ? 'Admin' : 'Aluno'}...`);
      setTimeout(() => {
        nav({ to: "/app" });
      }, 500);
    } catch (e) {
      setErr("Erro ao salvar sessão local.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErr("");
    setInfo("");
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/app`,
      });
      if (result.error) throw result.error;
      if (!result.redirected) nav({ to: "/app" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      setErr(msg);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        if (data.session) {
          nav({ to: "/app" });
        } else {
          setInfo("Conta criada! Você já pode entrar.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        nav({ to: "/app" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      // Mensagens em PT-BR para erros comuns
      if (/invalid login credentials/i.test(msg)) {
        setErr("E-mail ou senha incorretos.");
      } else if (/user already registered/i.test(msg)) {
        setErr("Este e-mail já está cadastrado. Faça login.");
      } else if (/weak password|known to be weak|pwned|password should be at least/i.test(msg)) {
        setErr("Use uma senha mais forte: pelo menos 8 caracteres, com letras, números e símbolo.");
      } else if (/email signups are disabled|email logins are disabled/i.test(msg)) {
        setErr("E-mail e senha ainda está desligado no Cloud. Use Google para entrar agora ou ative E-mail e senha em Cloud → Usuários → Auth Settings.");
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 bg-[#0A0F1A]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex flex-col items-center gap-4" aria-label="Dialogoo - Página inicial">
            <div className="relative inline-flex items-center justify-center p-1 bg-[#0F172A] rounded-3xl shadow-[0_20px_50px_rgba(6,182,212,0.15)] border border-white/10 overflow-hidden w-40 h-40">
              <img
                src={logo.url}
                alt="Dialogoo Logo"
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
            <span className="text-4xl font-extrabold bg-gradient-to-r from-[#2A7FFF] to-[#E94B7C] bg-clip-text text-transparent drop-shadow-lg">
              Dialogoo
            </span>
          </Link>
          <p className="text-xs text-slate-400 mt-2">
            {mode === "signin"
              ? "Entre com seu e-mail e senha"
              : "Crie sua conta para começar"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          aria-label={mode === "signin" ? "Formulário de login" : "Formulário de cadastro"}
          className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-4"
        >
          {isIframe && (
            <div className="bg-amber-500/10 border border-amber-500/15 rounded-xl p-3 text-amber-300 text-xs leading-relaxed space-y-1.5 shadow-lg">
              <p className="font-bold text-amber-200 text-[13px] flex items-center gap-1.5">
                <span>💡</span> Dica de Acesso
              </p>
              <p className="text-slate-300">
                O login direto do Google é bloqueado pelas diretrizes de segurança dentro do painel lateral do AI Studio.
              </p>
              <p className="text-slate-300 font-semibold pt-1">
                Para resolver:
              </p>
              <p className="text-slate-200">
                1. Abra o app em uma{" "}
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-cyan-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Nova Guia do Navegador ↗
                </a>
              </p>
              <p className="text-slate-400">
                Ou use a opção de <b>E-mail e Senha</b> abaixo diretamente neste painel!
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-950 font-semibold py-3 rounded-lg text-sm hover:bg-slate-100 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <span className="text-base font-bold" aria-hidden="true">G</span>}
            Continuar com Google
          </button>

          {/* QUICK DEVELOPMENT BYPASS */}
          <div className="pt-2.5 pb-2 text-center bg-slate-950/45 p-3 rounded-xl border border-slate-800/85 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
              ⚡ Atalhos Rápidos (Bypass de Teste)
            </p>
            <p className="text-[9px] text-slate-500 leading-normal">
              Se o Google Auth estiver inacessível no iFrame do AI Studio, use estes botões para acessar imediatamente:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleBypassSignIn('admin')}
                disabled={loading}
                className="px-2.5 py-2 bg-[#2A7FFF]/10 hover:bg-[#2A7FFF]/25 text-cyan-300 border border-cyan-500/25 rounded-lg text-[11px] font-extrabold transition active:scale-95 disabled:opacity-55"
              >
                Entrar como Admin
              </button>
              <button
                type="button"
                onClick={() => handleBypassSignIn('student')}
                disabled={loading}
                className="px-2.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/25 rounded-lg text-[11px] font-extrabold transition active:scale-95 disabled:opacity-55"
              >
                Entrar como Aluno
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-500" aria-hidden="true">
            <span className="h-px flex-1 bg-white/10" />
            <span>E-mail</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="space-y-2">
            <label htmlFor="auth-email" className="block text-xs text-slate-400">E-mail</label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
              placeholder="voce@email.com"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="auth-password" className="block text-xs text-slate-400">Senha</label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : 6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={mode === "signup" ? "auth-password-hint" : undefined}
              className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
              placeholder="••••••••"
            />
            {mode === "signup" && (
              <p id="auth-password-hint" className="text-[11px] text-slate-500">
                Mínimo 8 caracteres com letras, números e símbolo.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#2A7FFF] to-[#E94B7C] text-white font-semibold py-3 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : mode === "signin" ? (
              "Entrar"
            ) : (
              "Criar conta"
            )}
          </button>

          {err && <p role="alert" aria-live="assertive" className="text-xs text-red-400 text-center">{err}</p>}
          {info && <p role="status" aria-live="polite" className="text-xs text-emerald-400 text-center">{info}</p>}

          <button
            type="button"
            onClick={() => {
              setErr("");
              setInfo("");
              setMode(mode === "signin" ? "signup" : "signin");
            }}
            className="w-full text-xs text-slate-400 hover:text-slate-200 transition"
          >
            {mode === "signin"
              ? "Não tem conta? Cadastre-se"
              : "Já tem conta? Entrar"}
          </button>
        </form>

        <Link
          to="/"
          className="block text-center text-[11px] text-slate-500 hover:text-slate-300"
        >
          ← Voltar para o site
        </Link>
      </div>
    </main>
  );
}
