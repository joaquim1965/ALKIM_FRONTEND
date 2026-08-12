/**
 * InkPickerModal.jsx
 *
 * Modal para seleccionar tintas (familias de colores Tailwind en tono 500)
 * Muestra un grid de colores y permite seleccionar uno
 */

import React from 'react';
import Modal from '../UI/Modal';

// Familias de colores Tailwind con tono 500
const TAILWIND_INKS = {
  slate: '#64748b',
  gray: '#6b7280',
  zinc: '#71717a',
  neutral: '#737373',
  stone: '#78716c',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
};

const InkPickerModal = ({
  isOpen,
  onClose,
  onSelect,
  selectedInk = null, // Hex del color seleccionado actualmente
}) => {
  const handleSelect = (family, hex) => {
    onSelect?.(family, hex);
    onClose?.();
  };

  // Función para calcular el color de contraste para el checkmark
  const getContrastColor = (hexColor) => {
    if (!hexColor) return '#ffffff';

    // Remover # si existe
    const hex = hexColor.replace('#', '');

    // Convertir a RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calcular luminancia relativa (WCAG)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Si es oscuro (luminancia < 0.5), usar blanco; si es claro, usar gris oscuro
    return luminance < 0.5 ? '#ffffff' : '#1f2937';
  };

  // Normalizar el color seleccionado para comparación
  const normalizeColor = (color) => {
    if (!color) return '';
    return color.toLowerCase().trim();
  };

  const normalizedSelectedInk = normalizeColor(selectedInk);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Seleccionar Tinta (Tono 500)"
      size="lg"
    >
      <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
        {Object.entries(TAILWIND_INKS).map(([family, hex]) => {
          const isSelected = normalizeColor(hex) === normalizedSelectedInk;
          const checkColor = getContrastColor(hex);

          return (
            <button
              key={family}
              onClick={() => handleSelect(family, hex)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              {/* Cuadrado de color */}
              <div
                className="w-16 h-16 rounded-lg border-2 border-white shadow-md relative flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: hex }}
              >
                {isSelected && (
                  <svg
                    className="w-8 h-8 drop-shadow-lg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    style={{ color: checkColor }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Nombre de la familia */}
              <div className="text-sm font-bold text-gray-700 dark:text-gray-300 capitalize">
                {family}
              </div>

              {/* Código hex */}
              <div className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400">
                {hex}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};

export default InkPickerModal;
