import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/app" });
    });
  }, [nav]);

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
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/40 to-teal-400/30 blur-3xl rounded-full scale-110" aria-hidden="true" />
              <img
                src="/__l5e/assets-v1/d8b936e0-4be4-4ae4-9140-29a722510457/dialogoo-logo.png"
                alt=""
                aria-hidden="true"
                className="relative w-48 h-48 object-contain drop-shadow-[0_20px_50px_rgba(6,182,212,0.5)]"
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
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-950 font-semibold py-3 rounded-lg text-sm hover:bg-slate-100 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <span className="text-base font-bold" aria-hidden="true">G</span>}
            Continuar com Google
          </button>

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
    </div>
  );
}
