/**
 * UI/Label.jsx
 *
 * COMPONENTE UNIFICADO DE LABEL
 *
 *   • LabelRaw → Label completo con icono, badge, tamaño e indicador de requerido.
 *   • Label    → Alias de LabelRaw.
 *
 * USO:
 * import Label, { LabelRaw } from '@/components/UI/Label';
 *
 * <Label htmlFor="email" required>Email Address</Label>
 * <Label htmlFor="user" icon={<UserIcon />} badge="Optional">Username</Label>
 */

import React from 'react';

// ══════════════════════════════════════════════════
// 📦 CONFIGURACIONES DE ESTILO
// ══════════════════════════════════════════════════

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

// ══════════════════════════════════════════════════
// 🔩 LABELRAW — Label completo
// ══════════════════════════════════════════════════

/**
 * LabelRaw
 *
 * @param {object}           props
 * @param {React.ReactNode}  props.children          - Contenido del label
 * @param {string}          [props.htmlFor]          - ID del input asociado
 * @param {boolean}         [props.required=false]   - Muestra indicador *
 * @param {string}          [props.size="md"]        - Tamaño (sm, md, lg)
 * @param {React.ReactNode} [props.icon]             - Icono antes del texto
 * @param {string}          [props.badge]            - Badge después del texto
 * @param {string}          [props.className]        - Clases CSS adicionales
 * @param {...any}           [rest]                  - Props HTML nativas de label
 */
export function LabelRaw({ children, htmlFor, required = false, size = 'md', icon = null, badge = null, className = '', ...rest }) {
  const labelClasses = [
    'inline-flex items-center gap-2',
    'font-medium',
    'text-on-surface1',
    sizeClasses[size] || sizeClasses.md,
    className,
  ].filter(Boolean).join(' ');

  return (
    <label htmlFor={htmlFor} className={labelClasses} {...rest}>
      {icon && <span className="flex items-center">{icon}</span>}

      <span>
        {children}
        {required && <span className="text-destructive ml-1">*</span>}
      </span>

      {badge && (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface2 text-on-surface2">
          {badge}
        </span>
      )}
    </label>
  );
}

// ══════════════════════════════════════════════════
// 🎨 LABEL — Alias de LabelRaw
// ══════════════════════════════════════════════════

export function Label(props) {
  return <LabelRaw {...props} />;
}

export default Label;
