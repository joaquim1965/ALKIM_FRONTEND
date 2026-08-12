/**
 * ColorPickerModal.jsx
 *
 * Modal para seleccionar colores de la paleta completa de Tailwind CSS
 * Incluye blanco y negro puros al inicio + todas las familias de colores Tailwind
 */

import React from 'react';
import Modal from '../UI/Modal';

// Colores predefinidos de Tailwind CSS v4
const TAILWIND_COLORS = {
  slate: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a', 950: '#020617',
  },
  gray: {
    50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db',
    400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151',
    800: '#1f2937', 900: '#111827', 950: '#030712',
  },
  zinc: {
    50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8',
    400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46',
    800: '#27272a', 900: '#18181b', 950: '#09090b',
  },
  neutral: {
    50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4',
    400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040',
    800: '#262626', 900: '#171717', 950: '#0a0a0a',
  },
  stone: {
    50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1',
    400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c',
    800: '#292524', 900: '#1c1917', 950: '#0c0a09',
  },
  red: {
    50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
    400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
    800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a',
  },
  orange: {
    50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
    400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
    800: '#9a3412', 900: '#7c2d12', 950: '#431407',
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
    400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
    800: '#92400e', 900: '#78350f', 950: '#451a03',
  },
  yellow: {
    50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047',
    400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207',
    800: '#854d0e', 900: '#713f12', 950: '#422006',
  },
  lime: {
    50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#bef264',
    400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f',
    800: '#3f6212', 900: '#365314', 950: '#1a2e05',
  },
  green: {
    50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
    400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
    800: '#166534', 900: '#14532d', 950: '#052e16',
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
    400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
    800: '#065f46', 900: '#064e3b', 950: '#022c22',
  },
  teal: {
    50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
    400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
    800: '#115e59', 900: '#134e4a', 950: '#042f2e',
  },
  cyan: {
    50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
    400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
    800: '#155e75', 900: '#164e63', 950: '#083344',
  },
  sky: {
    50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
    400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
    800: '#075985', 900: '#0c4a6e', 950: '#082f49',
  },
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
    800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
  },
  indigo: {
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
    400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
    800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
  },
  violet: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
    400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
    800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065',
  },
  purple: {
    50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
    400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
    800: '#6b21a8', 900: '#581c87', 950: '#3b0764',
  },
  fuchsia: {
    50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc',
    400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf',
    800: '#86198f', 900: '#701a75', 950: '#4a044e',
  },
  pink: {
    50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4',
    400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d',
    800: '#9d174d', 900: '#831843', 950: '#500724',
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
    400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
    800: '#9f1239', 900: '#881337', 950: '#4c0519',
  },
};

// Colores base: blanco y negro puros
const BASE_COLORS = {
  'Blanco': '#ffffff',
  'Negro': '#000000',
  'Verde Fósforo': '#a3e635',
  'Amarillo Fluorescente': '#eeff00',
};

const ColorPickerModal = ({
  isOpen,
  onClose,
  onSelect,
  selectedColor = null,
  t,
}) => {
  /**
   * Determina si un color es claro u oscuro para el texto de contraste
   */
  const isLightColor = (hexColor) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  /**
   * Normaliza colores para comparación
   */
  const normalizeColor = (color) => {
    if (!color) return '';
    return color.toLowerCase().trim();
  };

  /**
   * Maneja la selección de un color
   */
  const handleSelectColor = (hex) => {
    onSelect?.(hex);
    onClose?.();
  };

  const normalizedSelected = normalizeColor(selectedColor);

  // Obtener tonalidades (50, 100, 200, ..., 950)
  const shades = Object.keys(TAILWIND_COLORS.slate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Seleccionar Color"
      size="full"
    >
      <div className="space-y-6" style={{ colorScheme: 'light' }}>
        {/* Sección: Colores Base */}
        <div>
          <h3 className="text-lg font-bold mb-3 text-on-background">Colores Base</h3>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(BASE_COLORS).map(([name, hex]) => {
              const isSelected = normalizeColor(hex) === normalizedSelected;
              const textColor = isLightColor(hex) ? '#000000' : '#ffffff';

              return (
                <button
                  key={name}
                  onClick={() => handleSelectColor(hex)}
                  className={`relative h-20 rounded-lg border-2 transition-all hover:scale-105 ${
                    isSelected
                      ? 'ring-4 ring-primary ring-offset-2'
                      : 'border-border hover:border-primary'
                  }`}
                  style={{ backgroundColor: hex }}
                >
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ color: textColor }}
                  >
                    <div className="font-bold text-sm">{name}</div>
                    <div className="font-mono text-xs mt-1">{hex}</div>
                    {isSelected && (
                      <svg
                        className="absolute top-2 right-2 w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sección: Paleta Tailwind */}
        <div>
          <h3 className="text-lg font-bold mb-3 text-on-background">Paleta Tailwind CSS</h3>
          <p className="text-sm text-on-surface2 mb-4">
            Selecciona un color de la paleta completa de Tailwind. Haz clic en cualquier cuadrado para seleccionarlo.
          </p>

          {/* Tabla de colores */}
          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto border-2 border-border rounded-lg">
            <table className="w-full border-separate border-spacing-1">
              {/* Encabezado */}
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="bg-surface2 py-2 px-4 text-left text-sm font-bold sticky left-0 z-20">
                    Color
                  </th>
                  {shades.map((shade) => (
                    <th
                      key={shade}
                      className="bg-surface2 py-2 px-2 text-center text-xs font-bold min-w-[60px]"
                    >
                      {shade}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Cuerpo */}
              <tbody>
                {Object.entries(TAILWIND_COLORS).map(([colorName, colorShades]) => (
                  <tr key={colorName}>
                    {/* Nombre del color */}
                    <td className="bg-surface2 py-2 px-4 sticky left-0 z-10 text-sm font-medium capitalize border-r-2 border-border">
                      {colorName}
                    </td>

                    {/* Tonalidades */}
                    {Object.entries(colorShades).map(([shade, hex]) => {
                      const isSelected = normalizeColor(hex) === normalizedSelected;
                      const textColor = isLightColor(hex) ? '#000000' : '#ffffff';

                      return (
                        <td key={shade} className="p-1">
                          <button
                            onClick={() => handleSelectColor(hex)}
                            className={`relative w-full h-16 rounded border-2 transition-all hover:scale-110 hover:z-30 ${
                              isSelected
                                ? 'ring-4 ring-primary ring-offset-1 z-20'
                                : 'border-border hover:border-primary'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={`${colorName}-${shade}\n${hex}`}
                          >
                            {/* Checkmark si está seleccionado */}
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg
                                  className="w-6 h-6 drop-shadow-lg"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  style={{ color: textColor }}
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </button>
                          {/* Código hex debajo */}
                          <div className="text-xs font-mono text-on-surface2 text-center mt-1">
                            {hex}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-info border-2 border-info rounded-lg p-3 text-sm text-white text-center">
          <p className="font-semibold">
            💡 Total de colores disponibles: {Object.keys(BASE_COLORS).length + Object.keys(TAILWIND_COLORS).length * shades.length} ({Object.keys(BASE_COLORS).length} base + {Object.keys(TAILWIND_COLORS).length * shades.length} Tailwind)
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ColorPickerModal;
