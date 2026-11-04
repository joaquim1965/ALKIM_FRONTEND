import { useEffect } from 'react';

const shortcut = (event) => event.ctrlKey && event.altKey && event.key === 'Enter';

/**
 * ¿Están los sonidos habilitados? (27/08/2026)
 *
 * Se guarda en el navegador, no en el usuario: el sonido depende del sitio
 * desde el que se trabaja —en una oficina con gente al lado molesta, en casa
 * no— y el mismo usuario puede querer una cosa en cada sitio.
 *
 * Por defecto, encendido: quien lo necesita para ver lo agradece, y quien no,
 * lo apaga una vez y se queda apagado.
 */
export const LLAVE_SONIDOS = 'sonidos';
export const EVENTO_SONIDOS = 'sonidos-cambiados';

export function sonidosHabilitados() {
  try {
    return window.localStorage.getItem(LLAVE_SONIDOS) !== 'no';
  } catch {
    return true;                     // sin acceso al almacén, que suene
  }
}

export function habilitarSonidos(si) {
  try {
    window.localStorage.setItem(LLAVE_SONIDOS, si ? 'si' : 'no');
  } catch { /* modo privado: se queda como esté */ }
  if (!si && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  // Hay dos interruptores —el altavoz de la barra superior y el de Panel de
  // control— y tienen que ir a la par: el que no se pulsó se entera por este
  // evento (25/09/2026).
  try { window.dispatchEvent(new CustomEvent(EVENTO_SONIDOS, { detail: Boolean(si) })); } catch { /* sin eventos */ }
}

/**
 * Texto de una opción para leerlo: sin la sangría ni la flecha «↳» de los subtipos
 * (03/11/2026), que el lector deletreaba.
 */
export const textoParaLeer = (t) => String(t || '').replace(/[\u00A0\s]+/g, ' ').replace(/^[\s↳]+/, '').trim();

/**
 * Lee un rótulo. `rapido` (03/11/2026, petición del usuario): al moverse por una lista, la opción
 * en la que se está se lee deprisa (velocidad 1,6) y cortando la anterior.
 */
// Lectura pendiente: un rótulo nuevo anula el anterior aunque aún no hubiera empezado
// (03/11/2026: al pulsar, la lectura del botón y la de la acción se decían las dos).
let pendiente = null;

export function speakMenuLabel(label, { rapido = false } = {}) {
  if (!label || !('speechSynthesis' in window)) return;
  if (!sonidosHabilitados()) return;
  try {
    if (pendiente) { window.clearTimeout(pendiente); pendiente = null; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textoParaLeer(label));
    utterance.lang = document.documentElement.lang || 'es-ES';
    utterance.rate = rapido ? 1.6 : 0.95;
    // `cancel()` seguido de `speak()` en el mismo tick se traga el mensaje en
    // Chrome: la cola se limpia despues de encolar el nuevo. Un tick de margen
    // basta, y explica que unos rotulos se leyeran y otros no sin patron
    // aparente.
    pendiente = window.setTimeout(() => {
      pendiente = null;
      try { window.speechSynthesis.speak(utterance); } catch { /* sin voz */ }
    }, 40);
  } catch {
    // Un fallo de sintesis de voz no puede tumbar la interfaz.
  }
}

/**
 * Lectura al pasar el ratón (03/11/2026, petición del usuario): espera 1 segundo encima antes
 * de hablar; si el ratón sale antes, no dice nada.
 */
export const ESPERA_AL_PASAR_MS = 1000;
let alPasar = null;
export function hablarAlPasar(texto) {
  cancelarAlPasar();
  if (!texto) return;
  alPasar = window.setTimeout(() => { alPasar = null; speakMenuLabel(texto); }, ESPERA_AL_PASAR_MS);
}
export function cancelarAlPasar() {
  if (alPasar) { window.clearTimeout(alPasar); alPasar = null; }
}

export default function useMenuSpeech() {
  useEffect(() => {
    const labelFor = (element) => {
      const select = element?.closest?.('select');
      if (select) {
        const option = select.options[select.selectedIndex];
        const prefix = select.getAttribute('aria-label') || select.dataset.speechLabel || '';
        return [prefix, option?.textContent?.trim()].filter(Boolean).join(': ');
      }
      const target = element?.closest?.('[data-speech-label]');
      return target?.dataset.speechLabel || '';
    };
    const readTarget = (event) => {
      speakMenuLabel(labelFor(event.target));
    };
    const readFocused = (event) => {
      if (!shortcut(event)) return;
      const label = labelFor(document.activeElement);
      if (!label) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      speakMenuLabel(label);
    };
    const readSelectMovement = (event) => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      if (!(event.target instanceof HTMLSelectElement)) return;
      window.setTimeout(() => speakMenuLabel(labelFor(event.target), { rapido: true }), 0);
    };

    // Al pulsar cualquier botón, pestaña o enlace se dice su texto (03/11/2026, petición del
    // usuario): el rótulo (data-speech-label, title o aria-label) o, si no tiene, lo que pone.
    // Si el propio botón dice algo más concreto (p. ej. «Editar Severo Ochoa»), lo suyo manda
    // porque habla después y anula esto.
    const readClick = (event) => {
      const el = event.target?.closest?.('button, [role="button"], [role="tab"], a[href]');
      if (!el || el.closest('select')) return;
      const texto = el.dataset.speechLabel || el.dataset.globalTooltipTitle || el.getAttribute('title')
        || el.getAttribute('aria-label') || String(el.innerText || el.textContent || '').split('\n').map((x) => x.trim()).filter(Boolean)[0] || '';
      if (texto) { cancelarAlPasar(); speakMenuLabel(texto.slice(0, 80)); }
    };

    document.addEventListener('change', readTarget, true);
    document.addEventListener('keydown', readFocused, true);
    document.addEventListener('keyup', readSelectMovement, true);
    document.addEventListener('click', readClick, true);
    return () => {
      document.removeEventListener('click', readClick, true);
      document.removeEventListener('change', readTarget, true);
      document.removeEventListener('keydown', readFocused, true);
      document.removeEventListener('keyup', readSelectMovement, true);
    };
  }, []);
}
