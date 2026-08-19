/**
 * Memory consumption test after eliminating the unmounting system
 * @returns {Object} Memory usage statistics
 * @example
 * const stats = testMemoryConsumption();
 * console.log('Memory usage:', stats);
 */
function testMemoryConsumption() {
  if (typeof performance === 'undefined' || !performance.memory) {
    return { error: 'performance.memory not available in this environment' };
  }
  
  return {
    usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
    totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
    jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100,
    timestamp: new Date().toISOString()
  };
}

/**
 * Monitor memory usage over time
 * @param {number} duration - Duration in milliseconds to monitor
 * @param {number} interval - Interval in milliseconds between measurements
 * @returns {Array} Array of memory measurements
 * @example
 * const measurements = monitorMemoryUsage(5000, 1000);
 * // Returns 5 measurements over 5 seconds
 */
function monitorMemoryUsage(duration, interval) {
  var measurements = [];
  var startTime = Date.now();
  var measure = function() {
    var stats = testMemoryConsumption();
    measurements.push(stats);
    
    if (Date.now() - startTime < duration) {
      setTimeout(measure, interval);
    } else {
      console.log('Memory monitoring complete:', measurements);
    }
  };
  measure();
  return measurements;
}

// Exponer funciones globalmente para pruebas
window.testMemoryConsumption = testMemoryConsumption;
window.monitorMemoryUsage