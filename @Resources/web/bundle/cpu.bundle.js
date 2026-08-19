(function () {
  var U = window.RainmeterUtils;
  var GH = window.GraphHelper;

  /**
   * Auditoría v0.0.2: Estabilización del bundle CPU
   */
  function start() {
    U.whenReady(function (api) {
      var measures = {
        cpu_total: U.getMeasure(api, 'CPU_TOTAL'),
        process_count: U.getMeasure(api, 'PROCESS_COUNT'),
        thread_count: U.getMeasure(api, 'THREAD_COUNT'),
        cpu_threads: U.getMeasures(api, [
          "CPU_THREAD_0_LOAD", "CPU_THREAD_1_LOAD", "CPU_THREAD_2_LOAD", "CPU_THREAD_3_LOAD", "CPU_THREAD_4_LOAD", "CPU_THREAD_5_LOAD", "CPU_THREAD_6_LOAD", "CPU_THREAD_7_LOAD",
          "CPU_THREAD_8_LOAD", "CPU_THREAD_9_LOAD", "CPU_THREAD_10_LOAD", "CPU_THREAD_11_LOAD", "CPU_THREAD_12_LOAD", "CPU_THREAD_13_LOAD", "CPU_THREAD_14_LOAD", "CPU_THREAD_15_LOAD"
        ]),
        cpu_temp: U.getMeasure(api, 'CPU_TEMP_C'),
        cpu_clock_mhz: U.getMeasure(api, 'CPU_CLOCK_MHZ'),
        vcore_v: U.getMeasure(api, 'CPU_VCORE_V'),
        fan_rpm: U.getMeasure(api, 'CPU_FAN_RPM'),
        up_time: U.getMeasure(api, 'SYS_UPTIME')
      };

      var lpRoot = document.querySelector('[data-group="cpu"][data-role="lp-grid"]');
      var lpCount = (measures.cpu_threads && measures.cpu_threads.length) ? measures.cpu_threads.length : 16;
      
      var ringUsage = GH.createRing(60);
      var ringClock = GH.createRing(60);
      var ringTemp = GH.createRing(60);
      var lpRings = Array.from({ length: lpCount }, () => GH.createRing(60));

      var S = { usage: 0, tempC: null, freqGHz: null, proc: 0, thr: 0, upTimeStr: '00:00:00', vcoreV: null, fanRPM: null };

      function measure() {
        try {
          U.updateAll([
            measures.cpu_total, measures.process_count, measures.thread_count,
            measures.cpu_temp, measures.cpu_clock_mhz, measures.vcore_v,
            measures.fan_rpm, measures.up_time
          ]);
        } catch (e) { }
      }

      function compute() {
        try {
          var sumHWI = 0, cntHWI = 0;
          measures.cpu_threads.forEach(function (m) {
            if (m && m.ok) { var v = m.getNumber(); sumHWI += v; cntHWI++; }
          });
          
          var usageHWI = cntHWI > 0 ? (sumHWI / cntHWI) : 0;
          S.usage = usageHWI > 0 ? usageHWI : (measures.cpu_total ? measures.cpu_total.getNumber() : 0);
          S.proc = measures.process_count ? measures.process_count.getNumber() : 0;
          S.thr = measures.thread_count ? measures.thread_count.getNumber() : 0;
          S.tempC = measures.cpu_temp ? measures.cpu_temp.getNumber() : null;
          
          var clk = measures.cpu_clock_mhz ? measures.cpu_clock_mhz.getNumber() : null;
          S.freqGHz = clk ? (clk / 1000) : null;
          S.vcoreV = measures.vcore_v ? measures.vcore_v.getNumber() : null;
          S.fanRPM = measures.fan_rpm ? measures.fan_rpm.getNumber() : null;

          if (measures.up_time) {
            var ut = measures.up_time.getString();
            if (!ut || ut === '00:00:00') {
              var sec = Number(measures.up_time.getNumber()) || 0;
              var h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
              ut = [h,m,s].map(v => String(v).padStart(2,'0')).join(':');
            }
            S.upTimeStr = ut;
          }

          GH.push(ringUsage, S.usage);
          if (S.freqGHz) GH.push(ringClock, S.freqGHz);
          if (S.tempC) GH.push(ringTemp, S.tempC);
          for (var i = 0; i < lpCount; i++) {
            GH.push(lpRings[i], measures.cpu_threads[i] ? measures.cpu_threads[i].getNumber() : S.usage);
          }
        } catch (e) { }
      }

      function render() {
        try {
          U.setField('cpu-usage', AlertHelper.fmtPct(S.usage));
          U.setField('cpu-clock', S.freqGHz ? AlertHelper.fmtGHz(S.freqGHz) : '-- GHz');
          U.setField('cpu-temp', S.tempC ? AlertHelper.fmtDegC(S.tempC) : '--°C');
          U.setField('cpu-process', 'Process: ' + S.proc);
          U.setField('cpu-subprocess', 'SubProcess: ' + S.thr);

          var rightRoot = U.getRightRoot('cpu');
          U.setField('sys-uptime', S.upTimeStr, rightRoot);
          U.setField('cpu-vcoreV', S.vcoreV ? AlertHelper.fmtVolt(S.vcoreV, 2) : '-- V', rightRoot);
          U.setField('cpu-coolerRPM', S.fanRPM ? AlertHelper.fmtRPM(S.fanRPM) : '-- RPM', rightRoot);


          U.setState('cpu-usage', S.usage, 'cpu-usage');
          U.setState('cpu-temp', S.tempC || 0, 'cpu-temp');

          var capClock = (window.GraphScales && GraphScales.MAX_CPU_CLOCK_MHZ / 1000) || 5;
          document.querySelectorAll('path[data-series="cpu-usage"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(ringUsage, s.width, s.height, 2, 2, 0, 0, 0, 100));
          });
          document.querySelectorAll('path[data-series="cpu-clock"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(ringClock, s.width, s.height, 2, 2, 0, 0, 0, capClock));
          });
          document.querySelectorAll('path[data-series="cpu-temp"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            var capTemp = (window.GraphScales && GraphScales.MAX_TEMP_C) || 100;
            U.setPathD(el, GH.toPathFromRing(ringTemp, s.width, s.height, 2, 2, 0, 0, 0, capTemp));
          });



          for (var li = 0; li < lpCount; li++) {
            var lpEl = lpRoot ? lpRoot.querySelector('path[data-lp-index="' + (li + 1) + '"]') : null;
            if (lpEl) {
              var s = GH.getSizeForPath(lpEl);
              U.setPathD(lpEl, GH.toPathFromRing(lpRings[li], s.width, s.height, 2, 2, 0, 0, 0, 100));
            }
          }
        } catch (e) { }
      }

      if (window.HeartbeatInstance) {
        HeartbeatInstance.subscribe('cpu-m', measure, { phase: 'measure' });
        HeartbeatInstance.subscribe('cpu-c', compute, { phase: 'compute' });
        HeartbeatInstance.subscribe('cpu-r', render, { phase: 'render' });
      }
    });
  }

  start();
})();
