import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { calculateSmartPosition } from '../../utils/uiUtils';

/**
 * SuccessPopover
 * 
 * Ventana emergente premium para indicar éxito en una operación.
 * Se posiciona automáticamente al lado del botón que la lanzó.
 */
export function SuccessPopover({ 
  message, 
  subMessage, 
  onClose, 
  triggerRef, 
  preferredSide = 'bottom' 
}) {
  const [position, setPosition] = useState(null);
  const popoverRef = useRef(null);

  // Recalcular posición al abrir y si cambia el tamaño de la ventana
  const updatePosition = () => {
    if (!triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();

    const smartPos = calculateSmartPosition(triggerRect, popoverRect, {
      preferredSide,
      margin: 12
    });

    setPosition(smartPos);
  };

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [triggerRef, preferredSide]);

  // Cerrar al click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
        if (popoverRef.current && !popoverRef.current.contains(e.target) &&
            triggerRef.current && !triggerRef.current.contains(e.target)) {
            onClose();
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, triggerRef]);

  const style = position ? {
    ...position,
    zIndex: 9999,
  } : {
    visibility: 'hidden',
    position: 'fixed'
  };

  return createPortal(
    <div
      ref={popoverRef}
      style={style}
      className="bg-surface1 border border-border rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300 w-80"
    >
      <div 
        className="rounded-full p-4" 
        style={{ 
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          boxShadow: '0 0 20px var(--color-primary-border)'
        }}
      >
        <CheckCircle2 size={48} />
      </div>
      <div className="text-center w-full">
        <p 
          className="text-base font-bold mb-1"
          style={{ color: 'var(--color-primary)' }}
        >
          {message}
        </p>
        {subMessage && (
          <div 
            className="mt-3 p-3 rounded-lg border text-left overflow-hidden transition-all"
            style={{ 
              backgroundColor: 'var(--color-surface2)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-on-surface2)'
            }}
          >
            <p className="text-[9px] uppercase tracking-widest mb-1 font-bold">Ruta de exportación:</p>
            <p className="text-xs font-mono break-all leading-relaxed font-bold">
              {subMessage}
            </p>
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        className="w-full py-3 bg-primary text-on-primary rounded-lg font-black transition-all active:scale-95 shadow-lg border-2 border-primary-border hover:brightness-110 flex items-center justify-center gap-2"
        style={{
          boxShadow: '0 4px 12px var(--color-shadow)'
        }}
      >
        Aceptar
      </button>
    </div>,
    document.body
  );
}

export default SuccessPopover;
