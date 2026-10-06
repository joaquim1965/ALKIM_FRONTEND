/**
 * ComparadorCampos — forma ESTÁNDAR de pasar a un formulario los datos leídos
 * de un documento (06/10/2026). Ver docs/NORMAS_DESARROLLO.md «Lectura de documentos».
 *
 * Una fila por dato detectado: Campo · Valor actual · Valor leído · Qué se guarda
 * (Actual / Leído / Otro con su casilla). Si actual y leído coinciden pone «Coincide».
 * Por defecto: si el formulario no tiene el dato se propone el leído; si lo tiene, el actual.
 *
 * Lo usan pages/Cartera/LecturaNotaSimple.jsx y pages/Cartera/LecturaFactura.jsx.
 *
 * Campos: [{ c, nombre, tipo: 'texto'|'numero'|'importe'|'fecha'|'lista'|'personas', opciones?: [[valor, texto]], sinOtro? }]
 *   'personas': el valor es una lista de ids (p. ej. hipotecantes); se elige Actual o Leído, sin «Otro».
 */
import React from 'react';
import { TablaTema, claseFila, TD, CLASE_INPUT, SinDato } from '../UI/TemaPagina';
import { formatImporte } from '../../utils/format';
import CampoFecha from '../UI/CampoFecha';

// Botón de opción con el color de la fila: vacío = solo el círculo; elegido = círculo con un punto dentro.
const RADIO = 'h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-current bg-transparent '
  + 'checked:bg-[radial-gradient(circle,currentColor_0_40%,transparent_45%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current';

const NUMERICOS = ['numero', 'importe'];
const vacio = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);
const ids = (v) => (Array.isArray(v) ? v.map(String).sort().join(',') : '');
const texto = (v) => (v == null ? '' : String(v));
const aNumero = (v) => (vacio(v) ? null : Number(String(v).replace(',', '.')));

export function igualValor(campo, a, b) {
  if (campo.tipo === 'personas') return ids(a) === ids(b);
  if (NUMERICOS.includes(campo.tipo)) return aNumero(a) === aNumero(b);
  return texto(a).trim().toUpperCase() === texto(b).trim().toUpperCase();
}

export function verValor(campo, v) {
  if (vacio(v)) return null;
  if (campo.tipo === 'importe') return formatImporte(v, '€');
  if (campo.tipo === 'numero') return String(Number(v)).replace('.', ',');
  if (campo.tipo === 'fecha') return String(v).slice(0, 10).split('-').reverse().join('/');
  if (campo.tipo === 'personas') return v.map((id) => campo.opciones?.find(([k]) => String(k) === String(id))?.[1] || `#${id}`).join(' · ');
  if (campo.tipo === 'lista') return campo.opciones?.find(([k]) => k === v)?.[1] || String(v);
  return String(v);
}

/** Elección inicial para cada campo leído. */
export function eleccionInicial(campos, leidos, actuales) {
  return Object.fromEntries(campos.filter((f) => !vacio(leidos[f.c])).map((f) => [f.c, {
    opcion: vacio(actuales[f.c]) ? 'leido' : 'actual',
    propio: f.tipo === 'personas' ? '' : f.tipo === 'importe' || f.tipo === 'numero' ? texto(leidos[f.c]).replace('.', ',') : texto(leidos[f.c]),
  }]));
}

/** Valor de cada campo según lo elegido (todos los campos, cambien o no). */
export function valoresElegidos(campos, leidos, actuales, eleccion) {
  const r = {};
  for (const f of campos) {
    const e = eleccion[f.c];
    let v = actuales[f.c];
    if (e?.opcion === 'leido') v = leidos[f.c];
    else if (e?.opcion === 'propio') v = e.propio;
    r[f.c] = f.tipo === 'personas' ? (Array.isArray(v) ? v : []) : vacio(v) ? null : NUMERICOS.includes(f.tipo) ? aNumero(v) : String(v).trim();
  }
  return r;
}

/** Solo lo que cambia respecto a lo actual. */
export function cambiosElegidos(campos, leidos, actuales, eleccion) {
  const v = valoresElegidos(campos, leidos, actuales, eleccion);
  return Object.fromEntries(campos.filter((f) => !igualValor(f, v[f.c], actuales[f.c])).map((f) => [f.c, v[f.c]]));
}

export default function ComparadorCampos({ campos, leidos, actuales, eleccion, onElegir, t, textoVacio }) {
  const filas = campos.filter((f) => !vacio(leidos[f.c]));
  const tr = t || ((k, d) => d);
  return (
    <TablaTema columnas={[
      { texto: tr('campo', 'Campo') }, { texto: tr('valor_actual', 'Valor actual') }, { texto: tr('valor_leido', 'Valor leído') }, { texto: tr('que_guardar', 'Qué se guarda') },
    ]}>
      {filas.length === 0 && (
        <tr className={claseFila(0)}><td colSpan={4} className={TD}><SinDato texto={textoVacio || tr('nada_leido', 'No se ha detectado ningún dato')} /></td></tr>
      )}
      {filas.map((f, i) => {
        const actual = actuales[f.c];
        const leido = leidos[f.c];
        const e = eleccion[f.c] || { opcion: 'actual', propio: '' };
        return (
          <tr key={f.c} className={claseFila(i)}>
            <td className={TD}>{tr(`campo_${f.c}`, f.nombre)}</td>
            <td className={TD}>{verValor(f, actual) ?? <SinDato />}</td>
            <td className={TD}>{verValor(f, leido)}</td>
            <td className={TD}>
              {igualValor(f, actual, leido) ? tr('coincide', 'Coincide') : (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="radiogroup" aria-label={f.nombre}>
                  {[['actual', tr('opcion_actual', 'Actual')], ['leido', tr('opcion_leido', 'Leído')], ...(f.sinOtro || f.tipo === 'personas' ? [] : [['propio', tr('opcion_propio', 'Otro')]])].map(([op, et]) => (
                    <label key={op} className="flex cursor-pointer items-center gap-2">
                      <input type="radio" name={`leer_${f.c}`} checked={e.opcion === op} onChange={() => onElegir(f.c, { opcion: op })} className={RADIO} />
                      {et}
                    </label>
                  ))}
                  {e.opcion === 'propio' && (f.tipo === 'lista' ? (
                    <select value={e.propio} onChange={(ev) => onElegir(f.c, { propio: ev.target.value })} className={`${CLASE_INPUT} max-w-[14rem]`} aria-label={f.nombre}>
                      <option value="">—</option>
                      {f.opciones.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                    </select>
                  ) : f.tipo === 'fecha' ? (
                    <CampoFecha value={e.propio} onChange={(ev) => onElegir(f.c, { propio: ev.target.value })} className={`${CLASE_INPUT} max-w-[16rem]`} aria-label={f.nombre} autoFocus />
                  ) : (
                    <input value={e.propio} onChange={(ev) => onElegir(f.c, { propio: ev.target.value })}
                      type="text" inputMode={NUMERICOS.includes(f.tipo) ? 'decimal' : undefined}
                      className={`${CLASE_INPUT} max-w-[16rem]`} aria-label={f.nombre} autoFocus />
                  ))}
                </div>
              )}
            </td>
          </tr>
        );
      })}
    </TablaTema>
  );
}
