(function () {
  var U = window.RainmeterUtils;
  var GH = window.GraphHelper;

  function pct(used, total) { if (!isFinite(used) || !isFinite(total) || total <= 0) return 0; return Math.round((used / total) * 100); }

  /**
   * Auditoría v0.0.2: Estabilización del bundle MEM
   */
  function start() {
    U.whenReady(function (api) {
      var measures = {
        physTotal: U.getMeasure(api, 'PHYS_TOTAL'),
        availMB: U.getMeasure(api, 'AVAILABLE_MB'),
        commitB: U.getMeasure(api, 'COMMITTED_BYTES'),
        commitLim: U.getMeasure(api, 'COMMIT_LIMIT'),
        cacheB: U.getMeasure(api, 'CACHE_BYTES'),
      };

      var rPhys = GH.createRing(60);
      var rVirt = GH.createRing(60);
      var rCache = GH.createRing(60);
      var rSwap = GH.createRing(60);

      var S = { usedGB: 0, totalGB: 0, vUsedGB: 0, vTotGB: 0, pPhys: 0, pVirt: 0, cacheMB: 0, pSwap: 0 };

      function measure() {
        try {
          U.updateAll([measures.physTotal, measures.availMB, measures.commitB, measures.commitLim, measures.cacheB]);
        } catch (e) { }
      }

      function compute() {
        try {
          var totB = measures.physTotal ? measures.physTotal.getNumber() : 0;
          var availB = (measures.availMB ? measures.availMB.getNumber() : 0) * 1024 * 1024;
          var usedB = Math.max(0, totB - availB);
          
          S.usedGB = U.bytesToGB(usedB);
          S.totalGB = U.bytesToGB(totB);
          S.pPhys = pct(usedB, totB);

          var vUsedB = measures.commitB ? measures.commitB.getNumber() : 0;
          var vTotB = measures.commitLim ? measures.commitLim.getNumber() : 0;
          S.vUsedGB = U.bytesToGB(vUsedB);
          S.vTotGB = U.bytesToGB(vTotB);
          S.pVirt = pct(vUsedB, vTotB);

          var cB = measures.cacheB ? measures.cacheB.getNumber() : 0;
          S.cacheMB = cB / (1024 * 1024);

          var sTotB = Math.max(0, vTotB - totB);
          var sUsedB = Math.max(0, vUsedB - totB);
          S.pSwap = sTotB > 0 ? pct(sUsedB, sTotB) : 0;

          GH.push(rPhys, S.pPhys);
          GH.push(rVirt, S.pVirt);
          GH.push(rSwap, S.pSwap);
          
          var capPhysGB = (window.GraphScales && GraphScales.MAX_RAM_PHYS_GB) || 16.0;
          GH.push(rCache, Math.min(capPhysGB, S.cacheMB / 1024.0));
        } catch (e) { }
      }

      function render() {
        try {
          var physStr = AlertHelper.fmtGB(S.usedGB) + '/' + AlertHelper.fmtGB(S.totalGB) + ' (' + S.pPhys + '%)';
          var virtStr = AlertHelper.fmtGB(S.vUsedGB) + '/' + AlertHelper.fmtGB(S.vTotGB) + ' (' + S.pVirt + '%)';
          var cacheStr = AlertHelper.fmtMBorGB(S.cacheMB);

          U.setField('mem-phys', physStr);
          U.setField('mem-virt', virtStr);
          U.setField('mem-cache', cacheStr);
          
          var rightRoot = U.getRightRoot('mem');
          U.setField('mem-right-phys', physStr, rightRoot);
          U.setField('mem-right-virt', virtStr, rightRoot);
          U.setField('mem-right-cache', cacheStr, rightRoot);
          U.setField('mem-right-swap', S.pSwap + '%', rightRoot);

          U.setState('mem-phys', S.usedGB, 'mem-physGB');
          U.setState('mem-virt', S.vUsedGB, 'mem-virtGB');

          var capPhysGB = (window.GraphScales && GraphScales.MAX_RAM_PHYS_GB) || 16.0;

          document.querySelectorAll('path[data-series="mem-phys"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rPhys, s.width, s.height, 2, 2, 0, 0, 0, 100));
          });
          document.querySelectorAll('path[data-series="mem-virt"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rVirt, s.width, s.height, 2, 2, 0, 0, 0, 100));
          });
          document.querySelectorAll('path[data-series="mem-cache"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rCache, s.width, s.height, 2, 2, 0, 0, 0, capPhysGB));
          });
          document.querySelectorAll('path[data-series="mem-swap"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rSwap, s.width, s.height, 2, 2, 0, 0, 0, 100));
          });

        } catch (e) { }
      }

      if (window.HeartbeatInstance) {
        HeartbeatInstance.subscribe('mem-m', measure, { phase: 'measure' });
        HeartbeatInstance.subscribe('mem-c', compute, { phase: 'compute' });
        HeartbeatInstance.subscribe('mem-r', render, { phase: 'render' });
      }
    });
  }

  start();
})();
