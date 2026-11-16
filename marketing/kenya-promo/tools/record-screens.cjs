// Records genuine screen footage of the working ZawadiMart site for the promo.
// It drives a real browser against a running copy of the site and captures 30 fps frames while it
// scrolls smoothly, opens menus and taps buttons, then encodes each take to an MP4 with ffmpeg.
// A small touch circle (phone) or pointer (desktop) is drawn on the page so taps and clicks are visible.
//
//   node tools/record-screens.cjs http://localhost:4301 [sessions-dir]
//
// sessions-dir may hold admin.json (a signed-in admin session for the dashboard take).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const U = process.argv[2] || 'http://localhost:4301';
const SESS = process.argv[3];
const OUT = path.join(__dirname, '..', 'public', 'recordings');
const TMP = path.join(__dirname, '..', '.frames');
const FPS = 30;
const PHONE = { viewport: { width: 412, height: 870 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const CART = '[{"id":5,"qty":1},{"id":41,"qty":1},{"id":24,"qty":2}]';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

async function take(browser, name, ctxOpts, init, script) {
  const dir = path.join(TMP, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext(ctxOpts); if (init) await ctx.addInitScript(init.fn, init.arg);
  const p = await ctx.newPage(); let n = 0; const desktop = !ctxOpts.isMobile;
  const shot = async () => { await p.screenshot({ path: path.join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 }); };
  const settle = async () => {
    await p.waitForSelector('#boot', { state: 'detached', timeout: 30000 }).catch(() => {});
    await p.waitForSelector('.page-loader', { state: 'detached', timeout: 20000 }).catch(() => {});
    await p.evaluate(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } scrollTo(0, 0); });
    await p.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 30000 }).catch(() => {});
    await p.addStyleTag({ content: 'html{scroll-behavior:auto!important} #rec-dot{position:fixed;z-index:2147483647;pointer-events:none;border-radius:50%;transform:translate(-50%,-50%);transition:none}' });
    await p.waitForTimeout(400);
  };
  const api = {
    page: p,
    async go(url) { await p.goto(U + url); await settle(); },
    async hold(sec) { for (let i = 0; i < Math.round(sec * FPS); i++) await shot(); },
    // Smooth scroll to y (page px) over sec seconds, one captured frame per step
    async scroll(y, sec) { const from = await p.evaluate(() => scrollY); const f = Math.round(sec * FPS); for (let i = 1; i <= f; i++) { await p.evaluate((v) => scrollTo(0, v), from + (y - from) * ease(i / f)); await shot(); } },
    async scrollTo(sel, offset, sec) { const y = await p.evaluate(([s, o]) => document.querySelector(s).getBoundingClientRect().top + scrollY - o, [sel, offset]); await api.scroll(Math.max(0, y), sec); },
    // Show a touch circle (phone) or pointer (desktop) moving to the element, press, then click it for real
    async tap(sel, { nav = false, glide = 0.6 } = {}) {
      // Prefer a match already comfortably on screen (below the sticky header, above the bottom bar)
      const all = p.locator(sel).locator('visible=true'); const vh = (ctxOpts.viewport || {}).height || 870; let el = null;
      for (let i = 0; i < Math.min(await all.count(), 30); i++) { const bb = await all.nth(i).boundingBox(); if (bb && bb.y + bb.height / 2 > (desktop ? 120 : 230) && bb.y + bb.height / 2 < vh - 110) { el = all.nth(i); break; } }
      if (!el) { el = all.first(); await el.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -260)); await p.waitForTimeout(150); }
      const b = await el.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
      await p.evaluate(([x, y, desktop]) => { let d = document.getElementById('rec-dot'); if (!d) { d = document.createElement('div'); d.id = 'rec-dot'; document.body.appendChild(d); }
        d.style.cssText = desktop ? 'width:0;height:0' : 'width:46px;height:46px;background:rgba(15,23,42,.28);border:3px solid rgba(255,255,255,.95);box-shadow:0 4px 14px rgba(0,0,0,.3)';
        if (desktop) d.innerHTML = '<svg width="26" height="36" viewBox="0 0 24 34" style="position:absolute;left:-3px;top:-2px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))"><path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill="#fff" stroke="#111" stroke-width="2" stroke-linejoin="round"/></svg>';
        d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.opacity = 0; }, [x, y, desktop]);
      if (desktop) { // pointer glides in from lower right
        const f = Math.round(glide * FPS); const sx = 1440 * 0.75, sy = 900 * 0.85;
        for (let i = 0; i <= f; i++) { const t = ease(i / f); await p.evaluate(([x, y]) => { const d = document.getElementById('rec-dot'); d.style.opacity = 1; d.style.left = x + 'px'; d.style.top = y + 'px'; }, [sx + (x - sx) * t, sy + (y - sy) * t]); await shot(); }
        await p.mouse.move(x, y); await api.hold(0.15);
      } else {
        for (let i = 0; i < 6; i++) { await p.evaluate((o) => { const d = document.getElementById('rec-dot'); d.style.opacity = o; d.style.transform = `translate(-50%,-50%) scale(${1.4 - o * 0.4})`; }, (i + 1) / 6); await shot(); }
        for (let i = 0; i < 4; i++) { await p.evaluate((s) => { document.getElementById('rec-dot').style.transform = `translate(-50%,-50%) scale(${s})`; }, 1 - 0.06 * (i + 1)); await shot(); }
      }
      const before = p.url();
      if (desktop) await p.mouse.click(x, y); else await p.touchscreen.tap(x, y);
      if (nav) {
        await p.waitForURL((u) => u.toString() !== before, { timeout: 4000 }).catch(() => {});
        if (p.url() === before) { console.log(`  tap on ${sel} missed; clicking the element directly`); await el.click({ force: true }); await p.waitForURL((u) => u.toString() !== before, { timeout: 15000 }).catch(() => {}); }
        console.log(`  -> ${p.url().replace(U, '')}`); await settle();
      }
      else await p.waitForTimeout(350);
      await p.evaluate(() => { const d = document.getElementById('rec-dot'); if (d) d.style.opacity = 0; });
    },
    async type(sel, text, perChar = 0.09) { await p.locator(sel).first().fill(''); for (const ch of text) { await p.locator(sel).first().pressSequentially(ch); for (let i = 0; i < Math.round(perChar * FPS); i++) await shot(); } },
  };
  await script(api);
  await ctx.close();
  const out = path.join(OUT, `${name}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`${name}: ${(n / FPS).toFixed(1)}s -> ${path.relative(process.cwd(), out)}`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const cart = { fn: (c) => localStorage.setItem('zawadimart-cart', c), arg: CART };

  // Scene 1: browsing on a phone - home page, into a category, a product, add to cart, the cart
  await take(b, 'phone-browse', PHONE, null, async (r) => {
    await r.go('/'); await r.hold(0.6); await r.scroll(380, 1.4); await r.hold(0.4);
    await r.tap('.category-bubbles a[href="/category/phones-tablets"]', { nav: true }); await r.hold(0.4); await r.scroll(420, 1.3); await r.hold(0.3);
    await r.tap('.catalog-grid .product-card a.product-img', { nav: true }); await r.hold(0.5); await r.scroll(480, 1.2); await r.hold(0.3);
    await r.tap('.buy'); await r.hold(0.9);
    await r.tap('.header-main a[href="/cart"], a[href="/cart"]', { nav: true }); await r.hold(0.6); await r.scroll(300, 1.0); await r.hold(0.8);
  });
  // Scene 2: the responsive site on a desktop monitor
  await take(b, 'desktop-home', DESK, null, async (r) => {
    await r.go('/'); await r.hold(0.7); await r.scroll(700, 1.8); await r.hold(0.5); await r.scroll(1500, 1.6); await r.hold(0.5);
    await r.tap('.product-card a.product-img', { nav: true, glide: 0.8 }); await r.hold(0.6); await r.scroll(250, 1.0); await r.hold(1.0);
  });
  // Scene 3: menu, product cards and checkout on a phone
  await take(b, 'phone-menu-product', PHONE, cart, async (r) => {
    await r.go('/'); await r.hold(0.5);
    await r.tap('button.menu-btn'); await r.hold(1.2);
    await r.tap('aside[aria-label="Menu"] a[href="/shop"], aside a[href="/shop"]', { nav: true }); await r.hold(0.4); await r.scroll(500, 1.4); await r.hold(0.3);
    await r.tap('.product-card a.product-img', { nav: true }); await r.hold(0.5); await r.scroll(400, 1.2); await r.hold(0.8);
  });
  await take(b, 'phone-checkout', PHONE, cart, async (r) => {
    await r.go('/cart'); await r.hold(0.4); await r.scroll(500, 1.2);
    await r.tap('button:has-text("Proceed to Checkout"), a:has-text("Proceed to Checkout")', { nav: true }); await r.hold(0.4);
    await r.type('input[name=fullName]', 'Amina Wanjiku', 0.06); await r.scroll(700, 1.4);
    await r.tap('.payment-tabs button:has-text("M-Pesa"), .payment-tabs button:has-text("M-PESA")'); await r.hold(0.5);
    await r.scrollTo('.payment-panel input[name=mpesa]', 360, 0.8); await r.type('.payment-panel input[name=mpesa]', '0712 345 678', 0.07); await r.hold(1.0);
  });
  // Scene 4: admin dashboard and an order tracking form
  if (SESS && fs.existsSync(path.join(SESS, 'admin.json'))) {
    const admin = JSON.parse(fs.readFileSync(path.join(SESS, 'admin.json'), 'utf8'));
    await take(b, 'desktop-admin', DESK, { fn: (s) => localStorage.setItem('zawadimart-session', JSON.stringify(s)), arg: admin }, async (r) => {
      await r.go('/admin'); await r.hold(0.8);
      await r.tap('button:has-text("Orders"), a:has-text("Orders")', { glide: 0.8 }); await r.hold(0.8); await r.scroll(300, 1.0); await r.hold(1.0);
    });
  }
  await take(b, 'phone-track-order', PHONE, null, async (r) => {
    await r.go('/track-order'); await r.hold(0.5); await r.tap('input[name=orderNumber]'); await r.type('input[name=orderNumber]', 'ZM-818702', 0.08); await r.hold(0.3);
    await r.tap('input[name=contact]'); await r.type('input[name=contact]', '0722111222', 0.07); await r.hold(1.0);
  });
  await b.close();
  fs.rmSync(TMP, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
