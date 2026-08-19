(function () {
  var U = window.RainmeterUtils;
  var GH = window.GraphHelper;

  function toGB(mb) { return (Number(mb) || 0) / 1024.0; }

  /**
   * Auditoría v0.0.2: Estabilización del bundle GPU
   */
  function start() {
    U.whenReady(function (api) {
      var m = {
        usage: U.getMeasure(api, 'GPU_USAGE'),
        clockMHz: U.getMeasure(api, 'GPU_CLOCK_MHZ'),
        tempC: U.getMeasure(api, 'GPU_TEMP_C'),
        vramDedUsedMB: U.getMeasure(api, 'GPU_VRAM_DED_USED_MB'),
        vramDedTotMB: U.getMeasure(api, 'GPU_VRAM_DED_TOTAL_MB'),
        vramTotUsedMB: U.getMeasure(api, 'GPU_VRAM_TOT_USED_MB'),
        vramTotTotMB: U.getMeasure(api, 'GPU_VRAM_TOT_TOTAL_MB'),
        vcoreV: U.getMeasure(api, 'GPU_VCORE_V'),
        fanRPM: U.getMeasure(api, 'GPU_FAN_RPM'),
        vramClockMHz: U.getMeasure(api, 'GPU_VRAM_CLOCK_MHZ')
      };

      var rU = GH.createRing(60), rC = GH.createRing(60), rT = GH.createRing(60);
      var rV = GH.createRing(60), rS = GH.createRing(60);
      var rVCore = GH.createRing(60), rFan = GH.createRing(60), rMemClk = GH.createRing(60);

      var S = { usage: 0, clockMHz: null, tempC: null, dedUsedGB: 0, dedTotGB: 0, totUsedGB: 0, totTotGB: 0, vcoreV: null, fanRPM: null, vramClockMHz: null };

      function measure() {
        try {
          U.updateAll([
            m.usage, m.clockMHz, m.tempC, m.vramDedUsedMB, m.vramDedTotMB,
            m.vramTotUsedMB, m.vramTotTotMB, m.vcoreV, m.fanRPM, m.vramClockMHz
          ]);
        } catch (e) { }
      }

      function compute() {
        try {
          S.usage = m.usage ? m.usage.getNumber() : 0;
          S.clockMHz = m.clockMHz ? m.clockMHz.getNumber() : null;
          S.tempC = m.tempC ? m.tempC.getNumber() : null;

          S.dedUsedGB = toGB(m.vramDedUsedMB ? m.vramDedUsedMB.getNumber() : 0);
          S.dedTotGB = toGB(m.vramDedTotMB ? m.vramDedTotMB.getNumber() : 0);
          S.totUsedGB = toGB(m.vramTotUsedMB ? m.vramTotUsedMB.getNumber() : 0);
          S.totTotGB = toGB(m.vramTotTotMB ? m.vramTotTotMB.getNumber() : 0);

          S.vcoreV = m.vcoreV ? m.vcoreV.getNumber() : null;
          S.fanRPM = m.fanRPM ? m.fanRPM.getNumber() : null;
          S.vramClockMHz = m.vramClockMHz ? m.vramClockMHz.getNumber() : null;

          GH.push(rU, S.usage);
          if (S.clockMHz) GH.push(rC, S.clockMHz);
          if (S.tempC) GH.push(rT, S.tempC);
          if (S.dedTotGB > 0) GH.push(rV, S.dedUsedGB / S.dedTotGB * 100);
          if (S.totTotGB > 0) GH.push(rS, S.totUsedGB / S.totTotGB * 100);
          if (S.vcoreV) GH.push(rVCore, S.vcoreV);
          if (S.fanRPM) GH.push(rFan, S.fanRPM);
          if (S.vramClockMHz) GH.push(rMemClk, S.vramClockMHz);
        } catch (e) { }
      }

      function render() {
        try {
          var pDed = S.dedTotGB > 0 ? Math.round(S.dedUsedGB/S.dedTotGB*100) : 0;
          var pTot = S.totTotGB > 0 ? Math.round(S.totUsedGB/S.totTotGB*100) : 0;

          U.setField('gpu-usage', AlertHelper.fmtPct(S.usage));
          U.setField('gpu-clock', S.clockMHz ? AlertHelper.fmtMHz(S.clockMHz) : '-- MHz');
          U.setField('gpu-temp', S.tempC ? AlertHelper.fmtDegC(S.tempC) : '--°C');
          
          var vramDedStr = AlertHelper.fmtGB(S.dedUsedGB) + '/' + AlertHelper.fmtGB(S.dedTotGB) + ' (' + pDed + '%)';
          var vramTotStr = AlertHelper.fmtGB(S.totUsedGB) + '/' + AlertHelper.fmtGB(S.totTotGB) + ' (' + pTot + '%)';
          U.setField('gpu-vramDedicated', vramDedStr);
          U.setField('gpu-vramTotal', vramTotStr);

          var rightRoot = U.getRightRoot('gpu');
          U.setField('gpu-right-usage', AlertHelper.fmtPct(S.usage), rightRoot);
          U.setField('gpu-right-vramDedicated', vramDedStr, rightRoot);
          U.setField('gpu-right-vramTotal', vramTotStr, rightRoot);
          U.setField('gpu-right-clock', S.clockMHz ? AlertHelper.fmtMHz(S.clockMHz) : '-- MHz', rightRoot);
          U.setField('gpu-right-vcoreV', S.vcoreV ? AlertHelper.fmtVolt(S.vcoreV, 2) : '-- V', rightRoot);
          U.setField('gpu-right-fanRPM', S.fanRPM ? AlertHelper.fmtRPM(S.fanRPM) : '-- RPM', rightRoot);
          U.setField('gpu-right-vramClockMHz', S.vramClockMHz ? AlertHelper.fmtMHz(S.vramClockMHz) : '-- MHz', rightRoot);


          U.setState('gpu-usage', S.usage, 'gpu-usage');
          U.setState('gpu-temp', S.tempC || 0, 'gpu-temp');

          var capClock = (window.GraphScales && GraphScales.MAX_GPU_CLOCK_MHZ) || 2500;
          var capTemp = (window.GraphScales && GraphScales.MAX_TEMP_C) || 100;

          document.querySelectorAll('path[data-series="gpu-usage"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rU, s.width, s.height, 2, 2, 0, 0, 0, 100));
          });
          document.querySelectorAll('path[data-series="gpu-clock"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rC, s.width, s.height, 2, 2, 0, 0, 0, capClock));
          });
          document.querySelectorAll('path[data-series="gpu-temp"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rT, s.width, s.height, 2, 2, 0, 0, 0, capTemp));
          });
          document.querySelectorAll('path[data-series="gpu-vram"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rV, s.width, s.height, 2, 2, 0, 0, 0, 100));
          });
          document.querySelectorAll('path[data-series="gpu-vram-shared"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(rS, s.width, s.height, 2, 2, 0, 0, 0, 100));
          });

          // Gráficos adicionales del panel derecho
          document.querySelectorAll('path[data-series="gpu-vcore"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            // Cap de 1.5V para que 1V se vea a mitad de altura aprox
            U.setPathD(el, GH.toPathFromRing(rVCore, s.width, s.height, 2, 2, 0, 0, 0, 1.5));
          });
          document.querySelectorAll('path[data-series="gpu-fan-rpm"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            var capFan = Math.max(3000, GH.ringMax(rFan) * 1.1);
            U.setPathD(el, GH.toPathFromRing(rFan, s.width, s.height, 2, 2, 0, 0, 0, capFan));
          });
          document.querySelectorAll('path[data-series="gpu-vram-clock"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            var capVramClk = (window.GraphScales && GraphScales.MAX_VRAM_CLOCK_MHZ) || 10000;
            U.setPathD(el, GH.toPathFromRing(rMemClk, s.width, s.height, 2, 2, 0, 0, 0, capVramClk));
          });


        } catch (e) { }
      }

      if (window.HeartbeatInstance) {
        HeartbeatInstance.subscribe('gpu-m', measure, { phase: 'measure' });
        HeartbeatInstance.subscribe('gpu-c', compute, { phase: 'compute' });
        HeartbeatInstance.subscribe('gpu-r', render, { phase: 'render' });
      }
    });
  }

  start();
})();
