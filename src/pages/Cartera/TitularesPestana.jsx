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
import { formatImporte, formatPorcentaje } from '../../utils/format';
import {
  Campo, AvisoError, Ayuda, Rotulo, SinDato, CLASE_INPUT, Recuadro, TablaTema, claseFila, TD, FilaVacia, BotonFila,
} from '../../components/UI/TemaPagina';

const DERECHOS = ['PLENO_DOMINIO', 'NUDA_PROPIEDAD', 'USUFRUCTO'];
const FINALIDADES = ['INVERSION', 'EXISTENCIAS', 'USO_PROPIO'];
const TITULOS = ['COMPRAVENTA', 'HERENCIA', 'DONACION', 'APORTACION', 'COMPRA_CUOTA', 'OBRA_NUEVA', 'OTRO'];
const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = (v) => (v ? String(v).slice(0, 10) : '');
// Cifras con punto de millares (NORMAS §9). La unidad va en la cabecera de la columna.
const euros = (v) => (v == null || v === '' ? null : formatImporte(v, ''));
const pct = (v) => formatPorcentaje(v) ?? '';
const VACIA = { titular_id: '', porcentaje: '', tipo_derecho: 'PLENO_DOMINIO', finalidad: 'INVERSION', titulo_adquisicion: 'COMPRAVENTA', fecha_adquisicion: hoy(), precio_adquisicion: '', gastos_adquisicion: '', notas: '' };

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0]?.message || b.message || `Error ${r.status}`);
  return b;
}

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

  // Acciones en la primera columna (CRITERIOS «Los botones van SIEMPRE en la primera columna»).
  const acciones = conAccionesVisibles => conAccionesVisibles && puedeEscribir;
  const Tabla = ({ filas, conAcciones }) => {
    const conBotones = acciones(conAcciones);
    const columnas = [
      ...(conBotones ? [{ texto: '' }] : []),
      { texto: t('col_titular', 'Titular') }, { texto: '%', derecha: true }, { texto: t('col_derecho', 'Derecho') },
      { texto: t('col_finalidad', 'Finalidad') }, { texto: t('col_desde', 'Desde') }, { texto: t('col_coste', 'Coste (precio + gastos)'), derecha: true },
      { texto: t('col_hasta', 'Hasta') },
    ];
    return (
      <TablaTema columnas={columnas}>
        {filas.map((c, i) => (
          <tr key={c.id} className={claseFila(i)}>
            {conBotones && (
              <td className={`${TD} whitespace-nowrap`}>
                <BotonFila icono={<HandCoins size={15} />} titulo={t('vender_cuota', 'Vender cuota')} onClick={() => setVenta({ cuota: c, fecha: hoy(), porcentaje: c.porcentaje, precio: '', gastos: '', comprador_id: '', finalidad_comprador: c.finalidad })} />
                <BotonFila icono={<Pencil size={15} />} titulo={t('editar', 'Editar')} onClick={() => setForm(Object.fromEntries([['id', c.id], ...Object.keys(VACIA).map((k) => [k, k.startsWith('fecha') ? fecha(c[k]) : (c[k] ?? '')])]))} />
                <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar', 'Borrar')} onClick={() => borrar(c)} />
              </td>
            )}
            <td className={`${TD} font-black tracking-tight`}>{c.titular_nombre}</td>
            <td className={`${TD} text-right font-mono`}>{pct(c.porcentaje)}</td>
            <td className={TD}>{t(`derecho_${c.tipo_derecho.toLowerCase()}`, c.tipo_derecho)}</td>
            <td className={TD}>{t(`finalidad_${c.finalidad.toLowerCase()}`, c.finalidad)}</td>
            <td className={`${TD} font-mono`}>{fecha(c.fecha_adquisicion)}</td>
            <td className={`${TD} text-right font-mono`}>{euros(Number(c.precio_adquisicion || 0) + Number(c.gastos_adquisicion || 0))}</td>
            <td className={`${TD} font-mono`}>{fecha(c.fecha_transmision) || <SinDato texto={t('vigente', 'Vigente')} />}{c.comprador_nombre ? ` → ${c.comprador_nombre}` : ''}</td>
          </tr>
        ))}
        {!filas.length && <FilaVacia columnas={columnas.length}>{t('sin_cuotas', 'Sin cuotas.')}</FilaVacia>}
      </TablaTema>
    );
  };

  if (!datos && !error) return <p className="text-xs font-bold uppercase tracking-widest text-on-surface1">{t('cargando', 'Cargando…')}</p>;

  return (
    <div className="space-y-5">
      <AvisoError>{error}</AvisoError>
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm font-bold">
          {t('suma_vigente', 'Vigente hoy')}: {Object.entries(datos?.suma_vigente || {}).map(([d, s]) => `${t(`derecho_${d.toLowerCase()}`, d)} ${pct(s)}`).join(' · ') || t('sin_cuotas', 'Sin cuotas.')}
        </p>
        {puedeEscribir && !form && !venta && <>
          <Button leftIcon={<Plus size={16} />} onClick={() => setForm({ ...VACIA, porcentaje: Math.max(0, 100 - Number(datos?.suma_vigente?.PLENO_DOMINIO || 0)) || '' })}>{t('anadir', 'Añadir titular')}</Button>
          {vigentes.length > 0 && <Button variant="outline" leftIcon={<HandCoins size={16} />} onClick={() => setVenta({ propiedad: true, fecha: hoy(), precio: '', gastos: '' })}>{t('vender_propiedad', 'Vender la propiedad')}</Button>}
        </>}
      </div>

      {form && (
        <Recuadro as="form" onSubmit={guardar} className="grid gap-3 sm:grid-cols-4">
          <h3 className="font-black tracking-tight text-on-surface2 sm:col-span-4">{form.id ? t('editar_cuota', 'Editar cuota') : t('anadir', 'Añadir titular')}</h3>
          <Campo etiqueta={t('col_titular', 'Titular')} ancho="sm:col-span-2">
            <select required {...f('titular_id')} className={CLASE_INPUT}>
              <option value="">—</option>
              {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="%"><input required type="number" step="0.001" min="0.001" max="100" {...f('porcentaje')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('col_derecho', 'Derecho')}>
            <select {...f('tipo_derecho')} className={CLASE_INPUT}>{DERECHOS.map((d) => <option key={d} value={d}>{t(`derecho_${d.toLowerCase()}`, d)}</option>)}</select>
          </Campo>
          <Campo etiqueta={t('col_finalidad', 'Finalidad')}>
            <select {...f('finalidad')} className={CLASE_INPUT}>{FINALIDADES.map((d) => <option key={d} value={d}>{t(`finalidad_${d.toLowerCase()}`, d)}</option>)}</select>
          </Campo>
          <Campo etiqueta={t('titulo', 'Cómo se adquirió')}>
            <select {...f('titulo_adquisicion')} className={CLASE_INPUT}>{TITULOS.map((d) => <option key={d} value={d}>{t(`titulo_${d.toLowerCase()}`, d)}</option>)}</select>
          </Campo>
          <Campo etiqueta={t('col_desde', 'Desde')}><input required type="date" {...f('fecha_adquisicion')} className={CLASE_INPUT} /></Campo>
          <div />
          <Campo etiqueta={t('precio', 'Precio de su parte (€)')}><input type="number" step="0.01" min="0" {...f('precio_adquisicion')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('gastos', 'Gastos de su parte (€)')}><input type="number" step="0.01" min="0" {...f('gastos_adquisicion')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('notas', 'Notas')} ancho="sm:col-span-2"><input maxLength={255} {...f('notas')} className={CLASE_INPUT} /></Campo>
          <Ayuda className="sm:col-span-4">{t('ayuda_titular', 'Si el titular es una persona, créala antes en Gestión → Entidades como «Persona».')}</Ayuda>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => setForm(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('guardar', 'Guardar')}</Button>
          </div>
        </Recuadro>
      )}

      {venta && (
        <Recuadro as="form" onSubmit={vender} className="grid gap-3 sm:grid-cols-4">
          <h3 className="font-black tracking-tight text-on-surface2 sm:col-span-4">
            {venta.propiedad ? t('vender_propiedad', 'Vender la propiedad') : t('vender_cuota_de', 'Vender la cuota de {nombre} ({pct})').replace('{nombre}', venta.cuota.titular_nombre).replace('{pct}', pct(venta.cuota.porcentaje))}
          </h3>
          <Campo etiqueta={t('fecha_venta', 'Fecha de la venta')}><input required type="date" {...v('fecha')} className={CLASE_INPUT} /></Campo>
          {!venta.propiedad && <Campo etiqueta={t('pct_vendido', '% que se vende')}><input type="number" step="0.001" min="0.001" max={venta.cuota.porcentaje} {...v('porcentaje')} className={`${CLASE_INPUT} font-mono`} /></Campo>}
          <Campo etiqueta={t('precio_venta', 'Precio de venta (€)')}><input type="number" step="0.01" min="0" {...v('precio')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('gastos_venta', 'Gastos de la venta (€)')}><input type="number" step="0.01" min="0" {...v('gastos')} className={CLASE_INPUT} /></Campo>
          {!venta.propiedad && <>
            <Campo etiqueta={t('comprador', 'Comprador (si es de la casa)')} ancho="sm:col-span-2">
              <select {...v('comprador_id')} className={CLASE_INPUT}>
                <option value="">{t('comprador_externo', '(alguien de fuera)')}</option>
                {entidades.filter((e) => e.id !== venta.cuota.titular_id).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Campo>
            {venta.comprador_id && (
              <Campo etiqueta={t('finalidad_comprador', 'Finalidad para el comprador')}>
                <select {...v('finalidad_comprador')} className={CLASE_INPUT}>{FINALIDADES.map((d) => <option key={d} value={d}>{t(`finalidad_${d.toLowerCase()}`, d)}</option>)}</select>
              </Campo>
            )}
          </>}
          <Ayuda className="sm:col-span-4">{venta.propiedad
            ? t('ayuda_venta_propiedad', 'Cierra todas las cuotas vigentes en esa fecha; el precio y los gastos se reparten por %. La propiedad pasa a «Vendida».')
            : t('ayuda_venta_cuota', 'La cuota se cierra ese día. Si el comprador es de la casa, nace su cuota el mismo día. Si se vende una parte, el resto sigue.')}</Ayuda>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => setVenta(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('registrar_venta', 'Registrar la venta')}</Button>
          </div>
        </Recuadro>
      )}

      <section>
        <Rotulo className="mb-2">{t('vigentes', 'Titulares actuales')}</Rotulo>
        <Tabla filas={vigentes} conAcciones />
      </section>
      {historicas.length > 0 && (
        <section>
          <Rotulo className="mb-2">{t('historicas', 'Historial (cuotas vendidas o futuras)')}</Rotulo>
          <Tabla filas={historicas} conAcciones={false} />
        </section>
      )}

      <Recuadro as="section">
        <div className="mb-3 flex items-center gap-3">
          <Rotulo className="flex-1">{t('resumen', 'Resumen por titular')}</Rotulo>
          <Campo etiqueta={t('anyo', 'Año')}><input type="number" min="1990" max="2100" value={anyo} onChange={(e) => setAnyo(e.target.value)} className="input-base w-28 px-3 py-2 text-sm" /></Campo>
        </div>
        <TablaTema columnas={[{ texto: t('col_titular', 'Titular') }, { texto: '%', derecha: true }, { texto: t('col_coste', 'Coste (precio + gastos)'), derecha: true }, { texto: t('col_intereses', 'Intereses del año'), derecha: true }, { texto: t('col_capital', 'Capital amortizado'), derecha: true }]}>
            {resumen.map((r, i) => (
              <tr key={r.titular_id} className={claseFila(i)}>
                <td className={`${TD} font-black tracking-tight`}>{r.titular_nombre}</td><td className={`${TD} text-right font-mono`}>{pct(r.porcentaje)}</td>
                <td className={`${TD} text-right font-mono`}>{euros(r.coste) ?? <SinDato />}</td><td className={`${TD} text-right font-mono`}>{euros(r.intereses || 0)}</td><td className={`${TD} text-right font-mono`}>{euros(r.capital || 0)}</td>
              </tr>
            ))}
            {!resumen.length && <FilaVacia columnas={5}>{t('sin_cuotas', 'Sin cuotas.')}</FilaVacia>}
        </TablaTema>
      </Recuadro>
    </div>
  );
}
