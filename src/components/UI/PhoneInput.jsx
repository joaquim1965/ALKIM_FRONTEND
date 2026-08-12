/**
 * PhoneInput.jsx
 *
 * Componente de input para teléfono que separa prefijo y número
 * Visualmente parece un solo campo pero maneja dos valores separados
 * Usa InputBase como base para ambos inputs
 */

import React from 'react';
import { Phone } from 'lucide-react';
import { InputRaw } from './Input';

/**
 * @param {object} props
 * @param {string} props.label - Etiqueta del campo
 * @param {string} props.prefixPlaceholder - Placeholder para prefijo (ej: "+34")
 * @param {string} props.numberPlaceholder - Placeholder para número (ej: "612345678")
 * @param {object} props.registerPrefix - register del prefijo de React Hook Form
 * @param {object} props.registerNumber - register del número de React Hook Form
 * @param {object} props.errors - Objeto de errores de React Hook Form
 * @param {string} props.prefixName - Nombre del campo prefijo
 * @param {string} props.numberName - Nombre del campo número
 * @param {boolean} props.required - Si el campo es requerido
 * @param {boolean} props.disabled - Si está deshabilitado
 */
export function PhoneInput({
  label,
  prefixPlaceholder = '+34',
  numberPlaceholder = '612345678',
  registerPrefix,
  registerNumber,
  errors,
  prefixName,
  numberName,
  required = false,
  disabled = false,
}) {
  const prefixError = errors[prefixName]?.message;
  const numberError = errors[numberName]?.message;
  const error = prefixError || numberError;

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-on-surface1 mb-1">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      {/* Contenedor de los inputs */}
      <div className="flex">
        {/* Input de prefijo */}
        <InputRaw
          {...registerPrefix}
          type="text"
          placeholder={prefixPlaceholder}
          maxLength={4}
          error={error}
          showError={false}
          disabled={disabled}
          leftIcon={<Phone size={18} />}
          rounded="left"
          className="w-20"
          inputClassName="border-r-0"
        />

        {/* Separador visual */}
        <div className="h-auto w-px bg-border self-stretch" />

        {/* Input de número */}
        <InputRaw
          {...registerNumber}
          type="tel"
          placeholder={numberPlaceholder}
          error={error}
          showError={false}
          disabled={disabled}
          rounded="right"
          className="flex-1"
          inputClassName="border-l-0"
        />
      </div>

      {/* Mensaje de error (compartido) */}
      {error && (
        <p className="mt-1 text-sm text-on-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default PhoneInput;
