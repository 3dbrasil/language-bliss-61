import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/dialogoo-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

const ADMIN_PASSWORD = "admin8460";

function AuthPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [showAdminPwd, setShowAdminPwd] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");

  useEffect(() => {
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

  const enterAs = (type: 'admin' | 'student') => {
    setLoading(true);
    const mockUser = type === 'admin'
      ? { id: 'bypass-admin-id-123', email: 'inovamundoprinter@gmail.com' }
      : { id: 'bypass-student-id-456', email: 'aluno-teste@dialogoo.com' };
    try {
      localStorage.setItem('dialogoo_bypass_session', JSON.stringify(mockUser));
      setInfo(`Entrando como ${type === 'admin' ? 'Admin' : 'Aluno'}...`);
      setTimeout(() => nav({ to: "/app" }), 300);
    } catch {
      setErr("Erro ao salvar sessão local.");
      setLoading(false);
    }
  };

  const handleAdminClick = () => {
    setErr("");
    setShowAdminPwd(true);
  };

  const submitAdminPwd = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPwd === ADMIN_PASSWORD) {
      enterAs('admin');
    } else {
      setErr("Senha de admin incorreta.");
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 bg-[#0A0F1A]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex flex-col items-center gap-4" aria-label="Dialogoo - Página inicial">
            <div className="relative inline-flex items-center justify-center p-1 bg-[#0F172A] rounded-3xl shadow-[0_20px_50px_rgba(6,182,212,0.15)] border border-white/10 overflow-hidden w-40 h-40">
              <img src={logo.url} alt="Dialogoo Logo" className="w-full h-full object-cover rounded-2xl" />
            </div>
            <span className="text-4xl font-extrabold bg-gradient-to-r from-[#2A7FFF] to-[#E94B7C] bg-clip-text text-transparent drop-shadow-lg">
              Dialogoo
            </span>
          </Link>
          <p className="text-xs text-slate-400 mt-2">Escolha como deseja entrar</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-3">
          <button
            type="button"
            onClick={() => enterAs('student')}
            disabled={loading}
            className="w-full px-4 py-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-sm font-bold transition active:scale-95 disabled:opacity-55"
          >
            Entrar como Aluno
          </button>

          {!showAdminPwd ? (
            <button
              type="button"
              onClick={handleAdminClick}
              disabled={loading}
              className="w-full px-4 py-3 bg-[#2A7FFF]/15 hover:bg-[#2A7FFF]/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-sm font-bold transition active:scale-95 disabled:opacity-55"
            >
              Entrar como Admin
            </button>
          ) : (
            <form onSubmit={submitAdminPwd} className="space-y-2">
              <label htmlFor="admin-pwd" className="block text-xs text-slate-400">Senha de Admin</label>
              <input
                id="admin-pwd"
                type="password"
                autoFocus
                value={adminPwd}
                onChange={(e) => setAdminPwd(e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
                placeholder="••••••••"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#2A7FFF] to-[#E94B7C] text-white font-semibold rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdminPwd(false); setAdminPwd(""); setErr(""); }}
                  className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {err && <p role="alert" className="text-xs text-red-400 text-center pt-1">{err}</p>}
          {info && <p role="status" className="text-xs text-emerald-400 text-center pt-1">{info}</p>}
        </div>

        <Link to="/" className="block text-center text-[11px] text-slate-500 hover:text-slate-300">
          ← Voltar para o site
        </Link>
      </div>
    </main>
  );
}
