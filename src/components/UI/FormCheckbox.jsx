/**
 * UI/FormCheckbox.jsx
 *
 * COMPONENTE UNIFICADO DE FORM CHECKBOX
 * Contiene dos versiones exportadas:
 *
 *   • FormCheckboxRaw → Lógica pura de integración con React Hook Form. Sin estilos de color específicos.
 *   • FormCheckbox    → Componente estilizado que usa CheckboxBase con colores del sistema de diseño.
 *
 * CARACTERÍSTICAS:
 * ✅ Integración nativa con React Hook Form (register, errors)
 * ✅ Estados: normal, disabled, error
 * ✅ Label y required opcionales
 * ✅ Accesibilidad completa (ARIA)
 *
 * USO:
 * import FormCheckbox from '@/components/UI/FormCheckbox';
 * import { FormCheckboxRaw } from '@/components/UI/FormCheckbox';
 *
 * const { register, formState: { errors } } = useForm();
 *
 * <FormCheckbox
 *   name="terms"
 *   register={register}
 *   errors={errors}
 *   label="Acepto los términos y condiciones"
 *   required
 * />
 */

import React from 'react';
import { Checkbox } from './Checkbox';

// ══════════════════════════════════════════════════
// 🔩 FORMCHECKBOXRAW — Lógica pura de integración RHF
// ══════════════════════════════════════════════════

/**
 * FormCheckboxRaw
 *
 * Componente funcional "desnudo". Integra React Hook Form con Checkbox
 * sin imponer clases de color. Pasa clases externas vía `className`.
 *
 * @param {object}   props
 * @param {string}   props.name              - Nombre del campo (RHF)
 * @param {Function} props.register          - Función register de useForm()
 * @param {object}   props.errors            - Objeto errors de useForm()
 * @param {string}  [props.label]            - Etiqueta del checkbox
 * @param {boolean} [props.disabled=false]   - Si está deshabilitado
 * @param {boolean} [props.required=false]   - Si es requerido
 * @param {string}  [props.className]        - Clases CSS adicionales
 * @param {...any}   props.rest              - Props adicionales para Checkbox
 */
export function FormCheckboxRaw({
  name,
  register,
  errors,
  label,
  disabled = false,
  required = false,
  className = '',
  ...rest
}) {
  const error = errors?.[name]?.message;

  return (
    <Checkbox
      {...register(name)}
      label={label}
      error={error}
      disabled={disabled}
      required={required}
      className={className}
      {...rest}
    />
  );
}

// ══════════════════════════════════════════════════
// 🎨 FORMCHECKBOX — Componente estilizado
// ══════════════════════════════════════════════════

/**
 * FormCheckbox
 *
 * Componente estilizado completo. Alias tipado de FormCheckboxRaw que
 * hace explicito el contrato de props para formularios con React Hook Form.
 * Los estilos se aplican internamente mediante CheckboxBase y CSS Variables.
 *
 * @param {object}   props
 * @param {string}   props.name              - Nombre del campo (RHF)
 * @param {Function} props.register          - Función register de useForm()
 * @param {object}   props.errors            - Objeto errors de useForm()
 * @param {string}  [props.label]            - Etiqueta del checkbox
 * @param {boolean} [props.disabled=false]   - Si está deshabilitado
 * @param {boolean} [props.required=false]   - Si es requerido
 * @param {string}  [props.className]        - Clases CSS adicionales
 */
export function FormCheckbox({
  name,
  register,
  errors,
  label,
  disabled = false,
  required = false,
  className = '',
  ...rest
}) {
  const error = errors?.[name]?.message;

  return (
    <Checkbox
      {...register(name)}
      label={label}
      error={error}
      disabled={disabled}
      required={required}
      className={className}
      {...rest}
    />
  );
}

export default FormCheckbox;
