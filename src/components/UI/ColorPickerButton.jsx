/**
 * UI/ColorPickerButton.jsx
 *
 * COMPONENTE UNIFICADO — Botón selector de color
 *
 *   • ColorPickerButtonRaw → Presentación pura (cuadrado de color + label + valor).
 *   • ColorPickerButton    → Wrapper estilizado (actualmente equivalente al Raw).
 *
 * USO:
 * import ColorPickerButton, { ColorPickerButtonRaw } from '@/components/UI/ColorPickerButton';
 *
 * <ColorPickerButton color="#3b82f6" label="Primary" value="#3b82f6" onClick={open} />
 */

import React from 'react';

// ══════════════════════════════════════════════════
// 🔧 UTILIDADES
// ══════════════════════════════════════════════════

/**
 * Calcula si un color es claro u oscuro usando la fórmula WCAG
 * @param {string} hexColor - Color en formato hex (#rrggbb o #rgb)
 * @returns {boolean} true si es claro
 */
const isColorLight = (hexColor) => {
  if (!hexColor || hexColor === 'transparent') return true;
  const hex = hexColor.replace('#', '');
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return true;
  }
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5;
};

// ══════════════════════════════════════════════════
// 🔩 COLORPICKERBUTTONRAW — Presentación pura
// ══════════════════════════════════════════════════

/**
 * ColorPickerButtonRaw
 *
 * Botón de selección de color totalmente presentacional.
 * Aplica contraste automático del borde según la luminancia WCAG.
 *
 * @param {object}   props
 * @param {string}   props.color    - Color actual (hex, rgb, etc.)
 * @param {string}   props.label   - Etiqueta del color
 * @param {string}   props.value   - Valor del color a mostrar
 * @param {Function} props.onClick - Callback al hacer click
 * @param {string}  [props.title]  - Título opcional arriba del botón
 * @param {string}  [props.className] - Clases CSS adicionales
 */
export function ColorPickerButtonRaw({ color, label, value, onClick, title = null, className = '' }) {
  const borderColor = isColorLight(color) ? '#000000' : '#ffffff';

  return (
    <button
      onClick={onClick}
      type="button"
      className={[
        'flex-1 flex flex-col gap-2 p-2 rounded border border-border',
        'bg-surface1 hover:bg-surface-hover transition-colors duration-150',
        className,
      ].filter(Boolean).join(' ')}
      aria-label={`Select ${label}: ${value}`}
    >
      {title && <div className="text-sm font-semibold text-on-surface1">{title}</div>}

      <div className="flex items-center gap-3">
        <div className="flex-1 text-left">
          <div className="text-xs text-secondary">{label}</div>
          <div className="text-xs font-semibold text-on-surface1">{value}</div>
        </div>
        <div
          className="w-10 h-10 rounded shadow flex-shrink-0"
          style={{ backgroundColor: color, border: `1px solid ${borderColor}` }}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════
// 🎨 COLORPICKERBUTTON — Componente estilizado
// ══════════════════════════════════════════════════

/**
 * ColorPickerButton
 *
 * @param {object}   props
 * @param {string}   props.color    - Color actual
 * @param {string}   props.label   - Etiqueta del botón
 * @param {string}   props.value   - Valor a mostrar
 * @param {Function} props.onClick - Callback al clic
 * @param {string}  [props.title]  - Título opcional
 * @param {string}  [props.className] - Clases CSS adicionales
 */
export function ColorPickerButton({ color, label, value, onClick, title = null, className = '' }) {
  return (
    <ColorPickerButtonRaw
      color={color}
      label={label}
      value={value}
      onClick={onClick}
      title={title}
      className={className}
    />
  );
}

export default ColorPickerButton;
