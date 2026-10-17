import type { CapacitorConfig } from '@capacitor/cli';

// Si el APK apunta a un backend http:// (pruebas locales, p. ej. http://10.0.2.2:8080/api en el
// emulador) se habilita tráfico sin cifrar. En producción el backend es https y queda bloqueado.
const apiHttp = process.env['API_URL']?.startsWith('http://') ?? false;

const config: CapacitorConfig = {
  appId: 'com.roomix.app',
  appName: 'Roomix',
  webDir: 'dist/roomix/browser',
  server: {
    androidScheme: 'https',
    cleartext: apiHttp,
  },
  android: {
    allowMixedContent: apiHttp,
  },
  plugins: {
    SystemBars: {
      // index.html usa viewport-fit=cover; el CSS respeta env(safe-area-inset-*)
      initialViewportFitValueHint: 'cover',
      // Íconos claros sobre la barra superior oscura de Roomix
      style: 'DARK',
    },
  },
};

export default config;
