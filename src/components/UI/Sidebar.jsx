/**
 * UI/Sidebar.jsx
 *
 * COMPONENTE DE BARRA LATERAL (SIDEBAR)
 * Animado, colapsable y con estética premium.
 * Ahora permite control externo del estado para sincronización con items.
 */

import React from 'react';
import { Menu as MenuIcon, ChevronLeft } from 'lucide-react';

/**
 * @param {object} props
 * @param {React.ReactNode} props.children   - Contenido del sidebar
 * @param {boolean}         props.isOpen     - Estado actual (abierto/cerrado)
 * @param {Function}        props.onToggle   - Función para cambiar el estado
 * @param {string}          props.className  - Clases adicionales
 */
export const Sidebar = ({
    children,
    isOpen,
    onToggle,
    className = ''
}) => {
    return (
        <aside
            className={`
                h-full transition-all duration-300 ease-in-out border-r border-border
                bg-navbar text-on-navbar z-40 relative flex flex-col
                ${isOpen ? 'w-64' : 'w-16'}
                ${className}
            `}
        >
            {/* Header del Sidebar - Logo + Toggle */}
            <div className={`p-4 border-b border-border flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
                {isOpen && (
                    <div className="font-bold text-xl tracking-tight truncate animate-in fade-in duration-500">
                        ALKIM <span className="text-primary italic">IA</span>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="p-2 rounded-lg hover:bg-navbar-hover hover:text-on-navbar-hover transition-all active:scale-95"
                    aria-label={isOpen ? "Colapsar menú" : "Expandir menú"}
                >
                    {isOpen ? <ChevronLeft size={20} /> : <MenuIcon size={20} />}
                </button>
            </div>

            {/* Contenido (vía children) */}
            <div className="flex-1 overflow-y-auto hide-scrollbar py-2">
                {children}
            </div>

            {/* Footer Indicador (opcional) */}
            {!isOpen && (
                <div className="py-4 flex justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-success opacity-50" />
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
