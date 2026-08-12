/**
 * ColorsList.jsx
 *
 * Página que muestra la paleta completa de colores predefinidos de Tailwind CSS v4
 * Formato: Tabla con todas las tonalidades (50-950) para cada color
 *
 * MEJORA: Muestra las variables CSS cuando coinciden con colores de Tailwind
 */

import React from 'react';
import { useTmTr } from '../contexts/TmTrContext';

import { PaintBucket } from 'lucide-react';

const translations = new Proxy({}, { get: (_, prop) => prop });


const ColorsList = () => {
  const { theme, t } = useTmTr('ColorsList');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedVariables, setSelectedVariables] = React.useState([]);
  const [selectedColor, setSelectedColor] = React.useState('');

  // Colores predefinidos de Tailwind CSS v4
  const tailwindColors = {
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

  // Mapeo de colores CSS Variables por tema
  // ✅ ACTUALIZADO: 100% colores Tailwind v4 en los 3 temas
  const cssVariablesByTheme = {
    // ═══════════════════════════════════════════════════════
    // TEMA LIGHT - Azul Profesional (Sky palette)
    // ✅ 100% Tailwind v4 colors
    // ═══════════════════════════════════════════════════════
    light: {
      // 1. Global y Layout
      '#f0f9ff': ['--color-background-primary', '--color-surface-1-bg', '--color-table-row-striped-bg'],
      '#e0f2fe': ['--color-background-secondary', '--color-surface-2-bg', '--color-table-header-bg', '--color-disabled-bg'],
      '#0c4a6e': ['--color-text-primary', '--color-navbar-text', '--color-secondary-text', '--color-input-text', '--color-table-header-text', '--color-table-row-selected-text', '--color-modal-text', '--color-tab-active-text'],
      '#0369a1': ['--color-text-secondary', '--color-link-hover-text', '--color-tab-text'],
      '#bae6fd': ['--color-border-color', '--color-card-border', '--color-table-row-selected-bg', '--color-tab-border'],

      // 2. Acento y marca
      '#0284c7': ['--color-accent', '--color-primary-bg', '--color-link-text', '--color-input-focus-border', '--color-input-focus-ring', '--color-focus-ring', '--color-navbar-link-active-text', '--color-tab-indicator'],
      '#38bdf8': ['--color-accent-muted'],

      // 3. Fondos claros (slate-50, era #ffffff)
      '#f8fafc': ['--color-accent-foreground', '--color-primary-text', '--color-navbar-bg', '--color-secondary-bg', '--color-input-bg', '--color-card-bg', '--color-tab-content-bg', '--color-modal-bg'],

      // 4. Bordes secundarios
      '#7dd3fc': ['--color-secondary-border', '--color-input-border'],

      // 5. Estados (Success, Error, Warning, Info)
      '#ecfdf5': ['--color-success-bg'],
      '#065f46': ['--color-success-text'],
      '#34d399': ['--color-success-border'],
      '#fef2f2': ['--color-error-bg'],
      '#991b1b': ['--color-error-text'],
      '#fca5a5': ['--color-error-border'],
      '#ef4444': ['--color-input-invalid-border'],
      '#fffbeb': ['--color-warning-bg'],
      '#92400e': ['--color-warning-text'],
      '#fcd34d': ['--color-warning-border'],
      '#eff6ff': ['--color-info-bg'],
      '#1e40af': ['--color-info-text'],
      '#93c5fd': ['--color-info-border'],

      // 6. Disabled
      '#94a3b8': ['--color-disabled-text'],
    },

    // ═══════════════════════════════════════════════════════
    // TEMA DARK - Escala Neutral con acentos índigo
    // ✅ 100% Tailwind v4 colors
    // ═══════════════════════════════════════════════════════
    dark: {
      // 1. Fondos oscuros (Escala Neutral)
      '#0f172a': ['--color-background-primary', '--color-navbar-bg'],
      '#1f2937': ['--color-background-secondary', '--color-secondary-bg', '--color-input-bg', '--color-disabled-bg', '--color-card-bg', '--color-table-header-bg', '--color-surface-1-bg', '--color-surface-2-bg', '--color-tab-content-bg', '--color-modal-bg'],
      '#172554': ['--color-table-row-striped-bg'],

      // 2. Textos claros (Escala Neutral)
      '#f8fafc': ['--color-text-primary', '--color-accent-foreground', '--color-navbar-text', '--color-primary-text', '--color-secondary-text', '--color-input-text', '--color-table-header-text', '--color-table-row-selected-text', '--color-tab-active-text', '--color-modal-text'],
      '#94a3b8': ['--color-text-secondary', '--color-tab-text'],
      '#64748b': ['--color-disabled-text'],

      // 3. Bordes (Escala Neutral)
      '#334155': ['--color-border-color', '--color-card-border', '--color-table-row-selected-bg', '--color-tab-border'],
      '#475569': ['--color-secondary-border', '--color-input-border'],

      // 4. Acentos cromáticos (Índigo/Blue)
      '#818cf8': ['--color-accent', '--color-input-focus-border', '--color-input-focus-ring', '--color-tab-indicator'],
      '#a5b4fc': ['--color-accent-muted'],
      '#3b82f6': ['--color-primary-bg'],
      '#93c5fd': ['--color-link-text', '--color-navbar-link-active-text', '--color-info-border'],
      '#bfdbfe': ['--color-link-hover-text'],

      // 5. Estados (Success, Error, Warning, Info)
      '#ecfdf5': ['--color-success-text'],
      '#059669': ['--color-success-border'],
      '#fee2e2': ['--color-error-text'],
      '#dc2626': ['--color-error-border'],
      '#ef4444': ['--color-input-invalid-border'],
      '#fef3c7': ['--color-warning-text'],
      '#d97706': ['--color-warning-border'],
      '#dbeafe': ['--color-info-text'],
      '#2563eb': ['--color-info-border'],
    },

    // ═══════════════════════════════════════════════════════
    // TEMA HIGH-CONTRAST - Negro/Blanco con acentos saturados
    // ✅ 100% Tailwind v4 colors (extremos de paleta)
    // ═══════════════════════════════════════════════════════
    'high-contrast': {
      // 1. Fondos oscuros extremos (slate-950, slate-900)
      '#020617': ['--color-background-primary', '--color-background-secondary', '--color-accent-foreground', '--color-navbar-bg', '--color-primary-text', '--color-secondary-bg', '--color-input-bg', '--color-card-bg', '--color-table-header-bg', '--color-surface-1-bg', '--color-surface-2-bg', '--color-tab-content-bg', '--color-modal-bg', '--color-error-text', '--color-warning-text', '--color-info-text', '--color-table-row-selected-text'],
      '#0f172a': ['--color-table-row-striped-bg', '--color-disabled-bg'],

      // 2. Textos y bordes claros (slate-50, gray-200, gray-400)
      '#f8fafc': ['--color-text-primary', '--color-border-color', '--color-navbar-text', '--color-secondary-text', '--color-secondary-border', '--color-input-text', '--color-input-border', '--color-card-border', '--color-table-header-text', '--color-table-row-selected-bg', '--color-tab-active-text', '--color-tab-indicator', '--color-tab-border', '--color-modal-text', '--color-success-text'],
      '#e5e7eb': ['--color-text-secondary', '--color-tab-text'],
      '#9ca3af': ['--color-disabled-text'],

      // 3. Acentos cromáticos saturados (cyan, yellow)
      '#22d3ee': ['--color-accent', '--color-navbar-link-active-text', '--color-input-focus-border', '--color-input-focus-ring', '--color-focus-ring', '--color-link-text', '--color-link-hover-text', '--color-info-bg'],
      '#67e8f9': ['--color-accent-muted', '--color-info-border'],
      '#facc15': ['--color-primary-bg'],

      // 4. Estados saturados (green, red, amber)
      '#16a34a': ['--color-success-bg'],
      '#4ade80': ['--color-success-border'],
      '#dc2626': ['--color-input-invalid-border', '--color-error-bg'],
      '#fca5a5': ['--color-error-border'],
      '#f59e0b': ['--color-warning-bg'],
      '#fcd34d': ['--color-warning-border'],
    }
  };

  // Obtener variables CSS del tema actual
  const cssVariables = cssVariablesByTheme[theme] || cssVariablesByTheme.light;

  // Función para determinar si un color es claro u oscuro
  const isLightColor = (hexColor) => {
    // Convertir hex a RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calcular luminosidad relativa (fórmula W3C)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Si luminosidad > 0.5, el color es claro
    return luminance > 0.5;
  };

  // Obtener tonalidades (50, 100, 200, ..., 950)
  const shades = Object.keys(tailwindColors.slate);

  // Función para abrir modal con variables
  const handleColorClick = (variables, hex) => {
    if (variables.length > 0) {
      setSelectedVariables(variables);
      setSelectedColor(hex);
      setModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[90rem] mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <PaintBucket className="h-12 w-12 mx-auto mb-4 text-on-background" />
          <h1 className="text-4xl font-bold mb-2">{t('Parrafo1')}</h1>
          <p className="text-lg text-on-surface1">
            {t('Parrafo1')}
          </p>
          <p className="text-sm text-on-surface1 mt-2">
            {t('Parrafo1')}
          </p>
        </div>

        {/* Tabla de Colores */}
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-separate border-spacing-2 bg-surface1 rounded-xl shadow-lg shadow-shadow overflow-hidden">

            {/* Encabezado */}
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="bg-surface2 py-4 px-6 text-left w-32 sticky left-0 z-30 text-xl font-bold">
                  {t('Color')}
                </th>
                {shades.map((shade) => (
                  <th
                    key={shade}
                    className="bg-surface2 py-4 px-2 text-center text-md font-bold"
                  >
                    {shade}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Cuerpo de la tabla */}
            <tbody>
              {Object.entries(tailwindColors).map(([colorName, colorShades], index) => (
                <tr key={colorName} className={index % 2 === 0 ? "bg-background" : "bg-surface1"}>
                  {/* Nombre del color (primera columna, fija) */}
                  <td className="bg-surface2 py-4 px-6 sticky left-0 z-10 text-sm font-medium capitalize">
                    {colorName}
                  </td>

                  {/* Celdas de color con preview y hex */}
                  {Object.entries(colorShades).map(([shade, hex]) => {
                    const variables = cssVariables[hex] || [];
                    const hasVariables = variables.length > 0;
                    const isLight = isLightColor(hex);
                    const textColor = isLight ? '#000000' : '#ffffff';

                    return (
                      <td
                        key={shade}
                        className="py-2 px-2 text-center align-top"
                      >
                        {/* Muestra visual del color */}
                        <div
                          className={`h-10 w-full rounded-md shadow-inner mx-auto border relative overflow-hidden ${hasVariables ? 'cursor-pointer hover:ring-2 hover:ring-offset-1' : ''}`}
                          style={{
                            backgroundColor: hex,
                            borderColor: 'var(--color-border-color)',
                            ...(hasVariables && { '--tw-ring-color': hex })
                          }}
                          title={hasVariables ? `${colorName}-${shade}: ${hex}\n\nVariables CSS:\n${variables.join('\n')}\n\nClic para ver detalles` : `${colorName}-${shade}: ${hex}`}
                          onClick={() => handleColorClick(variables, hex)}
                        >
                          {/* Mostrar variables CSS si existen */}
                          {hasVariables && (
                            <div
                              className="absolute inset-0 flex flex-col items-center justify-center p-0.5 text-[6px] font-mono font-bold leading-tight overflow-hidden"
                              style={{ color: textColor }}
                            >
                              {variables.slice(0, 3).map((varName, idx) => (
                                <div key={idx} className="truncate w-full text-center">
                                  {varName.replace('--color-', '')}
                                </div>
                              ))}
                              {variables.length > 3 && (
                                <div className="text-[5px]">+{variables.length - 3}</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Código hexadecimal */}
                        <div className="mt-1 text-xs font-mono text-on-surface1">
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

        {/* Info adicional */}
        <div className="bg-info text-on-info border border-info-border p-4 rounded-lg mt-8">
          <h3 className="font-bold mb-2">{t('Parrafo1')}</h3>
          <div className="space-y-2 text-sm">
            <p>
              <strong>{t('Parrafo5')}</strong> <code className="bg-surface2 px-2 py-1 rounded">bg-blue-500</code>, <code className="bg-surface2 px-2 py-1 rounded">text-red-600</code>, <code className="bg-surface2 px-2 py-1 rounded">border-green-300</code>
            </p>
            <p>
              <strong>{t('Parrafo6')}</strong> <code className="bg-surface2 px-2 py-1 rounded">color: #3b82f6;</code>
            </p>
            <p>
              <strong>{t('VariablesCss')}</strong> {t('Parrafo1')} <code className="bg-surface2 px-1 rounded">App.css</code> {t('Parrafo8')}
            </p>
            <p>
              <strong>{t('Parrafo9')}</strong> {Object.keys(tailwindColors).length} {t('Familias')} × {shades.length} {t('Tonalidades')} = {Object.keys(tailwindColors).length * shades.length} {t('Colores')}
            </p>
          </div>
        </div>

        {/* Modal para mostrar variables CSS */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: '#000000' }}
            onClick={() => setModalOpen(false)}
          >
            <div
              className="relative rounded-lg shadow-2xl shadow-shadow max-w-2xl w-full max-h-[80vh] overflow-auto"
              style={{ backgroundColor: '#000000' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div
                className="sticky top-0 p-4 border-b flex items-center justify-between"
                style={{ backgroundColor: '#000000', borderColor: '#333333' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded border-2 border-white"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <h2 className="text-lg font-bold" style={{ color: '#ffffff' }}>
                    {t('VariablesCss')}
                  </h2>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-white hover:text-gray-300 text-2xl font-bold leading-none"
                  style={{ color: '#ffffff' }}
                >
                  ×
                </button>
              </div>

              {/* Contenido del modal */}
              <div className="p-6">
                <div className="space-y-2">
                  {selectedVariables.map((varName, idx) => (
                    <div
                      key={idx}
                      className="font-mono p-2 rounded"
                      style={{
                        color: '#ffffff',
                        fontSize: '14px',
                        backgroundColor: '#1a1a1a'
                      }}
                    >
                      {varName}
                    </div>
                  ))}
                </div>

                {/* Info adicional */}
                <div className="mt-6 pt-4 border-t" style={{ borderColor: '#333333' }}>
                  <p className="text-sm" style={{ color: '#cccccc' }}>
                    <strong style={{ color: '#ffffff' }}>{t('Color')}</strong> {selectedColor}
                  </p>
                  <p className="text-sm mt-2" style={{ color: '#cccccc' }}>
                    <strong style={{ color: '#ffffff' }}>{t('Parrafo10')}</strong> {selectedVariables.length}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div
                className="sticky bottom-0 p-4 border-t flex justify-end"
                style={{ backgroundColor: '#000000', borderColor: '#333333' }}
              >
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded font-semibold transition-colors"
                  style={{
                    backgroundColor: '#333333',
                    color: '#ffffff',
                    border: '1px solid #666666'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#444444'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#333333'}
                >
                  {t('Cerrar')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ColorsList;

