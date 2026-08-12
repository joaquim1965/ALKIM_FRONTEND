/**
 * UI/Link.jsx
 *
 * COMPONENTE UNIFICADO DE LINK
 * Contiene dos versiones exportadas del link:
 *
 *   • LinkRaw  → Lógica pura (iconos, externo, accesibilidad). Sin variante de color.
 *   • Link     → Componente estilizado que envuelve LinkRaw con variantes CSS Variables.
 *
 * CARACTERÍSTICAS:
 * ✅ Variantes: default, primary, muted, danger
 * ✅ Underline: none, always, hover
 * ✅ Iconos: leftIcon, rightIcon
 * ✅ Soporte para enlaces externos (target _blank + rel noopener)
 * ✅ Estado disabled
 * ✅ Accesibilidad: ARIA labels, focus ring
 *
 * USO:
 * import Link from '@/components/UI/Link';
 * import { LinkRaw } from '@/components/UI/Link';
 *
 * <Link href="/about">About</Link>
 * <Link href="https://example.com" external>External Link</Link>
 * <Link href="/profile" variant="primary">Profile</Link>
 * <Link href="/delete" variant="danger">Delete</Link>
 */

import React from 'react';

// ══════════════════════════════════════════════════
// 📦 CONFIGURACIONES DE ESTILO (usadas por Link)
// ══════════════════════════════════════════════════

/** Variantes de color — consumen CSS Variables del sistema de diseño */
const variantClasses = {
  default: 'text-link hover:text-link-hover',
  primary: 'text-primary hover:text-primary-hover',
  muted: 'text-secondary hover:text-on-surface1',
  danger: 'text-on-destructive',
};

/** Variantes de underline */
const underlineClasses = {
  none: 'no-underline',
  always: 'underline',
  hover: 'hover:underline',
};

// ══════════════════════════════════════════════════
// 🔩 LINKRAW — Lógica pura, mínimo estilo estructural
// ══════════════════════════════════════════════════

/**
 * LinkRaw
 *
 * Componente funcional "desnudo". Gestiona iconos, enlaces externos y
 * accesibilidad sin aplicar ninguna variante de color. Úsalo como base
 * para construir links personalizados pasando clases externas vía `className`.
 *
 * @param {object}           props
 * @param {React.ReactNode}  props.children        - Contenido del link
 * @param {string}           props.href             - URL del enlace
 * @param {boolean}         [props.external=false]  - Si es enlace externo (target _blank)
 * @param {React.ReactNode} [props.leftIcon]        - Icono a la izquierda
 * @param {React.ReactNode} [props.rightIcon]       - Icono a la derecha
 * @param {boolean}         [props.disabled=false]  - Si está deshabilitado
 * @param {string}          [props.className]       - Clases CSS adicionales
 * @param {...any}           rest                    - Props HTML nativas de <a>
 */
export function LinkRaw({
  children,
  href,
  external = false,
  leftIcon = null,
  rightIcon = null,
  disabled = false,
  className = '',
  ...rest
}) {
  // ─── Base estructural mínima (sin color/variante) ───
  const baseClasses = [
    'inline-flex items-center gap-1.5',
    'transition-colors duration-150',
    'focus:outline-none focus-ring',
    disabled ? 'is-disabled' : 'cursor-pointer',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // ─── Props para enlaces externos ───
  const externalProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <a
      href={disabled ? undefined : href}
      className={baseClasses}
      aria-disabled={disabled}
      {...externalProps}
      {...rest}
    >
      {/* Left Icon */}
      {leftIcon && <span className="flex items-center">{leftIcon}</span>}

      {/* Text */}
      {children}

      {/* Right Icon */}
      {rightIcon && <span className="flex items-center">{rightIcon}</span>}

      {/* External indicator (solo si no hay rightIcon) */}
      {external && !rightIcon && (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      )}
    </a>
  );
}

// ══════════════════════════════════════════════════
// 🎨 LINK — Componente estilizado (variantes + underline)
// ══════════════════════════════════════════════════

/**
 * Link
 *
 * Componente estilizado completo. Aplica variantes de color y underline
 * sobre LinkRaw usando CSS Variables del sistema de diseño.
 *
 * @param {object}           props
 * @param {React.ReactNode}  props.children              - Contenido del link
 * @param {string}           props.href                  - URL del enlace
 * @param {string}          [props.variant="default"]    - Variante de color
 * @param {string}          [props.underline="hover"]    - Cuándo mostrar underline
 * @param {boolean}         [props.external=false]       - Si es enlace externo
 * @param {React.ReactNode} [props.leftIcon]             - Icono izquierdo
 * @param {React.ReactNode} [props.rightIcon]            - Icono derecho
 * @param {boolean}         [props.disabled=false]       - Si está deshabilitado
 * @param {string}          [props.className]            - Clases CSS adicionales
 * @param {...any}           rest                    - Props HTML nativas de <a>
 */
export function Link({
  children,
  href,
  variant = 'default',
  underline = 'hover',
  external = false,
  leftIcon = null,
  rightIcon = null,
  disabled = false,
  className = '',
  ...rest
}) {
  // ─── Construir clases de estilo ───
  const styledClasses = [
    variantClasses[variant] || variantClasses.default,
    underlineClasses[underline] || underlineClasses.hover,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <LinkRaw
      href={href}
      external={external}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      disabled={disabled}
      className={styledClasses}
      {...rest}
    >
      {children}
    </LinkRaw>
  );
}

export default Link;
