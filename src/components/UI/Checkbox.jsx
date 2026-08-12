/**
 * UI/Checkbox.jsx
 *
 * COMPONENTE UNIFICADO DE CHECKBOX
 * Contiene dos versiones exportadas:
 *
 *   • CheckboxRaw → Lógica pura de checkbox accesible. Pasa clases vía className.
 *   • Checkbox    → Componente estilizado con CSS Variables del sistema de diseño.
 *
 * USO:
 * import Checkbox from '@/components/UI/Checkbox';
 * import { CheckboxRaw } from '@/components/UI/Checkbox';
 */

import React from 'react';

// ══════════════════════════════════════════════════
// 🔩 CHECKBOXRAW — Lógica pura sin color
// ══════════════════════════════════════════════════

export const CheckboxRaw = React.forwardRef((props, ref) => {
    const {
        label,
        checked,
        onChange,
        disabled = false,
        required = false,
        error = null,
        showError = true,
        className = '',
        id,
        ...rest
    } = props;

    const checkboxId = id || 'checkbox-' + Math.random().toString(36).substr(2, 9);

    return (
        <div>
            <div className={`flex items-start gap-3 ${className}`}>
                <input
                    ref={ref}
                    id={checkboxId}
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    className="mt-0.5 h-4 w-4 rounded border-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2"
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? checkboxId + '-error' : undefined}
                    {...rest}
                />

                {label && (
                    <label
                        htmlFor={checkboxId}
                        className={`text-sm select-none ${disabled ? 'text-secondary cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        {label}
                        {required && <span className="text-destructive ml-1">*</span>}
                    </label>
                )}
            </div>

            {showError && error && (
                <p id={checkboxId + '-error'} className="mt-1 text-sm text-on-destructive" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
});
CheckboxRaw.displayName = 'CheckboxRaw';

// ══════════════════════════════════════════════════
// 🎨 CHECKBOX — Componente estilizado
// ══════════════════════════════════════════════════

export const Checkbox = React.forwardRef((props, ref) => {
    const { className = '', disabled, error, ...rest } = props;

    const checkboxClasses = [
        className,
        'border-border',
        'text-primary',
        'focus:ring-primary',
        'focus:ring-offset-background',
        disabled ? 'cursor-not-allowed' : '',
        error ? 'border-destructive' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return <CheckboxRaw ref={ref} className={checkboxClasses} disabled={disabled} error={error} {...rest} />;
});
Checkbox.displayName = 'Checkbox';

export default Checkbox;
