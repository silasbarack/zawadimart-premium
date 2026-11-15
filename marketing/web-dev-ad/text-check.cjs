// QA: prints all on-screen text per scene, and checks the WhatsApp number and portfolio address.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.addInitScript((c) => { window.AD_CONFIG = c; }, config);
  await p.goto('file://' + path.join(__dirname, 'ad.html')); await p.evaluate(() => document.fonts.ready); await p.evaluate(() => window.AD.seek(29.9));
  const text = await p.evaluate(() => [...document.querySelectorAll('section')].map((s) => `[${s.id}] ` + [...s.querySelectorAll('.center, .fcut > div:first-child, .svc, .wa, .note')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ')).join('\n'));
  console.log(text);
  const num = await p.evaluate(() => document.getElementById('num').textContent); const port = await p.evaluate(() => document.querySelector('#port b').textContent);
  console.log('\nWhatsApp number on screen :', JSON.stringify(num), num === '+254 117 561 192' ? 'EXACT MATCH' : 'MISMATCH');
  console.log('Portfolio on screen       :', JSON.stringify(port), port === 'baracksilasmungai.onrender.com' ? 'EXACT MATCH' : 'MISMATCH');
  const sizes = await p.evaluate(() => { const px = (sel) => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize); return { smallestText: Math.min(...[...document.querySelectorAll('.fdetail, .chip, .kicker, .portfolio, #csub')].map((e) => parseFloat(getComputedStyle(e).fontSize))), number: px('#num'), button: px('#btn') }; });
  console.log('Font sizes (px on the 1080-wide frame):', JSON.stringify(sizes), '-> on a 360-px-wide phone the smallest text shows at', (sizes.smallestText * 360 / 1080).toFixed(1), 'px');
  await b.close(); })();
