(function () {
  try {
    if (!window.HeartbeatInstance && window.Heartbeat && window.Heartbeat.Heartbeat) {
      var hb = new window.Heartbeat.Heartbeat(1000);
      hb.firstTickMode = 'ready';
      hb.firstTickExtraWaitMs = 500;
      
      // Estandarización v0.0.2: Usar HeartbeatInstance como nombre oficial
      window.HeartbeatInstance = hb;
      window.__HB = hb; // Retrocompatibilidad
      
      hb.start();
    }
  } catch (e) {
    try { if (window.DebugLogger && window.DebugLogger.log) window.DebugLogger.log('bootstrap-hb error', e); } catch { }
  }
})();