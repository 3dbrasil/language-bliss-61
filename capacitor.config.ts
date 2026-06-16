import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cc2ce60caccb461daf8c53ee6e3e11ee',
  appName: 'Speak Native',
  webDir: 'dist',
  server: {
    // Para desenvolvimento com hot-reload aponte para a preview do Lovable:
    url: 'https://cc2ce60c-accb-461d-af8c-53ee6e3e11ee.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
