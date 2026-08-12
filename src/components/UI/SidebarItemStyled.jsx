/**
 * UI/SidebarItemStyled.jsx
 *
 * Componente estilizado para SidebarItem.
 * Contiene puramente la presentación usando Tailwind CSS.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * @param {object} props
 * @param {string} props.to       - Ruta de navegación
 * @param {React.ReactNode} props.icon - Icono (Lucide react)
 * @param {string} props.label    - Título del item
 * @param {boolean} props.collapsed - Estado colapsado del padre
 * @param {Function} props.navLinkClass - Función o string de clases
 * @param {string} props.title - Modal title text
 * @param {Function} props.onClick - Click handler
 */
export const SidebarItemStyled = ({
    to,
    icon,
    label,
    collapsed,
    navLinkClass,
    title,
    onClick,
    speechLabel
}) => {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={navLinkClass}
            title={title}
            data-speech-label={speechLabel}
        >
            <span className="shrink-0">{icon}</span>
            {!collapsed ? <span className="font-medium truncate text-sm">{label}</span> : null}
        </NavLink>
    );
};

export default SidebarItemStyled;
