// Copia index.html como 404.html en la salida del build. En un sitio estático (Render) una ruta profunda como
// /habitaciones/2/reservar no existe como archivo: al refrescar (F5) el servidor responde su 404.html, que así arranca
// Angular y el enrutador muestra la pantalla correcta. La regla de reescritura /* → /index.html del panel de Render
// hace lo mismo con estado 200; este archivo es la red de seguridad si la regla falta.
import { copyFileSync, existsSync } from 'node:fs';

const salida = 'dist/roomix/browser';
if (!existsSync(`${salida}/index.html`)) {
  console.error(`spa-fallback: no se encontró ${salida}/index.html`);
  process.exit(1);
}
copyFileSync(`${salida}/index.html`, `${salida}/404.html`);
console.log(`spa-fallback: ${salida}/404.html creado`);
