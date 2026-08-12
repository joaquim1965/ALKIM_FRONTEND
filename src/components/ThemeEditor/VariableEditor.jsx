/**
 * VariableEditor.jsx
 *
 * Componente para editar una variable CSS individual
 * Muestra color base y tono en cuadros clickeables
 */

import React from 'react';

const VariableEditor = ({
  varName,
  description,
  colorBaseFamily,
  colorBaseTone,
  colorBaseHex,
  toneFamily,
  toneNumber,
  toneHex,
  onColorBaseClick,
  onToneClick,
  usesBaseColor = false, // Si true, muestra "Color Base", si false muestra el nombre del color
  globalBaseColor = null // { family, tone, hex } del color base global
}) => {

  // Quitar los -- del principio del nombre de la variable
  const cleanVarName = varName.replace(/^--/, '');

  // Determinar qué texto mostrar para el Color Base
  const getColorBaseLabel = () => {
    if (!colorBaseFamily) return '-';
    if (usesBaseColor && globalBaseColor) {
      return 'Color Base';
    }
    // Mostrar solo la familia de color, sin el tono
    return colorBaseFamily;
  };

  return (
    <div className="p-3 border border-border rounded bg-surface2">
      {/* Título: Descripción */}
      <div className="font-semibold text-sm mb-1">{description}</div>

      {/* Subtítulo: Nombre CSS sin -- */}
      <div className="font-mono text-xs text-on-surface1 mb-2">{cleanVarName}</div>

      {/* Editores: Siempre 2 rectángulos */}
      <div className="flex flex-col sm:flex-row gap-0.5">
        {/* Color Base */}
        <button
          onClick={() => onColorBaseClick && onColorBaseClick(colorBaseHex, colorBaseFamily, colorBaseTone)}
          className={`flex items-center gap-1 p-1 rounded border border-border hover:bg-surface-hover transition-colors text-left flex-1 ${!colorBaseFamily ? 'cursor-not-allowed' : ''}`}
          disabled={!colorBaseFamily}
        >
          {/* Cuadro de color */}
          <div
            className="w-8 h-8 rounded border border-white flex-shrink-0 shadow-sm"
            style={{ backgroundColor: colorBaseHex || '#cccccc' }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-[9px] text-on-surface1">Color Base</div>
            <div className={`font-mono text-xs font-semibold truncate ${usesBaseColor ? 'text-blue-600 dark:text-blue-400' : ''}`}>
              {colorBaseFamily && colorBaseTone ? `${colorBaseFamily}-${colorBaseTone}` : (getColorBaseLabel() || '-')}
            </div>
          </div>
        </button>

        {/* Tono */}
        <button
          onClick={() => onToneClick && onToneClick(toneNumber, toneFamily)}
          className={`flex items-center gap-1 p-1 rounded border border-border hover:bg-surface-hover transition-colors text-left flex-1 ${!toneFamily ? 'cursor-not-allowed' : ''}`}
          disabled={!toneFamily}
        >
          {/* Cuadro de color */}
          <div
            className="w-8 h-8 rounded border border-white flex-shrink-0 shadow-sm"
            style={{ backgroundColor: toneHex || '#cccccc' }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-[9px] text-on-surface1">Tono</div>
            <div className="font-mono text-xs font-semibold truncate">
              {toneFamily ? `${toneFamily}-${toneNumber}` : '-'}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default VariableEditor;
