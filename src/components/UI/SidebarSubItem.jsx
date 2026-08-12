/**
 * UI/SidebarSubItem.jsx
 *
 * Item de segundo nivel (sub-item) para grupos colapsables.
 * Indentado y compacto.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';

export const SidebarSubItem = ({
    to = '#',
    label,
    icon = null,
    onClick
}) => {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            data-speech-label={label}
            className={({ isActive }) => `
                px-10 py-1.5 flex items-center gap-3 transition-all duration-200
                text-xs font-medium text-on-navbar/70
                ${isActive 
                    ? 'text-on-navbar-hover bg-navbar-hover border-r-2 border-tab-indicator' 
                    : 'hover:text-on-navbar-hover hover:bg-navbar-hover/40'}
            `}
        >
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="truncate">{label}</span>
        </NavLink>
    );
};

export default SidebarSubItem;
