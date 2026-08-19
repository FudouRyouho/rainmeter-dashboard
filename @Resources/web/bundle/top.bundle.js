(function () {
  var U = window.RainmeterUtils;

  /**
   * Auditoría v0.0.2: Estabilización del bundle TOP
   */
  function start() {
    U.whenReady(function (api) {
      var m = {
        cpu: U.getMeasures(api, ['TopCPU1', 'TopCPU2', 'TopCPU3', 'TopCPU4', 'TopCPU5']),
        mem: U.getMeasures(api, ['TopRAM1', 'TopRAM2', 'TopRAM3', 'TopRAM4', 'TopRAM5']),
        io: U.getMeasures(api, ['TopIO1', 'TopIO2', 'TopIO3', 'TopIO4', 'TopIO5']),
      };

      var cache = { cpu: [], mem: [], io: [] };

      function measure() {
        try {
          U.updateAll(m.cpu.concat(m.mem).concat(m.io));
        } catch (e) { }
      }

      function compute() {
        try {
          cache.cpu = m.cpu.map(function(mm) { 
            return { name: mm.getString(), value: mm.getNumber() }; 
          });
          cache.mem = m.mem.map(function(mr) { 
            return { name: mr.getString(), value: U.bytesToGB(mr.getNumber()) }; 
          });
          cache.io = m.io.map(function(mi) { 
            return { name: mi.getString(), value: U.bytesToKBps(mi.getNumber()) }; 
          });
        } catch (e) { }
      }

      function render() {
        try {
          cache.cpu.forEach(function(c, i) {
            var idx = i + 1;
            U.setField('top-cpu-' + idx + '-name', c.name);
            U.setField('top-cpu-' + idx + '-value', AlertHelper.fmtPct(c.value));
          });
          cache.mem.forEach(function(c, i) {
            var idx = i + 1;
            U.setField('top-ram-' + idx + '-name', c.name);
            U.setField('top-ram-' + idx + '-value', AlertHelper.fmtGB(c.value));
          });
          cache.io.forEach(function(c, i) {
            var idx = i + 1;
            U.setField('top-io-' + idx + '-name', c.name);
            U.setField('top-io-' + idx + '-value', AlertHelper.fmtKBps(c.value));
          });
        } catch (e) { }
      }

      if (window.HeartbeatInstance) {
        HeartbeatInstance.subscribe('top-m', measure, { phase: 'measure' });
        HeartbeatInstance.subscribe('top-c', compute, { phase: 'compute' });
        HeartbeatInstance.subscribe('top-r', render, { phase: 'render' });
      }
    });
  }

  start();
})();