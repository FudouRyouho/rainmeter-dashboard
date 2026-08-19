(function () {
  function start() {
    var HH = window.HoverHelper;

    function bindValueHover(valueEl, graphRoot, pathSelector, label) {
      if (!valueEl || !graphRoot) return;
      function findPath() {
        if (Array.isArray(pathSelector)) {
          var dsName = pathSelector[0];
          var legacySel = pathSelector[1];
          var dsSel = 'path[data-series="' + dsName + '"]';
          return graphRoot.querySelector(dsSel) || graphRoot.querySelector(legacySel);
        }
        var dsSel = 'path[data-series="' + pathSelector + '"]';
        return graphRoot.querySelector(dsSel);
      }
      function onEnter() {
        var path = findPath();
        HH.dimAllExcept(graphRoot, path || null);
        HH.showTooltip(graphRoot, label, (valueEl.textContent || '').trim());
      }
      function onLeave() { HH.clear(graphRoot); }
      valueEl.addEventListener('mouseenter', onEnter);
      valueEl.addEventListener('mouseleave', onLeave);
    }

    (function () {
      var root = document.querySelector('[data-group="cpu"] .tile-graph');
      bindValueHover(document.querySelector('[data-group="cpu"] [data-field="cpu-usage"]'), root, 'cpu-usage', 'Usage');
      bindValueHover(document.querySelector('[data-group="cpu"] [data-field="cpu-clock"]'), root, 'cpu-clock', 'Clock');
      bindValueHover(document.querySelector('[data-group="cpu"] [data-field="cpu-temp"]'), root, 'cpu-temp', 'Temp');
    })();

    (function () {
      var root = document.querySelector('[data-group="mem"] .tile-graph');
      bindValueHover(document.querySelector('[data-group="mem"] [data-field="mem-phys"]'), root, 'mem-phys', 'RAM');
      bindValueHover(document.querySelector('[data-group="mem"] [data-field="mem-virt"]'), root, 'mem-virt', 'VIRT');
      bindValueHover(document.querySelector('[data-group="mem"] [data-field="mem-cache"]'), root, 'mem-cache', 'CACHE');
    })();

    (function () {
      var root = document.querySelector('[data-group="gpu"] .tile-graph');
      bindValueHover(document.querySelector('[data-group="gpu"] [data-field="gpu-usage"]'), root, 'gpu-usage', 'Usage');
      bindValueHover(document.querySelector('[data-group="gpu"] [data-field="gpu-clock"]'), root, 'gpu-clock', 'Clock');
      bindValueHover(document.querySelector('[data-group="gpu"] [data-field="gpu-temp"]'), root, 'gpu-temp', 'Temp');
      bindValueHover(document.querySelector('[data-group="gpu"] [data-field="gpu-vramDedicated"]'), root, 'gpu-vram', 'VRAM');
      bindValueHover(document.querySelector('[data-group="gpu"] [data-field="gpu-vramTotal"]'), root, 'gpu-sram', 'Shared');
    })();

    (function () {
      var root = document.querySelector('[data-group="disk"][data-device-index="0"] .tile-graph');
      bindValueHover(document.querySelector('[data-group="disk"][data-device-index="0"] [data-field="disk-usagePct"]'), root, 'disk-usage', 'Usage');
      bindValueHover(document.querySelector('[data-group="disk"][data-device-index="0"] [data-field="disk-latency"]'), root, 'disk-latency', 'Latency');
      bindValueHover(document.querySelector('[data-group="disk"][data-device-index="0"] [data-field="disk-read"]'), root, 'disk-read', 'Read');
      bindValueHover(document.querySelector('[data-group="disk"][data-device-index="0"] [data-field="disk-write"]'), root, 'disk-write', 'Write');
    })();

    (function () {
      var root = document.querySelector('[data-group="disk"][data-device-index="1"] .tile-graph');
      bindValueHover(document.querySelector('[data-group="disk"][data-device-index="1"] [data-field="disk-usagePct"]'), root, 'disk-usage', 'Usage');
      bindValueHover(document.querySelector('[data-group="disk"][data-device-index="1"] [data-field="disk-latency"]'), root, 'disk-latency', 'Latency');
      bindValueHover(document.querySelector('[data-group="disk"][data-device-index="1"] [data-field="disk-read"]'), root, 'disk-read', 'Read');
      bindValueHover(document.querySelector('[data-group="disk"][data-device-index="1"] [data-field="disk-write"]'), root, 'disk-write', 'Write');
    })();

    (function () {
  var root = document.querySelector('[data-group="net"] .tile-graph');
  bindValueHover(document.querySelector('[data-group="net"] [data-field="net-up"]'), root, 'net-up', 'E');
  bindValueHover(document.querySelector('[data-group="net"] [data-field="net-down"]'), root, 'net-down', 'R');
  bindValueHover(document.querySelector('[data-group="net"] [data-field="net-ping"]'), root, 'net-ping', 'Ping');
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else { start(); }
})();
