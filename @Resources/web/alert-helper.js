(function () {
  const severityRank = { normal: 0, warn: 1, crit: 2 };
  function computeState(value, cfg) {
    if (!cfg) return 'normal';
    let v = value;
    if (cfg.direction === 'saturation' && cfg.capacity) {
      v = (value / cfg.capacity) * 100;
    }
    if (cfg.direction === 'low_is_bad') {
      if (v <= cfg.crit) return 'crit';
      if (v <= cfg.warn) return 'warn';
      return 'normal';
    }
    if (v >= cfg.crit) return 'crit';
    if (v >= cfg.warn) return 'warn';
    return 'normal';
  }
  function worst(states) {
    let w = 'normal';
    for (const s of states) {
      if (severityRank[s] > severityRank[w]) w = s;
    }
    return (w);
  }
  function assignState(el, state) {
    if (!el) return;
    el.setAttribute('data-alert', state);
  }
  const NF = {
    0: new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    1: new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    2: new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    3: new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
  };
  function fmtNumber(x, digits) {
    var nf = NF.hasOwnProperty(digits) ? NF[digits] : NF[0];
    return nf.format(x);
  }

  function fmtGHz(x) { return fmtNumber(x, 2) + ' GHz'; }
  function fmtMHz(x, digits) {
    var d = (typeof digits === 'number') ? Math.max(0, Math.floor(digits)) : 0;
    try { return new Intl.NumberFormat('es-ES', { useGrouping: false, minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(x) || 0) + ' MHz'; }
    catch {
      var n = Number(x) || 0; var k = Math.pow(10, d); return (Math.round(n * k) / k) + ' MHz';
    }
  }
  function fmtGB(x) { return fmtNumber(x, 1) + ' GB'; }
  function fmtPct(x) { return fmtNumber(x, 1) + '%'; }
  function fmtMs(x, digits) {
    var d = (typeof digits === 'number') ? Math.max(0, Math.floor(digits)) : 0;
    try { return new Intl.NumberFormat('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(x) || 0) + ' ms'; }
    catch { var n = Number(x) || 0; var k = Math.pow(10, d); return (Math.round(n * k) / k) + ' ms'; }
  }
  function fmtVolt(x, digits) {
    var d = (typeof digits === 'number') ? Math.max(0, Math.floor(digits)) : 3;
    try { return new Intl.NumberFormat('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(x) || 0) + ' V'; }
    catch { var n = Number(x) || 0; return n.toFixed(d) + ' V'; }
  }
  function fmtRPM(x) {
    try { return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(Number(x) || 0)) + ' RPM'; }
    catch { return Math.round(Number(x) || 0) + ' RPM'; }
  }
  function fmtDegC(x) { return fmtNumber(Number(x) || 0, 0) + ' °C'; }
  function fmtKBps(x) {
    if (x >= 1024) return fmtNumber(x / 1024, 1) + ' MB/s';
    return fmtNumber(x, 1) + ' KB/s';
  }
  function fmtMBorGB(mb) {
    if (mb >= 1024) return fmtNumber(mb / 1024, 1) + ' GB';
    return fmtNumber(mb, 1) + ' MB';
  }
  function fmtNetKbpsMbps(kbps) {
    if (kbps >= 1000) return fmtNumber(kbps / 1000, 1) + ' Mbps';
    return fmtNumber(kbps, 0) + ' Kbps';
  }
  function fmtGBorMB(gb) {
    if (gb < 1) return fmtNumber(gb * 1024, 1) + ' MB';
    return fmtNumber(gb, 1) + ' GB';
  }
  function emptyDegC() { return '-- °C'; }
  function emptyVolt() { return '-,-- V'; }
  function emptyMHz() { return '--- MHz'; }
  function emptyGHz() { return '-,-- GHz'; }
  function emptyPct() { return '--%'; }
  function emptyKBps() { return '---,- KB/s'; }
  function emptyMBps() { return '--,- MB/s'; }
  function emptyKbps() { return '--- Kbps'; }
  function emptyMbps() { return '--,- Mbps'; }
  function emptyRPM() { return '----- RPM'; }
  function emptyMs() { return '--- ms'; }
  function emptyGB() { return '--,- GB'; }
  function emptyMB() { return '---,- MB'; }

  window.AlertHelper = {
    computeState,
    worst,
    assignState,
    fmtGHz,
    fmtMHz,
    fmtGB,
    fmtPct,
    fmtMs,
    fmtVolt,
    fmtRPM,
    fmtDegC,
    fmtKBps,
    fmtMBorGB,
    fmtGBorMB,
    fmtNetKbpsMbps,
    emptyDegC,
    emptyVolt,
    emptyMHz,
    emptyGHz,
    emptyPct,
    emptyKBps,
    emptyMBps,
    emptyKbps,
    emptyMbps,
    emptyRPM,
    emptyMs,
    emptyGB,
    emptyMB,
  };
})();