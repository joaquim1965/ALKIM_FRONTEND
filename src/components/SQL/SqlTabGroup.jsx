/**
 * SQL/SqlTabGroup.jsx
 *
 * COMPONENTE DE PESTAÑAS PARA LA CONSOLA SQL (DUAL REACT)
 * Sigue el patrón de diseño premium y utiliza variables de tema.
 */

import React from 'react';

// ══════════════════════════════════════════════════
// 🔩 SQLTABGROUPRAW — Lógica y estructura pura
// ══════════════════════════════════════════════════

/**
 * @param {object}   props
 * @param {Array}    props.tabs          - [{ id, label, icon?, count?, hasError? }]
 * @param {string}   props.activeTabId   - ID del tab activo
 * @param {Function} props.onTabChange   - Callback al cambiar de tab
 * @param {string}  [props.variant="pill"] - 'pill' | 'underline'
 * @param {string}  [props.className]     - Clases adicionales
 */
export function SqlTabGroupRaw({
  tabs = [],
  activeTabId,
  onTabChange,
  variant = 'pill',
  className = '',
  tabClassName = '',
  activeTabClassName = '',
  inactiveTabClassName = '',
}) {
  return (
    <div className={`flex items-center ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-1.5 transition-all duration-200
              ${tabClassName}
              ${isActive ? activeTabClassName : inactiveTabClassName}
            `}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] font-mono">({tab.count})</span>
            )}
            {tab.hasError && (
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🎨 SQLTABGROUP — Componente estilizado premium
// ══════════════════════════════════════════════════

export function SqlTabGroup({
  tabs,
  activeTabId,
  onTabChange,
  variant = 'pill',
  className = ''
}) {
  // Estilos según variante
  // Colores de pestaña del tema (styles/utilities.css, 03/10/2026).
  const containerClasses = variant === 'pill'
    ? 'tab-bar flex-nowrap rounded-lg pb-1'
    : 'tab-bar flex-nowrap overflow-x-auto';

  const baseTabClasses = variant === 'pill'
    ? 'tab-base flex-1 justify-center px-3 py-1.5 text-xs rounded-md'
    : 'tab-base px-4 py-2 text-xs min-w-max';

  const activeClasses = 'tab-active';
  const inactiveClasses = '';

  return (
    <SqlTabGroupRaw
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={onTabChange}
      className={`${containerClasses} ${className}`}
      tabClassName={baseTabClasses}
      activeTabClassName={activeClasses}
      inactiveTabClassName={inactiveClasses}
    />
  );
}

export default SqlTabGroup;
