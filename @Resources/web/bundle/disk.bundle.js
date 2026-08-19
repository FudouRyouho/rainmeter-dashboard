(function () {
  var U = window.RainmeterUtils;
  var GH = window.GraphHelper;

  function toMs(sec) { return Math.round((Number(sec) || 0) * 1000 * 10) / 10; }

  /**
   * Auditoría v0.0.2: Estabilización del bundle DISK
   */
  function startForIndex(idx) {
    U.whenReady(function (api) {
      var prefix = 'DISK_' + idx + '_';
      var m = {
        usage: U.getMeasure(api, prefix + 'USAGE_PCT'),
        freeMB: U.getMeasure(api, prefix + 'FREE_MB'),
        totalMB: U.getMeasure(api, prefix + 'TOTAL_MB'),
        usedMB: U.getMeasure(api, prefix + 'USED_MB'),
        usedPct: U.getMeasure(api, prefix + 'USED_PCT'),
        readBps: U.getMeasure(api, prefix + 'READ_BPS'),
        writeBps: U.getMeasure(api, prefix + 'WRITE_BPS'),
        xferSec: U.getMeasure(api, prefix + 'XFER_SEC'),
        readPct: U.getMeasure(api, prefix + 'READ_PCT'),
        writePct: U.getMeasure(api, prefix + 'WRITE_PCT')
      };

      var rU = GH.createRing(60), rL = GH.createRing(60);
      var rR = GH.createRing(60), rW = GH.createRing(60);

      var S = { usage: 0, spacePct: 0, totalGB: 0, usedGB: 0, latMs: 0, rKBps: 0, wKBps: 0, rPct: 0, wPct: 0 };

      function measure() {
        try {
          U.updateAll([m.usage, m.freeMB, m.totalMB, m.usedMB, m.usedPct, m.readBps, m.writeBps, m.xferSec, m.readPct, m.writePct]);
        } catch (e) { }
      }

      function compute() {
        try {
          S.usage = m.usage ? m.usage.getNumber() : 0;
          S.spacePct = m.usedPct ? m.usedPct.getNumber() : 0;
          var tMB = m.totalMB ? m.totalMB.getNumber() : 0;
          var uMB = m.usedMB ? m.usedMB.getNumber() : 0;
          S.totalGB = tMB / 1024;
          S.usedGB = uMB / 1024;
          
          S.latMs = toMs(m.xferSec ? m.xferSec.getNumber() : 0);
          S.rKBps = U.bytesToKBps(m.readBps ? m.readBps.getNumber() : 0);
          S.wKBps = U.bytesToKBps(m.writeBps ? m.writeBps.getNumber() : 0);
          S.rPct = m.readPct ? m.readPct.getNumber() : 0;
          S.wPct = m.writePct ? m.writePct.getNumber() : 0;

          GH.push(rU, S.usage);
          GH.push(rL, S.latMs);
          GH.push(rR, S.rKBps);
          GH.push(rW, S.wKBps);
        } catch (e) { }
      }

      function render() {
        try {
          var tile = document.querySelector('[data-group="disk"][data-device-index="' + idx + '"]');
          if (!tile) return;

          U.setField('disk-usagePct', AlertHelper.fmtPct(S.usage), tile);
          U.setField('disk-usedPct', AlertHelper.fmtPct(S.spacePct), tile);
          U.setField('disk-totalGB', AlertHelper.fmtGB(S.totalGB), tile);
          U.setField('disk-usedGB', AlertHelper.fmtGB(S.usedGB), tile);
          U.setField('disk-latency', AlertHelper.fmtMs(S.latMs), tile);
          U.setField('disk-read', AlertHelper.fmtKBps(S.rKBps), tile);
          U.setField('disk-write', AlertHelper.fmtKBps(S.wKBps), tile);
          U.setField('disk-readPct', AlertHelper.fmtPct(S.rPct), tile);
          U.setField('disk-writePct', AlertHelper.fmtPct(S.wPct), tile);

          var rightRoot = U.getRightRoot('disk');
          U.setField('disk-' + idx + '-right-usage', AlertHelper.fmtPct(S.usage), rightRoot);
          U.setField('disk-' + idx + '-right-latency', AlertHelper.fmtMs(S.latMs), rightRoot);
          U.setField('disk-' + idx + '-right-read', AlertHelper.fmtKBps(S.rKBps), rightRoot);
          U.setField('disk-' + idx + '-right-write', AlertHelper.fmtKBps(S.wKBps), rightRoot);


          U.setState('disk-usagePct', S.usage, 'disk-usagePct', tile);
          U.setState('disk-usedPct', S.spacePct, 'disk-usedPct', tile);

          var capLat = (window.GraphScales && GraphScales.MAX_DISK_LAT_MS) || 50;
          var capRW = (window.GraphScales && GraphScales.MAX_DISK_READ_KBPS) || 100000;

          // Renderizar gráficas tanto en el Tile como en el Panel Derecho
          var diskPrefix = 'disk-' + idx + '-';
          
          document.querySelectorAll('[data-disk="' + idx + '"] path[data-series="disk-usage"], [data-disk-right="' + diskPrefix + 'usage"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rU, s.width, s.height, 2, 2, 0, 0, 0, 100));
          });
          document.querySelectorAll('[data-disk="' + idx + '"] path[data-series="disk-latency"], [data-disk-right="' + diskPrefix + 'latency"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rL, s.width, s.height, 2, 2, 0, 0, 0, capLat));
          });
          document.querySelectorAll('[data-disk="' + idx + '"] path[data-series="disk-read"], [data-disk-right="' + diskPrefix + 'read"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rR, s.width, s.height, 2, 2, 0, 0, 0, capRW));
          });
          document.querySelectorAll('[data-disk="' + idx + '"] path[data-series="disk-write"], [data-disk-right="' + diskPrefix + 'write"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rW, s.width, s.height, 2, 2, 0, 0, 0, capRW));
          });


        } catch (e) { }
      }

      if (window.HeartbeatInstance) {
        HeartbeatInstance.subscribe('disk' + idx + '-m', measure, { phase: 'measure' });
        HeartbeatInstance.subscribe('disk' + idx + '-c', compute, { phase: 'compute' });
        HeartbeatInstance.subscribe('disk' + idx + '-r', render, { phase: 'render' });
      }
    });
  }

  function boot() {
    startForIndex(0);
    startForIndex(1);
  }

  boot();
})();
