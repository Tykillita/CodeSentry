import sharp from 'sharp';
import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/media/projects');
const projectsRoot = resolve(root, '..');
await mkdir(out, { recursive: true });
async function findByName(directory, filename) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const candidate = resolve(directory, entry.name);
    if (entry.isFile() && entry.name === filename) return candidate;
    if (entry.isDirectory()) {
      const match = await findByName(candidate, filename).catch(() => null);
      if (match) return match;
    }
  }
  return null;
}
const vidmakerFrame = await findByName(resolve(projectsRoot, 'VidMaker/resultados'), 'opus55_012.8s.png');
if (!vidmakerFrame) throw new Error('No se encontró la exportación local de VidMaker.');
const files = [
  ...['es', 'en'].flatMap(lang => [
    [resolve(projectsRoot, `isTargetSleeping/docs/images/panel-${lang}.png`), `sleep-panel-${lang}.webp`, 850],
    [resolve(projectsRoot, `isTargetSleeping/docs/images/activity-${lang}.png`), `sleep-activity-${lang}.webp`, 850],
    [resolve(projectsRoot, `Cowork/docs/images/video-poster-${lang}.jpg`), `cowork-${lang}.webp`, 1100],
  ]),
  [resolve(projectsRoot, 'CentroVet Caninos y Felinos/docs/screenshots/01-portada.png'), 'centrovet-home.webp', 1200],
  [resolve(projectsRoot, 'CentroVet Caninos y Felinos/docs/screenshots/03-tienda.png'), 'centrovet-shop.webp', 1200],
  [vidmakerFrame, 'vidmaker-frame.webp', 1200],
];
for (const [source, name, width] of files) {
  const result = await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 79 }).toFile(resolve(out, name));
  console.log(`${name}: ${Math.round(result.size / 1024)} KB`);
}
const fonts = resolve(root, 'public/fonts/licenses');
await mkdir(fonts, { recursive: true });
for (const name of ['noto-serif-jp', 'manrope', 'ibm-plex-mono']) {
  await copyFile(resolve(root, `node_modules/@fontsource/${name}/LICENSE`), resolve(fonts, `${name}.txt`));
}
await sharp(resolve(root,'public/media/garden/social.svg')).png().toFile(resolve(root,'public/media/garden/social.png'));
