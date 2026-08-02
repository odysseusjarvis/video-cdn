import { chromium } from 'playwright';

const S = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const OUT = S + '/shots';
const FILE = 'file://' + S + '/edrive-brend.html';

const VIEWPORTS = [
  { name: 'mob', width: 390, height: 844 },
  { name: 'desk', width: 1440, height: 900 },
];
const STOPS = [0, 0.33, 0.66, 1.0];

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});

for (const vp of VIEWPORTS) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(FILE, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(2500);

  const heroH = await p.evaluate(() => document.getElementById('hero').offsetHeight);
  const canvases = await p.evaluate(() => document.querySelectorAll('canvas').length);
  const imgs = await p.evaluate(() => document.querySelectorAll('img').length);

  for (const s of STOPS) {
    await p.evaluate(y => scrollTo(0, y), Math.round((heroH - vp.height) * s));
    await p.waitForTimeout(1400);
    await p.screenshot({ path: `${OUT}/${vp.name}-${String(s).replace('.', '')}.png` });
  }

  // koliko canvasa je zaista obojeno (ne prazan)
  const box = await p.evaluate(() => {
    const c = document.querySelector('canvas').getBoundingClientRect();
    return { w: Math.round(c.width), h: Math.round(c.height), top: Math.round(c.top) };
  });
  console.log(`${vp.name}: hero=${heroH}px canvas=${canvases} img=${imgs} canvasBox=${box.w}x${box.h}@${box.top} errs=${errs.length ? errs[0] : 'nema'}`);
  await p.close();
}
await b.close();
