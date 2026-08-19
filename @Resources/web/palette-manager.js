(function () {
  const BG_HEX = '#1e1e1e';

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h;
    const num = parseInt(n, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const C = (1 - Math.abs(2 * l - 1)) * s;
    const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - C / 2;
    let r1 = 0, g1 = 0, b1 = 0;
    if (0 <= h && h < 60) { r1 = C; g1 = X; b1 = 0; }
    else if (60 <= h && h < 120) { r1 = X; g1 = C; b1 = 0; }
    else if (120 <= h && h < 180) { r1 = 0; g1 = C; b1 = X; }
    else if (180 <= h && h < 240) { r1 = 0; g1 = X; b1 = C; }
    else if (240 <= h && h < 300) { r1 = X; g1 = 0; b1 = C; }
    else { r1 = C; g1 = 0; b1 = X; }
    return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255) };
  }
  function srgbToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function luminanceRGB({ r, g, b }) { const R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b); return 0.2126 * R + 0.7152 * G + 0.0722 * B; }
  function contrastRatio(fgHex, bgHex) { const fg = luminanceRGB(typeof fgHex === 'string' ? hexToRgb(fgHex) : fgHex); const bg = luminanceRGB(hexToRgb(bgHex)); const L1 = Math.max(fg, bg), L2 = Math.min(fg, bg); return (L1 + 0.05) / (L2 + 0.05); }

  function mulberry32(seed) { return function () { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function randRange(rng, min, max) { return min + (max - min) * rng(); }
  const RANGES = {
    cpu: {
      usage: { h: 200, s: [38, 52], l: [60, 72] },
      clock: { h: 45, s: [40, 56], l: [58, 70] },
      temp: { h: 10, s: [45, 62], l: [58, 68] },
    },
    mem: {
      phys: { h: 200, s: [38, 52], l: [60, 72] },
      virt: { h: 50, s: [38, 52], l: [60, 72] },
      cache: { h: 185, s: [35, 50], l: [60, 72] },
      swap: { h: 280, s: [32, 48], l: [60, 72] },
    },
    gpu: {
      usage: { h: 200, s: [38, 52], l: [60, 72] },
      clock: { h: 50, s: [38, 52], l: [60, 72] },
      temp: { h: 10, s: [45, 62], l: [58, 68] },
      vram: { h: 185, s: [35, 50], l: [60, 72] },
      sram: { h: 220, s: [32, 48], l: [60, 72] },
      vcore: { h: 40, s: [40, 56], l: [58, 70] },
      fan: { h: 185, s: [30, 44], l: [62, 74] },
      vramclock: { h: 220, s: [32, 48], l: [62, 74] },
    },
    disk: {
      usage: { h: 140, s: [38, 52], l: [60, 72] },
      latency: { h: 40, s: [38, 52], l: [56, 68] },
      read: { h: 185, s: [35, 50], l: [60, 72] },
      write: { h: 220, s: [32, 48], l: [60, 72] },
    },
    net: {
      up: { h: 185, s: [35, 50], l: [60, 72] },
      down: { h: 220, s: [32, 48], l: [60, 72] },
    },
    top: {
      top1: { h: 200, s: [44, 58], l: [60, 72] },
      top2: { h: 280, s: [38, 54], l: [60, 74] },
      top3: { h: 140, s: [38, 52], l: [60, 72] },
      top4: { h: 185, s: [35, 50], l: [60, 72] },
      top5: { h: 220, s: [32, 48], l: [60, 72] },
    }
  };

  const USED_BUCKETS = new Set();
  function bucketKey(h, s, l) { return `${Math.round(h)}|${Math.round(s)}|${Math.round(l)}`; }

  function ensureContrast(h, s, l) {
    let rgb = hslToRgb(h, s, l); let ratio = contrastRatio(rgb, BG_HEX);
    let iter = 0;
    while (ratio < 3 && iter < 12) {
      l = Math.min(78, l + 2.5); s = Math.min(60, s + 2);
      rgb = hslToRgb(h, s, l); ratio = contrastRatio(rgb, BG_HEX); iter++;
    }
    return { h, s, l };
  }

  function generateColor(rng, range) {
    let h = range.h;
    let s = randRange(rng, range.s[0], range.s[1]);
    let l = randRange(rng, range.l[0], range.l[1]);
    ({ h, s, l } = ensureContrast(h, s, l));
    let key = bucketKey(h, s, l); let tries = 0;
    while (USED_BUCKETS.has(key) && tries < 6) {
      s = Math.min(62, s + 3); l = Math.max(58, l - 2);
      ({ h, s, l } = ensureContrast(h, s, l)); key = bucketKey(h, s, l); tries++;
    }
    USED_BUCKETS.add(key);
    return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
  }

  function applyVars(vars) { const root = document.documentElement; for (const [k, v] of Object.entries(vars)) { root.style.setProperty(`--${k}`, v); } }

  function buildPalette(rng) {
    const out = {};
    for (const [panel, series] of Object.entries(RANGES)) {
      for (const [name, range] of Object.entries(series)) {
        const varName = panel === 'top' ? name : `${panel}-${name}`;
        out[varName] = generateColor(rng, range);
      }
    }
    const deltas = {
      disk0: { s: 0, l: 0 },
      disk1: { s: 6, l: 8 },
    };
    for (const dev of Object.keys(deltas)) {
      const d = deltas[dev];
      ['usage', 'latency', 'read', 'write'].forEach(name => {
        const base = out[`disk-${name}`];
        const m = base.match(/hsl\((\d+),\s*(\d+)%\,\s*(\d+)%\)/);
        if (!m) return;
        let h = Number(m[1]), s = Math.min(62, Number(m[2]) + d.s), l = Math.min(78, Number(m[3]) + d.l);
        ({ h, s, l } = ensureContrast(h, s, l));
        out[`disk-${name}-${dev}`] = `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
      });
    }
    return out;
  }

  function init() {
    const seed = Date.now() & 0xffffffff; const rng = mulberry32(seed);
    const vars = buildPalette(rng);
    applyVars(vars);
    const panels = document.querySelectorAll('.right-panel');
    panels.forEach(p => {
      const t = p.getAttribute('data-panel');
      if (!t) return;
    });
  }

  window.PaletteManager = { init };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();