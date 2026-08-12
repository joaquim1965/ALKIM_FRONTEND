import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { calculateSmartPosition } from '../../utils/uiUtils';

/**
 * ErrorPopover
 * 
 * Ventana emergente premium para indicar error en una operación.
 * Se posiciona automáticamente al lado del botón que la lanzó.
 */
export function ErrorPopover({ 
  message, 
  errorDetails, 
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
      className="bg-surface1 border border-destructive-border rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300 w-80"
    >
      <div 
        className="rounded-full p-4 border-4" 
        style={{ 
          backgroundColor: '#ffffff',
          color: 'var(--color-destructive)',
          borderColor: 'var(--color-destructive)',
          boxShadow: '0 0 20px var(--color-destructive-border)'
        }}
      >
        <div className="flex items-center justify-center p-1 bg-white rounded-full">
            <XCircle size={48} className="text-red-500" />
        </div>
      </div>
      <div className="text-center w-full">
        <p 
          className="text-base font-bold mb-1"
          style={{ color: 'var(--color-destructive)' }}
        >
          {message}
        </p>
        {errorDetails && (
          <div 
            className="mt-3 p-3 rounded-lg border text-left overflow-hidden transition-all"
            style={{ 
              backgroundColor: 'var(--color-surface2)',
              borderColor: 'var(--color-destructive-border)',
              color: 'var(--color-on-surface2)'
            }}
          >
            <p className="text-[9px] uppercase tracking-widest mb-1 font-bold">Detalles del Error:</p>
            <p className="text-xs font-mono break-all leading-relaxed font-bold">
              {typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails)}
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

export default ErrorPopover;
