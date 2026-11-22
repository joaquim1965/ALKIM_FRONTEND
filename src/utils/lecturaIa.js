/**
 * lecturaIa.js — aviso mientras la IA lee un documento (20/11/2026, petición del usuario).
 *
 *  - Mientras dura la lectura, el ratón pasa a ser el círculo del botón «Leyendo…»
 *    (blanco con borde negro para verse sobre cualquier fondo).
 *  - Al terminar bien, suena un «ding» (generado con Web Audio: no hay archivo de sonido).
 *
 * Lo usa services/api.js: toda petición a una ruta de lectura con IA (`esLecturaIa`) lo activa
 * y lo apaga sola, así que ninguna pantalla tiene que acordarse. Con varias lecturas a la vez
 * el ratón sigue así hasta que acaba la última.
 */
const CLASE = 'leyendo-ia';
const ID_ESTILO = 'estilo-leyendo-ia';
const TAMANO = 48;

// Rutas que llaman a la IA: /propiedades/:id/(leer-documento | compraventa/leer | prestamos/leer |
// contratos/leer | gastos-compra/leer | facturas/leer). Leer un certificado digital no usa IA.
const RUTA_IA = /^\/propiedades\/\d+\/(leer-documento|[a-z-]+\/leer)(\?|$)/;
export const esLecturaIa = (endpoint) => RUTA_IA.test(String(endpoint));

/**
 * Ratón que gira (20/11/2026): un cursor CSS no se puede animar, así que mientras dura la lectura
 * se esconde el ratón real (cursor: none) y se pinta en su sitio el círculo del botón «Leyendo…»
 * (el spinner de components/UI/Button.jsx), girando y siguiendo al ratón, con los colores de la
 * cabecera del tema. No captura clics (pointer-events: none).
 */
const ARCO = 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z';
// Colores de la cabecera del tema activo (20/11/2026, petición del usuario): fondo = --color-navbar,
// círculo y arco = --color-on-navbar. El SVG va dentro de la página, así que las variables
// cambian solas con el tema.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${TAMANO}" height="${TAMANO}" viewBox="-2 -2 28 28" aria-hidden="true">`
  + `<circle cx="12" cy="12" r="13" style="fill: var(--color-navbar)"/>`
  + `<circle cx="12" cy="12" r="10" fill="none" stroke-width="4" opacity="0.35" style="stroke: var(--color-on-navbar)"/>`
  + `<path d="${ARCO}" style="fill: var(--color-on-navbar)"/></svg>`;

// Última posición del ratón: se guarda siempre, así el círculo aparece donde está el ratón
// aunque no se mueva después del clic en «Leer».
let raton = { x: -100, y: -100 };
let circulo = null;
const colocar = () => {
  if (circulo) circulo.style.transform = `translate(${raton.x - TAMANO / 2}px, ${raton.y - TAMANO / 2}px)`;
};
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => { raton = { x: e.clientX, y: e.clientY }; colocar(); }, { passive: true });
  window.addEventListener('pointerdown', (e) => { raton = { x: e.clientX, y: e.clientY }; colocar(); }, { passive: true, capture: true });
  document.addEventListener('mouseleave', () => { if (circulo) circulo.style.visibility = 'hidden'; });
  document.addEventListener('mouseenter', () => { if (circulo) circulo.style.visibility = 'visible'; });
}

function ponerEstilo() {
  if (document.getElementById(ID_ESTILO)) return;
  const e = document.createElement('style');
  e.id = ID_ESTILO;
  // `*` y !important: botones y enlaces ponen su propio cursor.
  e.textContent = `html.${CLASE}, html.${CLASE} * { cursor: none !important; }`
    + `#raton-leyendo-ia { position: fixed; left: 0; top: 0; width: ${TAMANO}px; height: ${TAMANO}px; pointer-events: none; z-index: 2147483647; }`
    + `#raton-leyendo-ia svg { display: block; animation: giro-leyendo-ia 0.9s linear infinite; }`
    + `@keyframes giro-leyendo-ia { to { transform: rotate(360deg); } }`;
  document.head.appendChild(e);
}

function mostrarCirculo() {
  if (circulo) return;
  circulo = document.createElement('div');
  circulo.id = 'raton-leyendo-ia';
  circulo.innerHTML = SVG;
  document.body.appendChild(circulo);
  colocar();
}

function quitarCirculo() {
  circulo?.remove();
  circulo = null;
}

let audio = null;
let pendientes = 0;

/** El AudioContext se crea (y se despierta) al EMPEZAR, que es justo tras el clic del usuario: más tarde el navegador podría no dejar sonar. */
function prepararSonido() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audio) audio = new Ctx();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch { /* sin sonido */ }
}

/** Dos notas seguidas (la6 y mi7) con caída suave, unos 0,6 s. */
export function ding() {
  try {
    prepararSonido();
    if (!audio) return;
    const t0 = audio.currentTime + 0.02;
    [[880, 0], [1318.5, 0.16]].forEach(([hz, retraso]) => {
      const osc = audio.createOscillator();
      const ganancia = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = hz;
      ganancia.gain.setValueAtTime(0.0001, t0 + retraso);
      ganancia.gain.exponentialRampToValueAtTime(0.35, t0 + retraso + 0.02);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, t0 + retraso + 0.45);
      osc.connect(ganancia).connect(audio.destination);
      osc.start(t0 + retraso);
      osc.stop(t0 + retraso + 0.5);
    });
  } catch { /* sin sonido */ }
}

export function empezarLecturaIa() {
  if (typeof document === 'undefined') return;
  ponerEstilo();
  prepararSonido();
  pendientes += 1;
  document.documentElement.classList.add(CLASE);
  mostrarCirculo();
}

/** @param {boolean} ok  la lectura ha terminado bien: suena el ding */
export function terminarLecturaIa(ok) {
  if (typeof document === 'undefined') return;
  pendientes = Math.max(0, pendientes - 1);
  if (pendientes === 0) {
    document.documentElement.classList.remove(CLASE);
    quitarCirculo();
  }
  if (ok) ding();
}
