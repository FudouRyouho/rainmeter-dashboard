/*
  Motor de datos mock para cadenas (CPU/GPU/DISK)
  - Evita dependencias; funciona en Rainmeter WebView y en preview local
  - Usa generadores con paseo aleatorio para valores estables
  - Cablea campos mediante atributos data-field

  Convenciones de campos:
    CPU:  cpu-summary, cpu-process, cpu-subprocess
    GPU:  gpu-summary, gpu-vramDedicated, gpu-vramTotal
    DISK: disk-summary, disk-read, disk-write
*/
(function () {
  /** Número aleatorio en rango */
  function rnd(min, max) {
    return Math.random() * (max - min) + min;
  }
  function clamp(x, min, max) {
    return Math.min(max, Math.max(min, x));
  }

  /**
   * Serie numérica con paseo aleatorio
   * @param {number} init
   * @param {number} min
   * @param {number} max
   * @param {number} step
   */
  function Series(init, min, max, step, opts) {
    this.value = init;
    this.min = min;
    this.max = max;
    this.step = step;
    this.opts = opts || {};
  }
  Series.prototype.next = function () {
    // paseo aleatorio
    this.value = clamp(this.value + rnd(-this.step, this.step), this.min, this.max);
    // picos cercanos al límite para probar alertas
    var spikeChance = this.opts.spikeChance || 0;
    if (spikeChance > 0 && Math.random() < spikeChance) {
      var rmin = (this.opts.spikeMinRatio != null) ? this.opts.spikeMinRatio : 0.11;
      var rmax = (this.opts.spikeMaxRatio != null) ? this.opts.spikeMaxRatio : 0.99;
      var ratio = rnd(rmin, rmax);
      this.value = clamp(this.max * ratio, this.min, this.max);
    }
    return this.value;
  };

  // Formateadores simples
  function fmtPercent(x) { return Math.round(x) + "%"; }
  function fmtC(x) { return Math.round(x) + " °C"; }
  function easeUsage(u) { return clamp(Math.pow(u / 100, 0.65), 0, 1); }

  function set(el, text) { if (el) el.textContent = text; }

  // Kill switch global para deshabilitar todos los mocks
  // Por defecto queda activado (true) salvo que la página lo sobrescriba antes de cargar este script.
  try {
    if (typeof window !== 'undefined') {
      if (typeof window.mocks_disabled === 'undefined') {
        window.mocks_disabled = true;
      }
      if (window.mocks_disabled === true) {
        return; // salir antes de inicializar cualquier bloque de mocks
      }
    }
  } catch {}

  var page = document.title;

  if (page === "CPU" && window.MOCKS_ENABLED_CPU !== false) {
    // Ryzen 7 4700S: base 3.6 GHz, boost ~4.0 GHz; reposo ~32 °C
    var baseClock = 3.60, boostClock = 4.00, ambient = 32;
    var cpuUsage = new Series(20, 1, 100, 4, { spikeChance: 0.08 });
    var processCount = new Series(188, 150, 260, 6);
    var subProcessCount = new Series(4122, 3000, 7000, 120);

    var summaryEl = document.querySelector('[data-field="cpu-summary"]');
    var usageEl = document.querySelector('[data-field="cpu-usage"]');
    var clockEl = document.querySelector('[data-field="cpu-clock"]');
    var tempEl  = document.querySelector('[data-field="cpu-temp"]');
    var procEl = document.querySelector('[data-field="cpu-process"]');
    var subProcEl = document.querySelector('[data-field="cpu-subprocess"]');

    // elementos de paths (gráfico) usando data-series
    var pathUsageEl = document.querySelector('path[data-series="cpu-usage"]');
    var pathClockEl = document.querySelector('path[data-series="cpu-clock"]');
    var pathTempEl  = document.querySelector('path[data-series="cpu-temp"]');

    // ring buffers para las tres series (50 puntos)
    var ringU = GraphHelper.createRing(50);
    var ringF = GraphHelper.createRing(50);
    var ringT = GraphHelper.createRing(50);
    var W = 100, H = 60, padTop = 2, padBottom = 2;

    setInterval(function () {
      var u = cpuUsage.next();
      var f = easeUsage(u);
      var clock = clamp(baseClock + (boostClock - baseClock) * f + rnd(-0.05, 0.05), baseClock, boostClock);
      var t = clamp(ambient + 0.45 * u + 4 * (clock - baseClock) + rnd(-1.5, 1.5), 30, 95);
      set(usageEl, fmtPercent(u));
      set(clockEl, AlertHelper.fmtGHz(clock));
      set(tempEl,  fmtC(t));
      // estado por ítem: uso y temperatura
      AlertHelper.assignState(usageEl, AlertHelper.computeState(u, ALERT_INDEX['cpu-usage']));
      AlertHelper.assignState(tempEl,  AlertHelper.computeState(t, ALERT_INDEX['cpu-temp']));
      set(procEl, "Process: " + Math.round(processCount.next()));
      set(subProcEl, "SubProcess: " + Math.round(subProcessCount.next()));

      // actualizar ring buffers y paths del gráfico
      GraphHelper.push(ringU, GraphHelper.normalize(u, 0, 100));
      GraphHelper.push(ringF, GraphHelper.normalize(clock, baseClock, boostClock));
      GraphHelper.push(ringT, GraphHelper.normalize(t, 30, 95));

      var pathU = GraphHelper.toPath(GraphHelper.values(ringU), W, H, padTop, padBottom);
      var pathF = GraphHelper.toPath(GraphHelper.values(ringF), W, H, padTop, padBottom);
      var pathT = GraphHelper.toPath(GraphHelper.values(ringT), W, H, padTop, padBottom);
      if (pathUsageEl) pathUsageEl.setAttribute('d', pathU);
      if (pathClockEl) pathClockEl.setAttribute('d', pathF);
      if (pathTempEl)  pathTempEl.setAttribute('d', pathT);
    }, 1000);
  }

  if (page === "GPU" && window.MOCKS_ENABLED_GPU !== false) {
    var gpuUsage = new Series(20, 1, 100, 5, { spikeChance: 0.12 });
    var idleClock = 300, boostClockMhz = 1785, ambientG = 30;
    var vramUsedDedicated = new Series(1.0, 0.2, 6.0, 0.25);
    var vramUsedTotal = new Series(1.0, 0.2, 14.0, 0.35);

    var gUsageEl = document.querySelector('[data-field="gpu-usage"]');
    var gClockEl = document.querySelector('[data-field="gpu-clock"]');
    var gTempEl  = document.querySelector('[data-field="gpu-temp"]');
    var vramDedicatedEl = document.querySelector('[data-field="gpu-vramDedicated"]');
    var vramTotalEl = document.querySelector('[data-field="gpu-vramTotal"]');

    // paths del gráfico (GPU): uso, reloj, temp, vram, sram
    var pathGUsageEl = document.querySelector('path[data-series="gpu-usage"]');
    var pathGClockEl = document.querySelector('path[data-series="gpu-clock"]');
    var pathGTempEl  = document.querySelector('path[data-series="gpu-temp"]');
    var pathVramEl   = document.querySelector('path[data-series="gpu-vram"]');
    var pathSramEl   = document.querySelector('path[data-series="gpu-vram-shared"]');
    var ringGU = GraphHelper.createRing(50);
    var ringGC = GraphHelper.createRing(50);
    var ringGT = GraphHelper.createRing(50);
    var ringV  = GraphHelper.createRing(50);
    var ringS  = GraphHelper.createRing(50);
    var WG = 100, HG = 60, padTopG = 2, padBottomG = 2;

    setInterval(function () {
      var u = gpuUsage.next();
      var f = easeUsage(u);
      var clockMhz = clamp(idleClock + (boostClockMhz - idleClock) * f + rnd(-30, 30), idleClock, boostClockMhz);
      var t = clamp(ambientG + 0.50 * u + 5 * f + rnd(-1.5, 1.5), 28, 92);
      set(gUsageEl, Math.round(u) + "%");
      set(gClockEl, Math.round(clockMhz) + " MHz");
      set(gTempEl,  fmtC(t));
      var sGUsage = AlertHelper.computeState(u, ALERT_INDEX['gpu-usage']);
      var sGTemp  = AlertHelper.computeState(t, ALERT_INDEX['gpu-temp']);
      AlertHelper.assignState(gUsageEl, sGUsage);
      AlertHelper.assignState(gTempEl,  sGTemp);
      var usedDed = clamp(0.2 + 0.05 * u + rnd(-0.15, 0.15), 0.2, 6.0);
      var usedTot = clamp(usedDed + 0.02 * u + rnd(-0.2, 0.2), 0.3, 14.0);
      var pDed = Math.round((usedDed / 6.0) * 100);
      var pTot = Math.round((usedTot / 14.0) * 100);
      set(vramDedicatedEl, AlertHelper.fmtGB(usedDed) + "/" + AlertHelper.fmtGB(6.0) + " (" + pDed + "%)");
      set(vramTotalEl,    AlertHelper.fmtGB(usedTot) + "/" + AlertHelper.fmtGB(14.0) + " (" + pTot + "%)");
      var sVramDed = AlertHelper.computeState(usedDed, ALERT_INDEX['gpu-vramDedGB']);
      var sVramTot = AlertHelper.computeState(usedTot, ALERT_INDEX['gpu-vramTotGB']);
      AlertHelper.assignState(vramDedicatedEl, sVramDed);
      AlertHelper.assignState(vramTotalEl, sVramTot);

      // actualizar paths del gráfico (GPU)
      GraphHelper.push(ringGU, GraphHelper.normalize(u, 0, 100));
      GraphHelper.push(ringGC, GraphHelper.normalize(clockMhz, idleClock, boostClockMhz));
      GraphHelper.push(ringGT, GraphHelper.normalize(t, 28, 92));
      GraphHelper.push(ringV,  GraphHelper.normalize(usedDed, 0, 6.0));
      GraphHelper.push(ringS,  GraphHelper.normalize(usedTot, 0, 14.0));
      var dGU = GraphHelper.toPath(GraphHelper.values(ringGU), WG, HG, padTopG, padBottomG);
      var dGC = GraphHelper.toPath(GraphHelper.values(ringGC), WG, HG, padTopG, padBottomG);
      var dGT = GraphHelper.toPath(GraphHelper.values(ringGT), WG, HG, padTopG, padBottomG);
      var dV  = GraphHelper.toPath(GraphHelper.values(ringV),  WG, HG, padTopG, padBottomG);
      var dS  = GraphHelper.toPath(GraphHelper.values(ringS),  WG, HG, padTopG, padBottomG);
      if (pathGUsageEl) pathGUsageEl.setAttribute('d', dGU);
      if (pathGClockEl) pathGClockEl.setAttribute('d', dGC);
      if (pathGTempEl)  pathGTempEl.setAttribute('d', dGT);
      if (pathVramEl)   pathVramEl.setAttribute('d', dV);
      if (pathSramEl)   pathSramEl.setAttribute('d', dS);
    }, 1000);
  }

  // DISK: soporte estricto
  var MOCKS_ENABLED_DISK = (typeof window.MOCKS_ENABLED_DISK !== 'undefined') ? window.MOCKS_ENABLED_DISK : true;
  if (page === "DISK" && MOCKS_ENABLED_DISK !== false) {
    var pct = new Series(22, 10, 100, 4, { spikeChance: 0.10 });
    var latency = new Series(2.1, 0.5, 15.0, 0.4);
    var read = new Series(16.3, 0.0, 2048.0, 14.0); // KB/s
    var write = new Series(112.5, 0.0, 2048.0, 18.0); // KB/s

    var summaryElD = document.querySelector('[data-disk-sumary]');
    var dUsageEl   = document.querySelector('[data-field$="usagePct"]');
    var dLatencyEl = document.querySelector('[data-field="disk-latency"]');
    var dFreeEl    = document.querySelector('[data-field$="freePct"]');
    var readEl = document.querySelector('[data-field="disk-read"]');
    var writeEl = document.querySelector('[data-field="disk-write"]');

    // paths del gráfico (DISK): uso, latencia, lectura, escritura
    var pathDU = document.querySelector('path[data-series="disk-usage"]');
    var pathDL = document.querySelector('path[data-series="disk-latency"]');
    var pathDR = document.querySelector('path[data-series="disk-read"]');
    var pathDW = document.querySelector('path[data-series="disk-write"]');
    var ringDU = GraphHelper.createRing(50);
    var ringDL = GraphHelper.createRing(50);
    var ringDR = GraphHelper.createRing(50);
    var ringDW = GraphHelper.createRing(50);
    var WD = 100, HD = 60, padTopD = 2, padBottomD = 2;

    function normKBps(x){
      var min = 0.5, max = 2048.0; // KB/s
      var logMin = Math.log10(min), logMax = Math.log10(max);
      var v = (Math.log10(Math.max(min, Math.min(max, x))) - logMin) / (logMax - logMin);
      return Math.max(0, Math.min(1, v));
    }

    // CPU Info (bottom, 2x2): uptime HH:MM:SS, VCore y RPM CPU_FAN
    (function(){
      var root = sel('#cpu-info');
      if (!root) return;
      var elUptime = root.querySelector('[data-field="sys-uptime"]');
      var elVcore  = root.querySelector('[data-field="cpu-vcoreV"]');
      var elRPM    = root.querySelector('[data-field="cpu-coolerRPM"]');
      var startTs = Date.now();
      var vcoreS = new Series(1.10, 0.85, 1.45, 0.015, { spikeChance: 0.06 });
      var rpmS   = new Series(1200, 700, 2200, 30, { spikeChance: 0.10 });
      function fmtVolt(v){
        return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + " V";
      }
      function fmtRPM(x){
        return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(x)) + " RPM";
      }
      function fmtHHMMSS(ms){
        var total = Math.floor(ms / 1000);
        var h = Math.floor(total / 3600);
        var m = Math.floor((total % 3600) / 60);
        var s = total % 60;
        function pad(n){ return String(n).padStart(2, '0'); }
        return pad(h) + ":" + pad(m) + ":" + pad(s);
      }
      setInterval(function(){
        var now = Date.now();
        if (elUptime) set(elUptime, fmtHHMMSS(now - startTs));
        var v = vcoreS.next();
        var r = rpmS.next();
        if (elVcore) set(elVcore, fmtVolt(v));
        if (elRPM)   set(elRPM, fmtRPM(r));
      }, 1000);
    })();

    setInterval(function () {
      var p = Math.round(pct.next());
      var lat = latency.next();
      var fpct = 100 - p;
      set(dUsageEl, p + "%");
      set(dLatencyEl, new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(lat) + " ms");
      set(dFreeEl, fpct + "%");
    var sDU = AlertHelper.computeState(p, ALERT_INDEX['disk.usagePct']);
      var sDL = AlertHelper.computeState(lat, ALERT_INDEX['disk.latency']);
    var sDF = AlertHelper.computeState(fpct, ALERT_INDEX['disk.freePct']);
      AlertHelper.assignState(dUsageEl, sDU);
      AlertHelper.assignState(dLatencyEl, sDL);
      AlertHelper.assignState(dFreeEl, sDF);
      var r = read.next();
      var w = write.next();
      // solo valor, prefijos R:/W: están en el HTML
      set(readEl,  AlertHelper.fmtKBps(r));
      set(writeEl, AlertHelper.fmtKBps(w));
      AlertHelper.assignState(readEl,  AlertHelper.computeState(r, ALERT_INDEX['disk.readKBps']));
      AlertHelper.assignState(writeEl, AlertHelper.computeState(w, ALERT_INDEX['disk.writeKBps']));

      // actualizar paths del gráfico (DISK)
      GraphHelper.push(ringDU, GraphHelper.normalize(p, 0, 100));
      GraphHelper.push(ringDL, GraphHelper.normalize(lat, 0.5, 15.0));
      GraphHelper.push(ringDR, normKBps(r));
      GraphHelper.push(ringDW, normKBps(w));
      var dU = GraphHelper.toPath(GraphHelper.values(ringDU), WD, HD, padTopD, padBottomD);
      var dL = GraphHelper.toPath(GraphHelper.values(ringDL), WD, HD, padTopD, padBottomD);
      var dR = GraphHelper.toPath(GraphHelper.values(ringDR), WD, HD, padTopD, padBottomD);
      var dW = GraphHelper.toPath(GraphHelper.values(ringDW), WD, HD, padTopD, padBottomD);
      if (pathDU) pathDU.setAttribute('d', dU);
      if (pathDL) pathDL.setAttribute('d', dL);
      if (pathDR) pathDR.setAttribute('d', dR);
      if (pathDW) pathDW.setAttribute('d', dW);
    }, 1000);
  }

  if (page === "RAM" && window.MOCKS_ENABLED_RAM !== false) {
    var physUsed = new Series(10.2, 2.0, 16.0, 0.6, { spikeChance: 0.14 });
    var virtUsed = new Series(12.0, 2.0, 24.0, 0.8, { spikeChance: 0.12 });
    var cache = new Series(7.0, 0.5, 12.0, 0.5);

    var physEl = document.querySelector('[data-field="ram-phys"]');
    var virtEl = document.querySelector('[data-field="ram-virt"]');
    var cacheEl = document.querySelector('[data-field="ram-cache"]');

    // paths del gráfico (RAM): física, virtual, cache
    var pathPhysEl = document.querySelector('path[data-series="ram-phys"]');
    var pathVirtEl = document.querySelector('path[data-series="ram-virt"]');
    var pathCacheEl = document.querySelector('path[data-series="ram-cache"]');
    var ringRP = GraphHelper.createRing(50);
    var ringRV = GraphHelper.createRing(50);
    var ringRC = GraphHelper.createRing(50);
    var WR = 100, HR = 60, padTopR = 2, padBottomR = 2;

    setInterval(function () {
      var pu = physUsed.next();
      var ppct = Math.round((pu / 16.0) * 100);
      set(physEl, AlertHelper.fmtGB(pu) + "/" + AlertHelper.fmtGB(16.0) + " (" + ppct + "%)");

      var vu = virtUsed.next();
      var vpct = Math.round((vu / 24.0) * 100);
      set(virtEl, AlertHelper.fmtGB(vu) + "/" + AlertHelper.fmtGB(24.0) + " (" + vpct + "%)");

      var c = cache.next();
      set(cacheEl, AlertHelper.fmtGBorMB(c));

      // estados por física/virtual
      AlertHelper.assignState(physEl, AlertHelper.computeState(pu, ALERT_INDEX['ram-physGB']));
      AlertHelper.assignState(virtEl, AlertHelper.computeState(vu, ALERT_INDEX['ram-virtGB']));

      // actualizar paths del gráfico (RAM)
      GraphHelper.push(ringRP, GraphHelper.normalize(pu, 0, 16.0));
      GraphHelper.push(ringRV, GraphHelper.normalize(vu, 0, 24.0));
      GraphHelper.push(ringRC, GraphHelper.normalize(c,  0, 12.0));
      var dP = GraphHelper.toPath(GraphHelper.values(ringRP), WR, HR, padTopR, padBottomR);
      var dV = GraphHelper.toPath(GraphHelper.values(ringRV), WR, HR, padTopR, padBottomR);
      var dC = GraphHelper.toPath(GraphHelper.values(ringRC), WR, HR, padTopR, padBottomR);
      if (pathPhysEl)  pathPhysEl.setAttribute('d', dP);
      if (pathVirtEl)  pathVirtEl.setAttribute('d', dV);
      if (pathCacheEl) pathCacheEl.setAttribute('d', dC);
    }, 1000);
  }

  if (page === "DRIVERS" && window.MOCKS_ENABLED_DRIVERS !== false) {
    // Picos realistas: mínimo 16 Kbps, máximo 100 Mbps (100000 Kbps)
    var up = new Series(32.0, 16.0, 100000.0, 2000.0, { spikeChance: 0.12 });
    var down = new Series(64.0, 16.0, 100000.0, 2400.0, { spikeChance: 0.12 });

    var upEl = document.querySelector('[data-field="net-up"]');
    var downEl = document.querySelector('[data-field="net-down"]');

    // paths del gráfico (subida/bajada) usando data-series
    var pathUpEl = document.querySelector('path[data-series="net-up"]');
    var pathDownEl = document.querySelector('path[data-series="net-down"]');
    var ringUp = GraphHelper.createRing(50);
    var ringDown = GraphHelper.createRing(50);
    var Wn = 100, Hn = 60, padTopN = 2, padBottomN = 2;

    function normKbps(k){
      var min = 16.0, max = 100000.0;
      // escala logarítmica para comprimir rangos amplios
      var logMin = Math.log10(min), logMax = Math.log10(max);
      var v = (Math.log10(Math.max(min, Math.min(max, k))) - logMin) / (logMax - logMin);
      return Math.max(0, Math.min(1, v));
    }

    setInterval(function () {
      var u = up.next();
      var d = down.next();
      // solo valor, prefijos E:/R: están en el HTML
      set(upEl,   AlertHelper.fmtNetKbpsMbps(u));
      set(downEl, AlertHelper.fmtNetKbpsMbps(d));
      // estados por saturación relativa a capacidad
      AlertHelper.assignState(upEl,   AlertHelper.computeState(u, ALERT_INDEX['net-upKbps']));
      AlertHelper.assignState(downEl, AlertHelper.computeState(d, ALERT_INDEX['net-downKbps']));

      // actualizar paths del gráfico
      GraphHelper.push(ringUp,   normKbps(u));
      GraphHelper.push(ringDown, normKbps(d));
      var pathU = GraphHelper.toPath(GraphHelper.values(ringUp),   Wn, Hn, padTopN, padBottomN);
      var pathD = GraphHelper.toPath(GraphHelper.values(ringDown), Wn, Hn, padTopN, padBottomN);
      if (pathUpEl)   pathUpEl.setAttribute('d', pathU);
      if (pathDownEl) pathDownEl.setAttribute('d', pathD);
    }, 1000);
  }
  if ((page === "TOP" || page === "Top Procesos (Combinado)") && window.MOCKS_ENABLED_TOP !== false) {
    // Nombres estables por columna
    var CPU_NAMES = ["Trae", "svchost", "YouTube", "MsMpEng", "System"]; 
    var RAM_NAMES = ["Chrome", "Photoshop", "VMware", "YouTube", "System"]; 
    var IO_NAMES  = ["Trae", "ExitLag", "svchost", "System", "parsecd"]; 

    // Totales suavemente variables
    var cpuTotal = new Series(55, 10, 95, 6, { spikeChance: 0.10 }); // %
    var ramTotalGB = new Series(10.5, 2.0, 16.0, 0.5, { spikeChance: 0.12 }); // GB usados
    var ioTotalKbps = new Series(1500, 10, 120000, 1800, { spikeChance: 0.12 }); // Kbps agregados

    // Pesos por proceso (variación suave)
    function makeWeight(){ return new Series(1.0, 0.5, 1.6, 0.08); }
    var cpuW = CPU_NAMES.map(makeWeight);
    var ramW = RAM_NAMES.map(makeWeight);
    var ioW  = IO_NAMES.map(function(){ return new Series(1.0, 0.5, 1.6, 0.10); });

    function shares(total, weights) {
      var vals = weights.map(function(s){ return s.next(); });
      var sum = vals.reduce(function(a,b){ return a + b; }, 0) || 1;
      return vals.map(function(v){ return (total * v) / sum; });
    }

    function writeSorted(prefix, names, values, fmt, alertKey) {
      // compose, sort desc
      var items = names.map(function(n, i){ return { name: n, value: values[i] }; })
                       .sort(function(a,b){ return b.value - a.value; });
      for (var i = 0; i < items.length && i < 5; i++) {
        var nameEl = document.querySelector('[data-field="'+prefix+'.'+(i+1)+'.name"]');
        var valueEl = document.querySelector('[data-field="'+prefix+'.'+(i+1)+'.value"]');
        if (nameEl) nameEl.textContent = items[i].name;
        if (valueEl) {
          valueEl.textContent = fmt(items[i].value);
          if (alertKey && window.ALERT_INDEX && window.AlertHelper) {
            var state = AlertHelper.computeState(items[i].value, ALERT_INDEX[alertKey]);
            AlertHelper.assignState(valueEl, state);
          }
        }
      }
    }

    // Gráficas bajo TOP (CPU/RAM/IO) en COMBINADO: 5 series por columna
    // Selección de paths por columna (si existen)
    var cpuPaths = [
      document.querySelector('.top-graphs .tile-cpu .series-top-1'),
      document.querySelector('.top-graphs .tile-cpu .series-top-2'),
      document.querySelector('.top-graphs .tile-cpu .series-top-3'),
      document.querySelector('.top-graphs .tile-cpu .series-top-4'),
      document.querySelector('.top-graphs .tile-cpu .series-top-5')
    ];
    var ramPaths = [
      document.querySelector('.top-graphs .tile-mem .series-top-1'),
      document.querySelector('.top-graphs .tile-mem .series-top-2'),
      document.querySelector('.top-graphs .tile-mem .series-top-3'),
      document.querySelector('.top-graphs .tile-mem .series-top-4'),
      document.querySelector('.top-graphs .tile-mem .series-top-5')
    ];
    var ioPaths = [
      document.querySelector('.top-graphs .tile-disk .series-top-1'),
      document.querySelector('.top-graphs .tile-disk .series-top-2'),
      document.querySelector('.top-graphs .tile-disk .series-top-3'),
      document.querySelector('.top-graphs .tile-disk .series-top-4'),
      document.querySelector('.top-graphs .tile-disk .series-top-5')
    ];

    // Buffers por serie (50 puntos)
    var cpuRings = [GraphHelper.createRing(50), GraphHelper.createRing(50), GraphHelper.createRing(50), GraphHelper.createRing(50), GraphHelper.createRing(50)];
    var ramRings = [GraphHelper.createRing(50), GraphHelper.createRing(50), GraphHelper.createRing(50), GraphHelper.createRing(50), GraphHelper.createRing(50)];
    var ioRings  = [GraphHelper.createRing(50), GraphHelper.createRing(50), GraphHelper.createRing(50), GraphHelper.createRing(50), GraphHelper.createRing(50)];
    var WT = 100, HT = 60, padTopT = 2, padBottomT = 2;

    function normKbpsTop(k){
      var min = 16.0, max = 100000.0;
      var logMin = Math.log10(min), logMax = Math.log10(max);
      var v = (Math.log10(Math.max(min, Math.min(max, k))) - logMin) / (logMax - logMin);
      return Math.max(0, Math.min(1, v));
    }

    setInterval(function(){
      var cpuVals = shares(cpuTotal.next(), cpuW);
      var ramVals = shares(ramTotalGB.next(), ramW);
      var ioVals  = shares(ioTotalKbps.next(), ioW);
      writeSorted('top-cpu', CPU_NAMES, cpuVals, function(v){ return Math.round(v) + '%'; }, 'cpu-usage');
      writeSorted('top-ram', RAM_NAMES, ramVals, AlertHelper.fmtGBorMB, 'ram-physGB');
      writeSorted('top-io',  IO_NAMES,  ioVals,  AlertHelper.fmtNetKbpsMbps, 'disk-readKBps');

      // Actualizar paths de las 5 series por columna
      for (var i = 0; i < 5; i++) {
        // CPU: porcentaje 0-100
        GraphHelper.push(cpuRings[i], GraphHelper.normalize(cpuVals[i] || 0, 0, 100));
        var dC = GraphHelper.toPath(GraphHelper.values(cpuRings[i]), WT, HT, padTopT, padBottomT);
        if (cpuPaths[i]) cpuPaths[i].setAttribute('d', dC);

        // RAM: GB normalizado a 0-16
        GraphHelper.push(ramRings[i], GraphHelper.normalize(ramVals[i] || 0, 0, 16.0));
        var dR = GraphHelper.toPath(GraphHelper.values(ramRings[i]), WT, HT, padTopT, padBottomT);
        if (ramPaths[i]) ramPaths[i].setAttribute('d', dR);

        // IO: Kbps en escala logarítmica
        GraphHelper.push(ioRings[i], normKbpsTop(ioVals[i] || 0));
        var dI = GraphHelper.toPath(GraphHelper.values(ioRings[i]), WT, HT, padTopT, padBottomT);
        if (ioPaths[i]) ioPaths[i].setAttribute('d', dI);
      }
    }, 1000);
  }

  // Modo COMBINADO: alimentar tiles CPU/RAM/GPU/DISK0/DISK1/Ethernet
  if ((page === "Panel Combinado" || page === "Top Procesos (Combinado)") && window.MOCKS_ENABLED_COMBINADO !== false) {
    function sel(q){ return document.querySelector(q); }

    // CPU (scoped a #cpu)
    (function(){
      var baseClock = 3.60, boostClock = 4.00, ambient = 32;
      var cpuUsage = new Series(20, 1, 100, 4, { spikeChance: 0.08 });
      var processCount = new Series(188, 150, 260, 6);
      var subProcessCount = new Series(4122, 3000, 7000, 120);

      var usageEl = sel('#cpu [data-field="cpu-usage"]');
      var clockEl = sel('#cpu [data-field="cpu-clock"]');
      var tempEl  = sel('#cpu [data-field="cpu-temp"]');
      var procEl = sel('#cpu [data-field="cpu-process"]');
      var subProcEl = sel('#cpu [data-field="cpu-subprocess"]');
    var pathUsageEl = sel('#cpu svg path[data-series="cpu-usage"]');
    var pathClockEl = sel('#cpu svg path[data-series="cpu-clock"]');
    var pathTempEl  = sel('#cpu svg path[data-series="cpu-temp"]');
      var ringU = GraphHelper.createRing(50);
      var ringF = GraphHelper.createRing(50);
      var ringT = GraphHelper.createRing(50);
      var W = 176, H = 60, padTop = 2, padBottom = 2;

      setInterval(function(){
        var u = cpuUsage.next();
        var f = easeUsage(u);
        var clock = clamp(baseClock + (boostClock - baseClock) * f + rnd(-0.05, 0.05), baseClock, boostClock);
        var t = clamp(ambient + 0.45 * u + 4 * (clock - baseClock) + rnd(-1.5, 1.5), 30, 95);
        set(usageEl, fmtPercent(u));
        set(clockEl, AlertHelper.fmtGHz(clock));
        set(tempEl,  fmtC(t));
        if (procEl)    set(procEl, "Process: " + Math.round(processCount.next()));
        if (subProcEl) set(subProcEl, "SubProcess: " + Math.round(subProcessCount.next()));
        AlertHelper.assignState(usageEl, AlertHelper.computeState(u, ALERT_INDEX['cpu-usage']));
        AlertHelper.assignState(tempEl,  AlertHelper.computeState(t, ALERT_INDEX['cpu-temp']));
        GraphHelper.push(ringU, GraphHelper.normalize(u, 0, 100));
        GraphHelper.push(ringF, GraphHelper.normalize(clock, baseClock, boostClock));
        GraphHelper.push(ringT, GraphHelper.normalize(t, 30, 95));
        var dU = GraphHelper.toPath(GraphHelper.values(ringU), W, H, padTop, padBottom);
        var dF = GraphHelper.toPath(GraphHelper.values(ringF), W, H, padTop, padBottom);
        var dT = GraphHelper.toPath(GraphHelper.values(ringT), W, H, padTop, padBottom);
        if (pathUsageEl) pathUsageEl.setAttribute('d', dU);
        if (pathClockEl) pathClockEl.setAttribute('d', dF);
        if (pathTempEl)  pathTempEl.setAttribute('d', dT);
      }, 1000);
    })();

    // RAM (scoped a #ram)
    (function(){
      var physUsed = new Series(10.2, 2.0, 16.0, 0.6, { spikeChance: 0.14 });
      var virtUsed = new Series(12.0, 2.0, 24.0, 0.8, { spikeChance: 0.12 });
      var cache = new Series(7.0, 0.5, 12.0, 0.5);
      var physEl = sel('#ram [data-field="mem-phys"]');
      var virtEl = sel('#ram [data-field="mem-virt"]');
      var cacheEl = sel('#ram [data-field="mem-cache"]');
    var pathPhysEl = sel('#ram svg path[data-series="mem-phys"]');
    var pathVirtEl = sel('#ram svg path[data-series="mem-virt"]');
    var pathCacheEl = sel('#ram svg path[data-series="mem-cache"]');
      var ringRP = GraphHelper.createRing(50);
      var ringRV = GraphHelper.createRing(50);
      var ringRC = GraphHelper.createRing(50);
      var W = 100, H = 60, padTop = 2, padBottom = 2;
      setInterval(function(){
        var pu = physUsed.next();
        var ppct = Math.round((pu / 16.0) * 100);
        set(physEl, AlertHelper.fmtGB(pu) + "/" + AlertHelper.fmtGB(16.0) + " (" + ppct + "%)");
        var vu = virtUsed.next();
        var vpct = Math.round((vu / 24.0) * 100);
        set(virtEl, AlertHelper.fmtGB(vu) + "/" + AlertHelper.fmtGB(24.0) + " (" + vpct + "%)");
        var c = cache.next();
        set(cacheEl, AlertHelper.fmtGBorMB(c));
        AlertHelper.assignState(physEl, AlertHelper.computeState(pu, ALERT_INDEX['mem-physGB']));
        AlertHelper.assignState(virtEl, AlertHelper.computeState(vu, ALERT_INDEX['mem-virtGB']));
        GraphHelper.push(ringRP, GraphHelper.normalize(pu, 0, 16.0));
        GraphHelper.push(ringRV, GraphHelper.normalize(vu, 0, 24.0));
        GraphHelper.push(ringRC, GraphHelper.normalize(c,  0, 12.0));
        var dP = GraphHelper.toPath(GraphHelper.values(ringRP), W, H, padTop, padBottom);
        var dV = GraphHelper.toPath(GraphHelper.values(ringRV), W, H, padTop, padBottom);
        var dC = GraphHelper.toPath(GraphHelper.values(ringRC), W, H, padTop, padBottom);
        if (pathPhysEl)  pathPhysEl.setAttribute('d', dP);
        if (pathVirtEl)  pathVirtEl.setAttribute('d', dV);
        if (pathCacheEl) pathCacheEl.setAttribute('d', dC);
      }, 1000);
    })();

    // GPU (scoped a #gpu)
    (function(){
      var gpuUsage = new Series(20, 1, 100, 5, { spikeChance: 0.12 });
      var idleClock = 300, boostClockMhz = 1785, ambientG = 30;
      var vramUsedDedicated = new Series(1.0, 0.2, 6.0, 0.25);
      var vramUsedTotal = new Series(1.0, 0.2, 14.0, 0.35);
      var gUsageEl = sel('#gpu [data-field="gpu-usage"]');
      var gClockEl = sel('#gpu [data-field="gpu-clock"]');
      var gTempEl  = sel('#gpu [data-field="gpu-temp"]');
      var vramDedicatedEl = sel('#gpu [data-field="gpu-vramDedicated"]');
      var vramTotalEl = sel('#gpu [data-field="gpu-vramTotal"]');
    var pathGUsageEl = sel('#gpu svg path[data-series="gpu-usage"]');
    var pathGClockEl = sel('#gpu svg path[data-series="gpu-clock"]');
    var pathGTempEl  = sel('#gpu svg path[data-series="gpu-temp"]');
    var pathVramEl   = sel('#gpu svg path[data-series="gpu-vram"]');
    var pathSramEl   = sel('#gpu svg path[data-series="gpu-vram-shared"]');
      var ringGU = GraphHelper.createRing(50);
      var ringGC = GraphHelper.createRing(50);
      var ringGT = GraphHelper.createRing(50);
      var ringV  = GraphHelper.createRing(50);
      var ringS  = GraphHelper.createRing(50);
      var W = 100, H = 60, padTop = 2, padBottom = 2;
      setInterval(function(){
        var u = gpuUsage.next();
        var f = easeUsage(u);
        var clockMhz = clamp(idleClock + (boostClockMhz - idleClock) * f + rnd(-30, 30), idleClock, boostClockMhz);
        var t = clamp(ambientG + 0.50 * u + 5 * f + rnd(-1.5, 1.5), 28, 92);
        set(gUsageEl, Math.round(u) + "%");
        set(gClockEl, Math.round(clockMhz) + " MHz");
        set(gTempEl,  fmtC(t));
        AlertHelper.assignState(gUsageEl, AlertHelper.computeState(u, ALERT_INDEX['gpu-usage']));
        AlertHelper.assignState(gTempEl,  AlertHelper.computeState(t, ALERT_INDEX['gpu-temp']));
        var usedDed = clamp(0.2 + 0.05 * u + rnd(-0.15, 0.15), 0.2, 6.0);
        var usedTot = clamp(usedDed + 0.02 * u + rnd(-0.2, 0.2), 0.3, 14.0);
        var pDed = Math.round((usedDed / 6.0) * 100);
        var pTot = Math.round((usedTot / 14.0) * 100);
        set(vramDedicatedEl, AlertHelper.fmtGB(usedDed) + "/" + AlertHelper.fmtGB(6.0) + " (" + pDed + "%)");
        set(vramTotalEl,    AlertHelper.fmtGB(usedTot) + "/" + AlertHelper.fmtGB(14.0) + " (" + pTot + "%)");
        AlertHelper.assignState(vramDedicatedEl, AlertHelper.computeState(usedDed, ALERT_INDEX['gpu-vramDedGB']));
        AlertHelper.assignState(vramTotalEl,    AlertHelper.computeState(usedTot, ALERT_INDEX['gpu-vramTotGB']));
        GraphHelper.push(ringGU, GraphHelper.normalize(u, 0, 100));
        GraphHelper.push(ringGC, GraphHelper.normalize(clockMhz, idleClock, boostClockMhz));
        GraphHelper.push(ringGT, GraphHelper.normalize(t, 28, 92));
        GraphHelper.push(ringV,  GraphHelper.normalize(usedDed, 0, 6.0));
        GraphHelper.push(ringS,  GraphHelper.normalize(usedTot, 0, 14.0));
        var dGU = GraphHelper.toPath(GraphHelper.values(ringGU), W, H, padTop, padBottom);
        var dGC = GraphHelper.toPath(GraphHelper.values(ringGC), W, H, padTop, padBottom);
        var dGT = GraphHelper.toPath(GraphHelper.values(ringGT), W, H, padTop, padBottom);
        var dV  = GraphHelper.toPath(GraphHelper.values(ringV),  W, H, padTop, padBottom);
        var dS  = GraphHelper.toPath(GraphHelper.values(ringS),  W, H, padTop, padBottom);
        if (pathGUsageEl) pathGUsageEl.setAttribute('d', dGU);
        if (pathGClockEl) pathGClockEl.setAttribute('d', dGC);
        if (pathGTempEl)  pathGTempEl.setAttribute('d', dGT);
        if (pathVramEl)   pathVramEl.setAttribute('d', dV);
        if (pathSramEl)   pathSramEl.setAttribute('d', dS);
      }, 1000);
    })();

    // DISK helper (scoped a #diskX)
    function attachDisk(rootSel){
      var pct = new Series(22, 10, 100, 4, { spikeChance: 0.10 });
      var latency = new Series(2.1, 0.5, 15.0, 0.4);
      var read = new Series(16.3, 0.0, 2048.0, 14.0); // KB/s
      var write = new Series(112.5, 0.0, 2048.0, 18.0); // KB/s
      var dUsageEl   = sel(rootSel + ' [data-field="disk-usagePct"]');
      var dLatencyEl = sel(rootSel + ' [data-field="disk-latency"]');
      var dFreeEl    = sel(rootSel + ' [data-field="disk-freePct"]');
      var readEl     = sel(rootSel + ' [data-field="disk-read"]');
      var writeEl    = sel(rootSel + ' [data-field="disk-write"]');
    var pathDU = sel(rootSel + ' svg path[data-series="disk-usage"]');
    var pathDL = sel(rootSel + ' svg path[data-series="disk-latency"]');
    var pathDR = sel(rootSel + ' svg path[data-series="disk-read"]');
    var pathDW = sel(rootSel + ' svg path[data-series="disk-write"]');
      var ringDU = GraphHelper.createRing(50);
      var ringDL = GraphHelper.createRing(50);
      var ringDR = GraphHelper.createRing(50);
      var ringDW = GraphHelper.createRing(50);
      var W = 100, H = 60, padTop = 2, padBottom = 2;
      function normKBps(x){
        var min = 0.5, max = 2048.0;
        var logMin = Math.log10(min), logMax = Math.log10(max);
        var v = (Math.log10(Math.max(min, Math.min(max, x))) - logMin) / (logMax - logMin);
        return Math.max(0, Math.min(1, v));
      }
      setInterval(function(){
        var p = Math.round(pct.next());
        var lat = latency.next();
        var fpct = 100 - p;
        set(dUsageEl, p + "%");
        set(dLatencyEl, new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(lat) + " ms");
        set(dFreeEl, fpct + "%");
        AlertHelper.assignState(dUsageEl,  AlertHelper.computeState(p, ALERT_INDEX['disk-usagePct']));
        AlertHelper.assignState(dLatencyEl,AlertHelper.computeState(lat, ALERT_INDEX['disk-latency']));
        AlertHelper.assignState(dFreeEl,   AlertHelper.computeState(fpct, ALERT_INDEX['disk-freePct']));
        var r = read.next();
        var w = write.next();
        set(readEl,  AlertHelper.fmtKBps(r));
        set(writeEl, AlertHelper.fmtKBps(w));
        AlertHelper.assignState(readEl,  AlertHelper.computeState(r, ALERT_INDEX['disk-readKBps']));
        AlertHelper.assignState(writeEl, AlertHelper.computeState(w, ALERT_INDEX['disk-writeKBps']));
        GraphHelper.push(ringDU, GraphHelper.normalize(p, 0, 100));
        GraphHelper.push(ringDL, GraphHelper.normalize(lat, 0.5, 15.0));
        GraphHelper.push(ringDR, normKBps(r));
        GraphHelper.push(ringDW, normKBps(w));
        var dU = GraphHelper.toPath(GraphHelper.values(ringDU), W, H, padTop, padBottom);
        var dL = GraphHelper.toPath(GraphHelper.values(ringDL), W, H, padTop, padBottom);
        var dR = GraphHelper.toPath(GraphHelper.values(ringDR), W, H, padTop, padBottom);
        var dW = GraphHelper.toPath(GraphHelper.values(ringDW), W, H, padTop, padBottom);
        if (pathDU) pathDU.setAttribute('d', dU);
        if (pathDL) pathDL.setAttribute('d', dL);
        if (pathDR) pathDR.setAttribute('d', dR);
        if (pathDW) pathDW.setAttribute('d', dW);
      }, 1000);
    }

    // CPU por hilo (16 LPs), grilla 2x8 en panel derecho
    (function(){
      var root = sel('#cpu-lp-grid');
      if (!root) return; // si no existe el contenedor, salimos
      var N = 16;
      var series = new Array(N);
      var rings  = new Array(N);
      var paths  = new Array(N);
      for (var i = 0; i < N; i++){
        series[i] = new Series(20 + Math.random() * 6, 1, 100, 4, { spikeChance: 0.08 });
        rings[i]  = GraphHelper.createRing(50);
        paths[i]  = root.querySelector('path[data-lp-index="' + (i+1) + '"]');
      }
      // Detectar tamaño lógico del primer SVG por viewBox (fallback a 176x60)
      var sampleSvg = root.querySelector('svg');
      var size = GraphHelper.getSVGSize(sampleSvg);
      var W = (size && size.width)  || 176;
      var H = (size && size.height) || 60;
      // Alinear la curva exactamente al recuadro: sin padding horizontal
      var padTop = 2, padBottom = 2, padLeft = 0, padRight = 0;
      setInterval(function(){
        for (var i = 0; i < N; i++){
          var u = series[i].next();
          GraphHelper.push(rings[i], GraphHelper.normalize(u, 0, 100));
          var d = GraphHelper.toPath(GraphHelper.values(rings[i]), W, H, padTop, padBottom, padLeft, padRight);
          var p = paths[i];
          if (p) p.setAttribute('d', d);
        }
      }, 1000);
    })();
  attachDisk('#disk0');
  attachDisk('#disk1');

    // Ethernet (scoped a #drivers)
    (function(){
      var up = new Series(32.0, 16.0, 100000.0, 2000.0, { spikeChance: 0.12 });
      var down = new Series(64.0, 16.0, 100000.0, 2400.0, { spikeChance: 0.12 });
      var upEl = sel('#drivers [data-field="net-up"]');
      var downEl = sel('#drivers [data-field="net-down"]');
      var pingEl = sel('#drivers [data-field="net-ping"]');
      var pubEl = sel('#drivers [data-field="net-ipPublic"]');
      var totUpEl = sel('#drivers [data-field="net-totalUp"]');
      var totDownEl = sel('#drivers [data-field="net-totalDown"]');
      var pathUpEl = sel('#drivers svg path[data-series="net-up"]');
      var pathDownEl = sel('#drivers svg path[data-series="net-down"]');
      var ringUp = GraphHelper.createRing(50);
      var ringDown = GraphHelper.createRing(50);
      var W = 100, H = 60, padTop = 2, padBottom = 2;
      function normKbps(k){
        var min = 16.0, max = 100000.0;
        var logMin = Math.log10(min), logMax = Math.log10(max);
        var v = (Math.log10(Math.max(min, Math.min(max, k))) - logMin) / (logMax - logMin);
        return Math.max(0, Math.min(1, v));
      }
      var ping = new Series(5, 1, 80, 2.5);
      var totUp = new Series(28.3, 0.0, 900.0, 0.2);
      var totDown = new Series(228.7, 0.0, 9000.0, 0.45);
      setInterval(function(){
        var u = up.next();
        var d = down.next();
        set(upEl,   AlertHelper.fmtNetKbpsMbps(u));
        set(downEl, AlertHelper.fmtNetKbpsMbps(d));
        if (pingEl)    set(pingEl, Math.round(ping.next()) + ' ms');
        if (pubEl)     set(pubEl, '190.175.3.118');
        if (totUpEl)   set(totUpEl, AlertHelper.fmtGB(totUp.next()));
        if (totDownEl) set(totDownEl, AlertHelper.fmtGB(totDown.next()));
        AlertHelper.assignState(upEl,   AlertHelper.computeState(u, ALERT_INDEX['net-upKbps']));
        AlertHelper.assignState(downEl, AlertHelper.computeState(d, ALERT_INDEX['net-downKbps']));
        GraphHelper.push(ringUp,   normKbps(u));
        GraphHelper.push(ringDown, normKbps(d));
        var dU = GraphHelper.toPath(GraphHelper.values(ringUp),   W, H, padTop, padBottom);
        var dD = GraphHelper.toPath(GraphHelper.values(ringDown), W, H, padTop, padBottom);
        if (pathUpEl)   pathUpEl.setAttribute('d', dU);
        if (pathDownEl) pathDownEl.setAttribute('d', dD);
      }, 1000);
    })();

  // DISK: panel derecho (DISK0/DISK1: Usage, Latency, Read, Write)
    (function(){
      var root = sel('#disk-right');
      if (!root) return;
  // Campos de texto para DISK0
      var text0Usage   = root.closest('.right-panel')?.querySelector('[data-field="disk-0-right-usage"]');
      var text0Latency = root.closest('.right-panel')?.querySelector('[data-field="disk-0-right-latency"]');
      var text0Read    = root.closest('.right-panel')?.querySelector('[data-field="disk-0-right-read"]');
      var text0Write   = root.closest('.right-panel')?.querySelector('[data-field="disk-0-right-write"]');
  // Campos de texto para DISK1
      var text1Usage   = root.closest('.right-panel')?.querySelector('[data-field="disk-1-right-usage"]');
      var text1Latency = root.closest('.right-panel')?.querySelector('[data-field="disk-1-right-latency"]');
      var text1Read    = root.closest('.right-panel')?.querySelector('[data-field="disk-1-right-read"]');
      var text1Write   = root.closest('.right-panel')?.querySelector('[data-field="disk-1-right-write"]');
  // Paths por serie DISK0
  var p0U = root.querySelector('path[data-disk-right="disk-0-usage"]');
  var p0L = root.querySelector('path[data-disk-right="disk-0-latency"]');
  var p0R = root.querySelector('path[data-disk-right="disk-0-read"]');
  var p0W = root.querySelector('path[data-disk-right="disk-0-write"]');
  // Paths por serie DISK1
  var p1U = root.querySelector('path[data-disk-right="disk-1-usage"]');
  var p1L = root.querySelector('path[data-disk-right="disk-1-latency"]');
  var p1R = root.querySelector('path[data-disk-right="disk-1-read"]');
  var p1W = root.querySelector('path[data-disk-right="disk-1-write"]');
      function getSizeForPath(p){ var svg = p && p.closest('svg'); var s = svg ? GraphHelper.getSVGSize(svg) : {width:178,height:110}; return s; }
      var padTop = 2, padBottom = 2, padLeft = 0, padRight = 0;
      // Series simuladas (basadas en attachDisk)
      var pct0 = new Series(22, 10, 100, 4, { spikeChance: 0.10 });
      var lat0 = new Series(2.1, 0.5, 15.0, 0.4);
      var read0 = new Series(16.3, 0.0, 2048.0, 14.0);
      var write0 = new Series(112.5, 0.0, 2048.0, 18.0);
      var pct1 = new Series(24, 8, 100, 4.5, { spikeChance: 0.10 });
      var lat1 = new Series(2.4, 0.5, 15.0, 0.5);
      var read1 = new Series(12.0, 0.0, 2048.0, 12.0);
      var write1 = new Series(96.0, 0.0, 2048.0, 16.0);
      // Buffers (rings) por serie
      var r0U = GraphHelper.createRing(50), r0L = GraphHelper.createRing(50), r0R = GraphHelper.createRing(50), r0W = GraphHelper.createRing(50);
      var r1U = GraphHelper.createRing(50), r1L = GraphHelper.createRing(50), r1R = GraphHelper.createRing(50), r1W = GraphHelper.createRing(50);
      function normKBps(x){
        var min = 0.5, max = 2048.0;
        var logMin = Math.log10(min), logMax = Math.log10(max);
        var v = (Math.log10(Math.max(min, Math.min(max, x))) - logMin) / (logMax - logMin);
        return Math.max(0, Math.min(1, v));
      }
      setInterval(function(){
  // DISK0 valores
        var p0 = Math.round(pct0.next());
        var l0 = lat0.next();
        var rd0 = read0.next();
        var wr0 = write0.next();
  // DISK1 valores
        var p1 = Math.round(pct1.next());
        var l1 = lat1.next();
        var rd1 = read1.next();
        var wr1 = write1.next();
  // Textos + estados DISK0
        if (text0Usage){ set(text0Usage, p0 + '%'); AlertHelper.assignState(text0Usage, AlertHelper.computeState(p0, ALERT_INDEX['disk-usagePct'])); }
        if (text0Latency){ set(text0Latency, AlertHelper.fmtMs(l0, 1)); AlertHelper.assignState(text0Latency, AlertHelper.computeState(l0, ALERT_INDEX['disk-0-latency'] || ALERT_INDEX['disk-latency'])); }
        if (text0Read){ set(text0Read, AlertHelper.fmtKBps(rd0)); AlertHelper.assignState(text0Read, AlertHelper.computeState(rd0, ALERT_INDEX['disk-0-readKBps'] || ALERT_INDEX['disk-readKBps'])); }
        if (text0Write){ set(text0Write, AlertHelper.fmtKBps(wr0)); AlertHelper.assignState(text0Write, AlertHelper.computeState(wr0, ALERT_INDEX['disk-0-writeKBps'] || ALERT_INDEX['disk-writeKBps'])); }
  // Textos + estados DISK1
        if (text1Usage){ set(text1Usage, p1 + '%'); AlertHelper.assignState(text1Usage, AlertHelper.computeState(p1, ALERT_INDEX['disk-usagePct'])); }
        if (text1Latency){ set(text1Latency, AlertHelper.fmtMs(l1, 1)); AlertHelper.assignState(text1Latency, AlertHelper.computeState(l1, ALERT_INDEX['disk-1-latency'] || ALERT_INDEX['disk-latency'])); }
        if (text1Read){ set(text1Read, AlertHelper.fmtKBps(rd1)); AlertHelper.assignState(text1Read, AlertHelper.computeState(rd1, ALERT_INDEX['disk-1-readKBps'] || ALERT_INDEX['disk-readKBps'])); }
        if (text1Write){ set(text1Write, AlertHelper.fmtKBps(wr1)); AlertHelper.assignState(text1Write, AlertHelper.computeState(wr1, ALERT_INDEX['disk-1-writeKBps'] || ALERT_INDEX['disk-writeKBps'])); }
        // Empujar buffers
        GraphHelper.push(r0U, GraphHelper.normalize(p0, 0, 100));
        GraphHelper.push(r0L, GraphHelper.normalize(l0, 0.5, 15.0));
        GraphHelper.push(r0R, normKBps(rd0));
        GraphHelper.push(r0W, normKBps(wr0));
        GraphHelper.push(r1U, GraphHelper.normalize(p1, 0, 100));
        GraphHelper.push(r1L, GraphHelper.normalize(l1, 0.5, 15.0));
        GraphHelper.push(r1R, normKBps(rd1));
        GraphHelper.push(r1W, normKBps(wr1));
  // Trazar curvas DISK0 con tamaño propio del SVG
        if (p0U){ var s0U = getSizeForPath(p0U); var d0U = GraphHelper.toPath(GraphHelper.values(r0U), s0U.width, s0U.height, padTop, padBottom, padLeft, padRight); p0U.setAttribute('d', d0U); }
        if (p0L){ var s0L = getSizeForPath(p0L); var d0L = GraphHelper.toPath(GraphHelper.values(r0L), s0L.width, s0L.height, padTop, padBottom, padLeft, padRight); p0L.setAttribute('d', d0L); }
        if (p0R){ var s0R = getSizeForPath(p0R); var d0R = GraphHelper.toPath(GraphHelper.values(r0R), s0R.width, s0R.height, padTop, padBottom, padLeft, padRight); p0R.setAttribute('d', d0R); }
        if (p0W){ var s0W = getSizeForPath(p0W); var d0W = GraphHelper.toPath(GraphHelper.values(r0W), s0W.width, s0W.height, padTop, padBottom, padLeft, padRight); p0W.setAttribute('d', d0W); }
  // Trazar curvas DISK1
        if (p1U){ var s1U = getSizeForPath(p1U); var d1U = GraphHelper.toPath(GraphHelper.values(r1U), s1U.width, s1U.height, padTop, padBottom, padLeft, padRight); p1U.setAttribute('d', d1U); }
        if (p1L){ var s1L = getSizeForPath(p1L); var d1L = GraphHelper.toPath(GraphHelper.values(r1L), s1L.width, s1L.height, padTop, padBottom, padLeft, padRight); p1L.setAttribute('d', d1L); }
        if (p1R){ var s1R = getSizeForPath(p1R); var d1R = GraphHelper.toPath(GraphHelper.values(r1R), s1R.width, s1R.height, padTop, padBottom, padLeft, padRight); p1R.setAttribute('d', d1R); }
        if (p1W){ var s1W = getSizeForPath(p1W); var d1W = GraphHelper.toPath(GraphHelper.values(r1W), s1W.width, s1W.height, padTop, padBottom, padLeft, padRight); p1W.setAttribute('d', d1W); }
      }, 1000);
    })();

    // RAM: panel derecho (multigráfica RAM/Virt/Swap/Cache)
    (function(){
      var root = sel('#ram-right');
      if (!root) return;
      // Campos de texto bajo las gráficas
      var textPhysRight  = root.closest('.right-panel')?.querySelector('[data-field="mem-right-phys"]');
      var textVirtRight  = root.closest('.right-panel')?.querySelector('[data-field="mem-right-virt"]');
      var textSwapRight  = root.closest('.right-panel')?.querySelector('[data-field="mem-right-swap"]');
      var textCacheRight = root.closest('.right-panel')?.querySelector('[data-field="mem-right-cache"]');
      var pathPhysRight  = root.querySelector('path[data-ram-right="phys"]');
      var pathVirtRight  = root.querySelector('path[data-ram-right="virt"]');
      var pathSwapRight  = root.querySelector('path[data-ram-right="swap"]');
      var pathCacheRight = root.querySelector('path[data-ram-right="cache"]');
      function getSizeForPath(p){ var svg = p && p.closest('svg'); var s = svg ? GraphHelper.getSVGSize(svg) : {width:178,height:110}; return s; }
      var padTop = 2, padBottom = 2, padLeft = 0, padRight = 0;
      // Series simuladas (valores base aproximados)
      var physUsed  = new Series(10.2, 2.0, 16.0, 0.6,  { spikeChance: 0.14 });
      var virtUsed  = new Series(13.8, 4.0, 24.0, 0.45, { spikeChance: 0.10 });
      var swapUsed  = new Series( 1.2, 0.0,  8.0, 0.30, { spikeChance: 0.08 });
      var cacheUsed = new Series( 7.4, 1.0, 12.0, 0.35, { spikeChance: 0.12 });
      // Buffers independientes
      var ringPhys  = GraphHelper.createRing(50);
      var ringVirt  = GraphHelper.createRing(50);
      var ringSwap  = GraphHelper.createRing(50);
      var ringCache = GraphHelper.createRing(50);
      setInterval(function(){
        // Empujar valores normalizados por cada rango
        var pu = physUsed.next();
        var vu = virtUsed.next();
        var su = swapUsed.next();
        var cu = cacheUsed.next();
        // Poblar textos resumen (similar al panel izquierdo)
        if (textPhysRight) {
          var ppct = Math.round((pu / 16.0) * 100);
          set(textPhysRight, AlertHelper.fmtGB(pu) + "/" + AlertHelper.fmtGB(16.0) + " (" + ppct + "%)");
          AlertHelper.assignState(textPhysRight, AlertHelper.computeState(pu, ALERT_INDEX['ram-physGB']));
        }
        if (textVirtRight) {
          var vpct = Math.round((vu / 24.0) * 100);
          set(textVirtRight, AlertHelper.fmtGB(vu) + "/" + AlertHelper.fmtGB(24.0) + " (" + vpct + "%)");
          AlertHelper.assignState(textVirtRight, AlertHelper.computeState(vu, ALERT_INDEX['ram-virtGB']));
        }
        if (textSwapRight) {
          var spct = Math.round((su / 8.0) * 100);
          set(textSwapRight, AlertHelper.fmtGB(su) + "/" + AlertHelper.fmtGB(8.0) + " (" + spct + "%)");
        }
        if (textCacheRight) {
          set(textCacheRight, AlertHelper.fmtGBorMB(cu));
        }
        GraphHelper.push(ringPhys,  GraphHelper.normalize(pu, 0, 16.0));
        GraphHelper.push(ringVirt,  GraphHelper.normalize(vu, 0, 24.0));
        GraphHelper.push(ringSwap,  GraphHelper.normalize(su, 0,  8.0));
        GraphHelper.push(ringCache, GraphHelper.normalize(cu, 0, 12.0));
        // Generar paths usando tamaño lógico de su propio SVG
        if (pathPhysRight){
          var sP = getSizeForPath(pathPhysRight);
          var dP = GraphHelper.toPath(GraphHelper.values(ringPhys), sP.width, sP.height, padTop, padBottom, padLeft, padRight);
          pathPhysRight.setAttribute('d', dP);
        }
        if (pathVirtRight){
          var sV = getSizeForPath(pathVirtRight);
          var dV = GraphHelper.toPath(GraphHelper.values(ringVirt), sV.width, sV.height, padTop, padBottom, padLeft, padRight);
          pathVirtRight.setAttribute('d', dV);
        }
        if (pathSwapRight){
          var sS = getSizeForPath(pathSwapRight);
          var dS = GraphHelper.toPath(GraphHelper.values(ringSwap), sS.width, sS.height, padTop, padBottom, padLeft, padRight);
          pathSwapRight.setAttribute('d', dS);
        }
        if (pathCacheRight){
          var sC = getSizeForPath(pathCacheRight);
          var dC = GraphHelper.toPath(GraphHelper.values(ringCache), sC.width, sC.height, padTop, padBottom, padLeft, padRight);
          pathCacheRight.setAttribute('d', dC);
        }
      }, 1000);
    })();

    // GPU: panel derecho (Usage, Clock, Temp, VRAM dedicada, VRAM total, VCore)
    (function(){
      var root = sel('#gpu-right');
      if (!root) return;
      // Campos de texto bajo las gráficas y extras
      var textUsageRight = root.closest('.right-panel')?.querySelector('[data-field="gpu-right-usage"]');
      var textTempRight  = root.closest('.right-panel')?.querySelector('[data-field="gpu-right-temp"]');
      var textClockRight = root.closest('.right-panel')?.querySelector('[data-field="gpu-right-clock"]');
      var textVcoreRight = root.closest('.right-panel')?.querySelector('[data-field="gpu-right-vcoreV"]');
      var textFanRPM     = root.closest('.right-panel')?.querySelector('[data-field="gpu-right-fanRPM"]');
      var textVramClock  = root.closest('.right-panel')?.querySelector('[data-field="gpu-right-vramClockMHz"]');
      var textVramDed    = root.closest('.right-panel')?.querySelector('[data-field="gpu-right-vramDedicated"]');
      var textVramTot    = root.closest('.right-panel')?.querySelector('[data-field="gpu-right-vramTotal"]');
      // Paths por serie
      var pathUsageRight = root.querySelector('path[data-gpu-right="usage"]');
      var pathClockRight = root.querySelector('path[data-gpu-right="clock"]');
      var pathTempRight  = root.querySelector('path[data-gpu-right="temp"]');
      var pathVramRight  = root.querySelector('path[data-gpu-right="vram"]');
      var pathSramRight  = root.querySelector('path[data-gpu-right="sram"]');
      var pathVcoreRight = root.querySelector('path[data-gpu-right="vcore"]');
      var pathFanRight   = root.querySelector('path[data-gpu-right="fanRPM"]');
      var pathvramclockRight = root.querySelector('path[data-gpu-right="vramClockMHz"]');
      function getSizeForPath(p){ var svg = p && p.closest('svg'); var s = svg ? GraphHelper.getSVGSize(svg) : {width:178,height:110}; return s; }
      var padTop = 2, padBottom = 2, padLeft = 0, padRight = 0;
      // Series simuladas (basadas en GPU tile)
      var gpuUsage = new Series(20, 1, 100, 5, { spikeChance: 0.12 });
      var ambientG = 30;
      var idleClock = 300, boostClockMhz = 1785; // usado para modelar temp en ease
      var vramUsedDedicated = new Series(1.0, 0.2, 6.0, 0.25);
      var vramUsedTotal     = new Series(1.0, 0.2, 14.0, 0.35);
      // Buffers independientes por serie
      var ringUsage = GraphHelper.createRing(50);
      var ringClock = GraphHelper.createRing(50);
      var ringTemp  = GraphHelper.createRing(50);
      var ringVram  = GraphHelper.createRing(50);
      var ringSram  = GraphHelper.createRing(50);
      var ringVcore = GraphHelper.createRing(50);
      var ringFan   = GraphHelper.createRing(50);
      var ringvramclock = GraphHelper.createRing(50);
      setInterval(function(){
        var u = gpuUsage.next();
        var f = easeUsage(u);
        // modelar temperatura como función del uso
        var t = clamp(ambientG + 0.50 * u + 5 * f + rnd(-1.5, 1.5), 28, 92);
        // clock GPU en MHz, similar al panel GPU izquierdo
        var clockMhz = clamp(idleClock + (boostClockMhz - idleClock) * f + rnd(-30, 30), idleClock, boostClockMhz);
        // voltaje (Vcore) aproximado en V
        var vcoreV = clamp(0.75 + 0.30 * f + rnd(-0.05, 0.05), 0.70, 1.15);
        // fan RPM y clock de VRAM (informativos)
        var fanRPM = clamp(800 + 20 * u + 120 * f + rnd(-60, 80), 600, 3600);
        var vramclockMHz = clamp(900 + 400 * f + rnd(-50, 50), 800, 2000);
        // VRAM dedicada/total similar al panel izquierdo
        var usedDed = clamp(0.2 + 0.05 * u + rnd(-0.15, 0.15), 0.2, 6.0);
        var usedTot = clamp(usedDed + 0.02 * u + rnd(-0.2, 0.2), 0.3, 14.0);
        var pDed = Math.round((usedDed / 6.0) * 100);
        var pTot = Math.round((usedTot / 14.0) * 100);
        // Poblar textos y estados
        if (textUsageRight){
          set(textUsageRight, Math.round(u) + '%');
          AlertHelper.assignState(textUsageRight, AlertHelper.computeState(u, ALERT_INDEX['gpu-usage']));
        }
        if (textClockRight){
          set(textClockRight, Math.round(clockMhz) + ' MHz');
        }
        if (textTempRight){
          set(textTempRight, fmtC(t));
          AlertHelper.assignState(textTempRight, AlertHelper.computeState(t, ALERT_INDEX['gpu-temp']));
        }
        if (textVcoreRight){
          set(textVcoreRight, new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(vcoreV) + ' V');
        }
        if (textFanRPM){
          set(textFanRPM, Math.round(fanRPM) + ' RPM');
        }
        if (textVramClock){
          set(textVramClock, Math.round(vramclockMHz) + ' MHz');
        }
        if (textVramDed){
          set(textVramDed, AlertHelper.fmtGB(usedDed) + '/' + AlertHelper.fmtGB(6.0) + ' (' + pDed + '%)');
          AlertHelper.assignState(textVramDed, AlertHelper.computeState(usedDed, ALERT_INDEX['gpu-vramDedGB']));
        }
        if (textVramTot){
          set(textVramTot, AlertHelper.fmtGB(usedTot) + '/' + AlertHelper.fmtGB(14.0) + ' (' + pTot + '%)');
          AlertHelper.assignState(textVramTot, AlertHelper.computeState(usedTot, ALERT_INDEX['gpu-vramTotGB']));
        }
        // Empujar y trazar curvas con tamaño propio del SVG
        GraphHelper.push(ringUsage, GraphHelper.normalize(u, 0, 100));
        GraphHelper.push(ringClock, GraphHelper.normalize(clockMhz, idleClock, boostClockMhz));
        GraphHelper.push(ringTemp,  GraphHelper.normalize(t, 28, 92));
        GraphHelper.push(ringVram,  GraphHelper.normalize(usedDed, 0, 6.0));
        GraphHelper.push(ringSram,  GraphHelper.normalize(usedTot, 0, 14.0));
        GraphHelper.push(ringVcore, GraphHelper.normalize(vcoreV, 0.70, 1.15));
        GraphHelper.push(ringFan,   GraphHelper.normalize(fanRPM, 600, 3600));
        GraphHelper.push(ringvramclock, GraphHelper.normalize(vramclockMHz, 800, 2000));
        if (pathUsageRight){
          var sU = getSizeForPath(pathUsageRight);
          var dU = GraphHelper.toPath(GraphHelper.values(ringUsage), sU.width, sU.height, padTop, padBottom, padLeft, padRight);
          pathUsageRight.setAttribute('d', dU);
        }
        if (pathClockRight){
          var sCk = getSizeForPath(pathClockRight);
          var dCk = GraphHelper.toPath(GraphHelper.values(ringClock), sCk.width, sCk.height, padTop, padBottom, padLeft, padRight);
          pathClockRight.setAttribute('d', dCk);
        }
        if (pathTempRight){
          var sT = getSizeForPath(pathTempRight);
          var dT = GraphHelper.toPath(GraphHelper.values(ringTemp), sT.width, sT.height, padTop, padBottom, padLeft, padRight);
          pathTempRight.setAttribute('d', dT);
        }
        if (pathVramRight){
          var sV = getSizeForPath(pathVramRight);
          var dV = GraphHelper.toPath(GraphHelper.values(ringVram), sV.width, sV.height, padTop, padBottom, padLeft, padRight);
          pathVramRight.setAttribute('d', dV);
        }
        if (pathSramRight){
          var sS = getSizeForPath(pathSramRight);
          var dS = GraphHelper.toPath(GraphHelper.values(ringSram), sS.width, sS.height, padTop, padBottom, padLeft, padRight);
          pathSramRight.setAttribute('d', dS);
        }
        if (pathVcoreRight){
          var sVc = getSizeForPath(pathVcoreRight);
          var dVc = GraphHelper.toPath(GraphHelper.values(ringVcore), sVc.width, sVc.height, padTop, padBottom, padLeft, padRight);
          pathVcoreRight.setAttribute('d', dVc);
        }
        if (pathFanRight){
          var sF = getSizeForPath(pathFanRight);
          var dF = GraphHelper.toPath(GraphHelper.values(ringFan), sF.width, sF.height, padTop, padBottom, padLeft, padRight);
          pathFanRight.setAttribute('d', dF);
        }
        if (pathvramclockRight){
          var sVk = getSizeForPath(pathvramclockRight);
          var dVk = GraphHelper.toPath(GraphHelper.values(ringvramclock), sVk.width, sVk.height, padTop, padBottom, padLeft, padRight);
          pathvramclockRight.setAttribute('d', dVk);
        }
      }, 1000);
    })();
  }
})();