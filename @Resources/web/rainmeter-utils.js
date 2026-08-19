/**
 * RainmeterUtils v0.0.4 (API Khanhas + UI Helpers integrados)
 * -----------------------------------------------------------
 * Proporciona un puente avanzado a Rainmeter, respetando los métodos 
 * C# nativos (GetValue/GetString) y exponiendo todos los helpers 
 * visuales de interfaz (setField, setState, etc.) que los bundles requieren.
 */

(function (window) {
  'use strict';

  // --- Capa de Comunicación con Rainmeter ---

  var _measureCache = {};

  function findNativeAPI() {
    try {
      if (window.RainmeterAPI) return window.RainmeterAPI;
      if (window.RM) return window.RM;

      var sync = (window.chrome && window.chrome.webview && window.chrome.webview.hostObjects && window.chrome.webview.hostObjects.sync);
      if (sync) {
        var aliases = ['RM', 'RainmeterAPI', 'Rainmeter'];
        for (var i = 0; i < aliases.length; i++) {
          try {
            var proxy = sync[aliases[i]];
            if (proxy) return proxy;
          } catch (e) { }
        }
      }
    } catch (e) { }
    
    // Auditoría v0.0.2: Retornar un objeto mock mínimo para prevenir crashes
    return {
      GetMeasure: function() { return { GetValue: function(){return 0;}, GetString: function(){return "";}, Update: function(){} }; },
      Execute: function(b) { console.log("[RM Fallback] Execute:", b); }
    };
  }

  function MeasureWrapper(name, nativeObj) {
    this.name = name;
    this.native = nativeObj;
    this.ok = !!nativeObj;
  }

  MeasureWrapper.prototype.getValue = function () {
    if (!this.native) return 0;
    try {
      // Intento directo sin comprobación de tipo para evitar proxies perezosos de WebView2
      try { return this.native.GetValue(); } catch(e1) {
        try { return this.native.GetNumber(); } catch(e2) {
          if (this.native.DoubleValue !== undefined) return this.native.DoubleValue;
          return 0;
        }
      }
    } catch (e) { return 0; }
  };

  MeasureWrapper.prototype.getString = function () {
    if (!this.native) return "";
    try {
      try { return this.native.GetString(); } catch(e1) {
        if (this.native.StringValue !== undefined) return this.native.StringValue;
        return "";
      }
    } catch (e) { return ""; }
  };

  MeasureWrapper.prototype.getNumber = function() { return this.getValue(); };

  MeasureWrapper.prototype.update = function () {
    // DESACTIVADO: Evitar saturación del plugin con Bangs !UpdateMeasure.
    // Rainmeter ya actualiza las medidas cada ciclo con UpdateDivider=1.
  };

  var Rainmeter = {
    _api: null,
    
    getMeasure: function (name) {
      if (!this._api) this._api = findNativeAPI();
      if (!this._api) return new MeasureWrapper(name, null);

      if (_measureCache[name]) return _measureCache[name];

      try {
        var nativeM = this._api.GetMeasure(name);
        if (!nativeM) nativeM = this._api.GetMeasure(name.toLowerCase());
        
        var wrapper = new MeasureWrapper(name, nativeM);
        if (wrapper.ok) _measureCache[name] = wrapper;
        return wrapper;
      } catch (e) {
        return new MeasureWrapper(name, null);
      }
    },

    whenReady: function (cb) {
      var self = this;
      var api = findNativeAPI();
      if (!api) {
        setTimeout(function () { self.whenReady(cb); }, 200);
        return;
      }
      this._api = api;
      setTimeout(function () { 
        if (!window.__RM_DIAGNOSED) {
          window.__RM_DIAGNOSED = true;
          console.info('%c[RainmeterAPI] Conectado exitosamente.', 'color: #4caf50; font-weight: bold;');
        }
        cb(api); 
      }, 300);
    }
  };

  // --- Capa de UI (Helpers) ---

  function setField(key, value, root) {
    var ctx = root || document;
    var el = ctx.querySelector('[data-field="' + key + '"]');
    if (!el) {
      var mDot = /^disk(\d+)\.(.+)$/.exec(key);
      var mDash = /^disk-(\d+)-(.+)$/.exec(key);
      var idx = null, rest = null;
      if (mDot) { idx = mDot[1]; rest = mDot[2]; }
      else if (mDash) { idx = mDash[1]; rest = mDash[2]; }
      if (idx !== null && rest) {
        var isTileCtx = (ctx !== document) && ctx.getAttribute && ctx.getAttribute('data-disk') === String(idx);
        if (isTileCtx) { el = ctx.querySelector('[data-field="disk.' + rest + '"]'); }
        if (!el) { el = document.querySelector('[data-disk="' + idx + '"] [data-field="disk.' + rest + '"]'); }
      }
    }
    if (el) el.textContent = String(value);
  }

  function setState(key, value, cfgKey, root) {
    var ctx = root || document;
    var el = ctx.querySelector('[data-field="' + key + '"]');
    if (!el) {
      var mDot = /^disk(\d+)\.(.+)$/.exec(key);
      var mDash = /^disk-(\d+)-(.+)$/.exec(key);
      var idx = null, rest = null;
      if (mDot) { idx = mDot[1]; rest = mDot[2]; }
      else if (mDash) { idx = mDash[1]; rest = mDash[2]; }
      if (idx !== null && rest) {
        var isTileCtx = (ctx !== document) && ctx.getAttribute && ctx.getAttribute('data-disk') === String(idx);
        if (isTileCtx) { el = ctx.querySelector('[data-field="disk.' + rest + '"]'); }
        if (!el) { el = document.querySelector('[data-disk="' + idx + '"] [data-field="disk.' + rest + '"]'); }
      }
    }
    if (!el) return;
    try { 
      var st = window.AlertHelper && window.AlertHelper.computeState(value, window.ALERT_INDEX && window.ALERT_INDEX[cfgKey]); 
      if (st) window.AlertHelper.assignState(el, st); 
    } catch (e) { }
  }

  function setPathD(el, d) {
    if (el) el.setAttribute('d', d);
  }

  function getRightRoot(panelName) {
    try { return document.querySelector('.dashboard-body [data-panel="' + panelName + '"]') || document; } catch(e) { return document; }
  }

  function getRightField(panelName, fieldName) {
    return panelName + '-right-' + fieldName;
  }

  function bytesToGB(x) { return Math.round((Number(x) / 1073741824) * 10) / 10; }
  function bytesToKBps(x) { return Number(x) / 1024; }

  function getMeasures(api, names) {
    return names.map(function (n) { return Rainmeter.getMeasure(n); });
  }

  function updateAll(measures) {
    for (var k in measures) {
      var m = measures[k];
      if (m) {
        if (Array.isArray(m)) {
          for (var i = 0; i < m.length; i++) { if (m[i] && m[i].update) m[i].update(); }
        } else if (typeof m.update === 'function') {
          m.update();
        }
      }
    }
  }

  // Exponer API y utilidades unificadas
  window.Rainmeter = Rainmeter;
  window.RainmeterUtils = {
    getAPI: findNativeAPI,
    whenReady: Rainmeter.whenReady.bind(Rainmeter),
    getMeasure: function (api, name) { return Rainmeter.getMeasure(name); },
    getMeasures: getMeasures,
    updateAll: updateAll,
    setField: setField,
    setState: setState,
    setPathD: setPathD,
    getRightRoot: getRightRoot,
    getRightField: getRightField,
    bytesToGB: bytesToGB,
    bytesToKBps: bytesToKBps
  };

})(window);