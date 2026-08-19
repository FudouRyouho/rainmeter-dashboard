(function(){
  /**
   * PanelBundle: envoltorio mínimo para suscripciones Heartbeat con paridad de panel.
   * Gating de visibilidad es opcional (desactivado por defecto) para no bloquear el panel izquierdo.
   * Mantiene `divider`, `phase` y `order` tal cual.
   * @example
   * PanelBundle.subscribe({ id: 'gpu-tick', panel: 'gpu', order: 18, phase: 'render', divider: 1, run: fn });
   * PanelBundle.subscribe({ id: 'gpu-tick', panel: 'gpu', gateVisibility: true, order: 18, phase: 'render', divider: 1, run: fn });
   * @param {{id:string, panel?:string, gateVisibility?:boolean, order?:number, phase?:'measure'|'compute'|'render', divider?:number, run:function}} opts
   */
  function PanelBundle(){ }
  PanelBundle.subscribe = function(opts){
    try {
      var HB = window.__HB;
      if (!HB || typeof HB.subscribe !== 'function') return;
      var id = (opts && typeof opts.id === 'string') ? opts.id : '';
      var run = (opts && typeof opts.run === 'function') ? opts.run : null;
      if (!id || !run) return;
      var order = (opts && typeof opts.order === 'number') ? opts.order : 100;
      var divider = (opts && typeof opts.divider === 'number') ? opts.divider : 1;
      var phase = (opts && (opts.phase === 'measure' || opts.phase === 'compute' || opts.phase === 'render')) ? opts.phase : 'render';
      var panel = (opts && typeof opts.panel === 'string') ? opts.panel : null;
      var gate = !!(opts && opts.gateVisibility === true);
      HB.subscribe({ id: id, divider: divider, phase: phase, order: order, run: function(ctx){
        try {
          // Solo aplicar gating si explícitamente habilitado.
          if (gate && panel && typeof HB.isVisible === 'function' && !HB.isVisible(panel)) return;
        } catch {}
        try { run(ctx); } catch {}
      } });
    } catch {}
  };
  window.PanelBundle = PanelBundle;
})();