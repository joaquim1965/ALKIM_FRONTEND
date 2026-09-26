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

export function speakMenuLabel(label) {
  if (!label || !('speechSynthesis' in window)) return;
  if (!sonidosHabilitados()) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(label);
    utterance.lang = document.documentElement.lang || 'es-ES';
    utterance.rate = 0.95;
    // `cancel()` seguido de `speak()` en el mismo tick se traga el mensaje en
    // Chrome: la cola se limpia despues de encolar el nuevo. Un tick de margen
    // basta, y explica que unos rotulos se leyeran y otros no sin patron
    // aparente.
    window.setTimeout(() => {
      try { window.speechSynthesis.speak(utterance); } catch { /* sin voz */ }
    }, 40);
  } catch {
    // Un fallo de sintesis de voz no puede tumbar la interfaz.
  }
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
      window.setTimeout(() => speakMenuLabel(labelFor(event.target)), 0);
    };

    document.addEventListener('change', readTarget, true);
    document.addEventListener('keydown', readFocused, true);
    document.addEventListener('keyup', readSelectMovement, true);
    return () => {
      document.removeEventListener('change', readTarget, true);
      document.removeEventListener('keydown', readFocused, true);
      document.removeEventListener('keyup', readSelectMovement, true);
    };
  }, []);
}
