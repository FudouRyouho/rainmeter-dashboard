(function () {
  function _getAlertProp(keys, prop) {
    try {
      var src = window.ALERT_INDEX;
      var arr = Array.isArray(keys) ? keys : [keys];
      for (var i = 0; i < arr.length; i++) {
        var k = String(arr[i]);
        if (src && src[k] && (src[k][prop] != null)) { return Number(src[k][prop]); }
      }
      return null;
    } catch { return null; }
  }

  function capacity(keys, fallback) {
    var v = _getAlertProp(keys, 'capacity');
    return (v == null ? Number(fallback) : v);
  }

  function crit(keys, fallback) {
    var v = _getAlertProp(keys, 'crit');
    return (v == null ? Number(fallback) : v);
  }

  function stabilizeList(prevArr, currArr, orderCostMax, valueDeltaThreshold) {
    try {
      if (!prevArr || prevArr.length === 0) return currArr;
      var idxPrev = {}; for (var i = 0; i < prevArr.length; i++) { idxPrev[prevArr[i].name] = i; }
      var cost = 0; var smallChange = true;
      for (var j = 0; j < currArr.length; j++) {
        var it = currArr[j]; var pi = idxPrev[it.name];
        if (typeof pi === 'number') { cost += Math.abs(pi - j); }
        var p = prevArr.find(function (x) { return x.name === it.name; });
        if (p) { var dv = Math.abs((Number(p.value) || 0) - (Number(it.value) || 0)); if (dv > valueDeltaThreshold) smallChange = false; }
      }
      if (cost <= Number(orderCostMax) && smallChange) return prevArr;
      return currArr;
    } catch { return currArr; }
  }

  window.ScaleUtils = { capacity, crit, stabilizeList };
})();