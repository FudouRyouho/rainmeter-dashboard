(function(){
  class Heartbeat {
    constructor(periodMs, ctxFactory){
      this.periodMs = Math.max(1, Number(periodMs)||1000);
      this.ctxFactory = typeof ctxFactory === 'function' ? ctxFactory : (function(){
        return {
          now: (typeof performance!=='undefined' && performance.now ? performance.now() : Date.now()),
          isVisible: function(panelId){
            try {
              var el = document.querySelector('[data-panel="'+panelId+'"]') || document.getElementById(panelId);
              if (!el) return false;
              var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
              if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0)) return false;
              var r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
              if (!r) return true;
              var vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
              var vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
              return !(r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw);
            } catch { return true; }
          }
        };
      });
      this.subs = [];
      this.running = false;
      this.tickCount = 0;
      this._timer = null;
      this.instrument = false;
      this.metrics = { lastTick: { start: 0, end: 0, phases: { measure: 0, compute: 0, render: 0 }, total: 0 }, subs: {} };
      this.renderBudgetMs = Math.floor(this.periodMs * 0.6);
      this.logPhases = { measure: false, compute: false, render: false };
      this.onOverrun = null;
      Heartbeat._overlay = Heartbeat._overlay || null;
      this.firstTickMode = 'ready';
      this.firstTickDebounceMs = 250;
      this.firstTickMaxWaitMs = 1200;
      this.firstTickExtraWaitMs = 250;
      try {
    var devOn = !!(typeof window !== 'undefined' && (window.__HB_DEV || (typeof localStorage !== 'undefined' && localStorage.getItem('__HB_DEV') === '1')));
    try {
      if (window.DebugLogger && typeof window.DebugLogger.enable === 'function') {
        window.DebugLogger.enable(!!devOn, 100);
      }
    } catch {}
        if (devOn) {
          this.instrument = true;
          var devLog = !!(typeof window !== 'undefined' && (window.__HB_DEV_LOG || (typeof localStorage !== 'undefined' && localStorage.getItem('__HB_DEV_LOG') === '1')));
          if (devLog) { this.logPhases = { measure: true, compute: true, render: true }; }
    var overlayFlag = (typeof window !== 'undefined' && typeof window.__HB_DEV_OVERLAY !== 'undefined') ? !!window.__HB_DEV_OVERLAY : false;
          Heartbeat._overlayEnabled = overlayFlag;
          if (overlayFlag) { Heartbeat._overlay = null; }
          var budgetFrac = (typeof window !== 'undefined' && typeof window.__HB_DEV_BUDGET === 'number') ? window.__HB_DEV_BUDGET : null;
          if (budgetFrac && budgetFrac > 0 && budgetFrac <= 1) { this.renderBudgetMs = Math.floor(this.periodMs * budgetFrac); }
        } else {
          Heartbeat._overlayEnabled = false;
        }
      } catch {}
    }
    isVisible(panelId){
      try {
        if (!panelId) return true;
        // Priorizar el panel derecho real; evitar confundir bloques del header con el panel
        var el = document.querySelector('.dashboard-right .right-panel[data-panel="'+panelId+'"]')
          || document.getElementById(panelId)
          || document.querySelector('[data-panel="'+panelId+'"]');
        if (!el) return false;
        var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
        if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0)) return false;
        var r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        if (!r) return true;
        var vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        var vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        return !(r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw);
      } catch { return true; }
    }
    subscribe(a, b, c){
      var s = null;
      if (a && typeof a === 'object' && typeof a.run === 'function') {
        s = {
          id: (typeof a.id === 'string' && a.id) ? a.id : (typeof a.name === 'string' ? a.name : ''),
          divider: (typeof a.divider === 'number') ? a.divider : 1,
          phase: (a.phase === 'measure' || a.phase === 'compute' || a.phase === 'render') ? a.phase : 'render',
          order: (typeof a.order === 'number') ? a.order : 100,
          run: a.run
        };
      } else if (typeof a === 'string' && typeof b === 'function') {
        var opts = c || {};
        s = {
          id: (typeof opts.id === 'string' && opts.id) ? opts.id : (typeof opts.name === 'string' ? opts.name : ('sub_' + Math.random().toString(36).slice(2))),
          divider: (typeof opts.divider === 'number') ? opts.divider : 1,
          phase: (a === 'measure' || a === 'compute' || a === 'render') ? a : 'render',
          order: (typeof opts.order === 'number') ? opts.order : 100,
          run: b
        };
      }
      if (!s || !s.id || typeof s.run !== 'function') return;
      if (typeof s.divider !== 'number') s.divider = 1;
      if (s.phase !== 'measure' && s.phase !== 'compute' && s.phase !== 'render') s.phase = 'render';
      if (typeof s.order !== 'number') s.order = 100;
      this.unsubscribe(s.id);
      this.subs.push(s);
    }
    unsubscribe(id){
      if (!id) return;
      this.subs = this.subs.filter(function(x){ return x.id !== id; });
    }
    start(){
      if (this.running) return;
      this.running = true;
      var self = this;
      var gateMode = this.firstTickMode === 'time' ? 'time' : 'ready';
      var tStart = Date.now();
      var fallbackUsed = false;
      function begin(){
        try {
          if ((typeof window !== 'undefined' && (window.__HB_DEV || (typeof localStorage !== 'undefined' && localStorage.getItem('__HB_DEV') === '1')))
              && window.DebugLogger && typeof window.DebugLogger.log === 'function'){
            window.DebugLogger.log('HB:firstTick', { waitedMs: (Date.now() - tStart), mode: gateMode, fallback: fallbackUsed });
          }
        } catch {}
        var extraDelay = Math.max(0, Number(self.firstTickExtraWaitMs)||0);
        var startTick = function(){ self._tick(); self._timer = setInterval(function(){ self._tick(); }, self.periodMs); };
        if (extraDelay > 0) { setTimeout(startTick, extraDelay); }
        else { startTick(); }
      }

      if (gateMode === 'time'){
        var delay = Math.max(0, Number(this.firstTickDebounceMs)||0);
        setTimeout(begin, delay);
        return;
      }
      var started = false;
      var pollMs = 150;
      var maxWait = Math.max(0, Number(this.firstTickMaxWaitMs)||1200);
      var failTimer = setTimeout(function(){ if (!started){ started = true; fallbackUsed = true; begin(); } }, maxWait);
      try {
        if (typeof window !== 'undefined' && window.RainmeterUtils && typeof window.RainmeterUtils.whenReady === 'function'){
          window.RainmeterUtils.whenReady(function(){ if (!started){ try{ clearTimeout(failTimer); }catch{} started = true; begin(); } }, pollMs);
        } else {
          (function check(){
            var api = null;
            try {
              api = window.RainmeterAPI || (window.chrome && window.chrome.webview && window.chrome.webview.hostObjects && window.chrome.webview.hostObjects.sync && window.chrome.webview.hostObjects.sync.RainmeterAPI);
            } catch {}
            if (api){ if (!started){ try{ clearTimeout(failTimer); }catch{} started = true; begin(); } }
            else { setTimeout(check, pollMs); }
          })();
        }
      } catch {
        begin();
      }
    }
    stop(){
      if (!this.running) return;
      this.running = false;
      if (this._timer) { try { clearInterval(this._timer); } catch {} this._timer = null; }
    }
    _tick(){
      try {
        this.tickCount++;
        var t0 = (typeof performance!=='undefined' && performance.now ? performance.now() : Date.now());
        var ctx = this._createCtxSafe();
        var p0 = (typeof performance!=='undefined' && performance.now ? performance.now() : Date.now());
        this._runPhase('measure', ctx);
        var p1 = (typeof performance!=='undefined' && performance.now ? performance.now() : Date.now());
        this._runPhase('compute', ctx);
        var p2 = (typeof performance!=='undefined' && performance.now ? performance.now() : Date.now());
        this._runPhase('render',  ctx);
        var t1 = (typeof performance!=='undefined' && performance.now ? performance.now() : Date.now());
        this.metrics.lastTick.start = t0;
        this.metrics.lastTick.end = t1;
        this.metrics.lastTick.phases.measure = (p1 - p0);
        this.metrics.lastTick.phases.compute = (p2 - p1);
        this.metrics.lastTick.phases.render  = (t1 - p2);
        this.metrics.lastTick.total = (t1 - t0);
        if (this.instrument && window.DebugLogger && window.DebugLogger.log) {
          try {
            var msg = { tick: this.tickCount, total: this.metrics.lastTick.total };
            if (this.logPhases.measure) msg.measure = this.metrics.lastTick.phases.measure;
            if (this.logPhases.compute) msg.compute = this.metrics.lastTick.phases.compute;
            if (this.logPhases.render)  msg.render  = this.metrics.lastTick.phases.render;
            window.DebugLogger.log('HB', msg);
          } catch {}
        }
        var overPhase = this.metrics.lastTick.phases.render > this.renderBudgetMs;
        var overTotal = this.metrics.lastTick.total > this.periodMs;
        if (overPhase || overTotal) {
          try {
            if (!window.__HB_OVERRUN) window.__HB_OVERRUN = { total: 0, render: 0 };
            if (overTotal) window.__HB_OVERRUN.total++;
            if (overPhase) window.__HB_OVERRUN.render++;
            if (typeof this.onOverrun === 'function') { this.onOverrun({ tick: this.tickCount, phases: this.metrics.lastTick.phases, total: this.metrics.lastTick.total, periodMs: this.periodMs }); }
            if (this.instrument && Heartbeat._overlayEnabled) this._showOverrunOverlay();
          } catch {}
        }
      } catch(e) {
        try { if (window.DebugLogger && window.DebugLogger.log) window.DebugLogger.log('Heartbeat tick error', e); } catch {}
      }
    }

    _createCtxSafe(){
      try { return this.ctxFactory(); } catch(e){ return { now: (typeof performance!=='undefined' && performance.now ? performance.now() : Date.now()) }; }
    }
    _runPhase(phase, ctx){
      try {
        var list = this.subs
          .filter(function(s){
            if (s.phase !== phase) return false;
            if (s.divider === -1) return false;
            var d = Math.max(1, s.divider|0);
            return (this.tickCount % d) === 0;
          }, this)
          .sort(function(a,b){ return a.order - b.order; });
        for (var i = 0; i < list.length; i++){
          var s = list[i];
          try { s.run(ctx); } catch(e){ try { if (window.DebugLogger && window.DebugLogger.log) window.DebugLogger.log('Heartbeat subscriber error: '+s.id, e); } catch {} }
        }
      } catch(e){ try { if (window.DebugLogger && window.DebugLogger.log) window.DebugLogger.log('Heartbeat phase error: '+phase, e); } catch {} }
    }
    _showOverrunOverlay(){
      try {
        if (!Heartbeat._overlay) {
          var el = document.createElement('div');
          el.setAttribute('data-hb-overlay', 'true');
          el.style.position = 'fixed';
          el.style.top = '4px';
          el.style.right = '4px';
          el.style.width = '8px';
          el.style.height = '8px';
          el.style.borderRadius = '50%';
          el.style.background = '#ff5252';
          el.style.opacity = '0.8';
          el.style.zIndex = '9999';
          document.body.appendChild(el);
          Heartbeat._overlay = el;
        } else {
          Heartbeat._overlay.style.background = '#ff5252';
        }
      } catch {}
    }
  }

  if (typeof window !== 'undefined'){
    window.Heartbeat = { Heartbeat: Heartbeat };
  }
})();