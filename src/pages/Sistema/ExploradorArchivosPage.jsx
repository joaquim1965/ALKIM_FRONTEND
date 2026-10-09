/**
 * ExploradorArchivosPage — Sistema → Explorador de archivos (fase 0c, 30/09/2026).
 *
 * Plan core inmobiliaria §8.5. Sustituye a «Documentación → Archivos».
 *
 *   Catálogo       s_files con filtros (entidad, tipo, ejercicio, texto, caducan)
 *   Carpetas       R2 tal cual, con lo que está indexado (solo sysadmin/superadmin)
 *   Mantenimiento  recuentos, espacio por tabla y papelera (restaurar, borrar a los 30 días)
 *   Plantillas     (08/10/2026) los tipos de documento («etiquetas») de cada apartado,
 *                  con sus subtipos; de momento «Propiedades». Es el mismo editor que
 *                  el lápiz de la pestaña Documentos de cada ficha (TiposDocumento).
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
import { formatTamano } from '../../utils/format';
import {
  CabeceraPagina, Panel, Campo, AvisoError, Ayuda, SinDato, CLASE_INPUT, TablaTema, claseFila, TD, FilaVacia, BotonFila, MICRO,
} from '../../components/UI/TemaPagina';
import CampoFecha from '../../components/UI/CampoFecha';
import TiposDocumento from '../../components/Documentos/TiposDocumento';

const PESTANAS = ['catalogo', 'carpetas', 'mantenimiento', 'plantillas'];
// Plantillas: un apartado por tabla que tiene documentos (de momento, propiedades).
// Entidades primero y, en las dos, sin la columna «Obligatorio» (09/10/2026): son
// plantillas para elegir los tipos que se deseen.
const PLANTILLAS = [{ clave: 'entidades', tabla: 'm_company', sinObligatorio: true }, { clave: 'propiedades', tabla: 'im_property', sinObligatorio: true }];
const fecha = (v) => (v ? String(v).slice(0, 10) : '');
const tamano = formatTamano;

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0]?.message || b.message || `Error ${r.status}`);
  return b;
}

export default function ExploradorArchivosPage() {
  const { t } = useTmTr('Explorador');
  const { t: tc } = useTmTr('CategoriaArchivo');
  const { t: td } = useTmTr('Documentos');
  const { user } = useStore();
  const [plantilla, setPlantilla] = useState(PLANTILLAS[0].clave);
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
      <CabeceraPagina icono={<FolderTree size={24} />} titulo={t('titulo', 'Explorador de archivos')} subtitulo={t('subtitulo', 'Todos los documentos: por tipo, por entidad y tal como están guardados en R2.')} />

      {/* Pestañas del tema (styles/utilities.css, 03/10/2026). */}
      <nav role="tablist" className="tab-bar rounded-xl pb-1" aria-label={t('titulo', 'Explorador de archivos')}>
        {PESTANAS.filter((p) => p !== 'carpetas' || adminSistema).map((p) => (
          <button key={p} type="button" role="tab" aria-selected={p === pestana} className={`tab-base rounded-lg ${p === pestana ? 'tab-active' : ''}`} onClick={() => setPestana(p)}>{t(`pestana_${p}`, p)}</button>
        ))}
      </nav>

      <AvisoError>{error}</AvisoError>

      {pestana === 'catalogo' && (
        <Panel className="space-y-4 p-5">
          <form onSubmit={(e) => { e.preventDefault(); buscar(); }} className="grid gap-3 rejilla-campos">
            <Campo etiqueta={t('entidad', 'Entidad')}>
              <select {...f('entidad_id')} className={CLASE_INPUT}>
                <option value="">{t('todas', 'Todas')}</option>
                {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta={t('categoria', 'Tipo de documento')}>
              <select {...f('categoria_id')} className={CLASE_INPUT}>
                <option value="">{t('todos', 'Todos')}</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{nombreCat(c.codigo, c.nombre)}</option>)}
              </select>
            </Campo>
            <Campo etiqueta={t('ejercicio', 'Ejercicio')}><input type="number" min="1990" max="2100" {...f('ejercicio')} className={CLASE_INPUT} /></Campo>
            <Campo etiqueta={t('caduca_antes', 'Caducan antes de')}><CampoFecha {...f('caduca_antes')} className={CLASE_INPUT} /></Campo>
            <Campo etiqueta={t('texto', 'Buscar')}><input maxLength={100} {...f('texto')} className={CLASE_INPUT} /></Campo>
            <div className="flex items-end"><Button type="submit" leftIcon={<Search size={16} />} loading={cargando}>{t('buscar', 'Buscar')}</Button></div>
          </form>
          <p className={`${MICRO} text-on-surface2`}>{archivos.length} {t('archivos', 'archivos')}</p>
          <TablaTema columnas={[{ texto: '' }, { texto: t('col_nombre', 'Archivo') }, { texto: t('categoria', 'Tipo de documento') }, { texto: t('entidad', 'Entidad') }, { texto: t('col_objeto', 'Objeto') }, { texto: t('col_fecha', 'Fecha') }, { texto: t('col_tamano', 'Tamaño'), derecha: true }]}>
              {archivos.map((a, i) => (
                <tr key={a.id} className={claseFila(i)}>
                  <td className={TD}><BotonFila icono={<Download size={15} />} titulo={t('descargar', 'Descargar')} onClick={() => descargar(a)} /></td>
                  <td className={`${TD} font-black tracking-tight`}>{Number(a.confidencial) === 1 && <Lock size={12} className="mr-1 inline" />}{a.nombre_original}</td>
                  <td className={TD}>{nombreCat(a.categoria_codigo, a.categoria_nombre)}</td>
                  <td className={TD}>{a.entidad_nombre || <SinDato />}</td>
                  <td className={`${TD} font-mono text-xs`}>{a.origen_tabla} {a.origen_id ?? ''}</td>
                  <td className={`${TD} font-mono`}>{fecha(a.fecha_documento) || fecha(a.fecha_alta)}</td>
                  <td className={`${TD} text-right font-mono`}>{tamano(a.tamanyo_bytes)}</td>
                </tr>
              ))}
              {!archivos.length && <FilaVacia columnas={7}>{t('vacio', 'No hay archivos con estos filtros.')}</FilaVacia>}
          </TablaTema>
        </Panel>
      )}

      {pestana === 'plantillas' && (
        <Panel className="space-y-4 p-5">
          <nav role="tablist" className="tab-bar rounded-xl pb-1" aria-label={t('pestana_plantillas', 'Plantillas')}>
            {PLANTILLAS.map((p) => (
              <button key={p.clave} type="button" role="tab" aria-selected={p.clave === plantilla} className={`tab-base rounded-lg ${p.clave === plantilla ? 'tab-active' : ''}`}
                onClick={() => setPlantilla(p.clave)}>{t(`plantillas_${p.clave}`, p.clave)}</button>
            ))}
          </nav>
          {PLANTILLAS.filter((p) => p.clave === plantilla).map((p) => (
            <TiposDocumento key={p.tabla} tabla={p.tabla} enLinea sinObligatorio={Boolean(p.sinObligatorio)} t={td} nombreCat={(c) => tc(c.codigo, c.nombre)} />
          ))}
        </Panel>
      )}

      {pestana === 'carpetas' && carpeta && (
        <Panel className="space-y-3 p-5">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" leftIcon={<ArrowUp size={14} />} disabled={!prefijo} onClick={subir}>{t('subir_nivel', 'Subir')}</Button>
            <p className="font-mono text-sm font-bold text-on-surface2">/{prefijo}</p>
          </div>
          <TablaTema columnas={[{ texto: '' }, { texto: t('col_nombre', 'Archivo') }, { texto: t('col_tamano', 'Tamaño'), derecha: true }, { texto: t('col_fecha', 'Fecha') }, { texto: t('col_indexado', 'En el catálogo') }]}>
              {carpeta.carpetas.map((c, i) => (
                <tr key={c} className={claseFila(i, { clic: true })} onClick={() => abrirCarpeta(c)}>
                  <td className={TD} />
                  <td className={`${TD} font-black tracking-tight`} colSpan={4}><Folder size={14} className="mr-2 inline" />{c.slice(prefijo.length)}</td>
                </tr>
              ))}
              {carpeta.objetos.map((o, j) => (
                <tr key={o.key} className={claseFila(carpeta.carpetas.length + j)}>
                  <td className={TD}><BotonFila icono={<Download size={15} />} titulo={t('descargar', 'Descargar')} onClick={() => enlaceR2(o.key)} /></td>
                  <td className={TD}><FileText size={14} className="mr-2 inline" />{o.key.slice(prefijo.length)}</td>
                  <td className={`${TD} text-right font-mono`}>{tamano(o.size)}</td>
                  <td className={`${TD} font-mono`}>{fecha(o.lastModified)}</td>
                  <td className={TD}>{o.archivo ? `${o.archivo.origen_tabla} ${o.archivo.origen_id ?? ''}${Number(o.archivo.activo) === -1 ? ` · ${t('en_papelera', 'en la papelera')}` : ''}` : t('no_indexado', 'no')}</td>
                </tr>
              ))}
              {!carpeta.carpetas.length && !carpeta.objetos.length && <FilaVacia columnas={5}>{t('carpeta_vacia', 'Carpeta vacía.')}</FilaVacia>}
          </TablaTema>
        </Panel>
      )}

      {pestana === 'mantenimiento' && estado && (
        <Panel className="space-y-5 p-5 text-on-surface2">
          <dl className="grid gap-3 sm:grid-cols-3">
            {[['activos', estado.activos], ['sin_clasificar', estado.sin_clasificar], ['caducan_60', estado.caducan_60], ['papelera', estado.papelera], ['pendientes', estado.pendientes], ['espacio', tamano(estado.bytes)]].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-border bg-surface1 p-4 text-on-surface1">
                <dt className={MICRO}>{t(`m_${k}`, k)}</dt>
                <dd className="mt-1 font-mono text-2xl font-black">{v ?? 0}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h2 className="mb-2 font-black tracking-tight">{t('por_tabla', 'Espacio por tipo de objeto')}</h2>
            <TablaTema columnas={[{ texto: t('col_objeto', 'Objeto') }, { texto: t('archivos', 'archivos'), derecha: true }, { texto: t('col_tamano', 'Tamaño'), derecha: true }]}>
                {estado.por_tabla.map((r, i) => (
                  <tr key={r.origen_tabla} className={claseFila(i)}>
                    <td className={`${TD} font-mono`}>{r.origen_tabla}</td><td className={`${TD} text-right font-mono`}>{r.n}</td><td className={`${TD} text-right font-mono`}>{tamano(r.bytes)}</td>
                  </tr>
                ))}
            </TablaTema>
          </div>
          <div>
            <h2 className="mb-2 font-black tracking-tight"><Trash2 size={16} className="mr-2 inline" />{t('papelera_titulo', 'Papelera')}</h2>
            <Ayuda className="mb-2">{t('papelera_ayuda', 'Se puede restaurar siempre. El borrado definitivo (también de R2) es posible a los {n} días y solo para administradores del sistema.').replace('{n}', estado.dias_papelera)}</Ayuda>
            <TablaTema columnas={[{ texto: '' }, { texto: t('col_nombre', 'Archivo') }, { texto: t('col_objeto', 'Objeto') }, { texto: t('col_borrado', 'En la papelera desde') }]}>
                {papelera.map((a, i) => (
                  <tr key={a.id} className={claseFila(i)}>
                    <td className={`${TD} whitespace-nowrap`}>
                      <BotonFila icono={<RotateCcw size={15} />} titulo={t('restaurar', 'Restaurar')} onClick={() => restaurar(a)} />
                      {adminSistema && <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar_definitivo', 'Borrar para siempre')} onClick={() => borrar(a)} />}
                    </td>
                    <td className={`${TD} font-black tracking-tight`}>{a.nombre_original}</td>
                    <td className={`${TD} font-mono text-xs`}>{a.origen_tabla} {a.origen_id ?? ''}</td>
                    <td className={`${TD} font-mono`}>{fecha(a.fecha_eliminacion)}</td>
                  </tr>
                ))}
                {!papelera.length && <FilaVacia columnas={4}>{t('papelera_vacia', 'La papelera está vacía.')}</FilaVacia>}
            </TablaTema>
          </div>
        </Panel>
      )}
    </div>
  );
}
