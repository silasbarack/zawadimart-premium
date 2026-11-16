// QA: lists every text block and device and flags anything outside TikTok's safe area
// (x 40-950; y 150-1540 for text) or overlapping within a scene. Run: node safe-check.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.addInitScript((c) => { window.AD_CONFIG = c; }, { ...config, voiceDurations: (() => { try { return JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'voice', 'durations.json'), 'utf8')); } catch { return {}; } })() });
  await p.goto('file://' + path.join(__dirname, 'ad.html')); await p.evaluate(() => document.fonts.ready);
  const T = await p.evaluate(() => window.AD.T); const times = { hook: T.hook[1] - 0.6, show: T.show[1] - 0.6, pitch: T.pitch[1] - 0.6, chat: T.chat[1] - 0.2 }; const out = [];
  for (const [id, t] of Object.entries(times)) { await p.evaluate((x) => window.AD.seek(x), t); out.push(...await p.evaluate((id) => {
    const r = []; document.querySelectorAll(`#${id} .center > *, #${id} .svc, #${id} .wa, #${id} .btn`).forEach((el) => { const b = el.getBoundingClientRect(); if (!b.width) return; const bad = b.left < 40 || b.right > 950 || b.top < 150 || b.bottom > 1540; r.push(`${id} text ${(el.id || el.className).toString().slice(0, 12).padEnd(12)} x ${Math.round(b.left)}-${Math.round(b.right)} y ${Math.round(b.top)}-${Math.round(b.bottom)}${bad ? '  <-- OUTSIDE SAFE AREA' : ''}`); }); return r; }, id)); }
  for (let i = 0; i < config.features.length; i++) { const t = await p.evaluate((i) => window.AD.featTimes[i][1] - 0.3, i); await p.evaluate((x) => window.AD.seek(x), t);
    out.push(await p.evaluate((i) => { const el = document.getElementById('f' + i); const txt = el.querySelector('.fdetail').getBoundingClientRect(); const lab = el.querySelector('.flabel').getBoundingClientRect(); const f = window.AD_CONFIG.features[i]; const dev = document.getElementById(f.device === 'laptop' ? 'featLap' : 'featPh').getBoundingClientRect();
      return `feature ${i + 1}: label y ${Math.round(lab.top)}-${Math.round(lab.bottom)} (x to ${Math.round(lab.right)}) detail to y ${Math.round(txt.bottom)} | device ${Math.round(dev.left)}-${Math.round(dev.right)} x ${Math.round(dev.top)}-${Math.round(dev.bottom)}${txt.bottom > dev.top - 10 ? '  <-- TEXT TOUCHES DEVICE' : ''}${lab.right > 950 ? '  <-- LABEL TOO WIDE' : ''}`; }, i)); }
  console.log(out.join('\n')); await b.close(); })();
