// Genera src/environments/environment.production.ts desde variables de entorno.
// Uso: API_URL=https://roomix-api.onrender.com/api npm run build
// Si API_URL no está definida se conserva el archivo actual (por defecto '/api').
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const apiUrl = process.env.API_URL?.trim();
const destino = fileURLToPath(new URL('../src/environments/environment.production.ts', import.meta.url));

if (!apiUrl) {
  console.log('[set-env] API_URL no definida; se usa environment.production.ts existente.');
  process.exit(0);
}

const normalizada = apiUrl.replace(/\/+$/, '');
const contenido = `// Archivo generado por scripts/set-env.mjs durante \`npm run build\` a partir de API_URL.
// Valor por defecto '/api': mismo dominio (útil detrás de un proxy/nginx).
export const environment = {
  production: true,
  apiUrl: ${JSON.stringify(normalizada)},
};
`;

writeFileSync(destino, contenido, 'utf8');
console.log(`[set-env] apiUrl = ${normalizada}`);
