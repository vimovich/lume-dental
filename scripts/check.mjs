import { chromium } from 'playwright';
const [,, url, out, w='1440', h='900'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.log('pageerror:', e.message));
p.on('console', m => { if (m.type()==='error' && !/unsplash|ERR_|Failed to load resource/.test(m.text())) console.log('console:', m.text()); });
await p.route(/images\.unsplash\.com|fonts\.(googleapis|gstatic)/, r => r.abort());
await p.goto(url, { waitUntil: 'load' });
// scroll through to trigger reveals
const H = await p.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < H; y += 500) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(120); }
await p.evaluate(() => { scrollTo(0, 0); document.querySelectorAll('[data-reveal]').forEach(e => e.classList.add('is-in')); });
await p.waitForTimeout(1800);
const ov = await p.evaluate(() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.ticker,.docs,.ptabs,.arc,.pcta__bg,.capsule__orbit,.scan,.glass-sec'); }).slice(0, 8).map(e => e.className || e.tagName); });
if (ov.length) console.log('overflow:', ov);
await p.screenshot({ path: out, fullPage: true });
await b.close();
