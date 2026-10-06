/**
 * PrestamosPestana — pestaña «Préstamos» de la ficha de la propiedad (01/10/2026, fase 2).
 *
 * Préstamos e hipotecas ligados a la propiedad: alta desde una cuenta bancaria
 * (el banco sale de la cuenta), quién lo paga (por defecto, los titulares
 * actuales con su %), cuadro de amortización (francés calculado o pegado del
 * banco) y baja si no tiene cuotas conciliadas.
 *
 * API: /propiedades/:id/prestamos[/:prestamo[/cuadro]] · /gestion-bancos/cuentas
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Table2, ClipboardPaste, Calculator } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { formatImporte, formatPorcentaje } from '../../utils/format';
import {
  Campo, Casilla, AvisoError, Ayuda, SinDato, CLASE_INPUT, Recuadro, TablaTema, claseFila, TD, BotonAnadir,
} from '../../components/UI/TemaPagina';
import CampoFecha from '../../components/UI/CampoFecha';

const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = (v) => (v ? String(v).slice(0, 10) : '');
// Cifras con punto de millares (NORMAS §9).
const euros = (v) => (v == null || v === '' ? null : formatImporte(v, ''));
const pct = (v) => formatPorcentaje(v) ?? '';
const VACIO = { cuenta_id: '', tipo: 'HIPOTECA', partes: { HIPOTECANTE: [], HIPOTECANTE_NO_DEUDOR: [], AVALISTA: [] }, fecha_inicio: hoy(), importe_concedido: '', tipo_interes: '', num_cuotas: '', periodicidad: 'MENSUAL', tipo_interes_variable: false, indice: '', diferencial: '', gastos_formalizacion: '' };

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

// Intervinientes (05/10/2026): hasta 3 personas de Entidades en cada papel.
export const ROLES = [['HIPOTECANTE', 'Hipotecantes'], ['HIPOTECANTE_NO_DEUDOR', 'Hipotecante no deudor'], ['AVALISTA', 'Avalista']];

/** Hasta 3 desplegables de personas; aparece uno vacío más mientras quede sitio. */
function SelectorPersonas({ valor, onCambio, personas, etiqueta, t }) {
  const filas = valor.length < 3 ? [...valor, ''] : valor;
  return (
    <div className="space-y-2">
      {filas.map((v, i) => (
        <select key={i} aria-label={`${etiqueta} ${i + 1}`} value={v} className={CLASE_INPUT}
          onChange={(e) => {
            const n = [...valor];
            if (e.target.value) n[i] = Number(e.target.value); else n.splice(i, 1);
            onCambio(n.filter(Boolean));
          }}>
          <option value="">{i < valor.length ? t('quitar', '— quitar —') : '—'}</option>
          {personas.filter((p) => p.id === v || !valor.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      ))}
    </div>
  );
}

export default function PrestamosPestana({ propiedadId, puedeEscribir, version = 0 }) {
  const { t } = useTmTr('Prestamos');
  const [prestamos, setPrestamos] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [form, setForm] = useState(null);
  const [abierto, setAbierto] = useState(null);      // id del préstamo con el cuadro a la vista
  const [rehacer, setRehacer] = useState(null);      // { prestamo, modo: 'pegar'|'calcular', texto, num_cuotas, tipo_interes }
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try { setPrestamos((await pedir(`/propiedades/${propiedadId}/prestamos`)).data || []); }
    catch (e) { setError(e.message); setPrestamos([]); }
  }, [propiedadId]);
  useEffect(() => { cargar(); }, [cargar, version]);   // version: sube cuando se pasa una escritura desde Documentos
  useEffect(() => { pedir('/gestion-bancos/cuentas').then((b) => setCuentas(b.data || b || [])).catch(() => {}); }, []);
  useEffect(() => { pedir('/companies/mine').then((b) => setPersonas((b.data || []).filter((e) => e.tipo === 'PERSONAL').sort((x, y) => x.nombre.localeCompare(y.nombre)))).catch(() => {}); }, []);

  const f = (k) => ({ value: form?.[k] ?? '', onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const r = (k) => ({ value: rehacer?.[k] ?? '', onChange: (e) => setRehacer((s) => ({ ...s, [k]: e.target.value })) });

  const crear = async (ev) => {
    ev.preventDefault();
    setOcupado(true); setError('');
    try {
      const { partes, ...resto } = form;
      const cuerpo = { ...resto, partes: ROLES.flatMap(([rol]) => partes[rol].map((entidad_id) => ({ entidad_id, rol }))) };
      if (!cuerpo.tipo_interes_variable) { delete cuerpo.indice; delete cuerpo.diferencial; }
      await pedir(`/propiedades/${propiedadId}/prestamos`, { method: 'POST', body: JSON.stringify(cuerpo) });
      setForm(null); await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };
  const borrar = async (l) => {
    if (!window.confirm(t('confirmar_borrar', '¿Borrar el préstamo «{alias}» y su cuadro?').replace('{alias}', l.alias))) return;
    try { await pedir(`/propiedades/${propiedadId}/prestamos/${l.id}`, { method: 'DELETE' }); await cargar(); }
    catch (e) { setError(e.message); }
  };
  const guardarCuadro = async (ev) => {
    ev.preventDefault();
    setOcupado(true); setError('');
    try {
      const cuerpo = rehacer.modo === 'pegar'
        ? { texto: rehacer.texto }
        : { num_cuotas: rehacer.num_cuotas, tipo_interes: rehacer.tipo_interes };
      await pedir(`/propiedades/${propiedadId}/prestamos/${rehacer.prestamo.id}/cuadro`, { method: 'POST', body: JSON.stringify(cuerpo) });
      setAbierto(rehacer.prestamo.id); setRehacer(null); await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  if (!prestamos) return <p className="text-xs font-bold uppercase tracking-widest">{t('cargando', 'Cargando…')}</p>;

  return (
    <div className="space-y-5">
      <AvisoError>{error}</AvisoError>
      <div className="flex items-center gap-3">
        {puedeEscribir && !form && <BotonAnadir texto={t('nuevo', 'Nuevo préstamo')} onClick={() => setForm({ ...VACIO })} pequeno />}
        <p className="flex-1 text-sm font-bold">{t('ayuda', 'Los intereses de cada préstamo se reparten entre quienes lo pagan, según su %.')}</p>
      </div>

      {form && (
        <Recuadro as="form" onSubmit={crear} className="grid gap-3 rejilla-campos">
          <h3 className="font-black tracking-tight text-on-surface2 sm:col-span-full">{t('nuevo', 'Nuevo préstamo')}</h3>
          <Campo etiqueta={t('cuenta', 'Cuenta de cargo')} ancho="sm:col-span-2">
            <select required {...f('cuenta_id')} className={CLASE_INPUT}>
              <option value="">—</option>
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.alias}{c.entidad_nombre ? ` · ${c.entidad_nombre}` : ''}{c.empresa_nombre ? ` · ${c.empresa_nombre}` : ''}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('tipo', 'Tipo')}>
            <select {...f('tipo')} className={CLASE_INPUT}>
              <option value="HIPOTECA">{t('tipo_hipoteca', 'Hipoteca')}</option>
              <option value="PRESTAMO">{t('tipo_prestamo', 'Préstamo')}</option>
            </select>
          </Campo>
          <div className="hidden sm:block" />
          {ROLES.map(([rol, nombre]) => (
            <Campo key={rol} etiqueta={t(`rol_${rol.toLowerCase()}`, nombre)}>
              <SelectorPersonas t={t} etiqueta={t(`rol_${rol.toLowerCase()}`, nombre)} personas={personas} valor={form.partes[rol]}
                onCambio={(v) => setForm((s) => ({ ...s, partes: { ...s.partes, [rol]: v } }))} />
            </Campo>
          ))}
          <div className="hidden sm:block" />
          <Campo etiqueta={t('fecha_inicio', 'Fecha de firma')}><CampoFecha required {...f('fecha_inicio')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('importe', 'Importe concedido (€)')}><input required type="number" step="0.01" min="0.01" {...f('importe_concedido')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('interes', 'Interés anual (%)')}><input required type="number" step="0.001" min="0" max="30" {...f('tipo_interes')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('num_cuotas', 'Número de cuotas')}><input required type="number" min="1" max="600" {...f('num_cuotas')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('periodicidad', 'Periodicidad')}>
            <select {...f('periodicidad')} className={CLASE_INPUT}>
              <option value="MENSUAL">{t('per_mensual', 'Mensual')}</option>
              <option value="TRIMESTRAL">{t('per_trimestral', 'Trimestral')}</option>
              <option value="ANUAL">{t('per_anual', 'Anual')}</option>
            </select>
          </Campo>
          <Campo etiqueta={t('gastos', 'Gastos de formalización (€)')}><input type="number" step="0.01" min="0" {...f('gastos_formalizacion')} className={CLASE_INPUT} /></Campo>
          <div className="flex items-end pb-1"><Casilla etiqueta={t('variable', 'Interés variable')} checked={form.tipo_interes_variable} onChange={(v) => setForm((s) => ({ ...s, tipo_interes_variable: v }))} /></div>
          {form.tipo_interes_variable && <>
            <Campo etiqueta={t('indice', 'Índice')}>
              <select {...f('indice')} className={CLASE_INPUT}>
                <option value="">—</option>
                {['EURIBOR_12M', 'EURIBOR_6M', 'IRPH', 'OTRO'].map((i) => <option key={i} value={i}>{t(`indice_${i.toLowerCase()}`, i.replace('_', ' '))}</option>)}
              </select>
            </Campo>
            <Campo etiqueta={t('diferencial', 'Diferencial (%)')}><input type="number" step="0.001" min="-5" max="20" {...f('diferencial')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          </>}
          <Ayuda className="sm:col-span-full">{t('ayuda_alta', 'Se calcula un cuadro francés. Si el banco te da otro, pégalo después con «Pegar cuadro». Lo pagan los titulares actuales con su %.')}</Ayuda>
          <div className="flex justify-end gap-2 sm:col-span-full">
            <Button type="button" variant="secondary" onClick={() => setForm(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('guardar', 'Guardar')}</Button>
          </div>
        </Recuadro>
      )}

      {rehacer && (
        <Recuadro as="form" onSubmit={guardarCuadro} className="grid gap-3 rejilla-campos">
          <h3 className="font-black tracking-tight text-on-surface2 sm:col-span-full">
            {(rehacer.modo === 'pegar' ? t('pegar_cuadro', 'Pegar cuadro del banco') : t('recalcular', 'Recalcular cuadro'))} · {rehacer.prestamo.alias}
          </h3>
          {rehacer.modo === 'pegar' ? (
            <Campo etiqueta={t('texto_cuadro', 'Una fila por cuota: fecha; cuota; interés; capital; pendiente (también vale copiado de Excel)')} ancho="sm:col-span-full">
              <textarea required rows={10} {...r('texto')} className={`${CLASE_INPUT} font-mono text-xs`} />
            </Campo>
          ) : <>
            <Campo etiqueta={t('num_cuotas', 'Número de cuotas')}><input required type="number" min="1" max="600" {...r('num_cuotas')} className={`${CLASE_INPUT} font-mono`} /></Campo>
            <Campo etiqueta={t('interes', 'Interés anual (%)')}><input type="number" step="0.001" min="0" max="30" {...r('tipo_interes')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          </>}
          <Ayuda className="sm:col-span-full">{t('ayuda_rehacer', 'Sustituye el cuadro actual. Si alguna cuota ya está conciliada con el banco, no se puede rehacer.')}</Ayuda>
          <div className="flex justify-end gap-2 sm:col-span-full">
            <Button type="button" variant="secondary" onClick={() => setRehacer(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('guardar', 'Guardar')}</Button>
          </div>
        </Recuadro>
      )}

      {!prestamos.length && !form && <Recuadro className="text-center text-xs font-bold uppercase tracking-widest text-on-surface2">{t('vacio', 'Esta propiedad no tiene préstamos.')}</Recuadro>}

      {prestamos.map((l) => {
        const anyo = String(new Date().getFullYear());
        const delAnyo = (l.cuadro || []).filter((c) => fecha(c.fecha).startsWith(anyo));
        const interesAnyo = delAnyo.reduce((a, c) => a + Number(c.interes), 0);
        return (
          <Recuadro as="section" key={l.id} className="text-on-surface2">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 space-y-1">
                <h3 className="font-black tracking-tight">{l.alias} · {t(`tipo_${String(l.tipo).toLowerCase()}`, l.tipo)}</h3>
                <p className="text-sm font-bold">{[l.banco_nombre, l.cuenta_alias].filter(Boolean).join(' · ')}{l.iban ? <> · <span className="font-mono text-xs">{l.iban}</span></> : ''}</p>
                <p className="text-sm font-bold">
                  {t('importe', 'Importe concedido (€)')}: <span className="font-mono">{euros(l.importe_concedido)}</span> ·{' '}
                  {t('interes', 'Interés anual (%)')}: <span className="font-mono">{pct(l.tipo_interes)}</span>{Number(l.tipo_interes_variable) ? ` (${t('variable', 'Interés variable')})` : ''} ·{' '}
                  {t('cuota', 'Cuota')}: <span className="font-mono">{euros(l.cuota_mensual)}</span> ·{' '}
                  {t('desde_hasta', 'De {a} a {b}').replace('{a}', fecha(l.fecha_inicio)).replace('{b}', fecha(l.fecha_vencimiento))}
                </p>
                {(l.partes || []).length > 0 && (
                  <p className="text-sm font-bold">
                    {ROLES.map(([rol, nombre]) => {
                      const quienes = l.partes.filter((x) => x.rol === rol).map((x) => x.nombre);
                      return quienes.length ? `${t(`rol_${rol.toLowerCase()}`, nombre)}: ${quienes.join(', ')}` : null;
                    }).filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-sm font-bold">
                  {t('pagan', 'Lo pagan')}: {(l.duenos || []).map((d) => `${d.titular_nombre} ${pct(d.porcentaje)}`).join(' · ') || <SinDato />} ·{' '}
                  {t('intereses_anyo', 'Intereses {anyo}').replace('{anyo}', anyo)}: <span className="font-mono">{euros(interesAnyo)}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="xs" variant="outline" leftIcon={<Table2 size={15} />} onClick={() => setAbierto(abierto === l.id ? null : l.id)}>
                  {abierto === l.id ? t('ocultar_cuadro', 'Ocultar cuadro') : t('ver_cuadro', 'Ver cuadro')} ({(l.cuadro || []).length})
                </Button>
                {puedeEscribir && <>
                  <Button size="xs" variant="outline" leftIcon={<ClipboardPaste size={15} />} onClick={() => setRehacer({ prestamo: l, modo: 'pegar', texto: '' })}>{t('pegar_cuadro', 'Pegar cuadro del banco')}</Button>
                  <Button size="xs" variant="outline" leftIcon={<Calculator size={15} />} onClick={() => setRehacer({ prestamo: l, modo: 'calcular', num_cuotas: (l.cuadro || []).length || '', tipo_interes: l.tipo_interes })}>{t('recalcular', 'Recalcular cuadro')}</Button>
                  <Button size="xs" variant="outline" aria-label={t('borrar', 'Borrar')} onClick={() => borrar(l)}><Trash2 size={15} /></Button>
                </>}
              </div>
            </div>
            {abierto === l.id && (
              <div className="mt-3 max-h-96 overflow-auto">
                <TablaTema columnas={[{ texto: 'Nº', derecha: true }, { texto: t('col_fecha', 'Fecha') }, { texto: t('cuota', 'Cuota'), derecha: true }, { texto: t('col_interes', 'Interés'), derecha: true }, { texto: t('col_capital', 'Capital'), derecha: true }, { texto: t('col_pendiente', 'Pendiente'), derecha: true }, { texto: t('col_origen', 'Origen') }]}>
                    {(l.cuadro || []).map((c, i) => (
                      <tr key={c.id || c.numero} className={claseFila(i)}>
                        <td className={`${TD} text-right font-mono`}>{c.numero}</td><td className={`${TD} font-mono`}>{fecha(c.fecha)}</td>
                        <td className={`${TD} text-right font-mono`}>{euros(c.cuota)}</td><td className={`${TD} text-right font-mono`}>{euros(c.interes)}</td>
                        <td className={`${TD} text-right font-mono`}>{euros(c.capital)}</td><td className={`${TD} text-right font-mono`}>{euros(c.pendiente)}</td>
                        <td className={TD}>{t(`origen_${String(c.origen).toLowerCase()}`, c.origen)}{c.movimiento_id ? ` · ${t('conciliada', 'conciliada')}` : ''}</td>
                      </tr>
                    ))}
                </TablaTema>
              </div>
            )}
          </Recuadro>
        );
      })}
    </div>
  );
}
