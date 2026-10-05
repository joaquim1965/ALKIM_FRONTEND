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
import { formatImporte, formatPorcentaje } from '../../utils/format';
import {
  CabeceraPagina, Panel, CabeceraPanel, Campo, AvisoError, AvisoOk, Rotulo, SinDato, CLASE_INPUT,
  TablaTema, claseFila, TD, FilaVacia, BotonFila,
} from '../../components/UI/TemaPagina';

const ESTADOS = ['EMITIDO', 'PARCIAL', 'PAGADO', 'IMPAGADO', 'ANULADO'];
const mesActual = () => new Date().toISOString().slice(0, 7);
// Cifras con punto de millares (NORMAS §9). La unidad va en el rótulo.
const euros = (v) => (v == null || v === '' ? '' : formatImporte(v, ''));

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

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
      <CabeceraPagina icono={<Receipt size={24} />} titulo={t('titulo', 'Recibos')} subtitulo={t('subtitulo', 'Recibos de alquiler del mes y su cobro en el banco. Pantalla provisional (corte vertical).')} />
      <AvisoError>{error}</AvisoError>
      <AvisoOk>{aviso}</AvisoOk>

      {puedeGenerar && (
        <Panel className="p-5"><form onSubmit={generar} className="grid gap-3 sm:grid-cols-4">
          <h2 className="font-black tracking-tight text-on-surface2 sm:col-span-4">{t('generar', 'Generar el recibo de un mes')}</h2>
          <Campo etiqueta={t('contrato', 'Contrato')} ancho="sm:col-span-2">
            <select required value={gen.contrato_id} onChange={(e) => setGen((s) => ({ ...s, contrato_id: e.target.value }))} className={CLASE_INPUT}>
              <option value="">—</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.propiedad_codigo} · {c.que_se_alquila} · {c.inquilino || '?'} · {euros(c.renta_mensual)}€ · {c.arrendador_nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('mes', 'Mes')}><input required type="month" value={gen.mes} onChange={(e) => setGen((s) => ({ ...s, mes: e.target.value }))} className={CLASE_INPUT} /></Campo>
          <div className="flex items-end"><Button type="submit" loading={ocupado} leftIcon={<Plus size={16} />}>{t('generar_boton', 'Generar')}</Button></div>
        </form></Panel>
      )}

      <Panel className="overflow-hidden">
        <CabeceraPanel icono={<Receipt size={20} />} titulo={t('lista', 'Recibos')} contador={String((recibos || []).length)}>
          {contratoFiltro && <Button size="sm" variant="outline" leftIcon={<X size={14} />} onClick={() => { setParams({}); setMes(mesActual()); }}>{t('quitar_filtro', 'Quitar filtro de contrato')}</Button>}
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} aria-label={t('mes', 'Mes')} className="input-base px-3 py-2 text-sm" />
          <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label={t('col_estado', 'Estado')} className="input-base px-3 py-2 text-sm">
            <option value="">{t('todos_estados', 'Todos los estados')}</option>
            {ESTADOS.map((x) => <option key={x} value={x}>{t(`estado_${x.toLowerCase()}`, x)}</option>)}
          </select>
        </CabeceraPanel>
        <div className="p-3">
          <TablaTema columnas={[{ texto: t('col_numero', 'Número') }, { texto: t('col_periodo', 'Periodo') }, { texto: t('col_que', 'Qué se alquila') }, { texto: t('col_inquilino', 'Inquilino') }, { texto: t('col_entidad', 'Emite') }, { texto: t('col_total', 'Total (€)'), derecha: true }, { texto: t('col_cobrado', 'Cobrado (€)'), derecha: true }, { texto: t('col_estado', 'Estado') }]}>
              {(recibos || []).map((r, i) => (
                <tr key={r.id} tabIndex={0} onClick={() => abrir(r.id)} onKeyDown={(e) => e.key === 'Enter' && abrir(r.id)}
                  className={claseFila(i, { seleccionada: abierto?.id === r.id, clic: true })}>
                  <td className={`${TD} font-mono font-black`}>{r.serie}/{r.numero}</td>
                  <td className={`${TD} font-mono`}>{r.periodo_desde} → {r.periodo_hasta}</td>
                  <td className={TD}>{r.propiedad_codigo} · {r.que_se_alquila}</td>
                  <td className={`${TD} font-black tracking-tight`}>{r.inquilino || <SinDato />}</td>
                  <td className={TD}>{r.entidad_nombre}</td>
                  <td className={`${TD} text-right font-mono`}>{euros(r.total)}</td>
                  <td className={`${TD} text-right font-mono`}>{euros(r.pagado)}</td>
                  <td className={`${TD} font-bold`}>{t(`estado_${String(r.estado).toLowerCase()}`, r.estado)}</td>
                </tr>
              ))}
              {recibos && !recibos.length && <FilaVacia columnas={8}>{t('vacio', 'No hay recibos con estos filtros.')}</FilaVacia>}
          </TablaTema>
        </div>
      </Panel>

      {abierto && (
        <Panel className="space-y-4 p-5 text-on-surface2">
          <div className="flex flex-wrap items-start gap-3" aria-label={t('detalle', 'Detalle del recibo')}>
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-black tracking-tight">{t('recibo', 'Recibo')} <span className="font-mono">{abierto.serie}/{abierto.numero}</span> · {t(`estado_${String(abierto.estado).toLowerCase()}`, abierto.estado)}</h2>
              <p className="text-sm font-bold">{abierto.entidad_nombre}{abierto.entidad_nif ? ` (${abierto.entidad_nif})` : ''} → {abierto.inquilino || t('sin_inquilino', 'sin inquilino')} · {abierto.propiedad_codigo} · {abierto.que_se_alquila} · {t('contrato', 'Contrato')} <span className="font-mono">{abierto.contrato_codigo}</span></p>
              <p className="text-sm font-bold">{t('col_total', 'Total (€)')}: <span className="font-mono">{euros(abierto.total)}</span> · {t('col_cobrado', 'Cobrado (€)')}: <span className="font-mono">{euros(abierto.pagado)}</span> · {t('pendiente', 'Pendiente (€)')}: <span className="font-mono">{euros(Number(abierto.total) - Number(abierto.pagado))}</span></p>
            </div>
            {puedeGenerar && abierto.estado !== 'ANULADO' && !abierto.cobros.length && <Button size="sm" variant="outline" leftIcon={<Ban size={15} />} onClick={anular}>{t('anular', 'Anular')}</Button>}
            <Button size="sm" variant="secondary" leftIcon={<X size={15} />} onClick={() => { setAbierto(null); setCand(null); }}>{t('cerrar', 'Cerrar')}</Button>
          </div>

          {abierto.lineas.map((l) => {
            const rep = abierto.reparto.find((x) => x.linea_id === l.id)?.filas || [];
            return (
              <div key={l.id} className="rounded-2xl border border-border p-4">
                <p className="text-sm font-black">{l.descripcion} · <span className="font-mono">{euros(l.base)}€</span>{Number(l.cuota_iva) ? <> · IVA <span className="font-mono">{euros(l.cuota_iva)}</span></> : null}{Number(l.retencion) ? <> · {t('retencion', 'Retención')} <span className="font-mono">{euros(l.retencion)}</span></> : null}</p>
                <Rotulo className="mb-2 mt-3">{t('reparto', 'A quién va el ingreso')}</Rotulo>
                <TablaTema columnas={[{ texto: t('col_titular', 'Titular') }, { texto: '%', derecha: true }, { texto: t('col_importe', 'Importe (€)'), derecha: true }]}>
                    {rep.map((f, i) => (
                      <tr key={f.titular_id ?? 'sin'} className={claseFila(i)}>
                        <td className={`${TD} font-black tracking-tight`}>{f.titular_nombre || t('sin_titular', 'Sin titular (revisa la pestaña Titulares)')}</td>
                        <td className={`${TD} text-right font-mono`}>{formatPorcentaje(f.porcentaje)}</td>
                        <td className={`${TD} text-right font-mono`}>{euros(f.importe)}</td>
                      </tr>
                    ))}
                </TablaTema>
              </div>
            );
          })}

          <div>
            <Rotulo className="mb-2">{t('cobros', 'Cobros')}</Rotulo>
            {!abierto.cobros.length && <p className="text-sm font-bold">{t('sin_cobros', 'Todavía sin cobrar.')}</p>}
            {abierto.cobros.length > 0 && (
              <TablaTema columnas={[...(puedeCobrar ? [{ texto: '' }] : []), { texto: t('col_fecha', 'Fecha') }, { texto: t('col_movimiento', 'Movimiento') }, { texto: t('col_importe', 'Importe (€)'), derecha: true }]}>
                  {abierto.cobros.map((c, i) => (
                    <tr key={c.id} className={claseFila(i)}>
                      {puedeCobrar && <td className={`${TD} whitespace-nowrap`}><BotonFila icono={<Unlink size={13} />} texto={t('descasar', 'Deshacer')} onClick={() => descasar(c)} /></td>}
                      <td className={`${TD} font-mono`}>{c.fecha}</td>
                      <td className={TD}>{c.cuenta_alias} · {c.concepto_bancario || t('efectivo', 'Efectivo')}</td>
                      <td className={`${TD} text-right font-mono`}>{euros(c.importe)}</td>
                    </tr>
                  ))}
              </TablaTema>
            )}
          </div>

          {cand && (
            <div>
              <Rotulo className="mb-2">{t('candidatos', 'Movimientos que pueden pagarlo')} <span className="font-mono normal-case">({cand.desde} → {cand.hasta})</span></Rotulo>
              {!cand.movimientos.length && <p className="text-sm font-bold">{t('sin_candidatos', 'No hay ingresos sin casar en las cuentas de esta entidad en esas fechas. ¿Están descargados los extractos?')}</p>}
              {cand.movimientos.length > 0 && (
                <TablaTema columnas={[{ texto: '' }, { texto: t('col_fecha', 'Fecha') }, { texto: t('col_cuenta', 'Cuenta') }, { texto: t('col_concepto', 'Concepto') }, { texto: t('col_importe', 'Importe (€)'), derecha: true }, { texto: t('col_libre', 'Sin casar (€)'), derecha: true }]}>
                    {cand.movimientos.map((m, i) => (
                      <tr key={m.id} className={`${claseFila(i)} ${m.exacto ? 'font-black' : ''}`}>
                        <td className={`${TD} whitespace-nowrap`}><Button size="xs" variant="primary" leftIcon={<Link2 size={15} />} loading={ocupado} onClick={() => casar(m)}>{t('casar', 'Casar')}</Button></td>
                        <td className={`${TD} font-mono`}>{m.fecha}</td><td className={TD}>{m.cuenta_alias}</td>
                        <td className={TD}>{m.concepto_bancario}{m.exacto ? ` · ${t('exacto', 'importe exacto')}` : ''}</td>
                        <td className={`${TD} text-right font-mono`}>{euros(m.importe)}</td><td className={`${TD} text-right font-mono`}>{euros(m.libre)}</td>
                      </tr>
                    ))}
                </TablaTema>
              )}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
