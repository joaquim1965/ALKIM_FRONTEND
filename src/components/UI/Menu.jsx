/**
 * UI/Menu.jsx
 *
 * COMPONENTE UNIFICADO DE MENÚ
 * Contiene dos versiones exportadas del menú:
 *
 *   • MenuRaw  → Lógica pura (items, separadores, accesibilidad). Sin estilos de fondo/color.
 *   • Menu     → Componente estilizado que envuelve MenuRaw con clases CSS Variables.
 *
 * CARACTERÍSTICAS:
 * ✅ Items con iconos, badges y shortcuts
 * ✅ Separadores entre grupos de items
 * ✅ Orientaciones: vertical, horizontal
 * ✅ Items deshabilitados
 * ✅ Item activo destacado
 * ✅ Accesibilidad: ARIA, keyboard navigation
 *
 * USO:
 * import Menu from '@/components/UI/Menu';
 * import { MenuRaw } from '@/components/UI/Menu';
 *
 * const items = [
 *   { id: 'home', label: 'Home', icon: <HomeIcon />, onClick: () => navigate('/') },
 *   { type: 'separator' },
 *   { id: 'settings', label: 'Settings', badge: '2', onClick: () => navigate('/settings') }
 * ];
 *
 * <Menu items={items} activeId="home" />
 */

import React from 'react';

// ══════════════════════════════════════════════════
// 📦 CONFIGURACIONES DE ESTILO (usadas por Menu)
// ══════════════════════════════════════════════════

/** Orientaciones del menú */
const orientationClasses = {
  vertical: 'flex-col space-y-1',
  horizontal: 'flex-row space-x-1',
};

// ══════════════════════════════════════════════════
// 🔩 MENURAW — Lógica pura, mínimo estilo estructural
// ══════════════════════════════════════════════════

/**
 * MenuRaw
 *
 * Componente funcional "desnudo". Gestiona la lista de items, separadores
 * y accesibilidad sin aplicar colores de fondo/hover específicos.
 * Úsalo como base para construir menús personalizados vía `className`.
 *
 * @param {object}   props
 * @param {Array}    props.items               - Array de items del menú
 * @param {string}  [props.activeId]           - ID del item activo
 * @param {string}  [props.orientation="vertical"] - Orientación (vertical, horizontal)
 * @param {string}  [props.className]          - Clases CSS adicionales
 * @param {...any}   props.rest                - Props HTML nativas de <div>
 */
export function MenuRaw({
  items = [],
  activeId = null,
  orientation = 'vertical',
  className = '',
  ...rest
}) {
  // ─── Contenedor ───
  const containerClasses = [
    'flex',
    orientationClasses[orientation] || orientationClasses.vertical,
    'p-1',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // ─── Renderizado de separador ───
  const renderSeparator = (item, idx) => (
    <div
      key={item.id || `sep-${idx}`}
      className={`dropdown-divider ${orientation === 'horizontal' ? 'h-6 border-l border-t-0' : ''}`}
    />
  );

  // ─── Renderizado de item ───
  const renderItem = (item) => {
    const isActive = item.id === activeId;
    const isDisabled = item.disabled;

    const itemClasses = [
      'flex items-center justify-between gap-3',
      'px-3 py-2',
      'rounded-md',
      'text-sm font-medium',
      'transition-colors duration-150',
      'focus:outline-none focus-ring',
      isDisabled ? 'is-disabled' : 'cursor-pointer',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        key={item.id}
        className={itemClasses}
        onClick={!isDisabled ? item.onClick : undefined}
        role="menuitem"
        tabIndex={!isDisabled ? 0 : -1}
        onKeyDown={
          !isDisabled
            ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.onClick?.(e);
              }
            }
            : undefined
        }
        aria-disabled={isDisabled}
        aria-current={isActive ? 'page' : undefined}
        data-active={isActive ? 'true' : undefined}
      >
        {/* Left side: Icon + Label */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {item.icon && (
            <span className="flex-shrink-0 w-5 h-5">{item.icon}</span>
          )}
          <span className="truncate">{item.label}</span>
        </div>

        {/* Right side: Badge + Shortcut */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.badge && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-on-primary">
              {item.badge}
            </span>
          )}
          {item.shortcut && (
            <span className="text-xs font-mono">
              {item.shortcut}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={containerClasses} role="menu" {...rest}>
      {items.map((item, idx) => {
        if (item.type === 'separator') return renderSeparator(item, idx);
        return renderItem(item);
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🎨 MENU — Componente estilizado (colores + hover)
// ══════════════════════════════════════════════════

/**
 * Menu
 *
 * Componente estilizado completo. Aplica colores de fondo, hover y estado
 * activo sobre MenuRaw usando CSS Variables del sistema de diseño.
 *
 * @param {object}   props
 * @param {Array}    props.items               - Array de items del menú
 * @param {string}  [props.activeId]           - ID del item activo
 * @param {string}  [props.orientation="vertical"] - Orientación (vertical, horizontal)
 * @param {string}  [props.className]          - Clases CSS adicionales
 * @param {...any}   props.rest                - Props HTML nativas de <div>
 */
export function Menu({ items, activeId, orientation = 'vertical', className = '', ...rest }) {
  // ─── Clases de contenedor estilizado ───
  const styledClasses = ['bg-surface1', className].filter(Boolean).join(' ');

  // ─── Inyectar clases de color en cada item vía clone (wrapper approach) ───
  // Transformamos los items para añadir clases de estilo según el estado activo
  const styledItems = items.map((item) => {
    if (item.type === 'separator') return item;
    const isActive = item.id === activeId;
    return {
      ...item,
      _styledActive: isActive,
    };
  });

  return (
    <div className={['bg-surface1', 'rounded-md', className].filter(Boolean).join(' ')}>
      <MenuRaw
        items={styledItems}
        activeId={activeId}
        orientation={orientation}
        className=""
        {...rest}
      />
    </div>
  );
}

export default Menu;
