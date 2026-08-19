/**
 * Helper de texto: aplica clases de color según `data-state` en cada ítem.
 * Mantiene la separación de responsabilidades respecto al helper de cálculo.
 *
 * Estados → clases:
 *  - normal  → .text-normal
 *  - alerta  → .text-alerta
 *  - peligro → .text-peligro
 */
(function () {
  const MAP = { normal: 'text-normal', alerta: 'text-alerta', peligro: 'text-peligro' };

  /**
   * Aplica la clase de color correspondiente al estado del elemento.
   * @param {Element} el
   */
  function apply(el) {
    if (!el) return;
    const state = el.getAttribute('data-state');
    if (!state) return;
    el.classList.remove('text-normal', 'text-alerta', 'text-peligro');
    el.classList.add(MAP[state] || 'text-normal');
  }

  /** Escanea el documento y aplica clases a todos los elementos con `data-state`. */
  function scan() {
    document.querySelectorAll('[data-state]').forEach(apply);
  }

  // Observa cambios de `data-state` en todo el árbol
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'data-state') {
        apply(/** @type {Element} */ (m.target));
      }
    }
  });

  function start() {
    if (!document.body) return;
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-state'] });
    scan();
  }

  // Inicia cuando el documento esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Exponer API mínima por si se requiere re-escaneo manual
  window.AlertText = { scan };
})();