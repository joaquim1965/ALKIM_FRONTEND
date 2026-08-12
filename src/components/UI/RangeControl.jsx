/**
 * UI/RangeControl.jsx
 *
 * COMPONENTE UNIFICADO DE RANGE CONTROL
 * Contiene dos versiones exportadas:
 *
 *   • RangeControlRaw → Lógica pura (slider + input numérico). Sin clases de color.
 *   • RangeControl    → Componente estilizado con CSS Variables del sistema de diseño.
 *
 * CARACTERÍSTICAS:
 * ✅ Input numérico y slider sincronizados
 * ✅ Unidad configurable (%, px, etc.)
 * ✅ Etiquetas personalizables para min, mid y max
 * ✅ Validación de rango (min/max)
 * ✅ Accesibilidad completa
 *
 * USO:
 * import RangeControl from '@/components/UI/RangeControl';
 * import { RangeControlRaw } from '@/components/UI/RangeControl';
 *
 * <RangeControl label="Opacity" value={opacity} onChange={setOpacity} min={0} max={100} unit="%" />
 */

import React from 'react';

// ══════════════════════════════════════════════════
// 🔩 RANGECONTROLRAW — Lógica pura, sin estilos de color
// ══════════════════════════════════════════════════

/**
 * RangeControlRaw
 *
 * Componente funcional "desnudo". Gestiona la sincronización entre el input
 * numérico y el slider sin aplicar colores específicos del sistema de diseño.
 * Pasa clases externas vía `className`.
 *
 * @param {object}   props
 * @param {string}  [props.label]       - Etiqueta del control
 * @param {number}   props.value         - Valor actual
 * @param {Function} props.onChange      - Callback al cambiar valor
 * @param {number}  [props.min=1]        - Valor mínimo
 * @param {number}  [props.max=100]      - Valor máximo
 * @param {number}  [props.step=1]       - Incremento
 * @param {string}  [props.unit=""]      - Unidad (%, px, etc.)
 * @param {string}  [props.minLabel]     - Etiqueta del mínimo
 * @param {string}  [props.midLabel]     - Etiqueta del medio
 * @param {string}  [props.maxLabel]     - Etiqueta del máximo
 * @param {string}  [props.className]    - Clases CSS adicionales
 */
export function RangeControlRaw({
  label,
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  unit = '',
  minLabel = null,
  midLabel = null,
  maxLabel = null,
  className = '',
}) {
  const handleInputChange = (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= min && val <= max) {
      onChange?.(val);
    }
  };

  const handleSliderChange = (e) => {
    onChange?.(parseInt(e.target.value));
  };

  const defaultMinLabel = minLabel !== null ? minLabel : `${min}${unit}`;
  const defaultMidLabel = midLabel !== null ? midLabel : Math.floor((min + max) / 2);
  const defaultMaxLabel = maxLabel !== null ? maxLabel : `${max}${unit}`;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        {/* Number Input */}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInputChange}
          className="w-20 px-3 py-2 border text-center font-mono text-lg focus:outline-none"
        />

        {/* Unit */}
        {unit && (
          <span className="text-2xl font-bold">{unit}</span>
        )}

        {/* Slider with labels */}
        <div className="w-1/2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs mt-1">
            <span>{defaultMinLabel}</span>
            <span>{defaultMidLabel}</span>
            <span>{defaultMaxLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🎨 RANGECONTROL — Componente estilizado
// ══════════════════════════════════════════════════

/**
 * RangeControl
 *
 * Componente estilizado completo. Aplica colores y estilos del sistema de
 * diseño (CSS Variables) al control de rango.
 *
 * @param {object}   props
 * @param {string}  [props.label]       - Etiqueta del control
 * @param {number}   props.value         - Valor actual
 * @param {Function} props.onChange      - Callback al cambiar valor
 * @param {number}  [props.min=1]        - Valor mínimo
 * @param {number}  [props.max=100]      - Valor máximo
 * @param {number}  [props.step=1]       - Incremento
 * @param {string}  [props.unit=""]      - Unidad (%, px, etc.)
 * @param {string}  [props.minLabel]     - Etiqueta del mínimo
 * @param {string}  [props.midLabel]     - Etiqueta del medio
 * @param {string}  [props.maxLabel]     - Etiqueta del máximo
 */
export function RangeControl({
  label,
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  unit = '',
  minLabel = null,
  midLabel = null,
  maxLabel = null,
}) {
  const handleInputChange = (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= min && val <= max) {
      onChange?.(val);
    }
  };

  const handleSliderChange = (e) => {
    onChange?.(parseInt(e.target.value));
  };

  const defaultMinLabel = minLabel !== null ? minLabel : `${min}${unit}`;
  const defaultMidLabel = midLabel !== null ? midLabel : Math.floor((min + max) / 2);
  const defaultMaxLabel = maxLabel !== null ? maxLabel : `${max}${unit}`;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-2 text-on-surface1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        {/* Number Input */}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInputChange}
          className="w-20 px-3 py-2 border border-input-border rounded-md bg-input text-on-input text-center font-mono text-lg focus:outline-none focus-ring"
        />

        {/* Unit */}
        {unit && (
          <span className="text-2xl font-bold text-on-surface1">{unit}</span>
        )}

        {/* Slider with labels */}
        <div className="w-1/2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-secondary mt-1">
            <span>{defaultMinLabel}</span>
            <span>{defaultMidLabel}</span>
            <span>{defaultMaxLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RangeControl;
