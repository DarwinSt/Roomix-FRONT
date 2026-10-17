import { inject, provideAppInitializer } from '@angular/core';
import { Location } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Comportamiento nativo cuando la app corre como APK (Capacitor).
 * En el navegador no hace nada.
 */
export function provideMobilePlatform() {
  return provideAppInitializer(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const location = inject(Location);

    // Botón "atrás" de Android: vuelve a la pantalla anterior; en la raíz, cierra la app
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        location.back();
      } else {
        App.exitApp();
      }
    });
  });
}
