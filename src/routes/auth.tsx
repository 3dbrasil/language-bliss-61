import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/app" });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const redirect = `${window.location.origin}/app`;
        const { error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: { emailRedirectTo: redirect },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      }
      nav({ to: "/app" });
    } catch (e: any) {
      setErr(e.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0A0F1A]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] bg-clip-text text-transparent">
            Aria
          </Link>
          <p className="text-xs text-slate-400 mt-2">
            {mode === "signin" ? "Entre para conversar com a Aria" : "Crie sua conta para começar"}
          </p>
        </div>

        <form onSubmit={submit} className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Email</span>
            <div className="mt-1 flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-3">
              <Mail className="w-4 h-4 text-slate-500" />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent py-2.5 text-sm text-slate-100 outline-none"
                placeholder="you@email.com"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Senha</span>
            <div className="mt-1 flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-3">
              <Lock className="w-4 h-4 text-slate-500" />
              <input
                type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)}
                className="flex-1 bg-transparent py-2.5 text-sm text-slate-100 outline-none"
                placeholder="••••••••"
              />
            </div>
          </label>

          {err && <p className="text-xs text-red-400">{err}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
              {mode === "signin" ? "Entrar" : "Criar conta"} <ArrowRight className="w-4 h-4" />
            </>}
          </button>

          <button
            type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-[11px] text-slate-400 hover:text-slate-200"
          >
            {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
          </button>
        </form>

        <Link to="/" className="block text-center text-[11px] text-slate-500 hover:text-slate-300">
          ← Voltar para o site
        </Link>
      </div>
    </div>
  );
}
