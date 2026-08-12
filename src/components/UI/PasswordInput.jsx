/**
 * PasswordInput.jsx
 *
 * Componente de input para contraseñas con botón para mostrar/ocultar
 * Usa InputBase como base, añadiendo la lógica de toggle
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { InputRaw } from './Input';

/**
 * @param {object} props
 * @param {string} props.name - Nombre del campo
 * @param {string} props.label - Etiqueta del campo
 * @param {string} props.placeholder - Placeholder
 * @param {object} props.register - register de React Hook Form (ya ejecutado)
 * @param {object} props.errors - Objeto de errores (React Hook Form o custom)
 * @param {string} props.error - Error directo como string
 * @param {boolean} props.required - Si el campo es requerido
 * @param {boolean} props.disabled - Si está deshabilitado
 */
export function PasswordInput({
  name,
  label,
  placeholder,
  register,
  errors = {},
  error: directError,
  required = false,
  disabled = false,
  value,
  onChange,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);

  // Soporte tanto para 'errors' (RHF) como 'error' string directo
  const currentError = directError || errors[name]?.message || (typeof errors[name] === 'string' ? errors[name] : undefined);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <InputRaw
      {...register}
      type={showPassword ? 'text' : 'password'}
      name={name}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      error={currentError}
      required={required}
      disabled={disabled}
      leftIcon={<Lock size={18} />}
      rightIcon={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      onRightIconClick={togglePasswordVisibility}
      rightIconAriaLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      fullWidth
      {...rest}
    />
  );
}

export default PasswordInput;
