import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GifFrame, GifUtil, BitmapImage } from 'gifwrap';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.resolve(__dirname, '../public/assets/icons');
const inputPath = path.join(iconsDir, 'inventory.gif');
const backupPath = path.join(iconsDir, 'inventory-original.gif');
const outputPath = path.join(iconsDir, 'inventory.gif');

const WHITE_THRESHOLD = 235;

function removeWhiteBackground(bitmap) {
  const { data, width, height } = bitmap;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
        data[i + 3] = 0;
      }
    }
  }
}

if (!fs.existsSync(inputPath)) {
  console.error('No se encontró:', inputPath);
  process.exit(1);
}

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(inputPath, backupPath);
  console.log('Copia de seguridad:', backupPath);
}

const gif = await GifUtil.read(inputPath);
const frames = gif.frames.map((frame) => {
  const bitmap = frame.bitmap;
  removeWhiteBackground(bitmap);
  return new GifFrame(new BitmapImage(bitmap.width, bitmap.height, bitmap.data), {
    delayCentisecs: frame.delayCentisecs ?? 10,
    disposalMethod: frame.disposalMethod,
  });
});

await GifUtil.write(outputPath, frames, { loops: gif.loops ?? 0 });

const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`GIF transparente: ${outputPath} (${sizeKb} KB, ${frames.length} frames)`);
