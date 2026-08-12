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
              <span className="text-[10px] text-secondary font-mono">({tab.count})</span>
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
  const containerClasses = variant === 'pill'
    ? 'bg-surface2 p-1 rounded-lg gap-1'
    : 'border-b border-border gap-0 overflow-x-auto';

  const baseTabClasses = variant === 'pill'
    ? 'flex-1 justify-center px-3 py-1.5 text-xs font-semibold rounded-md'
    : 'px-4 py-2 text-xs font-semibold border-r border-border min-w-max';

  const activeClasses = variant === 'pill'
    ? 'bg-primary text-on-primary shadow-sm'
    : 'bg-surface1 text-primary border-b-2 border-b-primary';

  const inactiveClasses = variant === 'pill'
    ? 'text-on-surface2 hover:bg-surface-hover hover:text-on-surface1'
    : 'text-on-surface2 hover:bg-surface-hover';

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
