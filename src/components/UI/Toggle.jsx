/**
 * Toggle.jsx — interruptor de dos posiciones (27/09/2026).
 *
 * Es EL interruptor de ALKIM: se usa siempre que haya que elegir entre dos
 * estados (sí/no, encendido/apagado). Diseño pedido por el usuario:
 *   · encendido: texto a la izquierda y bola a la derecha;
 *   · apagado:   bola a la izquierda y texto a la derecha.
 * Los colores son los del tema: encendido, el de «éxito» (--color-success con
 * su texto --color-on-success; en el tema oscuro, verde); apagado, negro sobre
 * blanco en oscuro y al revés en claro (--color-on-background con
 * --color-background).
 *
 * Los textos salen del diccionario (contexto `Toggle`, claves `on` y `off`),
 * así que cambian con el idioma: en español «Sí» / «No». Se pueden sustituir
 * con `textoSi` / `textoNo` cuando un caso concreto lo necesite.
 *
 * Uso:
 *   <Toggle checked={valor} onChange={setValor} label="Ver proceso" />
 */
import React from 'react';
import { useTmTr } from '../../contexts/TmTrContext';

const FONDO = 'var(--color-background)';
const TINTA = 'var(--color-on-background)';
const EXITO = 'var(--color-success)';
const SOBRE_EXITO = 'var(--color-on-success)';

const Toggle = ({
  checked = false,
  onChange,
  label = null,
  textoSi = null,
  textoNo = null,
  disabled = false,
  title,
  className = '',
}) => {
  const { t } = useTmTr('Toggle');
  const si = textoSi ?? t('on', 'Sí');
  const no = textoNo ?? t('off', 'No');

  const boton = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={typeof label === 'string' ? label : undefined}
      title={title}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative inline-flex h-8 min-w-[78px] shrink-0 items-center rounded-full border-2 px-1 transition-colors duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50`}
      style={{ backgroundColor: checked ? EXITO : TINTA, borderColor: checked ? EXITO : FONDO, boxShadow: checked ? 'none' : `0 0 0 1px ${TINTA}` }}
    >
      <span
        className={`flex-1 select-none px-1 text-sm font-black uppercase tracking-wide ${checked ? 'text-left pl-2 pr-7' : 'text-right pr-2 pl-7'}`}
        style={{ color: checked ? SOBRE_EXITO : FONDO }}
      >
        {checked ? si : no}
      </span>
      <span
        aria-hidden="true"
        className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full transition-all duration-200"
        style={{ backgroundColor: checked ? SOBRE_EXITO : FONDO, ...(checked ? { right: '3px' } : { left: '3px' }) }}
      />
    </button>
  );

  if (!label) return <span className={className}>{boton}</span>;
  return (
    <label className={`inline-flex items-center gap-2 text-sm font-bold ${className}`}>
      <span>{label}</span>
      {boton}
    </label>
  );
};

export default Toggle;
export { Toggle };
