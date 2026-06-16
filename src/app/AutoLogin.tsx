import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// WARNING: credentials are embedded in client code. Use only with a dedicated
// account meant to be shared across this app's installs.
const AUTO_EMAIL = "ric570683@gmail.com";
const AUTO_PASSWORD = "Sinapse8460!";

export function AutoLogin() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || data.session) return;

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: AUTO_EMAIL,
        password: AUTO_PASSWORD,
      });
      if (!signInErr || cancelled) return;

      // No account yet — create it, then it's auto-signed-in.
      await supabase.auth.signUp({
        email: AUTO_EMAIL,
        password: AUTO_PASSWORD,
        options: { emailRedirectTo: window.location.origin },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
