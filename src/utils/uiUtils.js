/**
 * d:/ALKIM/IA/FRONTEND/src/utils/uiUtils.js
 * 
 * Utilidades de Interfaz de Usuario para el ecosistema Alkim
 */

/**
 * calculateSmartPosition
 * 
 * Calcula la posición óptima de un popup respecto a un elemento disparador (trigger).
 * Asegura que el popup sea visible dentro del viewport, rotando su posición si es necesario
 * (arriba/abajo o izquierda/derecha) para evitar desbordamientos.
 * 
 * @param {DOMRect} triggerRect - Rectángulo del elemento que abre el popup (button.getBoundingClientRect())
 * @param {DOMRect} popoverRect - Rectángulo del popup (popover.getBoundingClientRect())
 * @param {Object} options - Configuración adicional
 * @param {string} [options.preferredSide='bottom'] - Lado preferido: 'right', 'left', 'top', 'bottom'
 * @param {number} [options.margin=10] - Margen de separación entre trigger y popup en píxeles
 * @param {number} [options.viewportMargin=10] - Margen mínimo de seguridad con los bordes de la ventana
 * @returns {Object} Objeto con estilos { top, left, position: 'fixed' }
 */
export function calculateSmartPosition(triggerRect, popoverRect, options = {}) {
  const {
    preferredSide = 'bottom',
    margin = 10,
    viewportMargin = 10
  } = options;

  let top = 0;
  let left = 0;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // --- Caso 1: Posicionamiento Lateral (Derecha / Izquierda) ---
  if (preferredSide === 'right' || preferredSide === 'left') {
    left = preferredSide === 'right' 
      ? triggerRect.right + margin 
      : triggerRect.left - popoverRect.width - margin;
    
    // Centrar verticalmente respecto al botón
    top = triggerRect.top + (triggerRect.height / 2) - (popoverRect.height / 2);

    // Ajuste automático lateral si se sale
    if (preferredSide === 'right' && left + popoverRect.width > vw - viewportMargin) {
      left = triggerRect.left - popoverRect.width - margin;
    } else if (preferredSide === 'left' && left < viewportMargin) {
      left = triggerRect.right + margin;
    }
  } 
  // --- Caso 2: Posicionamiento Vertical (Abajo / Arriba) ---
  else {
    top = preferredSide === 'bottom'
      ? triggerRect.bottom + margin
      : triggerRect.top - popoverRect.height - margin;
    
    // Centrar horizontalmente respecto al botón
    left = triggerRect.left + (triggerRect.width / 2) - (popoverRect.width / 2);

    // Ajuste automático vertical si se sale
    if (preferredSide === 'bottom' && top + popoverRect.height > vh - viewportMargin) {
      top = triggerRect.top - popoverRect.height - margin;
    } else if (preferredSide === 'top' && top < viewportMargin) {
      top = triggerRect.bottom + margin;
    }
  }

  // --- Ajustes Finales (Clamping) ---
  // Pase lo que pase, no permitimos que ninguna parte del popup esté fuera del área segura
  if (left < viewportMargin) left = viewportMargin;
  if (left + popoverRect.width > vw - viewportMargin) {
    left = vw - popoverRect.width - viewportMargin;
  }
  
  if (top < viewportMargin) top = viewportMargin;
  if (top + popoverRect.height > vh - viewportMargin) {
    top = vh - popoverRect.height - viewportMargin;
  }

  return { 
    top: `${Math.round(top)}px`, 
    left: `${Math.round(left)}px`, 
    position: 'fixed' 
  };
}
