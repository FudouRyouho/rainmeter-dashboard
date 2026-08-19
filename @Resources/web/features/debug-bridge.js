/**
 * DebugBridge v0.0.5 - Herramienta de Diagnóstico de Transparencia de Datos
 * ----------------------------------------------------------------------
 * Este módulo imprime en la consola los valores RAW que llegan de Rainmeter 
 * cada 5 segundos. Útil para verificar si un sensor (HWiNFO) está enviando 
 * datos válidos o si el ID es incorrecto.
 */
(function() {
    var U = window.RainmeterUtils;
    
    function logSensors() {
        U.whenReady(function(api) {
            console.groupCollapsed('%c[RM-DEBUG] Auditoría de Sensores RAW (Ciclo 5s)', 'color: #00bcd4; font-weight: bold;');
            
            var sensors = [
                { id: 'CPU_TEMP_C', label: 'CPU Temp' },
                { id: 'CPU_CLOCK_MHZ', label: 'CPU Clock' },
                { id: 'GPU_USAGE', label: 'GPU Usage' },
                { id: 'GPU_TEMP_C', label: 'GPU Temp' },
                { id: 'GPU_VRAM_DED_USED_MB', label: 'VRAM Used' },
                { id: 'GPU_VRAM_TOT_USED_MB', label: 'VRAM Allocated' },
                { id: 'CPU_VCORE_V', label: 'CPU VCore' },
                { id: 'CPU_FAN_RPM', label: 'CPU Fan' }
            ];

            sensors.forEach(function(s) {
                var m = U.getMeasure(api, s.id);
                var val = m ? m.getNumber() : 'NULL';
                var color = (val === 0 || val === 'NULL') ? 'color: #ff5252' : 'color: #8bc34a';
                console.log('%c> ' + s.label + ' (' + s.id + '): ' + val, color);
            });

            console.groupEnd();
        });
    }

    // Ejecutar cada 5 segundos
    setInterval(logSensors, 5000);
    // Ejecución inicial rápida
    setTimeout(logSensors, 1500);

})();
