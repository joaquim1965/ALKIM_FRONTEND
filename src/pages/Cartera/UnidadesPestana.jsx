/**
 * UnidadesPestana — pestaña «Unidades» de la ficha de la propiedad (01/10/2026, fase 1V).
 *
 * Pantalla provisional del corte vertical: qué se alquila (la propiedad entera
 * o unos espacios), con qué modalidad y quién lo cobra; y su contrato con el
 * inquilino. Los recibos se generan y se cobran en Cartera → Recibos.
 *
 * API: /propiedades/:id/unidades[/:unidad[/contratos[/:contrato]]] · /recibos/catalogos ·
 *      /terceros?papel=inquilino · /companies/mine
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, FileSignature, DoorClosed, Ban, Receipt } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';

const hoy = () => new Date().toISOString().slice(0, 10);
const euros = (v) => (v == null || v === '' ? '—' : `${Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
const UNIDAD_VACIA = { ambito: 'ESPACIOS', espacios: [], modalidad_id: '', explotacion: 'TITULARES', entidad_explotadora_id: '', fecha_desde: hoy(), nombre: '', codigo: '', renta_objetivo: '' };
const CONTRATO_VACIO = { tipo_id: '', fecha_inicio: hoy(), fecha_fin: '', renta_mensual: '', dia_pago: 1, forma_pago: 'TRANSFERENCIA', fianza_importe: '', fianza_depositada_en: '', tercero_id: '', estado: 'VIGENTE', es_vivienda_habitual_inquilino: false };

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}
const claseInput = 'mt-1 w-full rounded-lg border border-border bg-surface1 px-3 py-2 text-on-background';
const Campo = ({ etiqueta, children, ancho = '' }) => <label className={`block text-sm font-bold text-on-background ${ancho}`}>{etiqueta}{children}</label>;
const nombreTercero = (p) => p.razon_social || [p.nombre, p.apellidos].filter(Boolean).join(' ');

export default function UnidadesPestana({ propiedadId, espacios = [], puedeEscribir, puedeContratos }) {
  const { t } = useTmTr('Unidades');
  const [unidades, setUnidades] = useState(null);
  const [cat, setCat] = useState({ modalidades: [], tipos: [] });
  const [inquilinos, setInquilinos] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [formU, setFormU] = useState(null);
  const [formC, setFormC] = useState(null);       // { unidad, ...campos }
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try { setUnidades((await pedir(`/propiedades/${propiedadId}/unidades`)).data || []); }
    catch (e) { setError(e.message); setUnidades([]); }
  }, [propiedadId]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    pedir('/recibos/catalogos').then((b) => setCat(b.data || { modalidades: [], tipos: [] })).catch(() => {});
    pedir('/terceros?papel=inquilino').then((b) => setInquilinos(b.data || [])).catch(() => {});
    pedir('/companies/mine').then((b) => setEntidades(b.data || [])).catch(() => {});
  }, []);

  const alquilables = espacios.filter((e) => !Number(e.es_comun) && Number(e.activo ?? 1));
  const ocupados = new Set((unidades || []).filter((u) => !u.fecha_hasta).flatMap((u) => u.espacios.map((e) => e.espacio_id)));
  const fu = (k) => ({ value: formU?.[k] ?? '', onChange: (e) => setFormU((s) => ({ ...s, [k]: e.target.value })) });
  const fc = (k) => ({ value: formC?.[k] ?? '', onChange: (e) => setFormC((s) => ({ ...s, [k]: e.target.value })) });

  const ejecutar = async (fn) => {
    setOcupado(true); setError('');
    try { await fn(); await cargar(); } catch (e) { setError(e.message); } finally { setOcupado(false); }
  };

  const guardarUnidad = (ev) => {
    ev.preventDefault();
    ejecutar(async () => {
      const cuerpo = { ...formU, espacios: formU.ambito === 'ESPACIOS' ? formU.espacios : [] };
      if (cuerpo.explotacion !== 'ENTIDAD') delete cuerpo.entidad_explotadora_id;
      await pedir(`/propiedades/${propiedadId}/unidades`, { method: 'POST', body: JSON.stringify(cuerpo) });
      setFormU(null);
    });
  };
  const guardarContrato = (ev) => {
    ev.preventDefault();
    ejecutar(async () => {
      const { unidad, tercero_id, ...resto } = formC;
      await pedir(`/propiedades/${propiedadId}/unidades/${unidad.id}/contratos`, { method: 'POST', body: JSON.stringify({ ...resto, partes: tercero_id ? [{ tercero_id, rol: 'TITULAR' }] : [] }) });
      setFormC(null);
    });
  };
  const cerrarUnidad = (u) => {
    const f = window.prompt(t('cerrar_desde', 'Fecha de cierre de la unidad {codigo} (AAAA-MM-DD)').replace('{codigo}', u.codigo), hoy());
    if (f) ejecutar(() => pedir(`/propiedades/${propiedadId}/unidades/${u.id}`, { method: 'PUT', body: JSON.stringify({ fecha_hasta: f, estado: 'CERRADA' }) }));
  };
  const borrarUnidad = (u) => {
    if (window.confirm(t('confirmar_borrar_unidad', '¿Borrar la unidad {codigo}?').replace('{codigo}', u.codigo))) ejecutar(() => pedir(`/propiedades/${propiedadId}/unidades/${u.id}`, { method: 'DELETE' }));
  };
  const rescindir = (u, c) => {
    const f = window.prompt(t('rescindir_desde', 'Fecha de fin del contrato {codigo} (AAAA-MM-DD)').replace('{codigo}', c.codigo), hoy());
    if (f) ejecutar(() => pedir(`/propiedades/${propiedadId}/unidades/${u.id}/contratos/${c.id}`, { method: 'PUT', body: JSON.stringify({ estado: 'RESCINDIDO', fecha_rescision: f }) }));
  };
  const borrarContrato = (u, c) => {
    if (window.confirm(t('confirmar_borrar_contrato', '¿Borrar el contrato {codigo}?').replace('{codigo}', c.codigo))) ejecutar(() => pedir(`/propiedades/${propiedadId}/unidades/${u.id}/contratos/${c.id}`, { method: 'DELETE' }));
  };
  const elegirTipo = (tipoId) => {
    const tipo = cat.tipos.find((x) => String(x.id) === String(tipoId));
    setFormC((s) => ({ ...s, tipo_id: tipoId, fianza_importe: s.fianza_importe || (tipo?.fianza_meses_defecto && s.renta_mensual ? (Number(tipo.fianza_meses_defecto) * Number(s.renta_mensual)).toFixed(2) : s.fianza_importe) }));
  };

  if (!unidades) return <p className="text-sm">{t('cargando', 'Cargando…')}</p>;

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="text-sm text-destructive-text">{error}</div>}
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm">{t('ayuda', 'Una unidad es lo que se alquila: la propiedad entera o unos espacios. Los recibos se generan en Cartera → Recibos.')}</p>
        {puedeEscribir && !formU && !formC && <Button leftIcon={<Plus size={16} />} onClick={() => setFormU({ ...UNIDAD_VACIA })}>{t('nueva', 'Nueva unidad')}</Button>}
      </div>

      {formU && (
        <form onSubmit={guardarUnidad} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4">
          <h3 className="font-black text-on-background sm:col-span-4">{t('nueva', 'Nueva unidad')}</h3>
          <Campo etiqueta={t('ambito', 'Qué se alquila')}>
            <select {...fu('ambito')} className={claseInput}>
              <option value="ESPACIOS">{t('ambito_espacios', 'Unos espacios')}</option>
              <option value="PROPIEDAD">{t('ambito_propiedad', 'La propiedad entera')}</option>
            </select>
          </Campo>
          <Campo etiqueta={t('modalidad', 'Modalidad')}>
            <select required {...fu('modalidad_id')} className={claseInput}>
              <option value="">—</option>
              {cat.modalidades.map((m) => <option key={m.id} value={m.id}>{t(`mod_${m.codigo.toLowerCase()}`, m.nombre)}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('desde', 'Desde')}><input required type="date" {...fu('fecha_desde')} className={claseInput} /></Campo>
          <Campo etiqueta={t('renta_objetivo', 'Renta objetivo (€/mes)')}><input type="number" step="0.01" min="0" {...fu('renta_objetivo')} className={claseInput} /></Campo>
          {formU.ambito === 'ESPACIOS' && (
            <fieldset className="sm:col-span-4">
              <legend className="text-sm font-bold text-on-background">{t('espacios', 'Espacios')}</legend>
              <div className="mt-1 flex flex-wrap gap-3">
                {alquilables.map((e) => (
                  <label key={e.id} className={`flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-on-background ${ocupados.has(e.id) ? 'opacity-60' : ''}`}>
                    <input type="checkbox" disabled={ocupados.has(e.id)} checked={formU.espacios.includes(e.id)}
                      onChange={(ev) => setFormU((s) => ({ ...s, espacios: ev.target.checked ? [...s.espacios, e.id] : s.espacios.filter((x) => x !== e.id) }))} />
                    {e.codigo} · {e.nombre}{ocupados.has(e.id) ? ` (${t('ocupado', 'ya en otra unidad')})` : ''}
                  </label>
                ))}
                {!alquilables.length && <span className="text-sm">{t('sin_espacios', 'Esta propiedad no tiene espacios alquilables: dibújalos en la pestaña Espacios.')}</span>}
              </div>
            </fieldset>
          )}
          <Campo etiqueta={t('explotacion', 'Quién cobra')}>
            <select {...fu('explotacion')} className={claseInput}>
              <option value="TITULARES">{t('expl_titulares', 'Los titulares, por su %')}</option>
              <option value="ENTIDAD">{t('expl_entidad', 'Una entidad concreta')}</option>
            </select>
          </Campo>
          {formU.explotacion === 'ENTIDAD' && (
            <Campo etiqueta={t('entidad', 'Entidad')}>
              <select required {...fu('entidad_explotadora_id')} className={claseInput}>
                <option value="">—</option>
                {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Campo>
          )}
          <Campo etiqueta={t('nombre', 'Nombre (opcional)')}><input maxLength={150} {...fu('nombre')} className={claseInput} /></Campo>
          <Campo etiqueta={t('codigo', 'Código (opcional)')}><input maxLength={30} {...fu('codigo')} className={`${claseInput} font-mono`} placeholder="PO-H2" /></Campo>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => setFormU(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('guardar', 'Guardar')}</Button>
          </div>
        </form>
      )}

      {formC && (
        <form onSubmit={guardarContrato} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4">
          <h3 className="font-black text-on-background sm:col-span-4">{t('nuevo_contrato_de', 'Nuevo contrato · {codigo}').replace('{codigo}', formC.unidad.codigo)}</h3>
          <Campo etiqueta={t('inquilino', 'Inquilino')} ancho="sm:col-span-2">
            <select required {...fc('tercero_id')} className={claseInput}>
              <option value="">—</option>
              {inquilinos.map((p) => <option key={p.id} value={p.id}>{nombreTercero(p)}{p.documento ? ` · ${p.documento}` : ''}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('tipo_contrato', 'Tipo de contrato')} ancho="sm:col-span-2">
            <select required value={formC.tipo_id} onChange={(e) => elegirTipo(e.target.value)} className={claseInput}>
              <option value="">—</option>
              {cat.tipos.map((x) => <option key={x.id} value={x.id}>{t(`tipo_${x.codigo.toLowerCase()}`, x.nombre)}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('inicio', 'Inicio')}><input required type="date" {...fc('fecha_inicio')} className={claseInput} /></Campo>
          <Campo etiqueta={t('fin', 'Fin (opcional)')}><input type="date" {...fc('fecha_fin')} className={claseInput} /></Campo>
          <Campo etiqueta={t('renta', 'Renta mensual (€)')}><input required type="number" step="0.01" min="0.01" {...fc('renta_mensual')} className={`${claseInput} font-mono`} /></Campo>
          <Campo etiqueta={t('dia_pago', 'Día de pago')}><input type="number" min="1" max="28" {...fc('dia_pago')} className={claseInput} /></Campo>
          <Campo etiqueta={t('forma_pago', 'Forma de pago')}>
            <select {...fc('forma_pago')} className={claseInput}>
              <option value="TRANSFERENCIA">{t('fp_transferencia', 'Transferencia')}</option>
              <option value="DOMICILIACION">{t('fp_domiciliacion', 'Domiciliación')}</option>
              <option value="EFECTIVO">{t('fp_efectivo', 'Efectivo')}</option>
            </select>
          </Campo>
          <Campo etiqueta={t('fianza', 'Fianza (€)')}><input type="number" step="0.01" min="0" {...fc('fianza_importe')} className={claseInput} /></Campo>
          <Campo etiqueta={t('fianza_en', 'Fianza depositada en')}><input maxLength={100} {...fc('fianza_depositada_en')} className={claseInput} placeholder="INCASOL" /></Campo>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold text-on-background">
            <input type="checkbox" checked={Boolean(formC.es_vivienda_habitual_inquilino)} onChange={(e) => setFormC((s) => ({ ...s, es_vivienda_habitual_inquilino: e.target.checked }))} />
            {t('vivienda_habitual', 'Es la vivienda habitual del inquilino')}
          </label>
          <p className="text-xs sm:col-span-4">{t('ayuda_contrato', 'El IVA y la retención salen de la modalidad de la unidad. Si el inquilino no está en la lista, créalo en Gestión → Terceros.')}</p>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => setFormC(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('guardar', 'Guardar')}</Button>
          </div>
        </form>
      )}

      {!unidades.length && !formU && <p className="rounded-xl border border-border p-4 text-center text-sm">{t('vacio', 'Esta propiedad todavía no tiene unidades.')}</p>}

      {unidades.map((u) => (
        <section key={u.id} className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1">
              <h3 className="font-black text-on-background"><span className="font-mono">{u.codigo}</span> · {u.nombre}</h3>
              <p className="text-sm">
                {t(`mod_${String(u.modalidad_codigo).toLowerCase()}`, u.modalidad_nombre)} ·{' '}
                {u.ambito === 'PROPIEDAD' ? t('ambito_propiedad', 'La propiedad entera') : u.espacios.map((e) => e.codigo).join(' + ')} ·{' '}
                {u.explotacion === 'ENTIDAD' ? u.explotadora_nombre : t('expl_titulares', 'Los titulares, por su %')} ·{' '}
                {t(`estado_${String(u.estado).toLowerCase()}`, u.estado)} · {t('desde', 'Desde')} <span className="font-mono">{u.fecha_desde}</span>
                {u.fecha_hasta ? <> · {t('hasta', 'Hasta')} <span className="font-mono">{u.fecha_hasta}</span></> : null}
              </p>
            </div>
            {!u.fecha_hasta && (
              <div className="flex flex-wrap gap-1">
                {puedeContratos && !formC && <Button size="xs" variant="ghost" leftIcon={<FileSignature size={15} />} onClick={() => setFormC({ ...CONTRATO_VACIO, unidad: u, renta_mensual: u.renta_objetivo || '' })}>{t('nuevo_contrato', 'Nuevo contrato')}</Button>}
                {puedeEscribir && <Button size="xs" variant="ghost" leftIcon={<DoorClosed size={15} />} onClick={() => cerrarUnidad(u)}>{t('cerrar', 'Cerrar')}</Button>}
                {puedeEscribir && !u.contratos.length && <Button size="xs" variant="ghost" aria-label={t('borrar', 'Borrar')} onClick={() => borrarUnidad(u)}><Trash2 size={15} /></Button>}
              </div>
            )}
          </div>
          {u.contratos.length > 0 && (
            <table className="mt-3 w-full text-sm">
              <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider">
                <th className="p-2">{t('col_contrato', 'Contrato')}</th><th className="p-2">{t('inquilino', 'Inquilino')}</th>
                <th className="p-2">{t('col_fechas', 'Fechas')}</th><th className="p-2 text-right">{t('renta', 'Renta mensual (€)')}</th>
                <th className="p-2">{t('col_estado', 'Estado')}</th><th className="p-2 text-right">{t('col_recibos', 'Recibos')}</th><th />
              </tr></thead>
              <tbody>
                {u.contratos.map((c) => (
                  <tr key={c.id} className="bg-table-row text-on-table-row border-b border-border">
                    <td className="p-2 font-mono">{c.codigo}</td>
                    <td className="p-2 font-bold">{c.partes.filter((p) => p.rol === 'TITULAR').map((p) => p.nombre).join(', ') || '—'}</td>
                    <td className="p-2 font-mono">{c.fecha_inicio} → {c.fecha_rescision || c.fecha_fin || '…'}</td>
                    <td className="p-2 text-right font-mono">{euros(c.renta_mensual)}</td>
                    <td className="p-2">{t(`contrato_${String(c.estado).toLowerCase()}`, c.estado)}</td>
                    <td className="p-2 text-right font-mono">{c.recibos}</td>
                    <td className="whitespace-nowrap p-2 text-right">
                      <Link to={`/cartera/recibos?contrato=${c.id}`} className="mr-1 inline-flex items-center gap-1 text-sm font-bold underline" aria-label={t('ver_recibos', 'Ver recibos')}><Receipt size={15} />{t('ver_recibos', 'Ver recibos')}</Link>
                      {puedeContratos && ['VIGENTE', 'PRORROGADO'].includes(c.estado) && <Button size="xs" variant="ghost" aria-label={t('rescindir', 'Rescindir')} onClick={() => rescindir(u, c)}><Ban size={15} /></Button>}
                      {puedeContratos && !Number(c.recibos) && <Button size="xs" variant="ghost" aria-label={t('borrar', 'Borrar')} onClick={() => borrarContrato(u, c)}><Trash2 size={15} /></Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}
