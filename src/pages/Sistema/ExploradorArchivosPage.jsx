/**
 * ExploradorArchivosPage — Sistema → Explorador de archivos (fase 0c, 30/09/2026).
 *
 * Plan core inmobiliaria §8.5. Sustituye a «Documentación → Archivos».
 *
 *   Catálogo       s_files con filtros (entidad, tipo, ejercicio, texto, caducan)
 *   Carpetas       R2 tal cual, con lo que está indexado (solo sysadmin/superadmin)
 *   Mantenimiento  recuentos, espacio por tabla y papelera (restaurar, borrar a los 30 días)
 *
 * API: GET /files · GET /files/r2 · GET /files/r2/enlace · GET /files/mantenimiento ·
 *      GET /files/:id/descarga · POST /files/:id/restaurar · DELETE /files/:id/definitivo
 * Textos: s_dictionary, contexto «Explorador» y «CategoriaArchivo» (4 idiomas).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FolderTree, Folder, FileText, Download, RotateCcw, Trash2, Search, ArrowUp, Lock } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { useStore } from '../../hooks/useStore';

const PESTANAS = ['catalogo', 'carpetas', 'mantenimiento'];
const fecha = (v) => (v ? String(v).slice(0, 10) : '');
const tamano = (b) => {
  const n = Number(b) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
};

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0]?.message || b.message || `Error ${r.status}`);
  return b;
}
const claseInput = 'mt-1 w-full rounded-lg border border-border bg-surface1 px-3 py-2 text-on-background';
const Campo = ({ etiqueta, children }) => <label className="block text-sm font-bold text-on-background">{etiqueta}{children}</label>;

export default function ExploradorArchivosPage() {
  const { t } = useTmTr('Explorador');
  const { t: tc } = useTmTr('CategoriaArchivo');
  const { user } = useStore();
  const adminSistema = Number(user?.rol) >= 3;     // Carpetas de R2 y borrado definitivo
  const [pestana, setPestana] = useState('catalogo');
  const [error, setError] = useState('');

  // Catálogo
  const [filtros, setFiltros] = useState({ entidad_id: '', categoria_id: '', ejercicio: '', texto: '', caduca_antes: '' });
  const [archivos, setArchivos] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Carpetas
  const [prefijo, setPrefijo] = useState('');
  const [carpeta, setCarpeta] = useState(null);

  // Mantenimiento
  const [estado, setEstado] = useState(null);
  const [papelera, setPapelera] = useState([]);

  const nombreCat = (codigo, nombre) => tc(codigo || 'SIN_CLASIFICAR', nombre || codigo);

  const buscar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== ''));
      setArchivos((await pedir(`/files?${qs}`)).data || []);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, [filtros]);

  useEffect(() => {
    (async () => {
      try {
        setEntidades((await pedir('/companies/mine')).data || []);
        setCategorias((await pedir('/files/categorias')).data || []);
      } catch (e) { setError(e.message); }
    })();
  }, []);
  useEffect(() => { if (pestana === 'catalogo') buscar(); }, [pestana]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirCarpeta = useCallback(async (p) => {
    setError('');
    try { setCarpeta((await pedir(`/files/r2?prefix=${encodeURIComponent(p)}`)).data); setPrefijo(p); }
    catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { if (pestana === 'carpetas' && !carpeta) abrirCarpeta(''); }, [pestana, carpeta, abrirCarpeta]);

  const cargarMantenimiento = useCallback(async () => {
    setError('');
    try {
      setEstado((await pedir('/files/mantenimiento')).data);
      setPapelera((await pedir('/files?papelera=1')).data || []);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { if (pestana === 'mantenimiento') cargarMantenimiento(); }, [pestana, cargarMantenimiento]);

  const descargar = async (a) => {
    try { window.open((await pedir(`/files/${a.id}/descarga`)).data.url, '_blank', 'noopener'); }
    catch (e) { setError(e.message); }
  };
  const enlaceR2 = async (key) => {
    try { window.open((await pedir(`/files/r2/enlace?key=${encodeURIComponent(key)}`)).data.url, '_blank', 'noopener'); }
    catch (e) { setError(e.message); }
  };
  const restaurar = async (a) => {
    try { await pedir(`/files/${a.id}/restaurar`, { method: 'POST' }); await cargarMantenimiento(); }
    catch (e) { setError(e.message); }
  };
  const borrar = async (a) => {
    if (!window.confirm(t('confirmar_borrar', 'Borrar «{nombre}» para siempre (también de R2). No se puede deshacer.').replace('{nombre}', a.nombre_original))) return;
    try { await pedir(`/files/${a.id}/definitivo`, { method: 'DELETE' }); await cargarMantenimiento(); }
    catch (e) { setError(e.message); }
  };

  const subir = () => {
    const partes = prefijo.split('/').filter(Boolean);
    partes.pop();
    abrirCarpeta(partes.length ? `${partes.join('/')}/` : '');
  };

  const f = (k) => ({ value: filtros[k], onChange: (e) => setFiltros((s) => ({ ...s, [k]: e.target.value })) });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-widest">{t('seccion', 'Sistema')}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-on-background">{t('titulo', 'Explorador de archivos')}</h1>
        <p className="mt-2 text-sm">{t('subtitulo', 'Todos los documentos: por tipo, por entidad y tal como están guardados en R2.')}</p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label={t('titulo', 'Explorador de archivos')}>
        {PESTANAS.filter((p) => p !== 'carpetas' || adminSistema).map((p) => (
          <Button key={p} size="sm" variant={p === pestana ? 'primary' : 'outline'} onClick={() => setPestana(p)}>{t(`pestana_${p}`, p)}</Button>
        ))}
      </nav>

      {error && <div role="alert" className="rounded-xl border border-destructive bg-surface1 px-4 py-3 text-sm text-destructive-text">{error}</div>}

      {pestana === 'catalogo' && (
        <section className="space-y-4 rounded-2xl border border-border bg-surface2 p-5">
          <form onSubmit={(e) => { e.preventDefault(); buscar(); }} className="grid gap-3 sm:grid-cols-6">
            <Campo etiqueta={t('entidad', 'Entidad')}>
              <select {...f('entidad_id')} className={claseInput}>
                <option value="">{t('todas', 'Todas')}</option>
                {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta={t('categoria', 'Tipo de documento')}>
              <select {...f('categoria_id')} className={claseInput}>
                <option value="">{t('todos', 'Todos')}</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{nombreCat(c.codigo, c.nombre)}</option>)}
              </select>
            </Campo>
            <Campo etiqueta={t('ejercicio', 'Ejercicio')}><input type="number" min="1990" max="2100" {...f('ejercicio')} className={claseInput} /></Campo>
            <Campo etiqueta={t('caduca_antes', 'Caducan antes de')}><input type="date" {...f('caduca_antes')} className={claseInput} /></Campo>
            <Campo etiqueta={t('texto', 'Buscar')}><input maxLength={100} {...f('texto')} className={claseInput} /></Campo>
            <div className="flex items-end"><Button type="submit" leftIcon={<Search size={16} />} loading={cargando}>{t('buscar', 'Buscar')}</Button></div>
          </form>
          <p className="text-xs">{archivos.length} {t('archivos', 'archivos')}</p>
          <table className="w-full text-sm">
            <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider">
              <th className="p-2">{t('col_nombre', 'Archivo')}</th><th className="p-2">{t('categoria', 'Tipo de documento')}</th><th className="p-2">{t('entidad', 'Entidad')}</th>
              <th className="p-2">{t('col_objeto', 'Objeto')}</th><th className="p-2">{t('col_fecha', 'Fecha')}</th><th className="p-2 text-right">{t('col_tamano', 'Tamaño')}</th><th />
            </tr></thead>
            <tbody>
              {archivos.map((a) => (
                <tr key={a.id} className="bg-table-row text-on-table-row border-b border-border hover:bg-table-row-hover hover:text-on-table-row-hover">
                  <td className="p-2 font-bold">{Number(a.confidencial) === 1 && <Lock size={12} className="mr-1 inline" />}{a.nombre_original}</td>
                  <td className="p-2">{nombreCat(a.categoria_codigo, a.categoria_nombre)}</td>
                  <td className="p-2">{a.entidad_nombre || '—'}</td>
                  <td className="p-2 font-mono text-xs">{a.origen_tabla} {a.origen_id ?? ''}</td>
                  <td className="p-2 font-mono">{fecha(a.fecha_documento) || fecha(a.fecha_alta)}</td>
                  <td className="p-2 text-right font-mono">{tamano(a.tamanyo_bytes)}</td>
                  <td className="p-2 text-right"><Button size="xs" variant="ghost" aria-label={t('descargar', 'Descargar')} onClick={() => descargar(a)}><Download size={15} /></Button></td>
                </tr>
              ))}
              {!archivos.length && <tr className="bg-table-row text-on-table-row"><td colSpan={7} className="p-6 text-center">{t('vacio', 'No hay archivos con estos filtros.')}</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {pestana === 'carpetas' && carpeta && (
        <section className="space-y-3 rounded-2xl border border-border bg-surface2 p-5">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" leftIcon={<ArrowUp size={14} />} disabled={!prefijo} onClick={subir}>{t('subir_nivel', 'Subir')}</Button>
            <p className="font-mono text-sm">/{prefijo}</p>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider">
              <th className="p-2">{t('col_nombre', 'Archivo')}</th><th className="p-2 text-right">{t('col_tamano', 'Tamaño')}</th><th className="p-2">{t('col_fecha', 'Fecha')}</th><th className="p-2">{t('col_indexado', 'En el catálogo')}</th><th />
            </tr></thead>
            <tbody>
              {carpeta.carpetas.map((c) => (
                <tr key={c} className="bg-table-row text-on-table-row cursor-pointer border-b border-border hover:bg-table-row-hover hover:text-on-table-row-hover" onClick={() => abrirCarpeta(c)}>
                  <td className="p-2 font-bold" colSpan={5}><Folder size={14} className="mr-2 inline" />{c.slice(prefijo.length)}</td>
                </tr>
              ))}
              {carpeta.objetos.map((o) => (
                <tr key={o.key} className="bg-table-row text-on-table-row border-b border-border hover:bg-table-row-hover hover:text-on-table-row-hover">
                  <td className="p-2"><FileText size={14} className="mr-2 inline" />{o.key.slice(prefijo.length)}</td>
                  <td className="p-2 text-right font-mono">{tamano(o.size)}</td>
                  <td className="p-2 font-mono">{fecha(o.lastModified)}</td>
                  <td className="p-2">{o.archivo ? `${o.archivo.origen_tabla} ${o.archivo.origen_id ?? ''}${Number(o.archivo.activo) === -1 ? ` · ${t('en_papelera', 'en la papelera')}` : ''}` : t('no_indexado', 'no')}</td>
                  <td className="p-2 text-right"><Button size="xs" variant="ghost" aria-label={t('descargar', 'Descargar')} onClick={() => enlaceR2(o.key)}><Download size={15} /></Button></td>
                </tr>
              ))}
              {!carpeta.carpetas.length && !carpeta.objetos.length && <tr className="bg-table-row text-on-table-row"><td colSpan={5} className="p-6 text-center">{t('carpeta_vacia', 'Carpeta vacía.')}</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {pestana === 'mantenimiento' && estado && (
        <section className="space-y-5 rounded-2xl border border-border bg-surface2 p-5">
          <dl className="grid gap-3 sm:grid-cols-3">
            {[['activos', estado.activos], ['sin_clasificar', estado.sin_clasificar], ['caducan_60', estado.caducan_60], ['papelera', estado.papelera], ['pendientes', estado.pendientes], ['espacio', tamano(estado.bytes)]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border p-3">
                <dt className="text-xs font-black uppercase tracking-widest">{t(`m_${k}`, k)}</dt>
                <dd className="mt-1 font-mono text-2xl font-black text-on-background">{v ?? 0}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h2 className="mb-2 font-black text-on-background">{t('por_tabla', 'Espacio por tipo de objeto')}</h2>
            <table className="w-full text-sm">
              <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider"><th className="p-2">{t('col_objeto', 'Objeto')}</th><th className="p-2 text-right">{t('archivos', 'archivos')}</th><th className="p-2 text-right">{t('col_tamano', 'Tamaño')}</th></tr></thead>
              <tbody>
                {estado.por_tabla.map((r) => (
                  <tr key={r.origen_tabla} className="bg-table-row text-on-table-row border-b border-border">
                    <td className="p-2 font-mono">{r.origen_tabla}</td><td className="p-2 text-right font-mono">{r.n}</td><td className="p-2 text-right font-mono">{tamano(r.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="mb-2 font-black text-on-background"><FolderTree size={16} className="mr-2 inline" />{t('papelera_titulo', 'Papelera')}</h2>
            <p className="mb-2 text-xs">{t('papelera_ayuda', 'Se puede restaurar siempre. El borrado definitivo (también de R2) es posible a los {n} días y solo para administradores del sistema.').replace('{n}', estado.dias_papelera)}</p>
            <table className="w-full text-sm">
              <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider"><th className="p-2">{t('col_nombre', 'Archivo')}</th><th className="p-2">{t('col_objeto', 'Objeto')}</th><th className="p-2">{t('col_borrado', 'En la papelera desde')}</th><th /></tr></thead>
              <tbody>
                {papelera.map((a) => (
                  <tr key={a.id} className="bg-table-row text-on-table-row border-b border-border">
                    <td className="p-2 font-bold">{a.nombre_original}</td>
                    <td className="p-2 font-mono text-xs">{a.origen_tabla} {a.origen_id ?? ''}</td>
                    <td className="p-2 font-mono">{fecha(a.fecha_eliminacion)}</td>
                    <td className="whitespace-nowrap p-2 text-right">
                      <Button size="xs" variant="ghost" aria-label={t('restaurar', 'Restaurar')} onClick={() => restaurar(a)}><RotateCcw size={15} /></Button>
                      {adminSistema && <Button size="xs" variant="ghost" aria-label={t('borrar_definitivo', 'Borrar para siempre')} onClick={() => borrar(a)}><Trash2 size={15} /></Button>}
                    </td>
                  </tr>
                ))}
                {!papelera.length && <tr className="bg-table-row text-on-table-row"><td colSpan={4} className="p-6 text-center">{t('papelera_vacia', 'La papelera está vacía.')}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
