/**
 * TemaPagina — piezas comunes para que las pantallas nuevas sigan el tema
 * (01/10/2026).
 *
 * Las pantallas del Plan core inmobiliaria (Entidades, Terceros, Propiedades,
 * Recibos, Explorador de archivos…) se escribieron cada una con su propio
 * formulario, sus propias tablas y su propia cabecera, y se saltaban las normas
 * de `docs/CRITERIOS_UI_LISTADOS.md` y `docs/NORMAS_DESARROLLO.md` §8:
 *   · texto `text-on-background` dentro de las celdas de DataTable (blanco sobre
 *     fila blanca en el tema oscuro);
 *   · casillas nativas en lugar de `Toggle`;
 *   · inputs con colores de superficie en lugar de `input-base`;
 *   · acciones en la última columna; `toFixed()` para enseñar números.
 * Todo lo que necesitan está aquí, copiado de las pantallas modelo
 * (Tesorería → Bancos y cuentas, Extractos, /settings).
 *
 * Textos: s_dictionary, contexto «Comun» (BACKEND/migrations/2026.10.07 - textos comunes.sql).
 */
import React from 'react';
import { X } from 'lucide-react';
import Toggle from './Toggle';
import { useTmTr } from '../../contexts/TmTrContext';

/** Clase de todo input, select y textarea de formulario. */
export const CLASE_INPUT = 'input-base w-full px-3 py-2 text-sm';
/** Micro-etiqueta: la firma del estilo de la aplicación. */
export const MICRO = 'text-[11px] font-black uppercase tracking-widest';

