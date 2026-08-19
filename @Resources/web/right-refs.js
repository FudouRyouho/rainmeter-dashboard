(function () {
  /**
   * RightRefs: gestiona referencias a paths SVG en paneles derechos,
   * priorizando atributos `data-<panel>-right` con fallback a `data-series`.
   *
   * @param {string} panel Nombre del panel (cpu|mem|gpu|disk|net)
   * @param {Object} spec Mapa lógico { key: { attr: string, series?: string } }
   */
  function RightRefs(panel, spec) {
    this.panel = String(panel || '').trim();
    this.spec = spec || {};
    this.paths = {};
    this._ready = false;
    this._acquirePaths();
  }

  RightRefs.prototype._getRoot = function () {
    try {
      var root = document.querySelector('.right-panel[data-panel="' + this.panel + '"]');
      return root || document;
    } catch { return document; }
  };

  /**
   * Adquiere paths una sola vez durante la inicialización
   */
  RightRefs.prototype._acquirePaths = function () {
    try {
      var root = this._getRoot();
      var attrName = 'data-' + this.panel + '-right';
      for (var key in this.spec) {
        var cfg = this.spec[key] || {};
        var attrVal = String(cfg.attr || key);
        var series = cfg.series ? String(cfg.series) : null;
        var el = null;
        try { el = root.querySelector('path[' + attrName + '="' + attrVal + '"]'); } catch { }
        if (!el && series) {
          try { el = root.querySelector('path[data-series="' + series + '"]'); } catch { }
        }
        this.paths[key] = el || null;
      }
      this._ready = Object.keys(this.paths).some(function (k) { return !!this.paths[k]; }.bind(this));
    } catch { }
  };

  /**
   * Retorna las referencias adquiridas (sin re-adquisición)
   * @returns {{paths: Object<string, Element|null>, ready: boolean}}
   */
  RightRefs.prototype.getReferences = function () {
    // Solo retornar lo que realmente se usa - eliminar overhead de re-adquisición
    return { paths: this.paths, ready: this._ready };
  };

  window.RightRefs = RightRefs;
})();