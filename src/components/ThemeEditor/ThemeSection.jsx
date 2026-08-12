/**
 * ThemeSection.jsx
 *
 * Sección del editor de temas con:
 * - Izquierda: Editor de variables (base + familia)
 * - Derecha: Preview en tiempo real del componente
 */

import React, { useState } from 'react';
import TailwindColorPicker from './TailwindColorPicker';
import GrayTonePicker from './GrayTonePicker';

const ThemeSection = ({
  title,
  description,
  baseVar,
  familyVar,
  PreviewComponent,
  baseColor,
  familyColor,
  onBaseChange,
  onFamilyChange
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGrayPicker, setShowGrayPicker] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-surface2 border-b border-border">
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && (
          <p className="text-sm text-on-surface1 mt-1">{description}</p>
        )}
      </div>

      {/* Content: Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Izquierda: Editor de variables */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide">Editor</h4>

          {/* Variable Tono (Neutral/Gris) */}
          {baseVar && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Tono (Neutral)</div>
              <button
                onClick={() => setShowGrayPicker(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors text-left"
              >
                {/* Cuadro de color */}
                <div
                  className="w-10 h-10 rounded-md shadow-sm border-2 border-white flex-shrink-0"
                  style={{ backgroundColor: baseColor.hex }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {baseVar.name}
                  </div>
                  <div className="text-sm text-on-surface1 truncate">
                    {baseColor.family}-{baseColor.tone}
                  </div>
                  <div className="text-xs text-on-surface1 font-mono">
                    {baseColor.hex}
                  </div>
                </div>

                {/* Icono */}
                <div className="text-on-surface1">
                  ⚪
                </div>
              </button>
            </div>
          )}

          {/* Variable Color Base (Color cromático) */}
          {familyVar && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Color Base</div>
              <button
                onClick={() => setShowColorPicker(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors text-left"
              >
                {/* Cuadro de color */}
                <div
                  className="w-10 h-10 rounded-md shadow-sm border-2 border-white flex-shrink-0"
                  style={{ backgroundColor: familyColor.hex }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {familyVar.name}
                  </div>
                  <div className="text-sm text-on-surface1 truncate">
                    {familyColor.family}-{familyColor.tone}
                  </div>
                  <div className="text-xs text-on-surface1 font-mono">
                    {familyColor.hex}
                  </div>
                </div>

                {/* Icono */}
                <div className="text-on-surface1">
                  🎨
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Derecha: Preview del componente */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide">Preview</h4>
          <div className="p-6 rounded-lg border border-border bg-surface2">
            {PreviewComponent}
          </div>
        </div>
      </div>

      {/* Modales */}
      <TailwindColorPicker
        isOpen={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        onSelect={onFamilyChange}
        currentFamily={familyColor?.family}
        tone={familyColor?.tone || 500}
        title={`Seleccionar color para ${familyVar?.name || 'variable'}`}
      />

      <GrayTonePicker
        isOpen={showGrayPicker}
        onClose={() => setShowGrayPicker(false)}
        onSelect={(tone) => onBaseChange(baseColor.family, tone)}
        currentTone={baseColor?.tone}
        family={baseColor?.family || 'neutral'}
        title={`Seleccionar tono para ${baseVar?.name || 'variable'}`}
      />
    </div>
  );
};

export default ThemeSection;
