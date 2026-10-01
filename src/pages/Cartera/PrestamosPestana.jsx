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

const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = (v) => (v ? String(v).slice(0, 10) : '');
const euros = (v) => (v == null || v === '' ? '—' : Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const pct = (v) => `${Number(v).toLocaleString('es-ES', { maximumFractionDigits: 3 })} %`;
const VACIO = { cuenta_id: '', tipo: 'HIPOTECA', alias: '', fecha_inicio: hoy(), importe_concedido: '', tipo_interes: '', num_cuotas: '', periodicidad: 'MENSUAL', tipo_interes_variable: false, indice: '', diferencial: '', gastos_formalizacion: '' };

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}
const claseInput = 'mt-1 w-full rounded-lg border border-border bg-surface1 px-3 py-2 text-on-background';
const Campo = ({ etiqueta, children, ancho = '' }) => <label className={`block text-sm font-bold text-on-background ${ancho}`}>{etiqueta}{children}</label>;

export default function PrestamosPestana({ propiedadId, puedeEscribir }) {
  const { t } = useTmTr('Prestamos');
  const [prestamos, setPrestamos] = useState(null);
  const [cuentas, setCuentas] = useState([]);
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
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { pedir('/gestion-bancos/cuentas').then((b) => setCuentas(b.data || b || [])).catch(() => {}); }, []);

  const f = (k) => ({ value: form?.[k] ?? '', onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const r = (k) => ({ value: rehacer?.[k] ?? '', onChange: (e) => setRehacer((s) => ({ ...s, [k]: e.target.value })) });

  const crear = async (ev) => {
    ev.preventDefault();
    setOcupado(true); setError('');
    try {
      const cuerpo = { ...form };
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

  if (!prestamos) return <p className="text-sm">{t('cargando', 'Cargando…')}</p>;

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="text-sm text-destructive-text">{error}</div>}
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm">{t('ayuda', 'Los intereses de cada préstamo se reparten entre quienes lo pagan, según su %.')}</p>
        {puedeEscribir && !form && <Button leftIcon={<Plus size={16} />} onClick={() => setForm({ ...VACIO })}>{t('nuevo', 'Nuevo préstamo')}</Button>}
      </div>

      {form && (
        <form onSubmit={crear} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4">
          <h3 className="font-black text-on-background sm:col-span-4">{t('nuevo', 'Nuevo préstamo')}</h3>
          <Campo etiqueta={t('cuenta', 'Cuenta de cargo')} ancho="sm:col-span-2">
            <select required {...f('cuenta_id')} className={claseInput}>
              <option value="">—</option>
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.alias}{c.entidad_nombre ? ` · ${c.entidad_nombre}` : ''}{c.empresa_nombre ? ` · ${c.empresa_nombre}` : ''}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('tipo', 'Tipo')}>
            <select {...f('tipo')} className={claseInput}>
              <option value="HIPOTECA">{t('tipo_hipoteca', 'Hipoteca')}</option>
              <option value="PRESTAMO">{t('tipo_prestamo', 'Préstamo')}</option>
            </select>
          </Campo>
          <Campo etiqueta={t('alias', 'Nombre')}><input required maxLength={100} {...f('alias')} className={claseInput} /></Campo>
          <Campo etiqueta={t('fecha_inicio', 'Fecha de firma')}><input required type="date" {...f('fecha_inicio')} className={claseInput} /></Campo>
          <Campo etiqueta={t('importe', 'Importe concedido (€)')}><input required type="number" step="0.01" min="0.01" {...f('importe_concedido')} className={`${claseInput} font-mono`} /></Campo>
          <Campo etiqueta={t('interes', 'Interés anual (%)')}><input required type="number" step="0.001" min="0" max="30" {...f('tipo_interes')} className={`${claseInput} font-mono`} /></Campo>
          <Campo etiqueta={t('num_cuotas', 'Número de cuotas')}><input required type="number" min="1" max="600" {...f('num_cuotas')} className={`${claseInput} font-mono`} /></Campo>
          <Campo etiqueta={t('periodicidad', 'Periodicidad')}>
            <select {...f('periodicidad')} className={claseInput}>
              <option value="MENSUAL">{t('per_mensual', 'Mensual')}</option>
              <option value="TRIMESTRAL">{t('per_trimestral', 'Trimestral')}</option>
              <option value="ANUAL">{t('per_anual', 'Anual')}</option>
            </select>
          </Campo>
          <Campo etiqueta={t('gastos', 'Gastos de formalización (€)')}><input type="number" step="0.01" min="0" {...f('gastos_formalizacion')} className={claseInput} /></Campo>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold text-on-background">
            <input type="checkbox" checked={Boolean(form.tipo_interes_variable)} onChange={(e) => setForm((s) => ({ ...s, tipo_interes_variable: e.target.checked }))} />
            {t('variable', 'Interés variable')}
          </label>
          {form.tipo_interes_variable && <>
            <Campo etiqueta={t('indice', 'Índice')}>
              <select {...f('indice')} className={claseInput}>
                <option value="">—</option>
                {['EURIBOR_12M', 'EURIBOR_6M', 'IRPH', 'OTRO'].map((i) => <option key={i} value={i}>{t(`indice_${i.toLowerCase()}`, i.replace('_', ' '))}</option>)}
              </select>
            </Campo>
            <Campo etiqueta={t('diferencial', 'Diferencial (%)')}><input type="number" step="0.001" min="-5" max="20" {...f('diferencial')} className={`${claseInput} font-mono`} /></Campo>
          </>}
          <p className="text-xs sm:col-span-4">{t('ayuda_alta', 'Se calcula un cuadro francés. Si el banco te da otro, pégalo después con «Pegar cuadro». Lo pagan los titulares actuales con su %.')}</p>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => setForm(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('guardar', 'Guardar')}</Button>
          </div>
        </form>
      )}

      {rehacer && (
        <form onSubmit={guardarCuadro} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4">
          <h3 className="font-black text-on-background sm:col-span-4">
            {(rehacer.modo === 'pegar' ? t('pegar_cuadro', 'Pegar cuadro del banco') : t('recalcular', 'Recalcular cuadro'))} · {rehacer.prestamo.alias}
          </h3>
          {rehacer.modo === 'pegar' ? (
            <Campo etiqueta={t('texto_cuadro', 'Una fila por cuota: fecha; cuota; interés; capital; pendiente (también vale copiado de Excel)')} ancho="sm:col-span-4">
              <textarea required rows={10} {...r('texto')} className={`${claseInput} font-mono text-xs`} />
            </Campo>
          ) : <>
            <Campo etiqueta={t('num_cuotas', 'Número de cuotas')}><input required type="number" min="1" max="600" {...r('num_cuotas')} className={`${claseInput} font-mono`} /></Campo>
            <Campo etiqueta={t('interes', 'Interés anual (%)')}><input type="number" step="0.001" min="0" max="30" {...r('tipo_interes')} className={`${claseInput} font-mono`} /></Campo>
          </>}
          <p className="text-xs sm:col-span-4">{t('ayuda_rehacer', 'Sustituye el cuadro actual. Si alguna cuota ya está conciliada con el banco, no se puede rehacer.')}</p>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => setRehacer(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('guardar', 'Guardar')}</Button>
          </div>
        </form>
      )}

      {!prestamos.length && !form && <p className="rounded-xl border border-border p-4 text-center text-sm">{t('vacio', 'Esta propiedad no tiene préstamos.')}</p>}

      {prestamos.map((l) => {
        const anyo = String(new Date().getFullYear());
        const delAnyo = (l.cuadro || []).filter((c) => fecha(c.fecha).startsWith(anyo));
        const interesAnyo = delAnyo.reduce((a, c) => a + Number(c.interes), 0);
        return (
          <section key={l.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1">
                <h3 className="font-black text-on-background">{l.alias} · {t(`tipo_${String(l.tipo).toLowerCase()}`, l.tipo)}</h3>
                <p className="text-sm">{l.banco_nombre || '—'} · {l.cuenta_alias}{l.iban ? ` · ${l.iban}` : ''}</p>
                <p className="text-sm">
                  {t('importe', 'Importe concedido (€)')}: <span className="font-mono">{euros(l.importe_concedido)}</span> ·{' '}
                  {t('interes', 'Interés anual (%)')}: <span className="font-mono">{pct(l.tipo_interes)}</span>{Number(l.tipo_interes_variable) ? ` (${t('variable', 'Interés variable')})` : ''} ·{' '}
                  {t('cuota', 'Cuota')}: <span className="font-mono">{euros(l.cuota_mensual)}</span> ·{' '}
                  {t('desde_hasta', 'De {a} a {b}').replace('{a}', fecha(l.fecha_inicio)).replace('{b}', fecha(l.fecha_vencimiento))}
                </p>
                <p className="text-sm">
                  {t('pagan', 'Lo pagan')}: {(l.duenos || []).map((d) => `${d.titular_nombre} ${pct(d.porcentaje)}`).join(' · ') || '—'} ·{' '}
                  {t('intereses_anyo', 'Intereses {anyo}').replace('{anyo}', anyo)}: <span className="font-mono">{euros(interesAnyo)}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="xs" variant="ghost" leftIcon={<Table2 size={15} />} onClick={() => setAbierto(abierto === l.id ? null : l.id)}>
                  {abierto === l.id ? t('ocultar_cuadro', 'Ocultar cuadro') : t('ver_cuadro', 'Ver cuadro')} ({(l.cuadro || []).length})
                </Button>
                {puedeEscribir && <>
                  <Button size="xs" variant="ghost" leftIcon={<ClipboardPaste size={15} />} onClick={() => setRehacer({ prestamo: l, modo: 'pegar', texto: '' })}>{t('pegar_cuadro', 'Pegar cuadro del banco')}</Button>
                  <Button size="xs" variant="ghost" leftIcon={<Calculator size={15} />} onClick={() => setRehacer({ prestamo: l, modo: 'calcular', num_cuotas: (l.cuadro || []).length || '', tipo_interes: l.tipo_interes })}>{t('recalcular', 'Recalcular cuadro')}</Button>
                  <Button size="xs" variant="ghost" aria-label={t('borrar', 'Borrar')} onClick={() => borrar(l)}><Trash2 size={15} /></Button>
                </>}
              </div>
            </div>
            {abierto === l.id && (
              <div className="mt-3 max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0"><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider">
                    <th className="p-2 text-right">Nº</th><th className="p-2">{t('col_fecha', 'Fecha')}</th><th className="p-2 text-right">{t('cuota', 'Cuota')}</th>
                    <th className="p-2 text-right">{t('col_interes', 'Interés')}</th><th className="p-2 text-right">{t('col_capital', 'Capital')}</th>
                    <th className="p-2 text-right">{t('col_pendiente', 'Pendiente')}</th><th className="p-2">{t('col_origen', 'Origen')}</th>
                  </tr></thead>
                  <tbody>
                    {(l.cuadro || []).map((c) => (
                      <tr key={c.id || c.numero} className="bg-table-row text-on-table-row border-b border-border">
                        <td className="p-2 text-right font-mono">{c.numero}</td><td className="p-2 font-mono">{fecha(c.fecha)}</td>
                        <td className="p-2 text-right font-mono">{euros(c.cuota)}</td><td className="p-2 text-right font-mono">{euros(c.interes)}</td>
                        <td className="p-2 text-right font-mono">{euros(c.capital)}</td><td className="p-2 text-right font-mono">{euros(c.pendiente)}</td>
                        <td className="p-2">{t(`origen_${String(c.origen).toLowerCase()}`, c.origen)}{c.movimiento_id ? ` · ${t('conciliada', 'conciliada')}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
