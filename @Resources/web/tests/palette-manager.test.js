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
  function contrastRatio(fg, bgHex) { const L1 = Math.max(luminanceRGB(fg), luminanceRGB(hexToRgb(bgHex))); const L2 = Math.min(luminanceRGB(fg), luminanceRGB(hexToRgb(bgHex))); return (L1 + 0.05) / (L2 + 0.05); }

  function parseHsl(str) {
    const m = /^\s*hsl\((\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)\s*$/i.exec(str || '');
    if (!m) return null;
    return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
  }

  function getVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`);
  }

  function rgbFromHslStr(hslStr) {
    const p = parseHsl(hslStr); if (!p) return null; return hslToRgb(p.h, p.s, p.l);
  }

  const TOKENS = [
    'cpu-usage', 'cpu-clock', 'cpu-temp',
    'mem-phys', 'mem-virt', 'mem-cache', 'mem-swap',
    'gpu-usage', 'gpu-clock', 'gpu-temp', 'gpu-vram', 'gpu-sram', 'gpu-vcore', 'gpu-fan', 'gpu-vramclock',
    'disk-usage', 'disk-latency', 'disk-read', 'disk-write',
    'net-up', 'net-down',
    'top1', 'top2', 'top3', 'top4', 'top5',
    'disk-usage-disk0', 'disk-usage-disk1',
    'disk-latency-disk0', 'disk-latency-disk1',
    'disk-read-disk0', 'disk-read-disk1',
    'disk-write-disk0', 'disk-write-disk1',
  ];

  function run() {
    const results = { passes: [], fails: [], details: [] };
    TOKENS.forEach(name => {
      const val = getVar(name);
      const rgb = rgbFromHslStr(val);
      if (!rgb) {
        results.fails.push({ name, reason: 'Formato HSL inválido o variable vacía', value: val });
        return;
      }
      const ratio = contrastRatio(rgb, BG_HEX);
      const ok = ratio >= 3;
      (ok ? results.passes : results.fails).push({ name, value: val.trim(), ratio: Number(ratio.toFixed(2)) });
      results.details.push({ name, value: val.trim(), ratio: Number(ratio.toFixed(2)) });
    });

    function neq(a, b) { return (a || '').trim() !== (b || '').trim(); }
    const baseU = getVar('disk-usage'), u0 = getVar('disk-usage-disk0'), u1 = getVar('disk-usage-disk1');
    const baseL = getVar('disk-latency'), l0 = getVar('disk-latency-disk0'), l1 = getVar('disk-latency-disk1');
    const baseR = getVar('disk-read'), r0 = getVar('disk-read-disk0'), r1 = getVar('disk-read-disk1');
    const baseW = getVar('disk-write'), w0 = getVar('disk-write-disk0'), w1 = getVar('disk-write-disk1');
    [
      ['disk-usage', baseU, u0, u1],
      ['disk-latency', baseL, l0, l1],
      ['disk-read', baseR, r0, r1],
      ['disk-write', baseW, w0, w1],
    ].forEach(([label, base, v0, v1]) => {
      if (!neq(base, v0)) results.fails.push({ name: label + ' vs disk0', reason: 'disk0 igual al base', base: base.trim(), disk0: (v0 || '').trim() });
      if (!neq(base, v1)) results.fails.push({ name: label + ' vs disk1', reason: 'disk1 igual al base', base: base.trim(), disk1: (v1 || '').trim() });
      if (!neq(v0, v1)) results.fails.push({ name: label + ' disk0 vs disk1', reason: 'disk0 igual a disk1', disk0: (v0 || '').trim(), disk1: (v1 || '').trim() });
    });

    const summary = `Palette tests: ${results.passes.length} OK, ${results.fails.length} FAIL`;
    console.group(summary);
    console.table(results.details);
    if (results.fails.length) { console.warn('Failures:', results.fails); }
    console.groupEnd();
    window.PaletteTestResult = { summary, ...results };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else { run(); }
})();