(function () {
    var _SIZE_CACHE = new WeakMap();
    /**
     * @param {number} capacity - Capacidad máxima del buffer circular
     * @returns {Object} Anillo de datos con buffer circular
     * @example
     * const ring = createRing(60);
     * // Devuelve: { buf: [0,0,0,...,0], idx: 0, len: 60 }
     */
    function createRing(capacity) {
        return { buf: new Array(capacity).fill(0), idx: 0, len: capacity };
    }
    /**
     * @param {Object} r - Anillo de datos
     * @param {number} v - Valor a insertar
     * @example
     * const ring = createRing(3);
     * push(ring, 25.5);
     * // ring: { buf: [25.5,0,0], idx: 1, len: 3 }
     */
    function push(r, v) {
        r.buf[r.idx] = v;
        r.idx = (r.idx + 1) % r.len;
    }
    /**
     * @param {Object} r - Anillo de datos
     * @param {number} v - Valor para llenar todo el buffer
     * @example
     * const ring = createRing(3);
     * fillRing(ring, 100);
     * // ring: { buf: [100,100,100], idx: 0, len: 3 }
     */
    function fillRing(r, v) {
        try {
            var val = Number(v) || 0;
            for (var i = 0; i < r.len; i++) r.buf[i] = val;
            r.idx = 0;
        } catch { }
    }
    /**
     * @param {Object} r - Anillo de datos
     * @returns {number[]} Array con todos los valores del buffer
     * @example
     * const ring = { buf: [10,20,30], idx: 1, len: 3 };
     * const vals = values(ring);
     * // Devuelve: [20,30,10]
     */
    function values(r) {
        const out = new Array(r.len);
        for (let i = 0; i < r.len; i++) out[i] = r.buf[(r.idx + i) % r.len];
        return out;
    }

    /**
     * @param {number} x - Valor a normalizar
     * @param {number} min - Valor mínimo del rango
     * @param {number} max - Valor máximo del rango
     * @returns {number} Valor normalizado entre 0 y 1
     * @example
     * normalize(75, 0, 100); // Devuelve: 0.75
     * normalize(25, 0, 100); // Devuelve: 0.25
     */
    function normalize(x, min, max) {
        if (max === min) return 0;
        const v = (x - min) / (max - min);
        return Math.max(0, Math.min(1, v));
    }

    /**
     * @param {number} x - Valor a normalizar
     * @param {number} min - Valor mínimo del rango
     * @param {number} max - Valor máximo del rango
     * @returns {number} Valor normalizado logarítmicamente entre 0 y 1
     * @example
     * normalizeLog(100, 1, 1000); // Devuelve: ~0.67
     * normalizeLog(10, 1, 100);  // Devuelve: 0.5
     */
    function normalizeLog(x, min, max) {
        try {
            const xm = Math.max(min, Math.min(max, Number(x) || 0));
            if (max <= 0 || min <= 0 || max === min) return 0;
            const logMin = Math.log10(min);
            const logMax = Math.log10(max);
            const denom = (logMax - logMin);
            if (!denom) return 0;
            const v = (Math.log10(xm) - logMin) / denom;
            return Math.max(0, Math.min(1, v));
        } catch { return 0; }
    }

    /**
     * @param {Object} ring - Anillo de datos
     * @returns {number} Valor máximo en el buffer
     * @example
     * const ring = { buf: [10,50,30], idx: 0, len: 3 };
     * ringMax(ring); // Devuelve: 50
     */
    function ringMax(ring) {
        let m = -Infinity;
        for (let i = 0; i < ring.len; i++) {
            const v = ring.buf[(ring.idx + i) % ring.len];
            if (v > m) m = v;
        }
        return (m === -Infinity) ? 0 : m;
    }

    /**
     * @param {number[]} valsNorm - Array de valores normalizados (0-1)
     * @param {number} width - Ancho del SVG
     * @param {number} height - Alto del SVG
     * @param {number} padTop - Padding superior
     * @param {number} padBottom - Padding inferior
     * @param {number} [padLeft=0] - Padding izquierdo
     * @param {number} [padRight=0] - Padding derecho
     * @returns {string} Path SVG para gráfico de líneas
     * @example
     * const path = toPath([0, 0.5, 1, 0.5], 100, 60, 2, 2);
     * // Devuelve: "M0,56 L50,36 L100,16 L50,36"
     */
    function toPath(valsNorm, width, height, padTop, padBottom, padLeft = 0, padRight = 0) {
        const effH = height - padTop - padBottom;
        const effW = width - padLeft - padRight;
        const n = valsNorm.length;
        const baselineY = Math.round(height - padBottom);
        if (n <= 1) return `M${padLeft},${baselineY} L${width - padRight},${baselineY}`;
        const step = effW / (n - 1);
        let d = '';
        for (let i = 0; i < n; i++) {
            const x = Math.round(padLeft + i * step);
            const y = Math.round(height - padBottom - valsNorm[i] * effH);
            d += (i === 0 ? 'M' : ' L') + x + ',' + y;
        }
        return d;
    }

    /**
     * @param {Object} ring - Anillo de datos
     * @param {number} width - Ancho del SVG
     * @param {number} height - Alto del SVG
     * @param {number} padTop - Padding superior
     * @param {number} padBottom - Padding inferior
     * @param {number} [padLeft=0] - Padding izquierdo
     * @param {number} [padRight=0] - Padding derecho
     * @param {number} [min=0] - Valor mínimo para normalización
     * @param {number} [max=1] - Valor máximo para normalización
     * @returns {string} Path SVG para gráfico de líneas
     * @example
     * const ring = { buf: [0, 50, 100], idx: 0, len: 3 };
     * const path = toPathFromRing(ring, 100, 60, 2, 2, 0, 0, 0, 100);
     * // Devuelve: "M0,56 L50,36 L100,16"
     */
    function toPathFromRing(ring, width, height, padTop, padBottom, padLeft = 0, padRight = 0, min = 0, max = 1) {
        const effH = height - padTop - padBottom;
        const effW = width - padLeft - padRight;
        const n = ring.len;
        const baselineY = Math.round(height - padBottom);
        if (n <= 1) return `M${padLeft},${baselineY} L${width - padRight},${baselineY}`;
        const step = effW / (n - 1);
        const denom = (max - min);
        let d = '';
        for (let i = 0; i < n; i++) {
            const raw = ring.buf[(ring.idx + i) % ring.len];
            let v = denom ? (raw - min) / denom : 0;
            if (v < 0) v = 0; else if (v > 1) v = 1;
            const x = Math.round(padLeft + i * step);
            const y = Math.round(height - padBottom - v * effH);
            d += (i === 0 ? 'M' : ' L') + x + ',' + y;
        }
        return d;
    }

    /**
     * @param {SVGElement} svgEl - Elemento SVG
     * @returns {Object} Tamaño del SVG {width, height}
     * @example
     * const svg = document.querySelector('svg');
     * const size = getSVGSize(svg);
     * // Devuelve: { width: 100, height: 60 }
     */
    function getSVGSize(svgEl) {
        try {
            const vb = svgEl.getAttribute('viewBox');
            if (vb) {
                const parts = vb.split(/\s+/).map(Number);
                if (parts.length === 4) return { width: parts[2], height: parts[3] };
            }
            
            const rect = svgEl.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                return { width: rect.width, height: rect.height };
            }
        } catch (e) { }
        return { width: 100, height: 60 };
    }

    /**
     * @param {SVGPathElement} path - Elemento path SVG
     * @returns {Object} Tamaño del SVG contenedor {width, height}
     * @example
     * const path = document.querySelector('path[data-series="cpu-usage"]');
     * const size = getSizeForPath(path);
     * // Devuelve: { width: 100, height: 60 }
     */
    function getSizeForPath(path) {
        try {
            if (!path) return { width: 100, height: 60 };
            // 1. Intentar recuperación desde cache (rápido)
            const cached = _SIZE_CACHE.get(path);
            if (cached) return cached;

            // 2. Si no hay cache, calcular en tiempo real desde el SVG padre
            const svg = path.closest('svg');
            const size = svg ? getSVGSize(svg) : { width: 100, height: 60 };
            
            // 3. Guardar en cache para la próxima vez
            _SIZE_CACHE.set(path, size);
            return size;
        } catch { }
        return { width: 100, height: 60 };
    }

    /**
     * @param {SVGElement} svgEl - Elemento SVG
     * @param {Object} [opts] - Opciones de configuración
     * @param {number} [opts.lines=4] - Número de líneas de grid
     * @example
     * const svg = document.querySelector('svg');
     * addGrid(svg, { lines: 5 });
     * // Añade grid con 5 líneas horizontales al SVG
     */
    function addGrid(svgEl, opts) {
        try {
            const n = (opts && opts.lines) ? Math.max(1, Math.floor(opts.lines)) : 4;
            const size = getSVGSize(svgEl);
            let g = svgEl.querySelector('g.grid');
            if (!g) {
                g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('class', 'grid');
                if (svgEl.firstChild) svgEl.insertBefore(g, svgEl.firstChild);
                else svgEl.appendChild(g);
            }
            while (g.firstChild) g.removeChild(g.firstChild);
            const stepY = size.height / (n + 1);
            for (let i = 1; i <= n; i++) {
                const y = Math.round(i * stepY);
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', '0');
                line.setAttribute('y1', String(y));
                line.setAttribute('x2', String(size.width));
                line.setAttribute('y2', String(y));
                line.setAttribute('class', 'gridline');
                g.appendChild(line);
            }
        } catch { }
    }


    /**
     * Precalcula todos los tamaños de paths al inicio para evitar lookups en runtime
     * @returns {void}
     * @example
     * precomputeSizes();
     * // Precalcula todos los tamaños de gráficos
     */
    function precomputeSizes() {
        try {
            // Lista completa de todos los posibles data-series de gráficos
            const seriesList = [
                'cpu-usage', 'cpu-clock', 'cpu-temp', 'cpu-vcore', 'cpu-fan',
                'gpu-usage', 'gpu-clock', 'gpu-temp', 'gpu-vram', 'gpu-sram', 'gpu-vcore', 'gpu-fan-rpm', 'gpu-vram-clock',
                'mem-phys', 'mem-virt', 'mem-swap', 'mem-cache',
                'net-up', 'net-down',
                'disk-usage', 'disk-latency', 'disk-read', 'disk-write', 'read-pct', 'write-pct'
            ];

            // Buscar todos los paths de gráficos
            const allPaths = document.querySelectorAll('path[data-series]');

            allPaths.forEach(path => {
                const series = path.getAttribute('data-series');
                if (series && seriesList.includes(series)) {
                    const svg = path.closest('svg');
                    const size = svg ? getSVGSize(svg) : { width: 100, height: 60 };
                    _SIZE_CACHE.set(path, size);
                }
            });

            // También precalcular paths en paneles derechos
            const rightPanelPaths = document.querySelectorAll('.right-panel path[data-series]');
            rightPanelPaths.forEach(path => {
                const svg = path.closest('svg');
                const size = svg ? getSVGSize(svg) : { width: 100, height: 60 };
                _SIZE_CACHE.set(path, size);
            });

        } catch { }
    }

    // Auto-precalcular cuando el DOM esté listo
    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', precomputeSizes);
        } else {
            // DOM ya está listo
            setTimeout(precomputeSizes, 0);
        }

        window.addEventListener('resize', function () {
            _SIZE_CACHE = new WeakMap();
            precomputeSizes(); // Recalcular en resize
        });
    }

    window.GraphHelper = { createRing, push, fillRing, values, normalize, normalizeLog, toPath, toPathFromRing, ringMax, getSVGSize, getSizeForPath, addGrid, precomputeSizes };
})();