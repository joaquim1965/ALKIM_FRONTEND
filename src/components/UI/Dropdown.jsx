/**
 * UI/Dropdown.jsx
 *
 * COMPONENTE UNIFICADO DE DROPDOWN
 *
 *   • DropdownRaw → Presentación pura. Recibe isOpen, onToggle, dropdownRef externamente.
 *   • Dropdown    → Gestión automática de estado (isOpen) + cierre al clic afuera.
 *
 * USO:
 * import Dropdown, { DropdownRaw } from '@/components/UI/Dropdown';
 *
 * <Dropdown triggerIcon={<Globe />} options={opts} onSelect={handleSelect} selectedValue="en" />
 */

import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCloseDropdown } from '../../hooks/useCloseDropdown';

// ══════════════════════════════════════════════════
// 📦 CONFIGURACIONES DE ESTILO
// ══════════════════════════════════════════════════

const positionClasses = {
  left: 'left-0',
  right: 'right-0',
  center: 'left-1/2 -translate-x-1/2',
};

// ══════════════════════════════════════════════════
// 🔩 DROPDOWNRAW — Presentación pura
// ══════════════════════════════════════════════════

/**
 * DropdownRaw
 *
 * Dropdown totalmente presentacional. Requiere que el estado sea gestionado
 * externamente (isOpen, onToggle, dropdownRef). Úsalo cuando necesites control
 * total del ciclo de vida del dropdown.
 */
export function DropdownRaw({
  triggerIcon,
  triggerLabel,
  options = [],
  onSelect,
  isOpen,
  onToggle,
  dropdownRef,
  position = 'right',
  showChevron = true,
  selectedValue,
  variant = 'default',
  className = '',
  triggerClassName = '',
  menuClassName = '',
}) {
  if (!options || options.length === 0) {
    console.warn('DropdownRaw: No options provided');
    return null;
  }
  if (!onSelect || typeof onSelect !== 'function') {
    console.warn('DropdownRaw: onSelect callback is required');
    return null;
  }

  const handleSelect = (option) => {
    if (option.disabled) return;
    onSelect(option.value);
  };

  const menuClasses = [
    'dropdown-menu', 
    positionClasses[position] || positionClasses.right,
    menuClassName
  ].filter(Boolean).join(' ');

  const isNavbar = variant === 'navbar';
  const triggerClasses = [
    'dropdown-trigger',
    isNavbar ? 'px-3 py-2 rounded-lg transition-all duration-200 hover:bg-navbar-hover hover:text-on-navbar-hover' : '',
    triggerClassName
  ].filter(Boolean).join(' ');

  // Resolver label del trigger
  // Si no se pasa triggerLabel, buscamos el label correspondiente al selectedValue en las opciones
  const resolvedLabel = triggerLabel || options.find(o => String(o.value) === String(selectedValue))?.label;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button type="button" onClick={onToggle} className={triggerClasses}
        aria-haspopup="true" aria-expanded={isOpen}>
        {triggerIcon}
        {resolvedLabel && <span>{resolvedLabel}</span>}
        {showChevron && (
          <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className={menuClasses} role="menu" aria-orientation="vertical">
          {options.map((option, index) => {
            if (option.isDivider) {
              return <hr key={`divider-${index}`} className="dropdown-divider" />;
            }

            const isSelected = String(selectedValue) === String(option.value);
            const itemClasses = ['dropdown-item', isSelected ? 'is-active' : ''].filter(Boolean).join(' ');

            return (
              <button key={option.value} type="button" onClick={() => handleSelect(option)}
                disabled={option.disabled} className={itemClasses}
                role="menuitem" aria-selected={isSelected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(option); }
                }}>
                {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                <span className="flex-1">{option.label}</span>
                {isSelected && <span className="text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🎨 DROPDOWN — Con gestión automática de estado
// ══════════════════════════════════════════════════

/**
 * Dropdown
 */
export function Dropdown({
  triggerIcon,
  triggerLabel,
  options = [],
  onSelect,
  position = 'right',
  showChevron = true,
  selectedValue,
  closeOnSelect = true,
  closeOnClickOutside = true,
  variant = 'default',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  ...rest
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useCloseDropdown(dropdownRef, closeOnClickOutside && isOpen, () => setIsOpen(false));

  const handleSelect = (value) => {
    onSelect(value);
    if (closeOnSelect) setIsOpen(false);
  };

  return (
    <DropdownRaw
      triggerIcon={triggerIcon}
      triggerLabel={triggerLabel}
      options={options}
      onSelect={handleSelect}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      dropdownRef={dropdownRef}
      position={position}
      showChevron={showChevron}
      selectedValue={selectedValue}
      variant={variant}
      className={className}
      triggerClassName={triggerClassName}
      menuClassName={menuClassName}
      {...rest}
    />
  );
}

export default Dropdown;
