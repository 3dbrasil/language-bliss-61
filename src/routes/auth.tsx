import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/app" });
    });
  }, [nav]);

  const signInWithGoogle = async () => {
    setErr("");
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/app`,
      });
      if (result.error) {
        setErr(result.error.message ?? "Erro ao entrar com Google");
        setLoading(false);
        return;
      }
      if (result.redirected) return; // browser redirects to Google
      nav({ to: "/app" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0A0F1A]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-[#2A7FFF] to-[#00D4A0] bg-clip-text text-transparent">
            Speak Native
          </Link>
          <p className="text-xs text-slate-400 mt-2">
            Entre com sua conta Google para começar
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-4">
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold py-3 rounded-lg text-sm hover:bg-slate-100 disabled:opacity-50 transition"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Entrar com Google
              </>
            )}
          </button>

          {err && <p className="text-xs text-red-400 text-center">{err}</p>}

          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            Cada conta tem seu próprio progresso. As aulas são compartilhadas.
          </p>
        </div>

        <Link to="/" className="block text-center text-[11px] text-slate-500 hover:text-slate-300">
          ← Voltar para o site
        </Link>
      </div>
    </div>
  );
}
