(function () {
  var on = false;
  try { if (typeof location !== 'undefined' && /(?:\?|&)debug=(?:1|true)\b/i.test(location.search)) { on = true; } } catch { }
  var cfg = { limitPerResource: 3 };
  var store = { measures: {}, fields: {}, states: {} };

  function enabled() { return on; }
  function enable(flag, limit) { on = !!flag; if (typeof limit === 'number' && limit > 0) cfg.limitPerResource = limit; }
  function log(tag, payload) { if (!on) return; try { console.log('[DebugLogger]', tag, payload); } catch { } }
  function warn(msg) { if (!on) return; try { console.warn('[DebugLogger]', msg); } catch { } }

  function _push(map, key, entry) {
    var arr = map[key];
    if (!arr) { arr = []; map[key] = arr; }
    if (arr.length < cfg.limitPerResource) { arr.push(entry); }
  }

  function logMeasure(resource, payload) { if (!on) return; try { _push(store.measures, resource, { ts: Date.now(), payload: payload }); } catch { } }
  function logSetField(key, value, rootId, found) { if (!on) return; try { _push(store.fields, rootId || 'document', { ts: Date.now(), key: key, value: value, found: !!found }); } catch { } }
  function logSetState(key, value, cfgKey, rootId, found) { if (!on) return; try { _push(store.states, rootId || 'document', { ts: Date.now(), key: key, value: value, cfgKey: cfgKey, found: !!found }); } catch { } }

  function dump() { try { console.log('[DebugLogger] measures', JSON.stringify(store.measures)); console.log('[DebugLogger] fields', JSON.stringify(store.fields)); console.log('[DebugLogger] states', JSON.stringify(store.states)); } catch { } }
  function get() { return { measures: store.measures, fields: store.fields, states: store.states, config: { on, cfg } }; }
  function download() { try { var blob = new Blob([JSON.stringify(get(), null, 2)], { type: 'application/json' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'debug-log.json'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); document.body.removeChild(a); }, 0); } catch { } }

  window.DebugLogger = { enable, enabled, log, warn, logMeasure, logSetField, logSetState, dump, get, download };
})();