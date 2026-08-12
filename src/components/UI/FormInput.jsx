/**
 * UI/FormInput.jsx
 *
 * Input integrado con React Hook Form
 * Wrapper de Input que simplifica el uso con react-hook-form
 *
 * CARACTERISTICAS:
 * - Integración automática con React Hook Form (register)
 * - Muestra errores de validación automáticamente
 * - Soporte para todos los tipos de input (text, email, password, number, etc.)
 * - Iconos opcionales (izquierda/derecha)
 * - Helper text y labels
 *
 * USO:
 * import { FormInput } from '@/components/UI/FormInput';
 * import { useForm } from 'react-hook-form';
 *
 * const { register, formState: { errors } } = useForm();
 *
 * <FormInput
 *   name="email"
 *   label="Email"
 *   type="email"
 *   placeholder="tu@email.com"
 *   register={register}
 *   errors={errors}
 *   required
 * />
 */

import React from 'react';
import Input from './Input';

/**
 * @param {object} props - Propiedades del componente
 * @param {string} props.name - Nombre del campo (para React Hook Form)
 * @param {Function} props.register - Función register de useForm
 * @param {object} props.errors - Objeto errors de formState
 * @param {string} [props.label] - Etiqueta del input
 * @param {string} [props.type="text"] - Tipo de input
 * @param {string} [props.placeholder] - Placeholder
 * @param {string} [props.helperText] - Texto de ayuda
 * @param {React.ReactNode} [props.leftIcon] - Icono a la izquierda
 * @param {React.ReactNode} [props.rightIcon] - Icono a la derecha
 * @param {string} [props.size="md"] - Tamaño (sm, md, lg)
 * @param {boolean} [props.disabled=false] - Si está deshabilitado
 * @param {boolean} [props.required=false] - Si es requerido (solo visual)
 * @param {...any} props.rest - Cualquier otra prop de Input
 *
 * @note Cuando se usa con zodResolver, las validaciones se definen en el schema Zod,
 *       no en el register(). El parámetro 'required' es solo para mostrar el asterisco (*).
 */
export function FormInput({
  name,
  register,
  errors,
  label,
  type = 'text',
  placeholder,
  helperText,
  leftIcon,
  rightIcon,
  size = 'md',
  disabled = false,
  required = false,
  ...rest
}) {
  // Obtener mensaje de error si existe
  const error = errors[name]?.message;

  return (
    <Input
      {...register(name)}
      type={type}
      label={label}
      placeholder={placeholder}
      error={error}
      helperText={!error ? helperText : undefined}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      size={size}
      disabled={disabled}
      required={required}
      {...rest}
    />
  );
}

export default FormInput;
