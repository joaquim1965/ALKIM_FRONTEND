import React from 'react';

/**
 * Badge
 *
 * Etiqueta de estado compacta, tematizada con las variables CSS del proyecto.
 * Variantes: success | destructive | warning | info | neutral (por defecto).
 */
const VARIANTS = {
    success: 'bg-success text-on-success border-success',
    destructive: 'bg-destructive text-on-destructive border-destructive',
    warning: 'bg-warning text-on-warning border-warning',
    info: 'bg-info text-on-info border-info',
    neutral: 'bg-surface2 text-on-surface2 border-border',
};

export function Badge({ variant = 'neutral', className = '', children, ...rest }) {
    const styles = VARIANTS[variant] || VARIANTS.neutral;
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${styles} ${className}`}
            {...rest}
        >
            {children}
        </span>
    );
}

export default Badge;
