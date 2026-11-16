// Records which live-action clips and audio files are present, so the promo uses them instead of
// placeholders. Run after adding files to public/footage or public/audio (npm run render does it for you).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const pub = (p) => fs.existsSync(path.join(ROOT, 'public', p));
const src = fs.readFileSync(path.join(ROOT, 'src', 'script.ts'), 'utf8');
const ids = [...src.matchAll(/\{ id: '([a-z0-9-]+)'/g)].map((m) => m[1]);
const audio = [...src.matchAll(/'(audio\/[^']+)'/g)].map((m) => m[1]);

const status = {};
for (const id of ids) status[id] = pub(`footage/${id}.mp4`);
for (const a of audio) status[a] = pub(a);
fs.writeFileSync(path.join(ROOT, 'src', 'footage-status.json'), JSON.stringify(status, null, 1) + '\n');
for (const [k, v] of Object.entries(status)) console.log(`${v ? 'ready      ' : 'placeholder'}  ${k}`);
