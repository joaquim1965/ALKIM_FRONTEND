/**
 * RecibosPage — Cartera → Recibos (01/10/2026, Plan core inmobiliaria fase 1V).
 *
 * Pantalla provisional del corte vertical: generar el recibo del mes de un
 * contrato, ver su estado y casarlo con el movimiento del banco que lo paga.
 * El detalle muestra a quién va el ingreso (titulares por su %).
 *
 * API: /recibos · /recibos/contratos · /recibos/generar · /recibos/:id ·
 *      /recibos/:id/candidatos · /recibos/:id/cobros[/:cobro] · /recibos/:id/anular
 * Textos: s_dictionary, contexto «Recibos».
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Receipt, Plus, Link2, Unlink, Ban, X } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { useStore } from '../../hooks/useStore';

const ESTADOS = ['EMITIDO', 'PARCIAL', 'PAGADO', 'IMPAGADO', 'ANULADO'];
const mesActual = () => new Date().toISOString().slice(0, 7);
const euros = (v) => (v == null || v === '' ? '—' : Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}
const claseInput = 'mt-1 w-full rounded-lg border border-border bg-surface1 px-3 py-2 text-on-background';
const Campo = ({ etiqueta, children, ancho = '' }) => <label className={`block text-sm font-bold text-on-background ${ancho}`}>{etiqueta}{children}</label>;

export default function RecibosPage() {
  const { t } = useTmTr('Recibos');
  const { can, user } = useStore();
  const todo = Number(user?.rol) >= 3;
  const puedeGenerar = todo || can('co_document', 'Write');
  const puedeCobrar = todo || can('co_payment', 'Write');
  const [params, setParams] = useSearchParams();
  const contratoFiltro = params.get('contrato') || '';
  const [mes, setMes] = useState(contratoFiltro ? '' : mesActual());
  const [estado, setEstado] = useState('');
  const [recibos, setRecibos] = useState(null);
  const [contratos, setContratos] = useState([]);
  const [gen, setGen] = useState({ contrato_id: contratoFiltro, mes: mesActual() });
  const [abierto, setAbierto] = useState(null);       // detalle
  const [cand, setCand] = useState(null);              // candidatos
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    const q = new URLSearchParams();
    if (mes) q.set('mes', mes);
    if (estado) q.set('estado', estado);
    if (contratoFiltro) q.set('contrato_id', contratoFiltro);
    try { setRecibos((await pedir(`/recibos?${q}`)).data || []); } catch (e) { setError(e.message); setRecibos([]); }
  }, [mes, estado, contratoFiltro]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { pedir('/recibos/contratos').then((b) => setContratos(b.data || [])).catch(() => {}); }, []);

  const abrir = async (id) => {
    setError(''); setCand(null);
    try {
      const d = (await pedir(`/recibos/${id}`)).data;
      setAbierto(d);
      if (puedeCobrar && ['EMITIDO', 'PARCIAL', 'IMPAGADO'].includes(d.estado)) setCand((await pedir(`/recibos/${id}/candidatos`)).data);
    } catch (e) { setError(e.message); }
  };
  const ejecutar = async (fn, mensaje) => {
    setOcupado(true); setError(''); setAviso('');
    try { const r = await fn(); if (mensaje) setAviso(typeof mensaje === 'function' ? mensaje(r) : mensaje); await cargar(); return r; }
    catch (e) { setError(e.message); return null; }
    finally { setOcupado(false); }
  };
  const generar = (ev) => {
    ev.preventDefault();
    ejecutar(async () => {
      const r = (await pedir('/recibos/generar', { method: 'POST', body: JSON.stringify(gen) })).data;
      await abrir(r.id);
      return r;
    }, (r) => t('generado', 'Recibo {serie}/{numero} generado: {total} €.').replace('{serie}', r.serie).replace('{numero}', r.numero).replace('{total}', euros(r.total)));
  };
  const casar = (m) => ejecutar(async () => {
    const r = (await pedir(`/recibos/${abierto.id}/cobros`, { method: 'POST', body: JSON.stringify({ movimiento_id: m.id }) })).data;
    await abrir(abierto.id);
    return r;
  }, (r) => t('casado', 'Cobro casado. Estado: {estado}.').replace('{estado}', t(`estado_${String(r.estado).toLowerCase()}`, r.estado)));
  const descasar = (c) => {
    if (!window.confirm(t('confirmar_descasar', '¿Deshacer este cobro?'))) return;
    ejecutar(async () => { await pedir(`/recibos/${abierto.id}/cobros/${c.id}`, { method: 'DELETE' }); await abrir(abierto.id); });
  };
  const anular = () => {
    if (!window.confirm(t('confirmar_anular', '¿Anular el recibo {serie}/{numero}? No se borra: queda como anulado.').replace('{serie}', abierto.serie).replace('{numero}', abierto.numero))) return;
    ejecutar(async () => { await pedir(`/recibos/${abierto.id}/anular`, { method: 'POST' }); await abrir(abierto.id); });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-widest">{t('seccion', 'Cartera')}</p>
          <h1 className="text-2xl font-black text-on-background">{t('titulo', 'Recibos')}</h1>
          <p className="text-sm">{t('subtitulo', 'Recibos de alquiler del mes y su cobro en el banco. Pantalla provisional (corte vertical).')}</p>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-destructive bg-surface1 px-4 py-3 text-sm text-destructive-text">{error}</div>}
      {aviso && <div role="status" className="rounded-xl border border-border bg-surface1 px-4 py-3 text-sm">{aviso}</div>}

      {puedeGenerar && (
        <form onSubmit={generar} className="grid gap-3 rounded-2xl border border-border bg-surface2 p-4 sm:grid-cols-4">
          <h2 className="font-black text-on-background sm:col-span-4">{t('generar', 'Generar el recibo de un mes')}</h2>
          <Campo etiqueta={t('contrato', 'Contrato')} ancho="sm:col-span-2">
            <select required value={gen.contrato_id} onChange={(e) => setGen((s) => ({ ...s, contrato_id: e.target.value }))} className={claseInput}>
              <option value="">—</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.unidad_codigo} · {c.inquilino || '—'} · {euros(c.renta_mensual)} € · {c.arrendador_nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('mes', 'Mes')}><input required type="month" value={gen.mes} onChange={(e) => setGen((s) => ({ ...s, mes: e.target.value }))} className={claseInput} /></Campo>
          <div className="flex items-end"><Button type="submit" loading={ocupado} leftIcon={<Plus size={16} />}>{t('generar_boton', 'Generar')}</Button></div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface2">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border text-on-background"><Receipt size={20} /></div>
          <h2 className="flex-1 font-black text-on-background">{t('lista', 'Recibos')} <span className="font-mono">({(recibos || []).length})</span></h2>
          {contratoFiltro && <Button size="sm" variant="outline" leftIcon={<X size={14} />} onClick={() => { setParams({}); setMes(mesActual()); }}>{t('quitar_filtro', 'Quitar filtro de contrato')}</Button>}
          <label className="text-sm font-bold text-on-background">{t('mes', 'Mes')} <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="ml-1 rounded-lg border border-border bg-surface1 px-2 py-1 text-on-background" /></label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label={t('col_estado', 'Estado')} className="rounded-lg border border-border bg-surface1 px-3 py-2 text-sm text-on-background">
            <option value="">{t('todos_estados', 'Todos los estados')}</option>
            {ESTADOS.map((x) => <option key={x} value={x}>{t(`estado_${x.toLowerCase()}`, x)}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto p-3">
          <table className="w-full text-sm">
            <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider">
              <th className="p-2">{t('col_numero', 'Número')}</th><th className="p-2">{t('col_periodo', 'Periodo')}</th><th className="p-2">{t('col_unidad', 'Unidad')}</th>
              <th className="p-2">{t('col_inquilino', 'Inquilino')}</th><th className="p-2">{t('col_entidad', 'Emite')}</th>
              <th className="p-2 text-right">{t('col_total', 'Total (€)')}</th><th className="p-2 text-right">{t('col_cobrado', 'Cobrado (€)')}</th><th className="p-2">{t('col_estado', 'Estado')}</th>
            </tr></thead>
            <tbody>
              {(recibos || []).map((r) => (
                <tr key={r.id} tabIndex={0} onClick={() => abrir(r.id)} onKeyDown={(e) => e.key === 'Enter' && abrir(r.id)}
                  className={`cursor-pointer bg-table-row text-on-table-row border-b border-border hover:bg-table-row-hover hover:text-on-table-row-hover ${abierto?.id === r.id ? 'font-black' : ''}`}>
                  <td className="p-2 font-mono">{r.serie}/{r.numero}</td>
                  <td className="p-2 font-mono">{r.periodo_desde} → {r.periodo_hasta}</td>
                  <td className="p-2">{r.unidad_codigo} · {r.unidad_nombre}</td>
                  <td className="p-2">{r.inquilino || '—'}</td>
                  <td className="p-2">{r.entidad_nombre}</td>
                  <td className="p-2 text-right font-mono">{euros(r.total)}</td>
                  <td className="p-2 text-right font-mono">{euros(r.pagado)}</td>
                  <td className="p-2 font-bold">{t(`estado_${String(r.estado).toLowerCase()}`, r.estado)}</td>
                </tr>
              ))}
              {recibos && !recibos.length && <tr className="bg-table-row text-on-table-row"><td colSpan={8} className="p-4 text-center">{t('vacio', 'No hay recibos con estos filtros.')}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {abierto && (
        <section className="space-y-4 rounded-2xl border border-border bg-surface2 p-5" aria-label={t('detalle', 'Detalle del recibo')}>
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1">
              <h2 className="text-xl font-black text-on-background">{t('recibo', 'Recibo')} <span className="font-mono">{abierto.serie}/{abierto.numero}</span> · {t(`estado_${String(abierto.estado).toLowerCase()}`, abierto.estado)}</h2>
              <p className="text-sm">{abierto.entidad_nombre}{abierto.entidad_nif ? ` (${abierto.entidad_nif})` : ''} → {abierto.inquilino || '—'} · {abierto.propiedad_codigo} {abierto.unidad_codigo} · {t('contrato', 'Contrato')} <span className="font-mono">{abierto.contrato_codigo}</span></p>
              <p className="text-sm">{t('col_total', 'Total (€)')}: <span className="font-mono">{euros(abierto.total)}</span> · {t('col_cobrado', 'Cobrado (€)')}: <span className="font-mono">{euros(abierto.pagado)}</span> · {t('pendiente', 'Pendiente (€)')}: <span className="font-mono">{euros(Number(abierto.total) - Number(abierto.pagado))}</span></p>
            </div>
            {puedeGenerar && abierto.estado !== 'ANULADO' && !abierto.cobros.length && <Button size="sm" variant="outline" leftIcon={<Ban size={15} />} onClick={anular}>{t('anular', 'Anular')}</Button>}
            <Button size="sm" variant="secondary" leftIcon={<X size={15} />} onClick={() => { setAbierto(null); setCand(null); }}>{t('cerrar', 'Cerrar')}</Button>
          </div>

          {abierto.lineas.map((l) => {
            const rep = abierto.reparto.find((x) => x.linea_id === l.id)?.filas || [];
            return (
              <div key={l.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-bold text-on-background">{l.descripcion} · <span className="font-mono">{euros(l.base)} €</span>{Number(l.cuota_iva) ? <> · IVA <span className="font-mono">{euros(l.cuota_iva)}</span></> : null}{Number(l.retencion) ? <> · {t('retencion', 'Retención')} <span className="font-mono">{euros(l.retencion)}</span></> : null}</p>
                <h3 className="mt-2 text-xs font-black uppercase tracking-widest">{t('reparto', 'A quién va el ingreso')}</h3>
                <table className="mt-1 w-full text-sm">
                  <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider">
                    <th className="p-2">{t('col_titular', 'Titular')}</th><th className="p-2 text-right">%</th><th className="p-2 text-right">{t('col_importe', 'Importe (€)')}</th>
                  </tr></thead>
                  <tbody>
                    {rep.map((f) => (
                      <tr key={f.titular_id ?? 'sin'} className="bg-table-row text-on-table-row border-b border-border">
                        <td className="p-2 font-bold">{f.titular_nombre || t('sin_titular', 'Sin titular (revisa la pestaña Titulares)')}</td>
                        <td className="p-2 text-right font-mono">{Number(f.porcentaje).toLocaleString('es-ES', { maximumFractionDigits: 3 })}</td>
                        <td className="p-2 text-right font-mono">{euros(f.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          <div>
            <h3 className="mb-1 text-xs font-black uppercase tracking-widest">{t('cobros', 'Cobros')}</h3>
            {!abierto.cobros.length && <p className="text-sm">{t('sin_cobros', 'Todavía sin cobrar.')}</p>}
            {abierto.cobros.length > 0 && (
              <table className="w-full text-sm">
                <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider">
                  <th className="p-2">{t('col_fecha', 'Fecha')}</th><th className="p-2">{t('col_movimiento', 'Movimiento')}</th><th className="p-2 text-right">{t('col_importe', 'Importe (€)')}</th><th />
                </tr></thead>
                <tbody>
                  {abierto.cobros.map((c) => (
                    <tr key={c.id} className="bg-table-row text-on-table-row border-b border-border">
                      <td className="p-2 font-mono">{c.fecha}</td>
                      <td className="p-2">{c.cuenta_alias} · {c.concepto_bancario || t('efectivo', 'Efectivo')}</td>
                      <td className="p-2 text-right font-mono">{euros(c.importe)}</td>
                      <td className="p-2 text-right">{puedeCobrar && <Button size="xs" variant="ghost" leftIcon={<Unlink size={15} />} onClick={() => descasar(c)}>{t('descasar', 'Deshacer')}</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {cand && (
            <div>
              <h3 className="mb-1 text-xs font-black uppercase tracking-widest">{t('candidatos', 'Movimientos que pueden pagarlo')} <span className="font-mono normal-case">({cand.desde} → {cand.hasta})</span></h3>
              {!cand.movimientos.length && <p className="text-sm">{t('sin_candidatos', 'No hay ingresos sin casar en las cuentas de esta entidad en esas fechas. ¿Están descargados los extractos?')}</p>}
              {cand.movimientos.length > 0 && (
                <table className="w-full text-sm">
                  <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider">
                    <th className="p-2">{t('col_fecha', 'Fecha')}</th><th className="p-2">{t('col_cuenta', 'Cuenta')}</th><th className="p-2">{t('col_concepto', 'Concepto')}</th>
                    <th className="p-2 text-right">{t('col_importe', 'Importe (€)')}</th><th className="p-2 text-right">{t('col_libre', 'Sin casar (€)')}</th><th />
                  </tr></thead>
                  <tbody>
                    {cand.movimientos.map((m) => (
                      <tr key={m.id} className={`bg-table-row text-on-table-row border-b border-border ${m.exacto ? 'font-black' : ''}`}>
                        <td className="p-2 font-mono">{m.fecha}</td><td className="p-2">{m.cuenta_alias}</td>
                        <td className="p-2">{m.concepto_bancario}{m.exacto ? ` · ${t('exacto', 'importe exacto')}` : ''}</td>
                        <td className="p-2 text-right font-mono">{euros(m.importe)}</td><td className="p-2 text-right font-mono">{euros(m.libre)}</td>
                        <td className="p-2 text-right"><Button size="xs" leftIcon={<Link2 size={15} />} loading={ocupado} onClick={() => casar(m)}>{t('casar', 'Casar')}</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
