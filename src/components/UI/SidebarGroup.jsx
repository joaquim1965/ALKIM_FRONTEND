/**
 * UI/SidebarGroup.jsx
 *
 * Grupo colapsable dentro del Sidebar.
 * Soporta iconos y sub-items.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export const SidebarGroup = ({
    icon,
    label,
    children,
    collapsed = false,
    defaultOpen = false
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const toggle = () => {
        if (collapsed) return; // No abrir si está colapsado
        setIsOpen(!isOpen);
    };

    return (
        <div className="flex flex-col">
            {/* Header del grupo */}
            <button
                onClick={toggle}
                className={`
                    w-full px-4 py-3 flex items-center gap-4 transition-all duration-200
                    hover:bg-navbar-hover hover:text-on-navbar-hover text-on-navbar
                    ${collapsed ? 'justify-center' : 'justify-start'}
                `}
                title={collapsed ? label : ''}
                data-speech-label={label}
                aria-expanded={collapsed ? undefined : isOpen}
            >
                {/* Flecha a la izquierda, dentro del título (05/10/2026, petición del usuario). */}
                <div className="flex items-center gap-3 min-w-0">
                    {!collapsed && (
                        <span className="shrink-0" aria-hidden="true">
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                    )}
                    <span className="shrink-0">{icon}</span>
                    {!collapsed && <span className="font-medium truncate">{label}</span>}
                </div>
            </button>

            {/* Sub-items (solo si no está colapsado y está abierto) */}
            {isOpen && !collapsed && (
                <div className="bg-navbar-hover/20 flex flex-col animate-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

export default SidebarGroup;
