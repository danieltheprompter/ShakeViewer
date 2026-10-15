// Run from anywhere: node work/tools/build.mjs (needs `npm ci` in work/tools once).
// Precompiles the inline JSX in public/index.html to minified JS; writes dist/.
import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
import { transform } from 'esbuild';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const open = '<script type="text/babel" data-presets="env,react">';
const i = src.indexOf(open); if (i < 0) throw new Error('babel block not found');
const j = src.indexOf('</script>', i);
const jsx = src.slice(i + open.length, j);
const { code } = await transform(jsx.replace("'__CARTO_BASEMAPS_KEY__'", JSON.stringify(process.env.CARTO_BASEMAPS_KEY || '')), { loader: 'jsx', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', minify: true, target: 'es2019', charset: 'utf8', legalComments: 'none' });
const hash = crypto.createHash('sha256').update(code).digest('hex').slice(0, 10);
// Build into dist.tmp and swap in only on success, so a failed build never leaves the project without dist/.
const finalDist = path.join(root, 'dist'); const dist = path.join(root, 'dist.tmp'); fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
fs.writeFileSync(path.join(dist, `assets/app.${hash}.js`), code);
const cartoKey = process.env.CARTO_BASEMAPS_KEY || '';
if (!cartoKey) console.warn('warning: CARTO_BASEMAPS_KEY not set; build will use Esri tiles only');
if (!/^[A-Za-z0-9_\-.]*$/.test(cartoKey)) throw new Error('CARTO_BASEMAPS_KEY has unexpected characters');
let html = src.slice(0, i) + `<script src="/assets/app.${hash}.js"></script>` + src.slice(j + 9);
html = html.replace(/\s*<script src="https:\/\/unpkg\.com\/@babel\/standalone[^>]*><\/script>/, '');
if (html.includes('babel')) console.warn('warning: babel still referenced');
fs.writeFileSync(path.join(dist, 'index.html'), html);
for (const f of ['manifest.json', 'og-image.png', 'data/PB2002_boundaries.json', 'privacy/index.html', 'terms/index.html', 'support/index.html', 'fonts/inter-latin-var.woff2', 'fonts/jetbrains-mono-latin-var.woff2']) {
  const s = path.join(root, 'public', f); if (!fs.existsSync(s)) { console.warn('missing', f); continue; }
  fs.mkdirSync(path.dirname(path.join(dist, f)), { recursive: true }); fs.copyFileSync(s, path.join(dist, f));
}

fs.writeFileSync(path.join(dist, '_headers'), fs.readFileSync(path.join(root, 'tools/_headers')));
// Clean URLs for drag-and-drop deploys (netlify.toml has the same rules for CLI/git builds).
fs.writeFileSync(path.join(dist, '_redirects'), ['privacy', 'terms', 'support'].map(p => `/${p} /${p}/index.html 200`).join('\n') + '\n');
fs.rmSync(finalDist + '.old', { recursive: true, force: true });
if (fs.existsSync(finalDist)) fs.renameSync(finalDist, finalDist + '.old');
fs.renameSync(dist, finalDist); fs.rmSync(finalDist + '.old', { recursive: true, force: true });
console.log('built', `assets/app.${hash}.js`, code.length, 'bytes; html', html.length);
