import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cc2ce60caccb461daf8c53ee6e3e11ee',
  appName: 'Speak Native',
  webDir: 'dist',
  server: {
    // O app é SSR (TanStack Start) e não gera bundle estático.
    // O APK funciona como wrapper do site publicado no Lovable.
    url: 'https://language-bliss-61.lovable.app',
    cleartext: true,
    // Permite que o WebView navegue para os domínios do broker OAuth
    // (Google + Lovable) e volte para o app sem travar.
    allowNavigation: [
      'language-bliss-61.lovable.app',
      '*.lovable.app',
      'oauth.lovable.app',
      'accounts.google.com',
      '*.google.com',
      '*.googleusercontent.com',
ూ      '*.supabase.co',
    ].filter((h) => !h.includes('ూ')),
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
