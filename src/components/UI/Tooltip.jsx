import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { speakMenuLabel } from '../../hooks/useMenuSpeech';

/**
 * Tooltip.
 *
 * Se dibuja con `createPortal` sobre el `<body>` y posición `fixed`. Es
 * imprescindible en los listados: la tabla vive dentro de un contenedor con
 * `overflow-hidden` y `overflow-x-auto`, que recorta cualquier elemento
 * absoluto que se salga de la fila.
 *
 * El envoltorio es un `<span>` normal, no el propio control, así que también
 * funciona sobre botones deshabilitados. El navegador deja de enviar eventos de
 * ratón a un control `disabled`, de modo que justo el botón que más necesita
 * explicarse —el que no se puede pulsar— es el único que con `title` no dice
 * nada.
 *
 * API: `content` (o `texto`) y `position`. Se exporta con nombre y por defecto
 * porque el proyecto lo importa de las dos maneras.
 */
const MARGEN = 10;

export function Tooltip({ content, texto, position = 'top', children, className = '' }) {
  const [caja, setCaja] = useState(null);
  const referencia = useRef(null);
  const mensaje = content ?? texto;

  // Además de dibujarlo, se lee en voz alta, igual que hace GlobalActionTooltip
  // con los `title` del resto de la aplicación. Sin esto, cambiar un `title` por
  // este componente dejaba el botón mudo, que es peor que dejarlo feo.
  const mostrar = useCallback(() => {
    if (!referencia.current) return;
    setCaja(referencia.current.getBoundingClientRect());
    if (mensaje) speakMenuLabel(String(mensaje));
  }, [mensaje]);

  const ocultar = useCallback(() => setCaja(null), []);

  if (!mensaje) return children;

  // Arriba por defecto; si no cabe, se cae abajo solo.
  const lado = position === 'top' && caja && caja.top < 90 ? 'bottom' : position;
  const sitio = caja && {
    top: { left: caja.left + caja.width / 2, top: caja.top - MARGEN, transform: 'translate(-50%, -100%)' },
    bottom: { left: caja.left + caja.width / 2, top: caja.bottom + MARGEN, transform: 'translate(-50%, 0)' },
    right: { left: caja.right + MARGEN, top: caja.top + caja.height / 2, transform: 'translate(0, -50%)' },
    left: { left: caja.left - MARGEN, top: caja.top + caja.height / 2, transform: 'translate(-100%, -50%)' },
  }[lado];

  return (
    <span
      ref={referencia}
      data-alkim-tooltip=""
      className={`inline-flex ${className}`}
      onMouseEnter={mostrar}
      onMouseLeave={ocultar}
      onFocusCapture={mostrar}
      onBlurCapture={ocultar}
    >
      {children}
      {caja && createPortal(
        <span
          role="tooltip"
          style={{ position: 'fixed', ...sitio }}
          className="pointer-events-none z-[200] w-max max-w-[320px] whitespace-pre-line rounded-xl
            border-2 border-border bg-surface1 px-3 py-2 text-sm font-bold leading-snug
            text-on-surface1 shadow-2xl"
        >
          {mensaje}
        </span>,
        document.body
      )}
    </span>
  );
}

export default Tooltip;
