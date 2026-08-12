/**
 * UI/ColorPicker.jsx
 *
 * COMPONENTE UNIFICADO DE SELECTOR DE COLOR
 *
 *   • ColorPickerRaw → Vista 100% presentacional. Sin lógica de validación.
 *   • ColorPicker    → Lógica completa: estado, validación, conversión a hex.
 *
 * USO:
 * import ColorPicker, { ColorPickerRaw } from '@/components/UI/ColorPicker';
 *
 * <ColorPicker value={color} onChange={setColor} label="Color primario" />
 */

import React, { useState, useEffect } from 'react';

// ══════════════════════════════════════════════════
// 🔧 UTILIDADES
// ══════════════════════════════════════════════════

/**
 * Validar formato de color (hex, rgb, rgba, hsl, hsla, o palabra clave)
 * @param {string} color - Color a validar
 * @returns {boolean}
 */
const validateColor = (color) => {
  if (!color) return false;
  if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) return true;
  if (/^rgba?\(\d+,\s*\d+,\s*\d+(,\s*[\d.]+)?\)$/i.test(color)) return true;
  if (/^hsla?\(\d+,\s*[\d.]+%,\s*[\d.]+%(,\s*[\d.]+)?\)$/i.test(color)) return true;
  if (/^(transparent|currentColor|inherit|initial|unset)$/i.test(color)) return true;
  return false;
};

/** Convierte el valor a hex puro para el picker nativo */
const getPickerValue = (value) => {
  if (/^#([0-9A-F]{6})$/i.test(value)) return value;
  return '#000000';
};

// ══════════════════════════════════════════════════
// 🔩 COLORPICKERRAW — Vista pura (sin lógica de estado)
// ══════════════════════════════════════════════════

/**
 * ColorPickerRaw
 *
 * Componente 100% presentacional. Recibe todos los valores y callbacks
 * listos para renderizar. Úsalo cuando necesites control total del estado.
 *
 * @param {object}   props
 * @param {string}   props.value                          - Texto actual del input
 * @param {string}   props.pickerValue                   - Valor hex para el color picker
 * @param {boolean} [props.isValid=true]                  - Si el color es válido
 * @param {string}  [props.label=""]                      - Etiqueta
 * @param {string}  [props.description=""]               - Descripción opcional
 * @param {string}  [props.errorMessage=""]              - Mensaje de error
 * @param {string}  [props.pickerLabel="Seleccionar"]    - Texto del picker
 * @param {string}  [props.previewLabel="Actual"]        - Texto del preview
 * @param {string}  [props.resetLabel="Reset"]           - Texto del botón reset
 * @param {string}  [props.resetTitle="Resetear"]        - Title del botón reset
 * @param {string}  [props.placeholder="#000000"]        - Placeholder del input
 * @param {Function} props.onPickerChange                - Callback al cambiar picker
 * @param {Function} props.onInputChange                 - Callback al cambiar input
 * @param {Function}[props.onReset]                      - Callback reset (si existe, muestra botón)
 * @param {string}  [props.className=""]                 - Clases adicionales
 */
export function ColorPickerRaw({
  value = '',
  pickerValue = '#000000',
  isValid = true,
  label = '',
  description = '',
  errorMessage = '',
  pickerLabel = 'Seleccionar',
  previewLabel = 'Actual',
  resetLabel = 'Reset',
  resetTitle = 'Resetear a valor por defecto',
  placeholder = '#000000',
  onPickerChange,
  onInputChange,
  onReset,
  className = '',
}) {
  const borderColor = isValid ? 'var(--color-border)' : 'var(--color-destructive-border)';

  return (
    <div className={`space-y-2 ${className}`}>
      {(label || onReset) && (
        <div className="flex items-center justify-between">
          {label && <label className="text-sm font-semibold text-on-surface1">{label}</label>}
          {onReset && (
            <button type="button" onClick={onReset} className="text-xs text-link hover:underline" title={resetTitle}>
              {resetLabel}
            </button>
          )}
        </div>
      )}

      {description && <p className="text-xs text-on-surface2">{description}</p>}

      <div className="flex items-center gap-2">
        {/* Color Picker visual */}
        <div className="relative">
          <input type="color" value={pickerValue} onChange={onPickerChange}
            className="w-16 h-16 rounded border-2 cursor-pointer" style={{ borderColor }} />
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-[7px] font-bold text-white mix-blend-difference leading-tight text-center">
            {pickerLabel}
          </span>
        </div>

        {/* Preview box */}
        <div className="relative">
          <div className="w-16 h-16 rounded border-2 flex-shrink-0"
            style={{ backgroundColor: value, borderColor }} title={`Preview: ${value}`} />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white mix-blend-difference">
            {previewLabel}
          </span>
        </div>

        {/* Input de texto */}
        <input type="text" value={value} onChange={onInputChange}
          className={`px-2 py-2 rounded w-28 font-mono text-xs bg-input text-on-input border ${isValid ? 'border-input-border' : 'border-destructive-border'
            }`}
          placeholder={placeholder} />
      </div>

      {!isValid && errorMessage && <p className="text-xs text-on-destructive">{errorMessage}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🎨 COLORPICKER — Con lógica de validación y estado
// ══════════════════════════════════════════════════

/**
 * ColorPicker
 *
 * @param {object}   props
 * @param {string}   props.value        - Valor inicial del color
 * @param {Function} props.onChange     - Callback con el color válido
 * @param {string}  [props.label=""]   - Etiqueta del campo
 * @param {string}  [props.description=""] - Descripción
 * @param {Function}[props.onReset]    - Callback de reset
 * @param {string}  [props.className=""] - Clases adicionales
 */
export function ColorPicker({ value, onChange, label = '', description = '', onReset, className = '' }) {
  const [inputValue, setInputValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setInputValue(value);
    setIsValid(validateColor(value));
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const valid = validateColor(newValue);
    setIsValid(valid);
    if (valid) onChange(newValue);
  };

  const handlePickerChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsValid(true);
    onChange(newValue);
  };

  return (
    <ColorPickerRaw
      value={inputValue}
      pickerValue={getPickerValue(inputValue)}
      isValid={isValid}
      label={label}
      description={description}
      errorMessage="Color inválido. Usa formato: #hex, rgb(), rgba(), hsl() o palabra clave"
      onPickerChange={handlePickerChange}
      onInputChange={handleInputChange}
      onReset={onReset}
      className={className}
    />
  );
}

export default ColorPicker;
