/**
 * UI/Button.jsx
 *
 * COMPONENTE UNIFICADO DE BOTÓN
 * Contiene dos versiones exportadas del botón:
 *
 *   • ButtonRaw  → Lógica pura (loading, iconos, accesibilidad). Sin estilo de variante.
 *   • Button     → Componente estilizado que envuelve ButtonRaw con variantes Tailwind/CSS Variables.
 *
 * CARACTERÍSTICAS:
 * ✅ Variantes: primary, secondary, success, danger, warning, ghost, link
 * ✅ Tamaños: xs, sm, md, lg, xl
 * ✅ Estados: disabled, loading, active
 * ✅ Iconos: leftIcon, rightIcon, isIconOnly
 * ✅ Accesibilidad: ARIA labels, focus ring
 * ✅ Clases utility (btn-primary, etc.) consumen CSS Variables del sistema de diseño
 *
 * USO:
 * import Button from '@/components/UI/Button';
 * import { ButtonRaw } from '@/components/UI/Button';
 *
 * <Button onClick={handleClick}>Guardar</Button>
 * <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
 * <Button variant="danger" size="lg" onClick={handleDelete}>Eliminar</Button>
 * <Button loading loadingText="Guardando...">Guardar</Button>
 * <Button leftIcon={<Icon />}>Con icono</Button>
 */

import React from 'react';

// ══════════════════════════════════════════════════
// 📦 CONFIGURACIONES DE ESTILO (usadas por Button)
// ══════════════════════════════════════════════════

/** Variantes de color — consumen clases utility de utilities.css (CSS Variables) */
const variantClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'btn-success',
  danger: 'btn-destructive',
  destructive: 'btn-destructive',
  warning: 'btn-warning',
  ghost: 'btn-ghost',
  link: 'btn-link',
};

/** Tamaños — consumen clases utility de utilities.css */
const sizeClasses = {
  xs: 'btn-size-xs',
  sm: 'btn-size-sm',
  md: 'btn-size-md',
  lg: 'btn-size-lg',
  xl: 'btn-size-xl',
};

/** Redondez de esquinas */
const roundedClasses = {
  none: 'rounded-none',
  xs: 'rounded-xs',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

// ══════════════════════════════════════════════════
// 🔩 BUTTONRAW — Lógica pura, mínimo estilo estructural
// ══════════════════════════════════════════════════

/**
 * ButtonRaw
 *
 * Componente funcional "desnudo". Gestiona loading, iconos y accesibilidad
 * sin aplicar ninguna variante de color. Úsalo como base para construir
 * botones personalizados pasando clases externas vía `className`.
 *
 * @param {object}           props
 * @param {React.ReactNode}  props.children        - Contenido del botón
 * @param {boolean}         [props.disabled=false]  - Deshabilita el botón
 * @param {boolean}         [props.loading=false]   - Activa el estado de carga
 * @param {string}          [props.loadingText]     - Texto durante la carga
 * @param {React.ReactNode} [props.leftIcon]        - Icono a la izquierda
 * @param {React.ReactNode} [props.rightIcon]       - Icono a la derecha
 * @param {boolean}         [props.isIconOnly=false]- Solo icono (ajusta padding y aria-label)
 * @param {string}          [props.className]       - Clases CSS adicionales
 * @param {object} rest - Props HTML nativas de <button>
 */
export function ButtonRaw({
  children,
  disabled = false,
  loading = false,
  loadingText = null,
  leftIcon = null,
  rightIcon = null,
  isIconOnly = false,
  className = '',
  ...rest
}) {
  // ─── Spinner SVG inline ───
  const Spinner = () => (
    <svg
      className="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="text-secondary"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="text-primary"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // ─── Contenido dinámico ───
  const renderContent = () => {
    if (loading) {
      return (
        <>
          <Spinner />
          {loadingText || children}
        </>
      );
    }
    return (
      <>
        {leftIcon && <span className="mr-2 flex items-center">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2 flex items-center">{rightIcon}</span>}
      </>
    );
  };

  // ─── Base estructural mínima (sin color/variante) ───
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium',
    'border',
    'focus:outline-none focus-ring',
    'transition-all ease-in-out duration-300',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      disabled={disabled || loading}
      className={baseClasses}
      aria-busy={loading}
      aria-label={isIconOnly && typeof children === 'string' ? children : undefined}
      {...rest}
    >
      {renderContent()}
    </button>
  );
}

// ══════════════════════════════════════════════════
// 🎨 BUTTON — Componente estilizado (variantes + tamaños)
// ══════════════════════════════════════════════════

/**
 * Button
 *
 * Componente estilizado completo. Aplica variantes de color, tamaños,
 * redondez y elevación sobre ButtonRaw usando clases utility de Tailwind
 * y CSS Variables del sistema de diseño.
 *
 * @param {object}           props
 * @param {React.ReactNode}  props.children              - Contenido del botón
 * @param {string}          [props.variant="primary"]    - Variante de color
 * @param {string}          [props.size="md"]            - Tamaño (xs, sm, md, lg, xl)
 * @param {boolean}         [props.fullWidth=false]      - Ancho completo
 * @param {string}          [props.rounded="md"]         - Redondez (none, xs, sm, md, lg, xl, full)
 * @param {boolean}         [props.disabled=false]       - Deshabilita el botón
 * @param {boolean}         [props.loading=false]        - Estado de carga
 * @param {string}          [props.loadingText]          - Texto durante la carga
 * @param {React.ReactNode} [props.leftIcon]             - Icono izquierdo
 * @param {React.ReactNode} [props.rightIcon]            - Icono derecho
 * @param {boolean}         [props.isIconOnly=false]     - Solo icono
 * @param {boolean}         [props.disableElevation=false]- Quita la sombra
 * @param {string}          [props.className]            - Clases CSS adicionales
 * @param {object} rest - Props HTML nativas de <button>
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  rounded = 'md',
  disabled = false,
  loading = false,
  loadingText = null,
  leftIcon = null,
  rightIcon = null,
  isIconOnly = false,
  disableElevation = false,
  className = '',
  ...rest
}) {
  // ─── Construir clases de estilo ───
  const styledClasses = [
    // Tamaño
    isIconOnly ? 'btn-icon-only' : (sizeClasses[size] || sizeClasses.md),

    // Ancho completo
    fullWidth ? 'w-full' : '',

    // Redondez
    roundedClasses[rounded] || roundedClasses.md,

    // Sombra
    disableElevation ? 'shadow-none' : 'shadow-sm',

    // Variante
    (variantClasses[variant] || variantClasses.primary),

    // Estado disabled/loading
    (disabled || loading ? 'is-disabled' : ''),

    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <ButtonRaw
      disabled={disabled}
      loading={loading}
      loadingText={loadingText}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      isIconOnly={isIconOnly}
      className={styledClasses}
      {...rest}
    >
      {children}
    </ButtonRaw>
  );
}

export default Button;
