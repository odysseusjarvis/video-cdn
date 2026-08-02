import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
await p.goto('http://127.0.0.1:5178/reveal.html', { waitUntil: 'load' });
await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('.pw-wipe').forEach((w, i) => {
    const inner = w.querySelector('.pw-wipe__inner');
    const img = w.querySelector('img');
    const cover = w.querySelector('.pw-wipe__cover');
    out.push({
      i,
      cls: w.className,
      wipeBox: [Math.round(w.getBoundingClientRect().width), Math.round(w.getBoundingClientRect().height)],
      innerBox: [Math.round(inner.getBoundingClientRect().width), Math.round(inner.getBoundingClientRect().height)],
      imgBox: [Math.round(img.getBoundingClientRect().width), Math.round(img.getBoundingClientRect().height)],
      imgCls: img.className,
      imgAR: getComputedStyle(img).aspectRatio,
      cover: cover ? getComputedStyle(cover).transform : null,
    });
  });
  return out;
});
console.log(JSON.stringify(r, null, 2));
await b.close();
