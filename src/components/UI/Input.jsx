/**
 * UI/Input.jsx
 *
 * COMPONENTE UNIFICADO DE INPUT
 *
 *   • InputRaw → Campo de texto puro con soporte de tamaños, iconos, label, error.
 *   • Input    → Alias de InputRaw (mismo API, compatibilidad total).
 *
 * USO:
 * import Input, { InputRaw } from '@/components/UI/Input';
 *
 * <Input type="email" label="Email" value={email} onChange={e => setEmail(e.target.value)} />
 * <Input leftIcon={<SearchIcon />} placeholder="Buscar..." />
 */

import React from 'react';

// ══════════════════════════════════════════════════
// 📦 CONFIGURACIONES DE ESTILO
// ══════════════════════════════════════════════════

const sizeClasses = {
  sm: 'input-size-sm',
  md: 'input-size-md',
  lg: 'input-size-lg',
};

const roundedClasses = {
  all: 'rounded-md',
  left: 'rounded-l-md rounded-r-none',
  right: 'rounded-r-md rounded-l-none',
  none: 'rounded-none',
};

// ══════════════════════════════════════════════════
// 🔩 INPUTRAW — Campo de texto completo
// ══════════════════════════════════════════════════

/**
 * InputRaw
 *
 * @param {object}           props
 * @param {string}          [props.type="text"]           - Tipo de input
 * @param {string}          [props.label]                 - Etiqueta del campo
 * @param {string}          [props.placeholder]           - Placeholder
 * @param {string}           props.value                  - Valor controlado
 * @param {Function}         props.onChange               - Callback onChange
 * @param {Function}        [props.onBlur]                - Callback onBlur
 * @param {Function}        [props.onFocus]               - Callback onFocus
 * @param {string}          [props.size="md"]             - Tamaño (sm, md, lg)
 * @param {boolean}         [props.disabled=false]        - Deshabilitado
 * @param {boolean}         [props.readonly=false]        - Solo lectura
 * @param {boolean}         [props.required=false]        - Obligatorio
 * @param {string}          [props.error]                 - Mensaje de error
 * @param {boolean}         [props.showError=true]        - Mostrar mensaje de error
 * @param {string}          [props.helperText]            - Texto de ayuda
 * @param {React.ReactNode} [props.leftIcon]              - Icono izquierdo
 * @param {React.ReactNode} [props.rightIcon]             - Icono derecho
 * @param {Function}        [props.onRightIconClick]      - Callback del icono derecho
 * @param {string}          [props.rightIconAriaLabel]    - Aria-label del icono derecho
 * @param {boolean}         [props.fullWidth=false]       - Ancho completo
 * @param {string}          [props.rounded="all"]         - Redondez (all, left, right, none)
 * @param {string}          [props.className]             - Clases del contenedor
 * @param {string}          [props.inputClassName]        - Clases del input
 * @param {string}          [props.id]                    - ID del input
 * @param {React.Ref}        ref                          - Ref del input
 * @param {...any}           props.rest                   - Props HTML nativas de input
 */
export const InputRaw = React.forwardRef((props, ref) => {
  const {
    type = 'text',
    label,
    placeholder,
    value,
    onChange,
    onBlur,
    onFocus,
    size = 'md',
    disabled = false,
    readonly = false,
    required = false,
    error = null,
    showError = true,
    helperText = null,
    leftIcon = null,
    rightIcon = null,
    onRightIconClick = null,
    rightIconAriaLabel = 'Toggle',
    fullWidth = false,
    rounded = 'all',
    className = '',
    inputClassName = '',
    id,
    ...rest
  } = props;

  const inputId = id || 'input-' + Math.random().toString(36).substr(2, 9);

  const inputClasses = [
    'block w-full',
    'input-base',
    sizeClasses[size] || sizeClasses.md,
    roundedClasses[rounded] || roundedClasses.all,
    error ? 'input-error' : '',
    readonly ? 'cursor-default' : '',
    inputClassName,
  ].filter(Boolean).join(' ');

  const containerClasses = [fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ');
  const labelClasses = ['block font-medium mb-0.5 text-sm text-on-surface1', disabled ? 'opacity-50' : ''].filter(Boolean).join(' ');
  const rightIconBaseClasses = 'absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface1';

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={inputId} className={labelClasses}>
          {label}
          {required && <span className="ml-1 opacity-70">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface1">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          readOnly={readonly}
          required={required}
          className={inputClasses}
          style={{
            paddingLeft: leftIcon ? '2.5rem' : undefined,
            paddingRight: rightIcon ? '2.5rem' : undefined,
          }}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...rest}
        />

        {rightIcon && (
          onRightIconClick ? (
            <button 
              type="button" 
              onClick={onRightIconClick}
              onMouseDown={(e) => e.preventDefault()}
              className={`${rightIconBaseClasses} cursor-pointer hover:text-primary transition-colors`}
              tabIndex={-1} 
              aria-label={rightIconAriaLabel} 
              disabled={disabled}
            >
              {rightIcon}
            </button>
          ) : (
            <div className={`${rightIconBaseClasses} pointer-events-none`}>{rightIcon}</div>
          )
        )}
      </div>

      {showError && error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-on-destructive" role="alert">{error}</p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-secondary">{helperText}</p>
      )}
    </div>
  );
});

InputRaw.displayName = 'InputRaw';

// ══════════════════════════════════════════════════
// 🎨 INPUT — Alias de InputRaw
// ══════════════════════════════════════════════════

export const Input = React.forwardRef((props, ref) => <InputRaw ref={ref} {...props} />);
Input.displayName = 'Input';

export default Input;
