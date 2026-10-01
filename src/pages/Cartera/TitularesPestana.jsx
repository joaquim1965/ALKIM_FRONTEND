/**
 * TitularesPestana — pestaña «Titulares» de la ficha de la propiedad (01/10/2026, fase 2).
 *
 * Cuotas de titularidad vigentes e históricas, alta y edición, vender una cuota
 * (entera o en parte, a alguien de fuera o a otra entidad de la casa) y vender
 * la propiedad. Debajo, el resumen del año por titular: %, coste e intereses.
 *
 * API: /propiedades/:id/titulares[/:cuota[/vender]] · /propiedades/:id/vender ·
 *      /propiedades/:id/resumen-titulares?anyo=
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, HandCoins } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';

const DERECHOS = ['PLENO_DOMINIO', 'NUDA_PROPIEDAD', 'USUFRUCTO'];
const FINALIDADES = ['INVERSION', 'EXISTENCIAS', 'USO_PROPIO'];
const TITULOS = ['COMPRAVENTA', 'HERENCIA', 'DONACION', 'APORTACION', 'COMPRA_CUOTA', 'OBRA_NUEVA', 'OTRO'];
const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = (v) => (v ? String(v).slice(0, 10) : '');
const euros = (v) => (v == null || v === '' ? '—' : Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const pct = (v) => `${Number(v).toLocaleString('es-ES', { maximumFractionDigits: 3 })} %`;
const VACIA = { titular_id: '', porcentaje: '', tipo_derecho: 'PLENO_DOMINIO', finalidad: 'INVERSION', titulo_adquisicion: 'COMPRAVENTA', fecha_adquisicion: hoy(), precio_adquisicion: '', gastos_adquisicion: '', notas: '' };

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0]?.message || b.message || `Error ${r.status}`);
  return b;
}
const claseInput = 'mt-1 w-full rounded-lg border border-border bg-surface1 px-3 py-2 text-on-background';
const Campo = ({ etiqueta, children, ancho = '' }) => <label className={`block text-sm font-bold text-on-background ${ancho}`}>{etiqueta}{children}</label>;

export default function TitularesPestana({ propiedadId, puedeEscribir, onCambio }) {
  const { t } = useTmTr('Titulares');
  const [datos, setDatos] = useState(null);
  const [entidades, setEntidades] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [anyo, setAnyo] = useState(new Date().getFullYear());
  const [form, setForm] = useState(null);           // alta/edición de cuota
  const [venta, setVenta] = useState(null);         // { cuota } | { propiedad: true }
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      setDatos((await pedir(`/propiedades/${propiedadId}/titulares`)).data);
      setResumen((await pedir(`/propiedades/${propiedadId}/resumen-titulares?anyo=${anyo}`)).data || []);
    } catch (e) { setError(e.message); }
  }, [propiedadId, anyo]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { pedir('/companies/mine').then((b) => setEntidades(b.data || [])).catch(() => {}); }, []);

  const guardar = async (ev) => {
    ev.preventDefault();
    setOcupado(true); setError('');
    try {
      const { id, ...cuerpo } = form;
      await pedir(`/propiedades/${propiedadId}/titulares${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(cuerpo) });
      setForm(null); await cargar(); onCambio?.();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };
  const borrar = async (c) => {
    if (!window.confirm(t('confirmar_borrar', '¿Borrar la cuota de {nombre}? Úsalo solo para corregir un error; una venta se registra con «Vender».').replace('{nombre}', c.titular_nombre))) return;
    try { await pedir(`/propiedades/${propiedadId}/titulares/${c.id}`, { method: 'DELETE' }); await cargar(); onCambio?.(); }
    catch (e) { setError(e.message); }
  };
  const vender = async (ev) => {
    ev.preventDefault();
    setOcupado(true); setError('');
    try {
      const { cuota, propiedad, ...cuerpo } = venta;
      await pedir(propiedad ? `/propiedades/${propiedadId}/vender` : `/propiedades/${propiedadId}/titulares/${cuota.id}/vender`, { method: 'POST', body: JSON.stringify(cuerpo) });
      setVenta(null); await cargar(); onCambio?.();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  const f = (k) => ({ value: form?.[k] ?? '', onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const v = (k) => ({ value: venta?.[k] ?? '', onChange: (e) => setVenta((s) => ({ ...s, [k]: e.target.value })) });
  const vigentes = (datos?.cuotas || []).filter((c) => c.vigente);
  const historicas = (datos?.cuotas || []).filter((c) => !c.vigente);

  const Tabla = ({ filas, conAcciones }) => (
    <table className="w-full text-sm">
      <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider">
        <th className="p-2">{t('col_titular', 'Titular')}</th><th className="p-2 text-right">%</th><th className="p-2">{t('col_derecho', 'Derecho')}</th>
        <th className="p-2">{t('col_finalidad', 'Finalidad')}</th><th className="p-2">{t('col_desde', 'Desde')}</th><th className="p-2 text-right">{t('col_coste', 'Coste (precio + gastos)')}</th>
        <th className="p-2">{t('col_hasta', 'Hasta')}</th><th />
      </tr></thead>
      <tbody>
        {filas.map((c) => (
          <tr key={c.id} className="bg-table-row text-on-table-row border-b border-border hover:bg-table-row-hover hover:text-on-table-row-hover">
            <td className="p-2 font-bold">{c.titular_nombre}</td>
            <td className="p-2 text-right font-mono">{pct(c.porcentaje)}</td>
            <td className="p-2">{t(`derecho_${c.tipo_derecho.toLowerCase()}`, c.tipo_derecho)}</td>
            <td className="p-2">{t(`finalidad_${c.finalidad.toLowerCase()}`, c.finalidad)}</td>
            <td className="p-2 font-mono">{fecha(c.fecha_adquisicion)}</td>
            <td className="p-2 text-right font-mono">{euros(Number(c.precio_adquisicion || 0) + Number(c.gastos_adquisicion || 0))}</td>
            <td className="p-2 font-mono">{fecha(c.fecha_transmision) || '—'}{c.comprador_nombre ? ` → ${c.comprador_nombre}` : ''}</td>
            <td className="whitespace-nowrap p-2 text-right">
              {conAcciones && puedeEscribir && <>
                <Button size="xs" variant="ghost" aria-label={t('vender_cuota', 'Vender cuota')} onClick={() => setVenta({ cuota: c, fecha: hoy(), porcentaje: c.porcentaje, precio: '', gastos: '', comprador_id: '', finalidad_comprador: c.finalidad })}><HandCoins size={15} /></Button>
                <Button size="xs" variant="ghost" aria-label={t('editar', 'Editar')} onClick={() => setForm(Object.fromEntries([['id', c.id], ...Object.keys(VACIA).map((k) => [k, k.startsWith('fecha') ? fecha(c[k]) : (c[k] ?? '')])]))}><Pencil size={15} /></Button>
                <Button size="xs" variant="ghost" aria-label={t('borrar', 'Borrar')} onClick={() => borrar(c)}><Trash2 size={15} /></Button>
              </>}
            </td>
          </tr>
        ))}
        {!filas.length && <tr className="bg-table-row text-on-table-row"><td colSpan={8} className="p-4 text-center">{t('sin_cuotas', 'Sin cuotas.')}</td></tr>}
      </tbody>
    </table>
  );

  if (!datos && !error) return <p className="text-sm">{t('cargando', 'Cargando…')}</p>;

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="text-sm text-destructive-text">{error}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm">
          {t('suma_vigente', 'Vigente hoy')}: {Object.entries(datos?.suma_vigente || {}).map(([d, s]) => `${t(`derecho_${d.toLowerCase()}`, d)} ${pct(s)}`).join(' · ') || '—'}
        </p>
        {puedeEscribir && !form && !venta && <>
          <Button leftIcon={<Plus size={16} />} onClick={() => setForm({ ...VACIA, porcentaje: Math.max(0, 100 - Number(datos?.suma_vigente?.PLENO_DOMINIO || 0)) || '' })}>{t('anadir', 'Añadir titular')}</Button>
          {vigentes.length > 0 && <Button variant="outline" leftIcon={<HandCoins size={16} />} onClick={() => setVenta({ propiedad: true, fecha: hoy(), precio: '', gastos: '' })}>{t('vender_propiedad', 'Vender la propiedad')}</Button>}
        </>}
      </div>

      {form && (
        <form onSubmit={guardar} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4">
          <h3 className="font-black text-on-background sm:col-span-4">{form.id ? t('editar_cuota', 'Editar cuota') : t('anadir', 'Añadir titular')}</h3>
          <Campo etiqueta={t('col_titular', 'Titular')} ancho="sm:col-span-2">
            <select required {...f('titular_id')} className={claseInput}>
              <option value="">—</option>
              {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="%"><input required type="number" step="0.001" min="0.001" max="100" {...f('porcentaje')} className={`${claseInput} font-mono`} /></Campo>
          <Campo etiqueta={t('col_derecho', 'Derecho')}>
            <select {...f('tipo_derecho')} className={claseInput}>{DERECHOS.map((d) => <option key={d} value={d}>{t(`derecho_${d.toLowerCase()}`, d)}</option>)}</select>
          </Campo>
          <Campo etiqueta={t('col_finalidad', 'Finalidad')}>
            <select {...f('finalidad')} className={claseInput}>{FINALIDADES.map((d) => <option key={d} value={d}>{t(`finalidad_${d.toLowerCase()}`, d)}</option>)}</select>
          </Campo>
          <Campo etiqueta={t('titulo', 'Cómo se adquirió')}>
            <select {...f('titulo_adquisicion')} className={claseInput}>{TITULOS.map((d) => <option key={d} value={d}>{t(`titulo_${d.toLowerCase()}`, d)}</option>)}</select>
          </Campo>
          <Campo etiqueta={t('col_desde', 'Desde')}><input required type="date" {...f('fecha_adquisicion')} className={claseInput} /></Campo>
          <div />
          <Campo etiqueta={t('precio', 'Precio de su parte (€)')}><input type="number" step="0.01" min="0" {...f('precio_adquisicion')} className={claseInput} /></Campo>
          <Campo etiqueta={t('gastos', 'Gastos de su parte (€)')}><input type="number" step="0.01" min="0" {...f('gastos_adquisicion')} className={claseInput} /></Campo>
          <Campo etiqueta={t('notas', 'Notas')} ancho="sm:col-span-2"><input maxLength={255} {...f('notas')} className={claseInput} /></Campo>
          <p className="text-xs sm:col-span-4">{t('ayuda_titular', 'Si el titular es una persona, créala antes en Gestión → Entidades como «Persona».')}</p>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => setForm(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('guardar', 'Guardar')}</Button>
          </div>
        </form>
      )}

      {venta && (
        <form onSubmit={vender} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4">
          <h3 className="font-black text-on-background sm:col-span-4">
            {venta.propiedad ? t('vender_propiedad', 'Vender la propiedad') : t('vender_cuota_de', 'Vender la cuota de {nombre} ({pct})').replace('{nombre}', venta.cuota.titular_nombre).replace('{pct}', pct(venta.cuota.porcentaje))}
          </h3>
          <Campo etiqueta={t('fecha_venta', 'Fecha de la venta')}><input required type="date" {...v('fecha')} className={claseInput} /></Campo>
          {!venta.propiedad && <Campo etiqueta={t('pct_vendido', '% que se vende')}><input type="number" step="0.001" min="0.001" max={venta.cuota.porcentaje} {...v('porcentaje')} className={`${claseInput} font-mono`} /></Campo>}
          <Campo etiqueta={t('precio_venta', 'Precio de venta (€)')}><input type="number" step="0.01" min="0" {...v('precio')} className={claseInput} /></Campo>
          <Campo etiqueta={t('gastos_venta', 'Gastos de la venta (€)')}><input type="number" step="0.01" min="0" {...v('gastos')} className={claseInput} /></Campo>
          {!venta.propiedad && <>
            <Campo etiqueta={t('comprador', 'Comprador (si es de la casa)')} ancho="sm:col-span-2">
              <select {...v('comprador_id')} className={claseInput}>
                <option value="">{t('comprador_externo', '(alguien de fuera)')}</option>
                {entidades.filter((e) => e.id !== venta.cuota.titular_id).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Campo>
            {venta.comprador_id && (
              <Campo etiqueta={t('finalidad_comprador', 'Finalidad para el comprador')}>
                <select {...v('finalidad_comprador')} className={claseInput}>{FINALIDADES.map((d) => <option key={d} value={d}>{t(`finalidad_${d.toLowerCase()}`, d)}</option>)}</select>
              </Campo>
            )}
          </>}
          <p className="text-xs sm:col-span-4">{venta.propiedad
            ? t('ayuda_venta_propiedad', 'Cierra todas las cuotas vigentes en esa fecha; el precio y los gastos se reparten por %. La propiedad pasa a «Vendida».')
            : t('ayuda_venta_cuota', 'La cuota se cierra ese día. Si el comprador es de la casa, nace su cuota el mismo día. Si se vende una parte, el resto sigue.')}</p>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => setVenta(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('registrar_venta', 'Registrar la venta')}</Button>
          </div>
        </form>
      )}

      <section>
        <h3 className="mb-2 text-xs font-black uppercase tracking-widest">{t('vigentes', 'Titulares actuales')}</h3>
        <Tabla filas={vigentes} conAcciones />
      </section>
      {historicas.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-black uppercase tracking-widest">{t('historicas', 'Historial (cuotas vendidas o futuras)')}</h3>
          <Tabla filas={historicas} conAcciones={false} />
        </section>
      )}

      <section className="rounded-xl border border-border p-4">
        <div className="mb-2 flex items-center gap-3">
          <h3 className="flex-1 text-xs font-black uppercase tracking-widest">{t('resumen', 'Resumen por titular')}</h3>
          <label className="text-sm font-bold text-on-background">{t('anyo', 'Año')} <input type="number" min="1990" max="2100" value={anyo} onChange={(e) => setAnyo(e.target.value)} className="ml-1 w-24 rounded-lg border border-border bg-surface1 px-2 py-1 text-on-background" /></label>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider">
            <th className="p-2">{t('col_titular', 'Titular')}</th><th className="p-2 text-right">%</th><th className="p-2 text-right">{t('col_coste', 'Coste (precio + gastos)')}</th>
            <th className="p-2 text-right">{t('col_intereses', 'Intereses del año')}</th><th className="p-2 text-right">{t('col_capital', 'Capital amortizado')}</th>
          </tr></thead>
          <tbody>
            {resumen.map((r) => (
              <tr key={r.titular_id} className="bg-table-row text-on-table-row border-b border-border">
                <td className="p-2 font-bold">{r.titular_nombre}</td><td className="p-2 text-right font-mono">{pct(r.porcentaje)}</td>
                <td className="p-2 text-right font-mono">{euros(r.coste)}</td><td className="p-2 text-right font-mono">{euros(r.intereses || 0)}</td><td className="p-2 text-right font-mono">{euros(r.capital || 0)}</td>
              </tr>
            ))}
            {!resumen.length && <tr className="bg-table-row text-on-table-row"><td colSpan={5} className="p-4 text-center">{t('sin_cuotas', 'Sin cuotas.')}</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
