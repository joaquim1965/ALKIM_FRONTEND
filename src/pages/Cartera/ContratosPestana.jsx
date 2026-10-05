/**
 * ContratosPestana — pestaña «Contratos» de la ficha de la propiedad
 * (05/10/2026, sustituye a la pestaña Unidades: ya no hay UF).
 *
 * Un contrato alquila la propiedad entera (sin espacios marcados) o unos
 * espacios (una habitación, o piso + parking). Lleva la modalidad, quién
 * cobra (los titulares por su % o una entidad) y el inquilino. Los recibos se
 * generan en Cartera → Recibos.
 *
 * `preseleccion`: [ids de espacio] cuando se llega desde «Alquilar» en Espacios.
 *
 * API: /propiedades/:id/contratos[/:contrato] · /recibos/catalogos ·
 *      /terceros?papel=inquilino · /companies/mine
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Ban, Receipt, Pencil } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { formatImporte } from '../../utils/format';
import {
  Campo, Leyenda, Casilla, AvisoError, Ayuda, SinDato, CLASE_INPUT, Recuadro, TablaTema, claseFila, TD, BotonFila, BotonAnadir, FilaVacia,
} from '../../components/UI/TemaPagina';

const hoy = () => new Date().toISOString().slice(0, 10);
const euros = (v) => (v == null || v === '' ? null : formatImporte(v, ''));
const fechaEs = (f) => (f ? f.split('-').reverse().join('/') : null);
const VACIO = {
  espacios: [], modalidad_id: '', explotacion: 'TITULARES', arrendador_id: '', tipo_id: '', fecha_inicio: hoy(), fecha_fin: '',
  renta_mensual: '', dia_pago: 1, forma_pago: 'TRANSFERENCIA', fianza_importe: '', fianza_depositada_en: '', tercero_id: '',
  estado: 'VIGENTE', es_vivienda_habitual_inquilino: false, notas: '',
};
const VIGENTES = ['VIGENTE', 'PRORROGADO'];

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), ...(opciones.body ? { 'Content-Type': 'application/json' } : {}) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}
const nombreTercero = (p) => p.razon_social || [p.nombre, p.apellidos].filter(Boolean).join(' ');

export default function ContratosPestana({ propiedadId, espacios = [], puedeEscribir, preseleccion = null, onPreseleccionUsada, onCambio }) {
  const { t } = useTmTr('Contratos');
  const [contratos, setContratos] = useState(null);
  const [cat, setCat] = useState({ modalidades: [], tipos: [] });
  const [inquilinos, setInquilinos] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try { setContratos((await pedir(`/propiedades/${propiedadId}/contratos`)).data || []); }
    catch (e) { setError(e.message); setContratos([]); }
  }, [propiedadId]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    pedir('/recibos/catalogos').then((b) => setCat(b.data || { modalidades: [], tipos: [] })).catch(() => {});
    pedir('/terceros?papel=inquilino').then((b) => setInquilinos(b.data || [])).catch(() => {});
    pedir('/companies/mine').then((b) => setEntidades((b.data || []).filter((e) => ['PROPIETARIO', 'ADMINISTRADOR'].includes(e.rol)))).catch(() => {});
  }, []);

  const alquilables = espacios.filter((e) => !Number(e.es_comun) && Number(e.activo ?? 1));
  const modalidadHabitacion = () => cat.modalidades.find((m) => m.codigo === 'HABITACION')?.id || '';
  const nuevo = (ids = []) => {
    setError('');
    const espacio = alquilables.find((e) => e.id === ids[0]);
    setForm({ ...VACIO, espacios: ids, modalidad_id: ids.length ? modalidadHabitacion() : '', renta_mensual: espacio?.renta_objetivo || '' });
  };
  // Desde «Alquilar» en la pestaña Espacios.
  useEffect(() => {
    if (preseleccion && contratos && cat.modalidades.length && puedeEscribir) { nuevo(preseleccion); onPreseleccionUsada?.(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preseleccion, contratos, cat.modalidades.length]);

  const editar = (c) => {
    setError('');
    const titular = c.partes.find((p) => p.rol === 'TITULAR');
    setForm({
      id: c.id, recibos: Number(c.recibos), espacios: c.espacios.map((e) => e.espacio_id), modalidad_id: c.modalidad_id, explotacion: c.explotacion,
      arrendador_id: c.explotacion === 'ENTIDAD' ? c.arrendador_id : '', tipo_id: c.tipo_id, fecha_inicio: c.fecha_inicio, fecha_fin: c.fecha_fin || '',
      renta_mensual: c.renta_mensual, dia_pago: c.dia_pago, forma_pago: c.forma_pago, fianza_importe: c.fianza_importe ?? '',
      fianza_depositada_en: c.fianza_depositada_en || '', tercero_id: titular?.tercero_id || '', estado: c.estado,
      es_vivienda_habitual_inquilino: Boolean(Number(c.es_vivienda_habitual_inquilino)), notas: c.notas || '',
    });
  };

  const ejecutar = async (fn) => {
    setOcupado(true); setError('');
    try { await fn(); await cargar(); onCambio?.(); } catch (e) { setError(e.message); } finally { setOcupado(false); }
  };

  const guardar = (ev) => {
    ev.preventDefault();
    ejecutar(async () => {
      const { id, recibos, tercero_id, ...resto } = form;
      const cuerpo = { ...resto, partes: tercero_id ? [{ tercero_id: Number(tercero_id), rol: 'TITULAR' }] : [] };
      if (cuerpo.explotacion !== 'ENTIDAD') delete cuerpo.arrendador_id;
      if (recibos) { delete cuerpo.renta_mensual; delete cuerpo.fecha_inicio; }
      await pedir(`/propiedades/${propiedadId}/contratos${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(cuerpo) });
      setForm(null);
    });
  };
  const rescindir = (c) => {
    const f = window.prompt(t('rescindir_desde', 'Fecha de fin del contrato {codigo} (AAAA-MM-DD)').replace('{codigo}', c.codigo), hoy());
    if (f) ejecutar(() => pedir(`/propiedades/${propiedadId}/contratos/${c.id}`, { method: 'PUT', body: JSON.stringify({ estado: 'RESCINDIDO', fecha_rescision: f }) }));
  };
  const borrar = (c) => {
    if (window.confirm(t('confirmar_borrar', '¿Borrar el contrato {codigo}?').replace('{codigo}', c.codigo))) {
      ejecutar(() => pedir(`/propiedades/${propiedadId}/contratos/${c.id}`, { method: 'DELETE' }));
    }
  };
  const elegirTipo = (tipoId) => {
    const tipo = cat.tipos.find((x) => String(x.id) === String(tipoId));
    setForm((s) => ({ ...s, tipo_id: tipoId, fianza_importe: s.fianza_importe || (tipo?.fianza_meses_defecto && s.renta_mensual ? String(Math.round(Number(tipo.fianza_meses_defecto) * Number(s.renta_mensual) * 100) / 100) : s.fianza_importe) }));
  };
  const fc = (k) => ({ value: form?.[k] ?? '', onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const queSeAlquila = (c) => (c.espacios.length ? c.espacios.map((e) => e.nombre).join(' + ') : t('entera', 'Propiedad entera'));

  if (!contratos) return <p className="text-xs font-bold uppercase tracking-widest">{t('cargando', 'Cargando…')}</p>;

  return (
    <div className="space-y-5">
      <AvisoError>{error}</AvisoError>
      <div className="flex items-center gap-3">
        {puedeEscribir && !form && <BotonAnadir texto={t('nuevo', 'Nuevo contrato')} onClick={() => nuevo()} pequeno />}
        <p className="flex-1 text-sm font-bold">{t('ayuda', 'Un contrato alquila la propiedad entera o unos espacios (una habitación, o piso + parking). Los recibos se generan en Cartera → Recibos.')}</p>
      </div>

      {form && (
        <Recuadro as="form" onSubmit={guardar} className="grid gap-3 sm:grid-cols-4">
          <h3 className="font-black tracking-tight text-on-surface2 sm:col-span-4">{form.id ? t('editar', 'Editar contrato') : t('nuevo', 'Nuevo contrato')}</h3>
          <fieldset className="sm:col-span-4">
            <Leyenda>{t('que_se_alquila', 'Qué se alquila')}</Leyenda>
            <p className="mb-2 text-sm font-bold">{t('ayuda_espacios', 'Marca los espacios. Sin ninguno marcado, se alquila la propiedad entera.')}</p>
            <div className="flex flex-wrap gap-3">
              {alquilables.map((e) => (
                <span key={e.id} className="rounded-xl border border-border px-3 py-2">
                  <Casilla etiqueta={`${e.codigo} · ${e.nombre}`} checked={form.espacios.includes(e.id)}
                    onChange={(v) => setForm((s) => ({ ...s, espacios: v ? [...s.espacios, e.id] : s.espacios.filter((x) => x !== e.id) }))} />
                </span>
              ))}
              {!form.espacios.length && <span className="self-center text-sm font-black uppercase">{t('entera', 'Propiedad entera')}</span>}
            </div>
          </fieldset>
          <Campo etiqueta={t('inquilino', 'Inquilino')} ancho="sm:col-span-2">
            <select required={VIGENTES.includes(form.estado)} {...fc('tercero_id')} className={CLASE_INPUT}>
              <option value="">—</option>
              {inquilinos.map((p) => <option key={p.id} value={p.id}>{nombreTercero(p)}{p.documento ? ` · ${p.documento}` : ''}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('modalidad', 'Modalidad')}>
            <select required {...fc('modalidad_id')} className={CLASE_INPUT}>
              <option value="">—</option>
              {cat.modalidades.map((m) => <option key={m.id} value={m.id}>{t(`mod_${m.codigo.toLowerCase()}`, m.nombre)}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('tipo_contrato', 'Tipo de contrato')}>
            <select required value={form.tipo_id} onChange={(e) => elegirTipo(e.target.value)} className={CLASE_INPUT}>
              <option value="">—</option>
              {cat.tipos.map((x) => <option key={x.id} value={x.id}>{t(`tipo_${x.codigo.toLowerCase()}`, x.nombre)}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('inicio', 'Inicio')}><input required type="date" disabled={Boolean(form.recibos)} {...fc('fecha_inicio')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('fin', 'Fin (opcional)')}><input type="date" {...fc('fecha_fin')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('renta', 'Renta mensual (€)')}><input required type="number" step="0.01" min="0.01" disabled={Boolean(form.recibos)} {...fc('renta_mensual')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('dia_pago', 'Día de pago')}><input type="number" min="1" max="28" {...fc('dia_pago')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('forma_pago', 'Forma de pago')}>
            <select {...fc('forma_pago')} className={CLASE_INPUT}>
              <option value="TRANSFERENCIA">{t('fp_transferencia', 'Transferencia')}</option>
              <option value="DOMICILIACION">{t('fp_domiciliacion', 'Domiciliación')}</option>
              <option value="EFECTIVO">{t('fp_efectivo', 'Efectivo')}</option>
            </select>
          </Campo>
          <Campo etiqueta={t('fianza', 'Fianza (€)')}><input type="number" step="0.01" min="0" {...fc('fianza_importe')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('fianza_en', 'Fianza depositada en')}><input maxLength={100} {...fc('fianza_depositada_en')} className={CLASE_INPUT} placeholder="INCASOL" /></Campo>
          <Campo etiqueta={t('explotacion', 'Quién cobra')}>
            <select {...fc('explotacion')} className={CLASE_INPUT}>
              <option value="TITULARES">{t('expl_titulares', 'Los titulares, por su %')}</option>
              <option value="ENTIDAD">{t('expl_entidad', 'Una entidad concreta')}</option>
            </select>
          </Campo>
          {form.explotacion === 'ENTIDAD' && (
            <Campo etiqueta={t('entidad', 'Entidad')}>
              <select required {...fc('arrendador_id')} className={CLASE_INPUT}>
                <option value="">—</option>
                {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Campo>
          )}
          <div className="flex items-end pb-1 sm:col-span-2"><Casilla etiqueta={t('vivienda_habitual', 'Es la vivienda habitual del inquilino')} checked={form.es_vivienda_habitual_inquilino} onChange={(v) => setForm((s) => ({ ...s, es_vivienda_habitual_inquilino: v }))} /></div>
          <Ayuda className="sm:col-span-4">{t('ayuda_contrato', 'El IVA y la retención salen de la modalidad. Si el inquilino no está en la lista, créalo en Gestión → Terceros.')}</Ayuda>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => setForm(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('guardar', 'Guardar')}</Button>
          </div>
        </Recuadro>
      )}

      <TablaTema columnas={[
        { texto: '' }, { texto: t('col_que', 'Qué se alquila') }, { texto: t('inquilino', 'Inquilino') }, { texto: t('modalidad', 'Modalidad') },
        { texto: t('col_fechas', 'Fechas') }, { texto: t('renta', 'Renta mensual (€)'), derecha: true }, { texto: t('col_estado', 'Estado') }, { texto: t('col_recibos', 'Recibos'), derecha: true },
      ]}>
        {!contratos.length && <FilaVacia columnas={8}>{t('vacio', 'Esta propiedad todavía no tiene contratos.')}</FilaVacia>}
        {contratos.map((c, i) => (
          <tr key={c.id} className={claseFila(i)}>
            <td className={`${TD} whitespace-nowrap`}>
              {puedeEscribir && <BotonFila icono={<Pencil size={15} />} titulo={t('editar', 'Editar contrato')} onClick={() => editar(c)} />}
              <Link to={`/cartera/recibos?contrato=${c.id}`} title={t('ver_recibos', 'Ver recibos')} aria-label={t('ver_recibos', 'Ver recibos')} className="inline-flex rounded-md p-1 transition-all hover:bg-surface-hover hover:text-on-surface-hover"><Receipt size={15} /></Link>
              {puedeEscribir && VIGENTES.includes(c.estado) && <BotonFila icono={<Ban size={15} />} titulo={t('rescindir', 'Rescindir')} onClick={() => rescindir(c)} />}
              {puedeEscribir && !Number(c.recibos) && <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar', 'Borrar')} onClick={() => borrar(c)} />}
            </td>
            <td className={TD}><span className="font-black">{queSeAlquila(c)}</span><div className="font-mono text-xs">{c.codigo}</div></td>
            <td className={`${TD} font-black tracking-tight`}>{c.partes.filter((p) => p.rol === 'TITULAR').map((p) => p.nombre).join(', ') || <SinDato />}</td>
            <td className={TD}>{t(`mod_${String(c.modalidad_codigo).toLowerCase()}`, c.modalidad_nombre)}</td>
            <td className={`${TD} font-mono`}>{fechaEs(c.fecha_inicio)} → {fechaEs(c.fecha_rescision || c.fecha_fin) || '…'}</td>
            <td className={`${TD} text-right font-mono`}>{euros(c.renta_mensual)}</td>
            <td className={TD}>{t(`contrato_${String(c.estado).toLowerCase()}`, c.estado)}</td>
            <td className={`${TD} text-right font-mono`}>{c.recibos}</td>
          </tr>
        ))}
      </TablaTema>
    </div>
  );
}
