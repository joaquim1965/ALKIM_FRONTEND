import React from 'react';

/**
 * Spinner
 *
 * Indicador de carga circular tematizado.
 * Tamaños: sm | md (por defecto) | lg.
 */
const SIZES = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-4',
};

export function Spinner({ size = 'md', className = '', ...rest }) {
    const sizeClasses = SIZES[size] || SIZES.md;
    return (
        <div
            role="status"
            aria-label="Cargando"
            className={`${sizeClasses} border-primary border-t-transparent rounded-full animate-spin ${className}`}
            {...rest}
        />
    );
}

export default Spinner;
