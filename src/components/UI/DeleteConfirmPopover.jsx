import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { calculateSmartPosition } from '../../utils/uiUtils';

/**
 * DeleteConfirmPopover
 * Renderiza un globo de confirmación anclado al botón que lo dispara.
 * Si no cabe a la derecha, se renderiza a la izquierda.
 */
export function DeleteConfirmPopover({ message, onConfirm, onCancel, triggerRef }) {
    const [position, setPosition] = useState(null);
    const popoverRef = useRef(null);

    useLayoutEffect(() => {
        if (!triggerRef.current || !popoverRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const popoverRect = popoverRef.current.getBoundingClientRect();

        const smartPos = calculateSmartPosition(triggerRect, popoverRect, {
            preferredSide: 'right',
            margin: 10
        });

        setPosition(smartPos);
    }, [triggerRef]);

    // Cerrar si se hace click fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)) {
                onCancel();
            }
        };

        // Cerrar con Escape
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onCancel();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onCancel, triggerRef]);

    const style = position ? {
        top: `${position.top}px`,
        left: `${position.left}px`,
        position: 'fixed',
        zIndex: 9999,
    } : {
        visibility: 'hidden',
        position: 'fixed'
    };

    return createPortal(
        <div
            ref={popoverRef}
            style={style}
            className="bg-surface1 border border-border rounded shadow-xl flex flex-col p-3 min-w-[200px] max-w-[280px] animate-fade-in"
        >
            <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                <span className="text-sm text-on-surface1">{message}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-on-surface2 hover:bg-surface-hover rounded transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={onConfirm}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-on-destructive bg-destructive hover:bg-destructive-hover rounded transition-colors"
                >
                    Eliminar
                </button>
            </div>
        </div>,
        document.body
    );
}
