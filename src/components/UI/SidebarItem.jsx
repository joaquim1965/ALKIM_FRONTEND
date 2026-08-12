/**
 * UI/SidebarItem.jsx
 *
 * Item para el sidebar. Componente estándar con lógica.
 */

import React, { useCallback } from 'react';
import SidebarItemStyled from './SidebarItemStyled';

/**
 * @param {object} props
 * @param {string} props.to       - Ruta de navegación
 * @param {React.ReactNode} props.icon - Icono (Lucide react)
 * @param {string} props.label    - Título del item
 * @param {boolean} props.collapsed - Estado colapsado del padre
 * @param {Function} props.onClick - Click handler
 */
export const SidebarItem = ({
    to = '#',
    icon,
    label,
    collapsed = false,
    onClick
}) => {
    const getNavLinkClass = useCallback(
        ({ isActive }) => {
            const baseClass = 'px-4 py-3 flex items-center gap-4 transition-all duration-200';
            const activeClass = isActive
                ? 'bg-navbar-hover text-on-navbar-hover border-r-4 border-tab-indicator'
                : 'hover:bg-navbar-hover hover:text-on-navbar-hover';
            const justifyClass = collapsed ? 'justify-center' : 'justify-start';

            return `${baseClass} ${activeClass} ${justifyClass}`;
        },
        [collapsed]
    );

    return (
        <SidebarItemStyled
            to={to}
            onClick={onClick}
            icon={icon}
            label={label}
            collapsed={collapsed}
            title={collapsed ? label : ''}
            speechLabel={label}
            navLinkClass={getNavLinkClass}
        />
    );
};

export default SidebarItem;
