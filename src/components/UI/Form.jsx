/**
 * UI/Form.jsx
 *
 * COMPONENTE UNIFICADO DE FORMULARIO
 *
 *   • FormRaw → Lógica completa: estado, validación, submit/reset, contexto.
 *               Incluye subcomponentes: FormRaw.Field, FormRaw.Actions, FormRaw.Group
 *   • Form    → Alias de FormRaw con el mismo API. Se mantiene por consistencia.
 *
 * USO:
 * import Form, { FormRaw } from '@/components/UI/Form';
 *
 * <Form onSubmit={handle} initialValues={{ email: '' }}>
 *   <Form.Field name="email" label="Email" type="email" required />
 *   <Form.Actions>
 *     <Button type="submit">Login</Button>
 *   </Form.Actions>
 * </Form>
 */

import React, { useState, createContext, useContext } from 'react';
import { InputRaw } from './Input';
import { LabelRaw } from './Label';
import { ButtonRaw } from './Button';

// ══════════════════════════════════════════════════
// 📦 CONTEXTO DEL FORMULARIO
// ══════════════════════════════════════════════════

const FormContext = createContext(null);

const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) throw new Error('Form subcomponents must be used within a Form component');
  return context;
};

// ══════════════════════════════════════════════════
// 🔩 FORMRAW — Lógica completa del formulario
// ══════════════════════════════════════════════════

/**
 * FormRaw
 *
 * Gestión completa de estado, validación, submit y reset.
 * Expone FormRaw.Field, FormRaw.Actions y FormRaw.Group como subcomponentes.
 *
 * @param {object}           props
 * @param {React.ReactNode}  props.children               - Contenido del formulario
 * @param {object}          [props.initialValues={}]      - Valores iniciales
 * @param {Function}         props.onSubmit               - (values, helpers) => void
 * @param {Function}        [props.onReset]               - Callback de reset
 * @param {Function}        [props.validate]              - Validación global (values) => errors
 * @param {boolean}         [props.validateOnChange=false]- Validar en cada cambio
 * @param {boolean}         [props.validateOnBlur=true]   - Validar al perder foco
 * @param {string}          [props.className]             - Clases CSS adicionales
 * @param {...any}           props.rest                   - Props nativas de form
 */
export function FormRaw({
  children,
  initialValues = {},
  onSubmit,
  onReset,
  validate,
  validateOnChange = false,
  validateOnBlur = true,
  className = '',
  ...rest
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldValidatorsRef = React.useRef({});

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    onReset?.();
  };

  const validateField = (name, value) => {
    const validator = fieldValidatorsRef.current[name];
    if (validator) {
      const error = validator(value);
      setErrors((prev) => ({ ...prev, [name]: error }));
      return error;
    }
    return null;
  };

  const validateForm = () => {
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors || {});
      return Object.keys(validationErrors || {}).length === 0;
    }
    return true;
  };

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (validateOnChange) {
      validateField(name, value);
    } else if (errors[name]) {
      setErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (validateOnBlur) validateField(name, values[name]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = Object.keys(values).reduce((acc, key) => { acc[key] = true; return acc; }, {});
    setTouched(allTouched);
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(values, { setErrors, setSubmitting: setIsSubmitting, resetForm });
    } catch (err) {
      console.error('[Form] Error en submit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerFieldValidator = (name, validator) => {
    fieldValidatorsRef.current[name] = validator;
  };

  const contextValue = { values, errors, touched, isSubmitting, handleChange, handleBlur, registerFieldValidator };

  return (
    <FormContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        onReset={(e) => { e.preventDefault(); resetForm(); }}
        className={['space-y-3', className].filter(Boolean).join(' ')}
        noValidate
        {...rest}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

// ── Subcomponente: Form.Field ──────────────────────
FormRaw.Field = function FormField({ name, label, type = 'text', required = false, validate, ...rest }) {
  const { values, errors, touched, handleChange, handleBlur, registerFieldValidator } = useFormContext();

  React.useEffect(() => {
    if (validate) {
      registerFieldValidator(name, validate);
    } else if (required) {
      registerFieldValidator(name, (value) =>
        !value || (typeof value === 'string' && !value.trim()) ? 'Este campo es requerido' : null
      );
    }
  }, [name, validate, required]);

  return (
    <InputRaw
      name={name}
      label={label}
      type={type}
      value={values[name] || ''}
      onChange={(e) => handleChange(name, e.target.value)}
      onBlur={() => handleBlur(name)}
      error={touched[name] ? errors[name] : null}
      required={required}
      {...rest}
    />
  );
};

// ── Subcomponente: Form.Actions ────────────────────
FormRaw.Actions = function FormActions({ children, align = 'right', className = '' }) {
  const alignClasses = { left: 'justify-start', center: 'justify-center', right: 'justify-end' };
  return (
    <div className={[
      'flex items-center gap-3 mt-4 pt-3 border-t border-border',
      alignClasses[align],
      className
    ].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
};

// ── Subcomponente: Form.Group ──────────────────────
FormRaw.Group = function FormGroup({ children, title, description, className = '' }) {
  return (
    <div className={['space-y-3 p-3 border border-border rounded-lg', className].filter(Boolean).join(' ')}>
      {title && (
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-on-surface1">{title}</h3>
          {description && <p className="text-sm text-on-surface1 mt-1">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

// ══════════════════════════════════════════════════
// 🎨 FORM — Alias de FormRaw (mismo API)
// ══════════════════════════════════════════════════

/**
 * Form — Alias de FormRaw. Mantiene el mismo API para no romper importaciones existentes.
 */
export function Form(props) {
  return <FormRaw {...props} />;
}

Form.Field = FormRaw.Field;
Form.Actions = FormRaw.Actions;
Form.Group = FormRaw.Group;

export default Form;
