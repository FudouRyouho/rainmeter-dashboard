(function(){
  /**
   * @example
   * // Hidratar un contenedor con descriptor JSON
   * const el = document.querySelector('.tile-graph[data-graph]');
   * const cfg = JSON.parse(el.getAttribute('data-graph') || '{}');
   * GraphHydrator.build(el, cfg);
   *
   * @example
   * // Inicialización estándar tras DOM listo
   * GraphHydrator.init();
   *
   * @param {HTMLElement} root
   * @param {{series:string[],viewBox:[number,number],frame?:boolean,width?:number,height?:number,overlay?:{text:string}}} cfg
   * @returns {SVGSVGElement}
   */
  function build(root, cfg){
    var GH = (typeof window !== 'undefined') ? window.GraphHelper : null;
    var NS = 'http://www.w3.org/2000/svg';
    if (!root || !cfg) return null;
    var vb = Array.isArray(cfg.viewBox) && cfg.viewBox.length === 2 ? cfg.viewBox : [100,60];
    var vw = Number(vb[0]) || 100;
    var vh = Number(vb[1]) || 60;
    // Legacy sugar (deprecating): cfg.series
    var series = Array.isArray(cfg.series) ? cfg.series : [];
    // Canonical: cfg.paths; Sugar: cfg.dataset.series
    var pathsCfg = Array.isArray(cfg.paths) ? cfg.paths : [];
    var datasetRoot = (cfg && typeof cfg.dataset === 'object') ? cfg.dataset : null;
    var datasetSeries = (datasetRoot && Array.isArray(datasetRoot.series)) ? datasetRoot.series : [];
    var hasSeries = series.length > 0;
    var hasPaths = pathsCfg.length > 0;
    var hasDatasetSeries = datasetSeries.length > 0;
    var existingSvg = root.querySelector('svg');
    var svg = null;
    // Crear SVG cuando haya series, paths o azúcar dataset.series
    if (hasSeries || hasPaths || hasDatasetSeries) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + String(vw) + ' ' + String(vh));
      if (cfg.width) svg.setAttribute('width', String(cfg.width));
      if (cfg.height) svg.setAttribute('height', String(cfg.height));

      if (cfg.frame){
        var rect = document.createElementNS(NS, 'rect');
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('width', String(vw));
        rect.setAttribute('height', String(vh));
        rect.setAttribute('class', 'frame');
        svg.appendChild(rect);
      }

      if (hasPaths){
        for (var pi = 0; pi < pathsCfg.length; pi++){
          var pc = pathsCfg[pi] || {};
          var nameP = typeof pc.series === 'string' ? String(pc.series).trim() : '';
          var pEl = document.createElementNS(NS, 'path');
          pEl.setAttribute('d', 'M0,' + String(vh) + ' L' + String(vw) + ',' + String(vh));
          if (nameP) { pEl.setAttribute('data-series', nameP); }
          var ds = pc && pc.dataset && typeof pc.dataset === 'object' ? pc.dataset : null;
          if (ds){
            try {
              for (var k in ds){
                if (!Object.prototype.hasOwnProperty.call(ds, k)) continue;
                var val = ds[k];
                var key = String(k).trim();
                if (!key) continue;
                try { pEl.setAttribute('data-' + key, String(val)); } catch {}
              }
            } catch {}
          }
          svg.appendChild(pEl);
        }
      } else if (hasDatasetSeries) {
        // Sugar: cfg.dataset.series as array → genera un path por serie, clonando el resto de dataset
        for (var di = 0; di < datasetSeries.length; di++){
          var dName = String(datasetSeries[di] || '').trim();
          if (!dName) continue;
          var pDS = document.createElementNS(NS, 'path');
          pDS.setAttribute('d', 'M0,' + String(vh) + ' L' + String(vw) + ',' + String(vh));
          pDS.setAttribute('data-series', dName);
          // Clonar dataset sin la clave 'series'
          try {
            for (var dk in datasetRoot){
              if (!Object.prototype.hasOwnProperty.call(datasetRoot, dk)) continue;
              if (String(dk).trim() === 'series') continue;
              var dVal = datasetRoot[dk];
              var dKey = String(dk).trim();
              if (!dKey) continue;
              try { pDS.setAttribute('data-' + dKey, String(dVal)); } catch {}
            }
          } catch {}
          svg.appendChild(pDS);
        }
      } else {
        for (var i = 0; i < series.length; i++){
          var name = String(series[i] || '').trim();
          if (!name) continue;
          var p = document.createElementNS(NS, 'path');
          p.setAttribute('d', 'M0,' + String(vh) + ' L' + String(vw) + ',' + String(vh));
          p.setAttribute('data-series', name);
          svg.appendChild(p);
        }
      }
    } else {
      svg = existingSvg || null;
    }

    try {
      if (svg && GH && typeof GH.addGrid === 'function'){
        // Grid automático según alto del SVG (≤90 → 3, >90 → 4)
        var size = GH.getSVGSize ? GH.getSVGSize(svg) : { width: vw, height: vh };
        var lines = (size.height <= 90) ? 3 : 4;
        GH.addGrid(svg, { lines: lines });
      }
    } catch {}

    // Inyectar el SVG cuando se haya construido por cualquiera de las formas
    if (hasSeries || hasPaths || hasDatasetSeries) {
      try { root.innerHTML = ''; } catch {}
      if (svg) root.appendChild(svg);
    } else {
      // overlay-only: no limpiar markup existente
    }

    // Overlay opcional (panel derecho): etiqueta flotante minimalista
    try {
      var ov = cfg && cfg.overlay;
      var txt = ov && typeof ov.text === 'string' ? ov.text : '';
      if (txt) {
        var label = root.querySelector(':scope > .label');
        if (!label) {
          label = document.createElement('div');
          label.className = 'label';
          var p = document.createElement('p');
          p.textContent = txt;
          label.appendChild(p);
          root.appendChild(label);
        } else {
          var pEl = label.querySelector('p');
          if (pEl) { pEl.textContent = txt; }
          else {
            var pNew = document.createElement('p');
            pNew.textContent = txt;
            label.appendChild(pNew);
          }
        }
      }
    } catch {}
    return svg;
  }

  /**
   * @example
   * // Hidratar todos los contenedores declarativos
   * GraphHydrator.init();
   */
  function init(){
    try {
      var sels = ['.tile-graph[data-graph]', '.panel-graph[data-graph]'];
      var nodes = document.querySelectorAll(sels.join(','));
      for (var i = 0; i < nodes.length; i++){
        var el = nodes[i];
        var raw = el.getAttribute('data-graph') || '{}';
        var cfg = {};
        try { cfg = JSON.parse(raw); } catch { cfg = {}; }
        try { build(el, cfg); } catch {}
      }
      // Precalcular todos los tamaños de gráficos después de hidratar
      var GH = (typeof window !== 'undefined') ? window.GraphHelper : null;
      if (GH && typeof GH.precomputeSizes === 'function'){
        try { GH.precomputeSizes(); } catch {}
      }
    } catch {}
  }

  window.GraphHydrator = { build: build, init: init };
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ try { init(); } catch {} });
  } else { try { init(); } catch {} }
})();