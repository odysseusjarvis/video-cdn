/**
 * ScrollScrubber.jsx — premium-web skill, drop-in scroll-driven canvas scrubber.
 * ---------------------------------------------------------------------------
 * Plain React 18/19. NO framer-motion, NO GSAP, NO Tailwind, NO CSS file required.
 * Drops into Astro (client:visible), Vite, Next (add "use client") unchanged.
 *
 * Generalises the proven pattern from src/components/home/HeroCarVideo.jsx and fixes
 * every defect the blueprint's repo analysis found in it. See
 * references/scrubber-component.md for the defect-by-defect account.
 *
 *   D1  ResizeObserver resized the backing store but never redrew  -> blank on rotate
 *   D2  All-or-nothing preload (60 images before first paint)      -> poster-first ladder
 *   D3  rAF ran forever, even idle and offscreen                   -> IO-parked, settle-stopped
 *   D4  No prefers-reduced-motion path at all                      -> static end-state branch
 *   D5  No decoded-memory ceiling, no mobile frame budget          -> sliding window + tiers
 *   D6  JPEG only, no WebP path                                    -> format negotiation
 *
 * Modes: 'scrub' (R2/R7) | 'crossfade' (R4) | 'wipe' (R3) | 'parallax' (R1).
 * R5 (hotspot reveal) composes on top of any mode via `children` + the --pw-progress var.
 *
 * Compositor discipline: the canvas is painted, never transformed by layout properties.
 * Overlay choreography is driven by a CSS custom property, so overlays animate on
 * transform/opacity only. Nothing in this file animates a layout property.
 */

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

/* ══════════════════════════════════════════════════════════════════════════
   1. Small pure helpers
   ══════════════════════════════════════════════════════════════════════════ */

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

/** Pad an integer to `pad` digits. 4-digit default: the Apple reference is 147
 *  frames and the repo's 2-digit `padStart(2,'0')` overflows past 99. */
const padNum = (i, pad) => String(i).padStart(pad, '0');

/** Replace {i} (0-based, padded) and {n} (1-based, padded) in a URL pattern. */
function fillPattern(pattern, i, pad) {
  return pattern
    .replace(/\{i\}/g, padNum(i, pad))
    .replace(/\{n\}/g, padNum(i + 1, pad));
}

/** Synchronous, cached WebP capability probe. Chrome/Edge/Firefox/Safari 14+ = true. */
let _webpCache = null;
function supportsWebP() {
  if (_webpCache !== null) return _webpCache;
  if (typeof document === 'undefined') return (_webpCache = false);
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    _webpCache =
      typeof c.toDataURL === 'function' &&
      c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch {
    _webpCache = false;
  }
  return _webpCache;
}

/**
 * Source/destination rectangles for cover- or contain-fitting `sw×sh` into `dw×dh`.
 * The cover branch is the reference implementation's maths, kept verbatim in spirit.
 */
function fitRect(sw, sh, dw, dh, fit) {
  const sRatio = sw / sh;
  const dRatio = dw / dh;
  if (fit === 'contain') {
    let w, h;
    if (sRatio > dRatio) {
      w = dw;
      h = dw / sRatio;
    } else {
      h = dh;
      w = dh * sRatio;
    }
    return {
      sx: 0,
      sy: 0,
      sw,
      sh,
      dx: (dw - w) / 2,
      dy: (dh - h) / 2,
      dw: w,
      dh: h,
    };
  }
  // cover: crop the source, fill the destination
  let cw, ch, cx, cy;
  if (sRatio > dRatio) {
    ch = sh;
    cw = ch * dRatio;
    cx = (sw - cw) / 2;
    cy = 0;
  } else {
    cw = sw;
    ch = cw / dRatio;
    cx = 0;
    cy = (sh - ch) / 2;
  }
  return { sx: cx, sy: cy, sw: cw, sh: ch, dx: 0, dy: 0, dw, dh };
}

/** Natural pixel dimensions of an ImageBitmap or HTMLImageElement. */
function naturalSize(drawable) {
  if (!drawable) return null;
  const w = drawable.naturalWidth ?? drawable.width;
  const h = drawable.naturalHeight ?? drawable.height;
  if (!w || !h) return null;
  return { w, h };
}

