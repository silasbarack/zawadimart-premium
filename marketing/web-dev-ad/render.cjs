// Renders the web-development TikTok ad from config.json.
//   node render.cjs            -> full render to the file named in config.json ("output")
//   node render.cjs --stills   -> just a few preview frames in stills/ (fast check)
// Needs: Node 18+, Playwright with Chromium (npm i playwright && npx playwright install chromium),
// ffmpeg and python3 with numpy.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const config = JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf8'));
const FRAMES = path.join(DIR, 'frames');
const stillsOnly = process.argv.includes('--stills');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.addInitScript((c) => { window.AD_CONFIG = c; }, config);
  await page.goto('file://' + path.join(DIR, 'ad.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
  const { duration, fps, cues } = await page.evaluate(() => ({ duration: window.AD.duration, fps: window.AD.fps, cues: window.AD.cues }));

  if (stillsOnly) {
    fs.mkdirSync(path.join(DIR, 'stills'), { recursive: true });
    for (const t of [1.0, 2.9, 5.5, 8.6, 10.0, 11.6, 13.2, 14.9, 16.5, 18.3, 21.2, 23.6, 26.0, 29.0]) {
      await page.evaluate((x) => window.AD.seek(x), t);
      await page.screenshot({ path: path.join(DIR, 'stills', `t${t.toFixed(1)}.png`) });
    }
    console.log('stills written to', path.join(DIR, 'stills'));
    await browser.close();
    return;
  }

  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });
  const total = Math.round(duration * fps);
  for (let f = 0; f < total; f++) {
    await page.evaluate((x) => window.AD.seek(x), f / fps);
    await page.screenshot({ path: path.join(FRAMES, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 95 });
    if (f % 150 === 0) console.log(`frame ${f}/${total}`);
  }
  await browser.close();

  fs.writeFileSync(path.join(DIR, 'cues.json'), JSON.stringify(cues, null, 1));
  const wav = path.join(DIR, 'soundtrack.wav');
  execFileSync('python3', [path.join(DIR, 'soundtrack.py'), path.join(DIR, 'cues.json'), String(duration), wav], { stdio: 'inherit' });

  const out = path.join(DIR, config.output);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(FRAMES, 'f%04d.jpg'), '-i', wav,
    '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-r', String(fps),
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log('written', out);
})().catch((e) => { console.error(e); process.exit(1); });
