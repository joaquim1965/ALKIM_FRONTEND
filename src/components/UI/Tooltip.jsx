/**
 * UI/Tooltip.jsx
 *
 * COMPONENTE UNIFICADO DE TOOLTIP
 * Contiene dos versiones exportadas:
 *
 *   • TooltipRaw → Lógica pura (posicionamiento, delay, visibilidad). Sin colores de tema.
 *   • Tooltip    → Componente estilizado con colores CSS Variables del sistema de diseño.
 *
 * CARACTERÍSTICAS:
 * ✅ Posiciones: top, bottom, left, right
 * ✅ Delay configurable
 * ✅ Ajuste automático para no salir de pantalla
 * ✅ Cleanup automático de timers
 *
 * USO:
 * import Tooltip from '@/components/UI/Tooltip';
 * import { TooltipRaw } from '@/components/UI/Tooltip';
 *
 * <Tooltip content="Texto del tooltip"><button>Hover me</button></Tooltip>
 * <Tooltip content="Bottom tooltip" position="bottom"><span>Icon</span></Tooltip>
 */

import React, { useState, useRef, useEffect } from 'react';
import { calculateSmartPosition } from '../../utils/uiUtils';

// ══════════════════════════════════════════════════
// 🔩 TOOLTIPRAW — Lógica pura, sin colores de tema
// ══════════════════════════════════════════════════

/**
 * TooltipRaw
 *
 * Componente funcional "desnudo". Gestiona visibilidad, delay y posicionamiento
 * sin aplicar colores específicos. Pasa clases del tooltip vía `tooltipClassName`.
 *
 * @param {object}           props
 * @param {React.ReactNode}  props.children           - Elemento trigger del tooltip
 * @param {React.ReactNode}  props.content            - Contenido del tooltip
 * @param {string}          [props.position="top"]   - Posición (top, bottom, left, right)
 * @param {number}          [props.delay=200]         - Delay en ms antes de mostrar
 * @param {string}          [props.className]         - Clases para el wrapper del trigger
 * @param {string}          [props.tooltipClassName]  - Clases para el tooltip en sí
 */
export function TooltipRaw({
  children,
  content,
  position = 'top',
  delay = 200,
  className = '',
  tooltipClassName = '',
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const smartPos = calculateSmartPosition(triggerRect, tooltipRect, {
      preferredSide: position,
      margin: 8,
      viewportMargin: 8
    });

    setCoords({
      top: parseInt(smartPos.top),
      left: parseInt(smartPos.left)
    });
  };

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      calculatePosition();
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) calculatePosition();
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!content) return children;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={className}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 px-2 py-1.5 text-xs rounded border pointer-events-none whitespace-pre-wrap max-w-xs ${tooltipClassName}`}
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        >
          {content}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════
// 🎨 TOOLTIP — Componente estilizado
// ══════════════════════════════════════════════════

/**
 * Tooltip
 *
 * Componente estilizado completo. Aplica colores del sistema de diseño
 * (CSS Variables) al tooltip.
 *
 * @param {object}           props
 * @param {React.ReactNode}  props.children          - Elemento trigger
 * @param {React.ReactNode}  props.content           - Contenido del tooltip
 * @param {string}          [props.position="top"]  - Posición (top, bottom, left, right)
 * @param {number}          [props.delay=200]        - Delay en ms antes de mostrar
 * @param {string}          [props.className]        - Clases para el wrapper del trigger
 */
export function Tooltip({
  children,
  content,
  position = 'top',
  delay = 200,
  className = '',
}) {
  const tooltipClassName = 'bg-surface2 text-on-surface2 border-border shadow-lg';

  return (
    <TooltipRaw
      content={content}
      position={position}
      delay={delay}
      className={className}
      tooltipClassName={tooltipClassName}
    >
      {children}
    </TooltipRaw>
  );
}

export default Tooltip;
