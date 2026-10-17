import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.uncensoredaigirls.app',
  appName: 'Uncensored AI Girls',
  webDir: 'dist',
  backgroundColor: '#0a0a0f',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false },
};

export default config;