/** Cabecera de página: distintivo con icono, título y descripción; acciones a la derecha. */
export const CabeceraPagina = ({ icono, titulo, subtitulo, children }) => (
  <header className="flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-4">
      <div className="rounded-2xl border-2 border-border bg-surface2 p-2.5 text-on-background shadow-sm">{icono}</div>
      <div>
        <h1 className="mb-1 text-2xl font-black leading-none tracking-tight text-on-background">{titulo}</h1>
        {subtitulo && <p className="text-xs font-bold uppercase tracking-widest text-on-surface2">{subtitulo}</p>}
      </div>
    </div>
    {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
  </header>
);

/** Panel de contenido: superficie con borde y radio grande. */
export const Panel = ({ children, className = '' }) => (
  <section className={`rounded-3xl border border-border bg-surface2 shadow-sm ${className}`}>{children}</section>
);

/** Cabecera de un panel: icono, título y contador; controles a la derecha. */
export const CabeceraPanel = ({ icono, titulo, contador, children }) => (
  <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
    {icono && <div className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-border bg-surface2 text-on-background">{icono}</div>}
    <div className="flex-1">
      <h2 className="font-black tracking-tight text-on-background">{titulo}</h2>
      {contador != null && <p className={`${MICRO} text-on-surface2`}>{contador}</p>}
    </div>
    {children}
  </div>
);

/** Campo de formulario: micro-etiqueta encima y el control debajo. */
export const Campo = ({ etiqueta, children, ancho = '' }) => (
  <label className={`block space-y-1.5 ${ancho}`}>
    <span className={`ml-1 block ${MICRO} text-on-surface2`}>{etiqueta}</span>
    {children}
  </label>
);

/** Rótulo de un bloque de formulario (`<fieldset>`). */
export const Leyenda = ({ children }) => (
  <legend className={`mb-2 ${MICRO} text-on-surface2`}>{children}</legend>
);

/** Rótulo de sección dentro de un panel o una ficha. */
export const Rotulo = ({ children, className = '' }) => (
  <h3 className={`${MICRO} text-on-surface2 ${className}`}>{children}</h3>
);

/** Sí / No: siempre el interruptor de la aplicación (NORMAS «Interruptores»). */
export const Casilla = ({ etiqueta, checked, onChange, disabled = false }) => (
  <Toggle checked={Boolean(checked)} onChange={onChange} label={etiqueta} disabled={disabled} className="text-on-surface2" />
);

/** Avisos: error con los colores de «destructive», correcto con los de «success». */
export const AvisoError = ({ children }) => (children ? (
  <div role="alert" className="rounded-2xl border border-destructive bg-destructive px-4 py-3 text-sm font-bold text-on-destructive">{children}</div>
) : null);
export const AvisoOk = ({ children }) => (children ? (
  <div role="status" className="rounded-2xl border border-success bg-success px-4 py-3 text-sm font-bold text-on-success">{children}</div>
) : null);

export const AvisoAtencion = ({ children }) => (children ? (
  <div role="status" className="rounded-2xl border border-warning-border bg-warning px-4 py-3 text-sm font-bold text-on-warning">{children}</div>
) : null);

/** Texto de ayuda o explicación, sobre superficie. */
export const Ayuda = ({ children, className = '' }) => (
  <p className={`text-xs font-bold text-on-surface2 ${className}`}>{children}</p>
);

/** Ausencia de dato: se escribe, no se deja un guion (CRITERIOS «Tipografía dentro de las celdas»). */
export const SinDato = ({ texto }) => {
  const { t } = useTmTr('Comun');
  return <span className="text-[11px] font-bold uppercase tracking-widest">{texto || t('sin_datos', 'Sin datos')}</span>;
};

/** Ventana modal: la de Tesorería → Bancos y cuentas. */
export const VentanaModal = ({ titulo, icono, onCerrar, ancho = 'max-w-3xl', children }) => {
  const { t } = useTmTr('Comun');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={typeof titulo === 'string' ? titulo : undefined}>
      <div className={`animate-in zoom-in-95 flex max-h-[92vh] w-full ${ancho} flex-col overflow-hidden rounded-3xl border border-border bg-surface1 shadow-2xl duration-200`}>
        <div className="flex items-center justify-between gap-4 border-b border-border bg-surface2 p-5">
          <div className="flex min-w-0 items-center gap-3">
            {icono && <div className="rounded-2xl border-2 border-border bg-surface2 p-2 text-on-background">{icono}</div>}
            <h2 className="truncate text-xl font-black leading-none tracking-tight text-on-background">{titulo}</h2>
          </div>
          <button type="button" onClick={onCerrar} aria-label={t('cerrar', 'Cerrar')} className="rounded-full p-2 text-on-surface2 transition-colors hover:bg-surface-hover hover:text-on-surface-hover">
            <X size={20} />
          </button>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6 text-on-surface1">{children}</div>
      </div>
    </div>
  );
};

/** Recuadro de formulario dentro de una ficha. */
export const Recuadro = ({ children, className = '', as: Etiqueta = 'div', ...resto }) => (
  <Etiqueta className={`rounded-2xl border border-border bg-surface2 p-4 ${className}`} {...resto}>{children}</Etiqueta>
);

// ── Tablas escritas a mano (las que no son DataTable) ──────────────────────
// Colores de tabla del tema (CRITERIOS «Toda tabla nueva usa los colores de
// tabla del tema»). La celda NO lleva color: lo pone la fila.

/** Contenedor + cabecera. `columnas`: [{ texto, derecha }]. La de acciones, la primera. */
export const TablaTema = ({ columnas, children, className = '' }) => (
  <div className={`custom-scrollbar overflow-x-auto rounded-2xl border border-border ${className}`}>
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-border bg-table-header text-on-table-header">
          {columnas.map((c, i) => (
            <th key={i} className={`whitespace-nowrap px-4 py-3 ${MICRO} ${c.derecha ? 'text-right' : ''}`}>{c.texto}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

/** Clase de una fila según su posición (cebra) y si está seleccionada. */
export const claseFila = (i, { seleccionada = false, clic = false } = {}) => `border-b border-border transition-colors duration-100 last:border-0
  hover:bg-table-row-hover hover:text-on-table-row-hover ${clic ? 'cursor-pointer' : ''}
  ${seleccionada ? 'bg-table-row-selected text-on-table-row-selected'
    : (i % 2 === 1 ? 'bg-table-row-striped text-on-table-row-striped' : 'bg-table-row text-on-table-row')}`;

/**
 * Botón dentro de una fila (o de una lista con colores de tabla). Hereda el
 * color de la fila: `Button` ghost/outline pinta con `--color-on-surface1`
 * y sobre una fila blanca del tema oscuro quedaba blanco sobre blanco.
 * Mismo aspecto que las acciones de DataTable.
 */
export const BotonFila = ({ icono, texto, titulo, onClick, disabled = false, type = 'button' }) => (
  <button
    type={type} onClick={onClick} disabled={disabled} title={titulo || texto} aria-label={titulo || texto}
    className={`inline-flex items-center gap-1 rounded-md transition-all hover:bg-surface-hover hover:text-on-surface-hover disabled:cursor-not-allowed
      ${texto ? 'border border-current px-2 py-1 text-[11px] font-black uppercase tracking-widest' : 'p-1'}`}
  >
    {icono}{texto && <span>{texto}</span>}
  </button>
);

/** Celda: solo espacio y alineación, nunca color. */
export const TD = 'px-4 py-3';

/** Fila de «no hay datos». */
export const FilaVacia = ({ columnas, children }) => (
  <tr className="bg-table-row text-on-table-row">
    <td colSpan={columnas} className="px-4 py-8 text-center text-xs font-bold uppercase tracking-widest">{children}</td>
  </tr>
);
