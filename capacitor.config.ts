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
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
