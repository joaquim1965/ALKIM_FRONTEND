/**
 * TailwindColorPicker.jsx
 *
 * Selector modal de colores Tailwind
 * Muestra todos los colores de Tailwind organizados por familia
 * con el tono especificado
 */

import React from 'react';

// Familias de colores Tailwind con sus nombres
const COLOR_FAMILIES = {
  slate: { name: 'Slate', base: '#64748b' },
  gray: { name: 'Gray', base: '#6b7280' },
  zinc: { name: 'Zinc', base: '#71717a' },
  neutral: { name: 'Neutral', base: '#737373' },
  stone: { name: 'Stone', base: '#78716c' },
  red: { name: 'Red', base: '#ef4444' },
  orange: { name: 'Orange', base: '#f97316' },
  amber: { name: 'Amber', base: '#f59e0b' },
  yellow: { name: 'Yellow', base: '#eab308' },
  lime: { name: 'Lime', base: '#84cc16' },
  green: { name: 'Green', base: '#22c55e' },
  emerald: { name: 'Emerald', base: '#10b981' },
  teal: { name: 'Teal', base: '#14b8a6' },
  cyan: { name: 'Cyan', base: '#06b6d4' },
  sky: { name: 'Sky', base: '#0ea5e9' },
  blue: { name: 'Blue', base: '#3b82f6' },
  indigo: { name: 'Indigo', base: '#6366f1' },
  violet: { name: 'Violet', base: '#8b5cf6' },
  purple: { name: 'Purple', base: '#a855f7' },
  fuchsia: { name: 'Fuchsia', base: '#d946ef' },
  pink: { name: 'Pink', base: '#ec4899' },
  rose: { name: 'Rose', base: '#f43f5e' },
};

// Colores por tono (ejemplo con algunos tonos clave)
const TONES = {
  50: 'Muy claro',
  100: 'Claro',
  200: 'Claro medio',
  300: 'Medio claro',
  400: 'Medio',
  500: 'Base',
  600: 'Medio oscuro',
  700: 'Oscuro',
  800: 'Muy oscuro',
  900: 'Casi negro',
};

/**
 * Obtiene el valor hex del color Tailwind
 */
const getTailwindColor = (family, tone) => {
  // Mapeo simplificado (en producción usarías la paleta completa de Tailwind)
  const colors = {
    slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
    gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' },
    zinc: { 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b' },
    red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
    orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
    amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
    yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
    lime: { 50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#bef264', 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#3f6212', 900: '#365314' },
    green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
    emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
    teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
    cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63' },
    sky: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
    blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
    indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
    violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
    purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
    fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
    pink: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
    rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
  };

  return colors[family]?.[tone] || '#000000';
};

const TailwindColorPicker = ({
  isOpen,
  onClose,
  onSelect,
  currentFamily = 'blue',
  tone = 500,
  title = 'Seleccionar color',
  globalBaseColor = null, // { family, tone, hex } del color base global
  showBaseColorOption = false // Si true, muestra la opción "Usar Color Base"
}) => {
  if (!isOpen) return null;

  const handleSelect = (family) => {
    const colorValue = getTailwindColor(family, tone);
    onSelect(family, colorValue, tone);
    onClose();
  };

  const handleSelectBaseColor = () => {
    if (globalBaseColor) {
      onSelect(globalBaseColor.family, globalBaseColor.hex, globalBaseColor.tone, true); // true = usar color base
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-modal-backdrop"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface1 text-on-surface1 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded bg-secondary text-on-secondary hover:bg-secondary-hover transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-sm text-on-surface1">
            Tono seleccionado: {tone} ({TONES[tone]})
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Opción de Color Base (si está habilitada) */}
          {showBaseColorOption && globalBaseColor && (
            <>
              <div className="mb-4 pb-4 border-b border-border">
                <h3 className="text-sm font-semibold mb-3 text-blue-600 dark:text-blue-400">
                  ⭐ Usar Color Base Global
                </h3>
                <button
                  onClick={handleSelectBaseColor}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all w-full max-w-xs
                    ${currentFamily === globalBaseColor.family && tone === globalBaseColor.tone
                      ? `border-current bg-primary`
                      : `border-border hover:bg-surface-hover`}
                  `}
                >
                  {/* Cuadro de color */}
                  <div
                    className="w-16 h-16 rounded-lg shadow-md border-2 border-white"
                    style={{ backgroundColor: globalBaseColor.hex }}
                  />

                  {/* Nombre */}
                  <div className="text-center">
                    <div className="font-semibold">Color Base</div>
                    <div className="text-xs text-on-surface1">
                      {globalBaseColor.family}-{globalBaseColor.tone}
                    </div>
                    <div className="text-xs text-on-surface1 font-mono">
                      {globalBaseColor.hex}
                    </div>
                  </div>

                  {currentFamily === globalBaseColor.family && tone === globalBaseColor.tone && (
                    <div className="text-xs font-bold text-on-primary">
                      ✓ Seleccionado
                    </div>
                  )}
                </button>
              </div>
              <h3 className="text-sm font-semibold mb-3">
                O selecciona un color personalizado:
              </h3>
            </>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(COLOR_FAMILIES).map(([family, info]) => {
              const colorValue = getTailwindColor(family, tone);
              const isSelected = family === currentFamily;

              return (
                <button
                  key={family}
                  onClick={() => handleSelect(family)}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                    ${isSelected ? `border-current bg-primary` : `border-border hover:bg-surface-hover`}
                  `}
                >
                  {/* Cuadro de color */}
                  <div
                    className="w-16 h-16 rounded-lg shadow-md border-2 border-white"
                    style={{ backgroundColor: colorValue }}
                  />

                  {/* Nombre */}
                  <div className="text-center">
                    <div className="font-semibold">{info.name}</div>
                    <div className="text-xs text-on-surface1">
                      {family}-{tone}
                    </div>
                    <div className="text-xs text-on-surface1 font-mono">
                      {colorValue}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="text-xs font-bold text-on-primary">
                      ✓ Seleccionado
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-secondary text-on-secondary border-secondary-border border hover:bg-secondary-hover transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TailwindColorPicker;