/* ══════════════════════════════════════════════════════════════════════════
   2. Environment hooks — reduced motion + device tier
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * D4 fix. Live-updating prefers-reduced-motion. Re-renders when the user flips the
 * OS setting, so the component swaps to the static end state without a reload.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduced(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return reduced;
}

/**
 * D5 fix, part 1. Device tier decides the frame budget BEFORE a byte is requested.
 *   'full'   desktop / capable phone            -> every frame, dprCap 2
 *   'light'  narrow viewport or low memory      -> mobileFrames (or every 2nd), dprCap 1.5
 *   'poster' saveData or 2g                     -> NO sequence at all, poster only
 * Re-evaluates on resize and on Network Information change, so it auto-reverts.
 */
export function useDeviceTier({ mobileBreakpoint = 768, respectSaveData = true } = {}) {
  const read = useCallback(() => {
    if (typeof window === 'undefined') return { tier: 'full', dprCap: 2 };
    const conn =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    const saveData = respectSaveData && conn ? conn.saveData === true : false;
    const et = conn && typeof conn.effectiveType === 'string' ? conn.effectiveType : '';
    const veryslow = et === 'slow-2g' || et === '2g';
    if (saveData || veryslow) return { tier: 'poster', dprCap: 1.5 };

    const narrow = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`).matches;
    const lowMem = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (narrow || lowMem || (coarse && et === '3g')) return { tier: 'light', dprCap: 1.5 };
    return { tier: 'full', dprCap: 2 };
  }, [mobileBreakpoint, respectSaveData]);

  const [state, setState] = useState(read);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = read();
        setState((prev) =>
          prev.tier === next.tier && prev.dprCap === next.dprCap ? prev : next
        );
      });
    };
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    const conn =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    if (conn && conn.addEventListener) conn.addEventListener('change', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (conn && conn.removeEventListener) conn.removeEventListener('change', update);
    };
  }, [read]);

  return state;
}

/* ══════════════════════════════════════════════════════════════════════════
   3. FrameStore — the progressive loader + sliding decoded-frame window
   ══════════════════════════════════════════════════════════════════════════
   D2 fix: three-tier ladder. Poster paints first (it is a real <img> in the
   document, so it gets Chrome's in-viewport priority boost). Then an every-Nth
   KEYFRAME subset at high priority, which makes the scrub usable within a few
   hundred KB. Then the remainder at fetchpriority="low" on requestIdleCallback.
   Nothing waits for "all frames loaded" — `nearestLoaded()` always returns
   something once one frame exists.

   Why the ladder is load-bearing and not a nicety: images created with
   `new Image()` are never inserted into the document, never participate in
   layout, and therefore NEVER receive Chrome's in-viewport priority boost. They
   are pinned at Low priority forever. Firing 60 of them at once starves the
   poster and the fonts. Sequencing them is the only lever available.

   D5 fix, part 2: the sliding window. Budget is W×H×4×frames of LIVE bitmap;
   60 frames at 1280×720 is 221 MB decoded from 3.9 MB on disk, which is an
   iOS-Safari tab kill and is invisible in any network panel. Above the budget we
   keep only current ±loadRadius, evict beyond ±keepRadius, and PIN the keyframe
   subset permanently so a backward scrub past the evicted edge always has a
   frame within `keyframeEvery` to draw. Never a blank canvas.
   ══════════════════════════════════════════════════════════════════════════ */

const IDLE =
  typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback.bind(window)
    : (cb) => setTimeout(() => cb({ timeRemaining: () => 8, didTimeout: true }), 1);
const CANCEL_IDLE =
  typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function'
    ? window.cancelIdleCallback.bind(window)
    : (id) => clearTimeout(id);

class FrameStore {
  /**
   * @param {object} o
   * @param {string[]} o.urls              resolved frame URLs, in order
   * @param {number}   o.keyframeEvery     pin every Nth frame (never evicted)
   * @param {boolean}  o.windowed          enable the sliding window (memory-bound)
   * @param {number}   o.loadRadius        prefetch current ± this many
   * @param {number}   o.keepRadius        evict beyond current ± this many
   * @param {boolean}  o.useBitmap         try createImageBitmap for cheaper draws
   * @param {(i:number)=>void} o.onFrameReady  called after each successful decode
   */
  constructor({
    urls,
    keyframeEvery = 4,
    windowed = false,
    loadRadius = 12,
    keepRadius = 20,
    useBitmap = true,
    onFrameReady = () => {},
  }) {
    this.urls = urls;
    this.n = urls.length;
    this.keyframeEvery = Math.max(1, keyframeEvery);
    this.windowed = windowed;
    this.loadRadius = loadRadius;
    this.keepRadius = Math.max(keepRadius, loadRadius + 2);
    this.useBitmap = useBitmap && typeof createImageBitmap === 'function';
    this.onFrameReady = onFrameReady;
    this.destroyed = false;
    this.idleId = 0;
    this.readyCount = 0;

    this.slots = urls.map((url, i) => ({
      url,
      i,
      img: null,
      bitmap: null,
      state: 'idle', // idle | loading | ready | error
      pinned: i % this.keyframeEvery === 0 || i === 0 || i === this.n - 1,
    }));
  }

  /** Drawable for exactly frame i, or null. */
  get(i) {
    const s = this.slots[i];
    if (!s || s.state !== 'ready') return null;
    return s.bitmap || s.img;
  }

  /** Index of the loaded frame closest to i, searching outward. -1 if none. */
  nearestLoaded(i) {
    if (this.get(i)) return i;
    for (let d = 1; d < this.n; d++) {
      if (i - d >= 0 && this.get(i - d)) return i - d;
      if (i + d < this.n && this.get(i + d)) return i + d;
    }
    return -1;
  }

  /**
   * Request one frame. `priority` maps to fetchPriority.
   * Safe to call repeatedly; already-loading/ready slots are no-ops.
   */
  load(i, priority = 'auto') {
    const s = this.slots[i];
    if (!s || this.destroyed) return;
    if (s.state === 'loading' || s.state === 'ready') return;
    s.state = 'loading';

    const img = new Image();
    s.img = img;
    // Never block the main thread on decode; the rAF loop draws whatever exists.
    img.decoding = 'async';
    if ('fetchPriority' in img) img.fetchPriority = priority;
    else img.setAttribute('fetchpriority', priority);

    img.onload = () => {
      if (this.destroyed || s.img !== img) return;
      const finish = () => {
        if (this.destroyed || s.img !== img) return;
        s.state = 'ready';
        this.readyCount += 1;
        this.onFrameReady(i);
      };
      if (this.useBitmap) {
        // Safari has historically thrown on some sources; both the sync throw and
        // the async rejection fall back to the plain HTMLImageElement.
        try {
          createImageBitmap(img).then(
            (bmp) => {
              if (this.destroyed || s.img !== img) {
                bmp.close();
                return;
              }
              s.bitmap = bmp;
              finish();
            },
            () => {
              this.useBitmap = false;
              finish();
            }
          );
        } catch {
          this.useBitmap = false;
          finish();
        }
      } else {
        finish();
      }
    };
    img.onerror = () => {
      if (this.destroyed || s.img !== img) return;
      s.state = 'error';
      s.img = null;
    };
    img.src = s.url;
  }

  /** Tier 2 of the ladder: the pinned keyframe subset, at high priority. */
  loadKeyframes() {
    for (let i = 0; i < this.n; i++) if (this.slots[i].pinned) this.load(i, 'high');
  }

  /**
   * Tier 3: the remainder, at LOW priority, one per idle callback so it never
   * competes with the poster, fonts or the keyframe subset. Skipped entirely in
   * windowed mode — there the window itself does the fetching.
   */
  loadRemainder() {
    if (this.windowed) return;
    let cursor = 0;
    const step = (deadline) => {
      if (this.destroyed) return;
      let budget = deadline && deadline.timeRemaining ? deadline.timeRemaining() : 8;
      while (cursor < this.n && budget > 1) {
        const i = cursor++;
        if (this.slots[i].state === 'idle') this.load(i, 'low');
        budget -= 1;
      }
      if (cursor < this.n) this.idleId = IDLE(step, { timeout: 500 });
    };
    this.idleId = IDLE(step, { timeout: 500 });
  }

  /** Windowed mode: fetch around `center`, evict outside `keepRadius`. */
  window(center) {
    if (!this.windowed || this.destroyed) return;
    const lo = Math.max(0, center - this.loadRadius);
    const hi = Math.min(this.n - 1, center + this.loadRadius);
    for (let i = lo; i <= hi; i++) {
      this.load(i, Math.abs(i - center) <= 2 ? 'high' : 'auto');
    }
    const kLo = Math.max(0, center - this.keepRadius);
    const kHi = Math.min(this.n - 1, center + this.keepRadius);
    for (let i = 0; i < this.n; i++) {
      if (i >= kLo && i <= kHi) continue;
      this.evict(i);
    }
  }

  /** Release one slot's decoded memory. Pinned keyframes are never evicted. */
  evict(i) {
    const s = this.slots[i];
    if (!s || s.pinned || s.state === 'idle') return;
    if (s.bitmap) {
      s.bitmap.close();
      s.bitmap = null;
    }
    if (s.img) {
      s.img.onload = null;
      s.img.onerror = null;
      // removeAttribute, NOT src = '': assigning the empty string resolves against
      // the document URL and fires a real network request. Removing the attribute
      // releases the decoded bitmap silently; the bytes stay in the HTTP cache.
      s.img.removeAttribute('src');
      s.img = null;
    }
    if (s.state === 'ready') this.readyCount -= 1;
    s.state = 'idle';
  }

  destroy() {
    this.destroyed = true;
    if (this.idleId) CANCEL_IDLE(this.idleId);
    for (const s of this.slots) {
      if (s.bitmap) {
        s.bitmap.close();
        s.bitmap = null;
      }
      if (s.img) {
        s.img.onload = null;
        s.img.onerror = null;
        s.img.src = '';
        s.img = null;
      }
      s.state = 'idle';
    }
    this.readyCount = 0;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   4. Canvas painters — one per mode. All transform/opacity-equivalent work
      happens inside the canvas; no layout property is ever animated.
   ══════════════════════════════════════════════════════════════════════════ */

function paintOne(ctx, drawable, dw, dh, fit, alpha) {
  const size = naturalSize(drawable);
  if (!size) return false;
  const r = fitRect(size.w, size.h, dw, dh, fit);
  ctx.globalAlpha = alpha;
  ctx.drawImage(drawable, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
  ctx.globalAlpha = 1;
  return true;
}

/** mode 'scrub' (R2, R7) — nearest loaded frame, hard cut. */
function paintScrub(ctx, store, exact, dw, dh, fit) {
  const idx = store.nearestLoaded(exact);
  if (idx < 0) return false;
  return paintOne(ctx, store.get(idx), dw, dh, fit, 1);
}

/** mode 'crossfade' (R4) — frame N at alpha 1, frame N+1 at the fraction. */
function paintCrossfade(ctx, store, exactFloat, dw, dh, fit) {
  const lo = Math.floor(exactFloat);
  const hi = Math.min(store.n - 1, lo + 1);
  const t = exactFloat - lo;
  const loIdx = store.nearestLoaded(lo);
  if (loIdx < 0) return false;
  paintOne(ctx, store.get(loIdx), dw, dh, fit, 1);
  if (hi !== lo && t > 0.001) {
    const hiIdx = store.get(hi) ? hi : -1;
    if (hiIdx >= 0) paintOne(ctx, store.get(hiIdx), dw, dh, fit, t);
  }
  return true;
}

/** mode 'wipe' (R3) — before underneath, after clipped by progress. */
function paintWipe(ctx, store, p, dw, dh, fit, direction) {
  const beforeIdx = store.nearestLoaded(0);
  if (beforeIdx < 0) return false;
  paintOne(ctx, store.get(beforeIdx), dw, dh, fit, 1);

  const after = store.get(store.n - 1);
  if (!after) return true; // before-only is a valid intermediate state
  ctx.save();
  ctx.beginPath();
  if (direction === 'rtl') ctx.rect(dw * (1 - p), 0, dw * p, dh);
  else if (direction === 'ttb') ctx.rect(0, 0, dw, dh * p);
  else if (direction === 'btt') ctx.rect(0, dh * (1 - p), dw, dh * p);
  else ctx.rect(0, 0, dw * p, dh); // 'ltr'
  ctx.clip();
  paintOne(ctx, after, dw, dh, fit, 1);
  ctx.restore();
  return true;
}

/**
 * mode 'parallax' (R1) — frames are LAYERS, back to front (e.g. blurred plate,
 * rembg cutout subject, foreground scrim). Each drifts and scales at its own rate.
 * Drawn into an inflated destination rect so no layer edge ever enters the frame.
 */
function paintParallax(ctx, store, p, dw, dh, fit, rates, amplitude) {
  let drew = false;
  for (let i = 0; i < store.n; i++) {
    const d = store.get(i);
    if (!d) continue;
    const rate = rates[i] !== undefined ? rates[i] : 1 - i / Math.max(1, store.n);
    const shift = (p - 0.5) * amplitude * rate;
    const scale = 1 + p * 0.12 * rate;
    const inflate = amplitude * Math.abs(rate) + dw * 0.12 * Math.abs(rate);
    const iw = dw + inflate * 2;
    const ih = dh + inflate * 2;
    const size = naturalSize(d);
    if (!size) continue;
    const r = fitRect(size.w, size.h, iw, ih, fit);
    ctx.save();
    ctx.translate(dw / 2, dh / 2 + shift);
    ctx.scale(scale, scale);
    ctx.translate(-iw / 2, -ih / 2);
    ctx.drawImage(d, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
    ctx.restore();
    drew = true;
  }
  return drew;
}

/* ══════════════════════════════════════════════════════════════════════════
   5. The component
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * @typedef {Object} ScrollScrubberProps
 * @property {string[]}  [frames]            Explicit frame URLs, in order.
 * @property {string}    [srcPattern]        e.g. '/anim/hero/frame-{i}.webp' ({i} 0-based, {n} 1-based).
 * @property {number}    [count]             Frame count when using srcPattern.
 * @property {number}    [pad=4]             Zero-padding width for {i}/{n}.
 * @property {{webp?:string,jpeg?:string,avif?:string}} [formats]
 *                                           Per-format patterns; WebP chosen when supported (D6).
 * @property {string[]}  [mobileFrames]      Lighter ladder for the 'light' tier.
 * @property {string}    [mobileSrcPattern]  Pattern form of mobileFrames.
 * @property {number}    [mobileCount]
 * @property {'scrub'|'crossfade'|'wipe'|'parallax'} [mode='scrub']
 * @property {[number,number]} [scrollRange=[0.10,0.65]]  Section progress mapped to frame 0..N-1.
 * @property {number}    [lerp=0.08]         Smoothing factor. 0 disables smoothing.
 * @property {string}    poster              REQUIRED. Real <img>, the LCP element and CLS guard.
 * @property {string}    [reducedMotionFrame] Still shown under prefers-reduced-motion. Defaults to poster.
 * @property {(p:number)=>void} [onProgress] Called with raw section progress 0..1, rAF-throttled.
 * @property {string}    [className]
 * @property {string}    [sectionHeight='500vh']
 * @property {'cover'|'contain'} [fit='cover']
 * @property {number}    [dprCap]            Overrides the tier's DPR cap.
 * @property {number}    [keyframeEvery=4]
 * @property {number}    [memoryBudgetMB=250]
 * @property {'ltr'|'rtl'|'ttb'|'btt'} [wipeDirection='ltr']
 * @property {number[]}  [parallaxRates=[1,0.6,0.3]]
 * @property {number}    [parallaxAmplitude=120]
 * @property {string}    [ariaLabel]         Text equivalent of what the canvas shows.
 * @property {number}    [posterWidth=1280]
 * @property {number}    [posterHeight=720]
 * @property {React.ReactNode} [children]    Overlay. Read --pw-progress off the pin element.
 *   CAUTION: the static branch (reduced motion / save-data / no frames) pins
 *   --pw-progress to 1, so an overlay that FADES OUT across the scrub resolves to
 *   opacity 0 and its text disappears entirely for those visitors. Restore it with
 *   `[data-pw-scrubber='static'] .your-overlay { opacity: 1; transform: none; }`.
 *   See references/scrubber-component.md §4, "The fade-OUT trap".
 * @property {React.CSSProperties} [style]
 */

export default function ScrollScrubber(props) {
  const {
    frames,
    srcPattern,
    count = 0,
    pad = 4,
    formats,
    mobileFrames,
    mobileSrcPattern,
    mobileCount = 0,
    mode = 'scrub',
    scrollRange = [0.1, 0.65],
    lerp = 0.08,
    poster,
    reducedMotionFrame,
    onProgress,
    className = '',
    sectionHeight = '500vh',
    fit = 'cover',
    dprCap,
    keyframeEvery = 4,
    memoryBudgetMB = 250,
    wipeDirection = 'ltr',
    parallaxRates = [1, 0.6, 0.3],
    parallaxAmplitude = 120,
    ariaLabel = '',
    posterWidth = 1280,
    posterHeight = 720,
    children,
    style,
  } = props;

  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const canvasRef = useRef(null);
  const storeRef = useRef(null);
  const rafRef = useRef(0);
  const curRef = useRef(0); // smoothed frame position (float)
  const targetRef = useRef(0); // desired frame position (float)
  const drawnRef = useRef(-1); // last integer frame committed to the canvas
  const activeRef = useRef(false); // IO: section anywhere near the viewport
  const dirtyRef = useRef(true); // something changed; keep ticking
  const progressRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const reduced = usePrefersReducedMotion();
  const { tier, dprCap: tierDpr } = useDeviceTier();
  const effectiveDprCap = dprCap ?? tierDpr;

  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const firstDrawRef = useRef(false); // read inside draw() so draw stays stable

  /* ---- URL resolution, incl. D6 WebP negotiation and the mobile ladder ---- */
  const urls = useMemo(() => {
    const build = (list, pattern, n) => {
      if (Array.isArray(list) && list.length) return list;
      if (pattern && n > 0) {
        const out = new Array(n);
        for (let i = 0; i < n; i++) out[i] = fillPattern(pattern, i, pad);
        return out;
      }
      return null;
    };

    if (tier === 'light') {
      const light = build(mobileFrames, mobileSrcPattern, mobileCount);
      if (light) return light;
    }

    if (formats) {
      const webp = supportsWebP();
      const chosen =
        (webp && formats.webp) || formats.jpeg || formats.avif || formats.webp || null;
      if (chosen) {
        const n = count || (Array.isArray(frames) ? frames.length : 0);
        const full = build(null, chosen, n) || [];
        return tier === 'light' ? full.filter((_, i) => i % 2 === 0) : full;
      }
    }

    const full = build(frames, srcPattern, count) || [];
    // No dedicated mobile ladder supplied: halve the frame count on the light tier.
    return tier === 'light' && full.length > 12 ? full.filter((_, i) => i % 2 === 0) : full;
  }, [
    frames,
    srcPattern,
    count,
    pad,
    formats,
    mobileFrames,
    mobileSrcPattern,
    mobileCount,
    tier,
  ]);

  const frameCount = urls.length;
  const stillSrc = reducedMotionFrame || poster;

  /* ---- Static branch: reduced motion, saveData/2g, or no frames at all ---- */
  const staticMode = reduced || tier === 'poster' || frameCount === 0;

  /* ------------------------------------------------------------------ D1 fix
     Draw is a stable callback that reads refs, so the ResizeObserver can call it
     directly after resizing the backing store. The reference implementation
     resized and returned — leaving a cleared canvas until the next scroll event,
     which on a phone rotation is "the hero went blank".
     ------------------------------------------------------------------------ */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const store = storeRef.current;
    if (!canvas || !store) return;
    const dw = canvas.width;
    const dh = canvas.height;
    if (!dw || !dh) return;
    const ctx = canvas.getContext('2d', { alpha: mode === 'parallax' });
    if (!ctx) return;

    const exactFloat = clamp(curRef.current, 0, Math.max(0, frameCount - 1));
    const exact = Math.round(exactFloat);
    const p = frameCount > 1 ? exactFloat / (frameCount - 1) : 0;

    ctx.clearRect(0, 0, dw, dh);
    let ok = false;
    if (mode === 'crossfade') ok = paintCrossfade(ctx, store, exactFloat, dw, dh, fit);
    else if (mode === 'wipe') ok = paintWipe(ctx, store, p, dw, dh, fit, wipeDirection);
    else if (mode === 'parallax')
      ok = paintParallax(ctx, store, p, dw, dh, fit, parallaxRates, parallaxAmplitude);
    else ok = paintScrub(ctx, store, exact, dw, dh, fit);

    if (ok) {
      drawnRef.current = exact;
      if (!firstDrawRef.current) {
        firstDrawRef.current = true;
        setFirstFrameReady(true); // cross-fade poster -> canvas, once
      }
    }
  }, [mode, fit, frameCount, wipeDirection, parallaxRates, parallaxAmplitude]);

  /* ---- Backing store sizing + D1 immediate redraw ---- */
  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const pin = pinRef.current;
    if (!canvas || !pin) return;
    const rect = pin.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    // DPR clamp: uncapped DPR 3 on a full-bleed phone hero is a ~4501×2532
    // backing store (~46 MB) and a brutal per-frame drawImage cost.
    const dpr = Math.min(window.devicePixelRatio || 1, effectiveDprCap);
    const bw = Math.round(cssW * dpr);
    const bh = Math.round(cssH * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      drawnRef.current = -1; // resizing clears the canvas: force a repaint
    }
    draw(); // <-- D1: never leave the canvas blank after a resize
  }, [draw, effectiveDprCap]);

  /* ---- Build the FrameStore and run the loading ladder (D2) ---- */
  useEffect(() => {
    if (staticMode) return undefined;

    // D5: decoded-memory arithmetic, done before any request goes out.
    // Bytes = W × H × 4 × frames. Above the budget, the sliding window is not optional.
    const estW = posterWidth;
    const estH = posterHeight;
    const decodedMB = (estW * estH * 4 * frameCount) / (1024 * 1024);
    const windowed = decodedMB > memoryBudgetMB;

    const store = new FrameStore({
      urls,
      keyframeEvery: Math.max(1, Math.min(keyframeEvery, Math.max(1, frameCount - 1))),
      windowed,
      loadRadius: 12,
      keepRadius: 20,
      useBitmap: true,
      onFrameReady: () => {
        dirtyRef.current = true;
        start();
      },
    });
    storeRef.current = store;
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(
        `[ScrollScrubber] ${frameCount} frames · tier=${tier} · decoded ≈ ${decodedMB.toFixed(
          0
        )} MB · sliding window ${windowed ? 'ON' : 'off'}`
      );
    }

    // Tier 1 of the ladder is the poster <img>, already in the DOM below.
    // Tier 2: keyframe subset, high priority.
    store.load(0, 'high');
    if (mode === 'wipe') store.load(frameCount - 1, 'high');
    if (mode === 'parallax') for (let i = 0; i < frameCount; i++) store.load(i, 'high');
    else store.loadKeyframes();
    // Tier 3: the remainder, low priority, on idle, AFTER load.
    const kickRemainder = () => store.loadRemainder();
    if (document.readyState === 'complete') kickRemainder();
    else window.addEventListener('load', kickRemainder, { once: true });

    return () => {
      window.removeEventListener('load', kickRemainder);
      store.destroy();
      storeRef.current = null;
    };
    // `start` is declared below and is stable via refs; urls identity drives rebuilds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    urls,
    staticMode,
    frameCount,
    keyframeEvery,
    memoryBudgetMB,
    mode,
    posterWidth,
    posterHeight,
    tier,
  ]);

  /* ------------------------------------------------------------------ D3 fix
     One rAF loop, started only when the section is near the viewport (IO) and
     stopped the moment the scrub has settled and nothing is dirty. The reference
     implementation ran requestAnimationFrame forever, on every page, offscreen,
     idle, in a background tab — burning battery for nothing.
     ------------------------------------------------------------------------ */
  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const tick = useCallback(() => {
    rafRef.current = 0;
    const section = sectionRef.current;
    const pin = pinRef.current;
    const store = storeRef.current;
    if (!section || !pin || !store) return;

    // Section progress, equivalent to framer-motion offset ['start start','end end'].
    const rect = section.getBoundingClientRect();
    const travel = Math.max(1, rect.height - pin.offsetHeight);
    const raw = clamp(-rect.top / travel, 0, 1);

    if (Math.abs(raw - progressRef.current) > 0.0001) {
      progressRef.current = raw;
      pin.style.setProperty('--pw-progress', raw.toFixed(4));
      if (onProgressRef.current) onProgressRef.current(raw);
    }

    const [rs, re] = scrollRange;
    const span = Math.max(1e-6, re - rs);
    const mapped = clamp((raw - rs) / span, 0, 1);
    targetRef.current = mapped * Math.max(0, frameCount - 1);

    const diff = targetRef.current - curRef.current;
    const settled = Math.abs(diff) < 0.05;
    if (settled) curRef.current = targetRef.current;
    else curRef.current += diff * (lerp > 0 ? lerp : 1);

    // Redraw only when the committed frame changes — except in continuous modes
    // (crossfade / wipe / parallax) where every sub-frame step is visible.
    const continuous = mode !== 'scrub';
    const idx = Math.round(clamp(curRef.current, 0, Math.max(0, frameCount - 1)));
    if (continuous || idx !== drawnRef.current || dirtyRef.current) {
      dirtyRef.current = false;
      draw();
    }

    if (store.windowed) store.window(idx);

    // Keep ticking only while active AND (moving OR dirty). Otherwise park.
    if (activeRef.current && (!settled || dirtyRef.current)) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [draw, frameCount, lerp, mode, scrollRange]);

  const start = useCallback(() => {
    if (rafRef.current || !activeRef.current) return;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  /* ---- IntersectionObserver parking + scroll wake-up ---- */
  useEffect(() => {
    if (staticMode) return undefined;
    const section = sectionRef.current;
    if (!section) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          activeRef.current = e.isIntersecting;
          if (e.isIntersecting) {
            dirtyRef.current = true;
            start();
          } else {
            stop();
          }
        }
      },
      // Generous margin: wake a little before the section arrives so the first
      // visible pixel is already the right frame.
      { rootMargin: '50% 0px 50% 0px', threshold: 0 }
    );
    io.observe(section);

    const wake = () => {
      if (activeRef.current) start();
    };
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake, { passive: true });
    document.addEventListener('visibilitychange', wake);

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
      document.removeEventListener('visibilitychange', wake);
      stop();
    };
  }, [staticMode, start, stop]);

  /* ---- ResizeObserver: resize the backing store AND redraw (D1) ---- */
  useEffect(() => {
    if (staticMode) return undefined;
    const pin = pinRef.current;
    if (!pin) return undefined;
    sizeCanvas();
    const ro = new ResizeObserver(() => {
      sizeCanvas();
      dirtyRef.current = true;
      start();
    });
    ro.observe(pin);
    // devicePixelRatio can change without a resize (moving window between screens).
    let dprQuery = null;
    const onDpr = () => {
      sizeCanvas();
      dirtyRef.current = true;
      start();
    };
    if (window.matchMedia) {
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      if (dprQuery.addEventListener) dprQuery.addEventListener('change', onDpr);
    }
    return () => {
      ro.disconnect();
      if (dprQuery && dprQuery.removeEventListener)
        dprQuery.removeEventListener('change', onDpr);
    };
  }, [staticMode, sizeCanvas, start]);

  /* ══════════════════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════════════════ */

  const pinStyle = {
    position: 'sticky',
    top: 0,
    height: '100svh',
    minHeight: '100vh',
    overflow: 'clip',
    isolation: 'isolate',
  };

  /* D4: reduced motion / saveData / no-frames — SHOW THE END STATE INSTANTLY.
     No canvas, no observers, no rAF, and the tall section collapses to one
     viewport so there is no empty scroll region to fall through. */
  if (staticMode) {
    return (
      <section
        ref={sectionRef}
        className={className}
        data-pw-scrubber="static"
        data-pw-reason={reduced ? 'reduced-motion' : tier === 'poster' ? 'save-data' : 'no-frames'}
        style={{ position: 'relative', height: '100svh', ...style }}
      >
        <div ref={pinRef} style={{ ...pinStyle, '--pw-progress': '1' }}>
          <img
            src={stillSrc}
            alt={ariaLabel}
            width={posterWidth}
            height={posterHeight}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: fit,
            }}
          />
          {children}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={className}
      data-pw-scrubber={mode}
      style={{ position: 'relative', height: sectionHeight, ...style }}
    >
      <div ref={pinRef} style={pinStyle}>
        {/* LCP element + CLS guard. A <canvas> is NOT an LCP candidate, so the
            poster must be a real <img> with explicit width/height. In a
            client-rendered SPA also add, to index.html <head>:
            <link rel="preload" as="image" href="<poster>" fetchpriority="high"> */}
        <img
          src={poster}
          alt={ariaLabel}
          width={posterWidth}
          height={posterHeight}
          fetchPriority="high"
          loading="eager"
          decoding="async"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: fit,
            opacity: firstFrameReady ? 0 : 1,
            transition: 'opacity 320ms linear',
            willChange: 'opacity',
          }}
        />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            width: '100%',
            height: '100%',
            opacity: firstFrameReady ? 1 : 0,
            transition: 'opacity 320ms linear',
          }}
        />
        {/* Text equivalent for the decorative canvas. */}
        {ariaLabel ? (
          <p
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              margin: -1,
              padding: 0,
              overflow: 'hidden',
              clipPath: 'inset(50%)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {ariaLabel}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export { FrameStore, fitRect, supportsWebP, clamp };
