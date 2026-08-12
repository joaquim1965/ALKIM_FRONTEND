import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { calculateSmartPosition } from '../../utils/uiUtils';

/**
 * ConfirmPopover
 * 
 * Ventana emergente premium para solicitar confirmación de una acción sensible.
 * Se posiciona automáticamente al lado del botón que la lanzó.
 */
export function ConfirmPopover({ 
  message, 
  subMessage, 
  onConfirm, 
  onClose, 
  triggerRef, 
  preferredSide = 'bottom',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar'
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
      className="bg-surface1 border border-warning-border rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300 w-80"
    >
      <div 
        className="rounded-full p-4" 
        style={{ 
          backgroundColor: 'var(--color-warning)',
          color: 'var(--color-on-warning)',
          boxShadow: '0 0 20px var(--color-warning-border)'
        }}
      >
        <AlertTriangle size={48} />
      </div>
      <div className="text-center">
        <p className="text-lg font-black text-on-surface1 mb-1">
          {message}
        </p>
        <p className="text-xs text-on-surface1 leading-relaxed">
          {subMessage}
        </p>
      </div>
      <div className="flex gap-3 w-full mt-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 bg-surface2 text-on-surface2 rounded-lg font-bold transition-all active:scale-95 border border-border"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1 py-2.5 bg-warning text-on-warning rounded-lg font-black transition-all active:scale-95 shadow-lg border-2 border-warning-border hover:brightness-110"
        >
          {confirmText}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmPopover;
