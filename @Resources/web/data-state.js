// (function () {
/**
 * DataState: utilidad headless para gestionar tokens en `data-state`.
 * Los tokens representan estados como "active", "selected", "open", "closed", "disabled".
 *
 * @example
 * // Activar un botón
 * DataState.add(btn, 'active');
 *
 * @example
 * // Marcar un panel como abierto y seleccionado
 * DataState.add(panelEl, 'open');
 * DataState.add(panelEl, 'selected');
 *
 * @example
 * // Alternar estado
 * DataState.toggle(tileEl, 'active');
 */
function tokenize(value) {
  var s = String(value || '').trim();
  if (!s) return [];
  return s.split(/\s+/g).filter(Boolean);
}

/**
 * Lee los tokens de `data-state`.
 * @param {HTMLElement} el Elemento destino
 * @returns {string[]} Lista de tokens
 * @example
 * const tokens = DataState.read(el); // ['active', 'open']
 */
function read(el) {
  if (!el) return [];
  return tokenize(el.getAttribute('data-state'));
}

/**
 * Define tokens en `data-state`.
 * @param {HTMLElement} el Elemento destino
 * @param {string[]} tokens Lista de tokens
 * @returns {string[]} Tokens finales
 * @example
 * DataState.set(el, ['active', 'selected']);
 */
function set(el, tokens) {
  if (!el) return [];
  var arr = Array.isArray(tokens) ? tokens.slice() : tokenize(tokens);
  var s = arr.join(' ').trim();
  if (s) el.setAttribute('data-state', s); else el.removeAttribute('data-state');
  return arr;
}

/**
 * Añade un token si no existe.
 * @param {HTMLElement} el Elemento destino
 * @param {string} token Token a añadir
 * @returns {string[]} Tokens finales
 * @example
 * DataState.add(el, 'active');
 */
function add(el, token) {
  if (!el) return [];
  var arr = read(el);
  var t = String(token || '').trim();
  if (!t) return arr;
  if (arr.indexOf(t) < 0) arr.push(t);
  return set(el, arr);
}

/**
 * Elimina un token si existe.
 * @param {HTMLElement} el Elemento destino
 * @param {string} token Token a eliminar
 * @returns {string[]} Tokens finales
 * @example
 * DataState.remove(el, 'active');
 */
function remove(el, token) {
  if (!el) return [];
  var arr = read(el);
  var t = String(token || '').trim();
  if (!t) return arr;
  var next = arr.filter(function (x) { return x !== t; });
  return set(el, next);
}

/**
 * Alterna un token. Si `on` es booleano, fuerza el valor.
 * @param {HTMLElement} el Elemento destino
 * @param {string} token Token a alternar
 * @param {boolean} [on] Estado forzado
 * @returns {string[]} Tokens finales
 * @example
 * DataState.toggle(el, 'open');
 */
function toggle(el, token, on) {
  var t = String(token || '').trim();
  if (!el || !t) return [];
  var arr = read(el);
  var has = arr.indexOf(t) >= 0;
  var should = typeof on === 'boolean' ? !!on : !has;
  return should ? add(el, t) : remove(el, t);
}

/**
 * Verifica si existe un token.
 * @param {HTMLElement} el Elemento destino
 * @param {string} token Token a verificar
 * @returns {boolean} Presencia del token
 * @example
 * if (DataState.has(el, 'selected')) {
 *   // ...
 * }
 */
function has(el, token) {
  var t = String(token || '').trim();
  if (!el || !t) return false;
  return read(el).indexOf(t) >= 0;
}

window.DataState = { read, set, add, remove, toggle, has };
// })();