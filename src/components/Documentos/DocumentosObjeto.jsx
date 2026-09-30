/**
 * DocumentosObjeto — pestaña «Documentos» común (fase 0c, 30/09/2026).
 *
 * Plan core inmobiliaria §8.4. Se usa en la ficha de cualquier objeto que
 * admita documentos (entidad, socio, tercero; después propiedad, contrato…):
 *
 *   <DocumentosObjeto tabla="m_company" id={3} />
 *
 * Muestra lo que falta (categorías obligatorias sin archivo), los archivos por
 * categoría (propios y vinculados), y permite subir, descargar (enlace firmado
 * de 5 minutos), editar, vincular a otra entidad y mandar a la papelera.
 *
 * API: /files/objeto/:objeto/:id · POST /files · PATCH /files/:id ·
 *      GET /files/:id/descarga · POST|DELETE /files/:id/vinculos · DELETE /files/:id
 * Textos: s_dictionary, contexto «Documentos» y «CategoriaArchivo» (4 idiomas).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Upload, Download, Trash2, Pencil, Link2, Unlink, AlertTriangle, Lock, CheckCircle2, X } from 'lucide-react';
import Button from '../UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';

const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = (v) => (v ? String(v).slice(0, 10) : '');
const tamano = (b) => {
  const n = Number(b) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
};

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0]?.message || b.message || `Error ${r.status}`);
  return b;
}

const claseInput = 'mt-1 w-full rounded-lg border border-border bg-surface1 px-3 py-2 text-on-background';
const Campo = ({ etiqueta, children }) => <label className="block text-sm font-bold text-on-background">{etiqueta}{children}</label>;

export default function DocumentosObjeto({ tabla, id, soloLectura = false }) {
  const { t } = useTmTr('Documentos');
  const { t: tc } = useTmTr('CategoriaArchivo');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [subida, setSubida] = useState(null);          // formulario de subida
  const [edicion, setEdicion] = useState(null);        // { archivo, campos }
  const [vinculo, setVinculo] = useState(null);        // { archivo, entidad_id }
  const [entidades, setEntidades] = useState([]);

  const nombreCat = (c) => tc(c.codigo || c.categoria_codigo, c.nombre || c.categoria_nombre);

  const cargar = useCallback(async () => {
    setError('');
    try { setDatos((await pedir(`/files/objeto/${tabla}/${id}`)).data); }
    catch (e) { setError(e.message); }
  }, [tabla, id]);
  useEffect(() => { cargar(); }, [cargar]);

  const porCategoria = useMemo(() => {
    const grupos = new Map();
    for (const a of datos?.archivos || []) {
      const k = a.categoria_codigo || 'SIN_CLASIFICAR';
      if (!grupos.has(k)) grupos.set(k, { codigo: k, nombre: a.categoria_nombre, archivos: [] });
      grupos.get(k).archivos.push(a);
    }
    return [...grupos.values()];
  }, [datos]);

  const nuevaSubida = (categoria = null) => {
    setAviso(''); setError('');
    const c = categoria || datos?.categorias?.[0];
    setSubida({ ficheros: [], categoria_id: c?.id || '', fecha_documento: '', ejercicio: '', fecha_caducidad: '', confidencial: Boolean(Number(c?.confidencial)), descripcion: '' });
  };

  const subir = async (ev) => {
    ev.preventDefault();
    if (!subida.ficheros.length) return setError(t('falta_fichero', 'Elige al menos un archivo.'));
    setOcupado(true); setError('');
    try {
      for (const fichero of subida.ficheros) {
        const fd = new FormData();
        fd.append('archivo', fichero);
        fd.append('objeto_tabla', tabla);
        fd.append('objeto_id', id);
        for (const k of ['categoria_id', 'fecha_documento', 'ejercicio', 'fecha_caducidad', 'descripcion']) if (subida[k] !== '') fd.append(k, subida[k]);
        fd.append('confidencial', subida.confidencial ? '1' : '0');
        await pedir('/files', { method: 'POST', body: fd });
      }
      setAviso(t('subidos', '{n} archivo(s) subido(s).').replace('{n}', subida.ficheros.length));
      setSubida(null);
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  const descargar = async (a) => {
    try {
      const { data } = await pedir(`/files/${a.id}/descarga`);
      window.open(data.url, '_blank', 'noopener');
    } catch (e) { setError(e.message); }
  };

  const guardarEdicion = async (ev) => {
    ev.preventDefault();
    setOcupado(true); setError('');
    try {
      const c = edicion.campos;
      await pedir(`/files/${edicion.archivo.id}`, { method: 'PATCH', body: JSON.stringify({ ...c, confidencial: Boolean(c.confidencial) }) });
      setEdicion(null);
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  const papelera = async (a) => {
    if (!window.confirm(t('confirmar_papelera', '¿Mover «{nombre}» a la papelera? Se puede restaurar durante 30 días.').replace('{nombre}', a.nombre_original))) return;
    try { await pedir(`/files/${a.id}`, { method: 'DELETE' }); await cargar(); }
    catch (e) { setError(e.message); }
  };

  const abrirVinculo = async (a) => {
    setError('');
    try {
      if (!entidades.length) setEntidades((await pedir('/companies/mine')).data || []);
      setVinculo({ archivo: a, entidad_id: '' });
    } catch (e) { setError(e.message); }
  };
  const vincular = async (ev) => {
    ev.preventDefault();
    if (!vinculo.entidad_id) return;
    setOcupado(true);
    try {
      await pedir(`/files/${vinculo.archivo.id}/vinculos`, { method: 'POST', body: JSON.stringify({ objeto_tabla: 'm_company', objeto_id: Number(vinculo.entidad_id) }) });
      setVinculo(null);
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };
  const desvincular = async (a, v) => {
    try { await pedir(`/files/${a.id}/vinculos/${v.id}`, { method: 'DELETE' }); await cargar(); }
    catch (e) { setError(e.message); }
  };

  if (!datos && !error) return <p className="py-6 text-center text-sm">{t('cargando', 'Cargando…')}</p>;

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="rounded-lg border border-destructive px-3 py-2 text-sm text-destructive-text">{error}</div>}
      {aviso && <div role="status" className="rounded-lg border border-border px-3 py-2 text-sm">{aviso}</div>}

      {datos && (
        <section aria-label={t('que_falta', 'Qué falta')} className="rounded-xl border border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
            {datos.faltan.length ? <AlertTriangle size={16} className="text-warning" /> : <CheckCircle2 size={16} className="text-success" />}
            {t('que_falta', 'Qué falta')}
          </h3>
          {datos.faltan.length
            ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {datos.faltan.map((c) => (
                  <li key={c.id}>
                    <Button size="xs" variant="outline" leftIcon={<Upload size={14} />} disabled={soloLectura} onClick={() => nuevaSubida(c)}>{nombreCat(c)}</Button>
                  </li>
                ))}
              </ul>
            )
            : <p className="mt-2 text-sm">{t('nada_falta', 'Están todos los documentos obligatorios.')}</p>}
        </section>
      )}

      {!soloLectura && !subida && (
        <Button variant="primary" leftIcon={<Upload size={16} />} onClick={() => nuevaSubida()}>{t('subir', 'Subir documentos')}</Button>
      )}

      {subida && (
        <form onSubmit={subir} className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex justify-between">
            <h3 className="font-black text-on-background">{t('subir', 'Subir documentos')}</h3>
            <button type="button" onClick={() => setSubida(null)} aria-label={t('cerrar', 'Cerrar')}><X size={18} /></button>
          </div>
          <Campo etiqueta={t('ficheros', 'Archivos (PDF, imagen, Word, Excel; máx. 20 MB cada uno)')}>
            <input type="file" multiple onChange={(e) => setSubida((s) => ({ ...s, ficheros: [...e.target.files] }))} className={claseInput} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta={t('categoria', 'Tipo de documento')}>
              <select value={subida.categoria_id} onChange={(e) => {
                const c = datos.categorias.find((x) => String(x.id) === e.target.value);
                setSubida((s) => ({ ...s, categoria_id: e.target.value, confidencial: Boolean(Number(c?.confidencial)) }));
              }} className={claseInput}>
                {datos.categorias.map((c) => <option key={c.id} value={c.id}>{nombreCat(c)}{Number(c.obligatorio) ? ' *' : ''}</option>)}
              </select>
            </Campo>
            <Campo etiqueta={t('fecha_documento', 'Fecha del documento')}><input type="date" max={hoy()} value={subida.fecha_documento} onChange={(e) => setSubida((s) => ({ ...s, fecha_documento: e.target.value }))} className={claseInput} /></Campo>
            <Campo etiqueta={t('ejercicio', 'Ejercicio')}><input type="number" min="1990" max="2100" value={subida.ejercicio} onChange={(e) => setSubida((s) => ({ ...s, ejercicio: e.target.value }))} className={claseInput} /></Campo>
            {Number(datos.categorias.find((c) => String(c.id) === String(subida.categoria_id))?.caduca) === 1 && (
              <Campo etiqueta={t('fecha_caducidad', 'Caduca el')}><input type="date" value={subida.fecha_caducidad} onChange={(e) => setSubida((s) => ({ ...s, fecha_caducidad: e.target.value }))} className={claseInput} /></Campo>
            )}
            <div className="sm:col-span-2"><Campo etiqueta={t('descripcion', 'Descripción')}><input maxLength={500} value={subida.descripcion} onChange={(e) => setSubida((s) => ({ ...s, descripcion: e.target.value }))} className={claseInput} /></Campo></div>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-on-background">
            <input type="checkbox" checked={subida.confidencial} onChange={(e) => setSubida((s) => ({ ...s, confidencial: e.target.checked }))} className="h-4 w-4" />
            {t('confidencial', 'Confidencial (solo lo ven quienes gestionan)')}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSubida(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('subir_boton', 'Subir')}</Button>
          </div>
        </form>
      )}

      {porCategoria.length === 0 && <p className="text-sm">{t('sin_documentos', 'Todavía no hay documentos.')}</p>}

      {porCategoria.map((g) => (
        <section key={g.codigo} className="rounded-xl border border-border">
          <h3 className="border-b border-border px-4 py-2 text-sm font-black text-on-background">{nombreCat(g)} · {g.archivos.length}</h3>
          <ul>
            {g.archivos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-on-background">
                    {Number(a.confidencial) === 1 && <Lock size={13} className="mr-1 inline" aria-label={t('confidencial_corto', 'Confidencial')} />}
                    {a.nombre_original}
                  </p>
                  <p className="text-xs">
                    {[fecha(a.fecha_documento), a.ejercicio && `${t('ejercicio', 'Ejercicio')} ${a.ejercicio}`, tamano(a.tamanyo_bytes),
                      a.fecha_caducidad && `${t('caduca', 'caduca')} ${fecha(a.fecha_caducidad)}`,
                      !a.principal && t('vinculado', 'vinculado desde otro objeto'), a.descripcion].filter(Boolean).join(' · ')}
                  </p>
                  {a.vinculos?.length > 0 && (
                    <p className="text-xs">
                      {t('se_ve_en', 'También se ve en')}: {a.vinculos.map((v) => (
                        <span key={v.id} className="mr-2">{v.objeto_tabla} {v.objeto_id}
                          {!soloLectura && a.principal && <button type="button" className="ml-1" aria-label={t('desvincular', 'Desvincular')} onClick={() => desvincular(a, v)}><Unlink size={12} className="inline" /></button>}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <Button size="xs" variant="ghost" aria-label={t('descargar', 'Descargar')} onClick={() => descargar(a)}><Download size={15} /></Button>
                {!soloLectura && <>
                  <Button size="xs" variant="ghost" aria-label={t('editar', 'Editar')} onClick={() => setEdicion({ archivo: a, campos: { categoria_id: a.categoria_id, fecha_documento: fecha(a.fecha_documento), ejercicio: a.ejercicio || '', fecha_caducidad: fecha(a.fecha_caducidad), descripcion: a.descripcion || '', confidencial: Boolean(Number(a.confidencial)) } })}><Pencil size={15} /></Button>
                  <Button size="xs" variant="ghost" aria-label={t('vincular', 'Vincular a otra entidad')} onClick={() => abrirVinculo(a)}><Link2 size={15} /></Button>
                  {a.principal && <Button size="xs" variant="ghost" aria-label={t('papelera', 'Mover a la papelera')} onClick={() => papelera(a)}><Trash2 size={15} /></Button>}
                </>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {edicion && (
        <form onSubmit={guardarEdicion} className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex justify-between">
            <h3 className="font-black text-on-background">{t('editar_titulo', 'Editar «{nombre}»').replace('{nombre}', edicion.archivo.nombre_original)}</h3>
            <button type="button" onClick={() => setEdicion(null)} aria-label={t('cerrar', 'Cerrar')}><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta={t('categoria', 'Tipo de documento')}>
              <select value={edicion.campos.categoria_id} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, categoria_id: Number(e.target.value) } }))} className={claseInput}>
                {datos.categorias.map((c) => <option key={c.id} value={c.id}>{nombreCat(c)}</option>)}
              </select>
            </Campo>
            <Campo etiqueta={t('fecha_documento', 'Fecha del documento')}><input type="date" value={edicion.campos.fecha_documento} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, fecha_documento: e.target.value } }))} className={claseInput} /></Campo>
            <Campo etiqueta={t('ejercicio', 'Ejercicio')}><input type="number" min="1990" max="2100" value={edicion.campos.ejercicio} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, ejercicio: e.target.value } }))} className={claseInput} /></Campo>
            <Campo etiqueta={t('fecha_caducidad', 'Caduca el')}><input type="date" value={edicion.campos.fecha_caducidad} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, fecha_caducidad: e.target.value } }))} className={claseInput} /></Campo>
            <div className="sm:col-span-2"><Campo etiqueta={t('descripcion', 'Descripción')}><input maxLength={500} value={edicion.campos.descripcion} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, descripcion: e.target.value } }))} className={claseInput} /></Campo></div>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-on-background">
            <input type="checkbox" checked={edicion.campos.confidencial} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, confidencial: e.target.checked } }))} className="h-4 w-4" />
            {t('confidencial', 'Confidencial (solo lo ven quienes gestionan)')}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEdicion(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('guardar', 'Guardar')}</Button>
          </div>
        </form>
      )}

      {vinculo && (
        <form onSubmit={vincular} className="space-y-3 rounded-xl border border-border p-4">
          <h3 className="font-black text-on-background">{t('vincular_titulo', 'Que «{nombre}» se vea también en…').replace('{nombre}', vinculo.archivo.nombre_original)}</h3>
          <Campo etiqueta={t('entidad', 'Entidad')}>
            <select value={vinculo.entidad_id} onChange={(e) => setVinculo((s) => ({ ...s, entidad_id: e.target.value }))} className={claseInput}>
              <option value="">—</option>
              {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Campo>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setVinculo(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado} disabled={!vinculo.entidad_id}>{t('vincular_boton', 'Vincular')}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
