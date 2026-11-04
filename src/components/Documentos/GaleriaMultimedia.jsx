/**
 * GaleriaMultimedia — pestaña «Multimedia» de la ficha de la propiedad (29/10/2026, plan aprobado por el usuario).
 *
 * Las fotos y vídeos de la propiedad viven UNA sola vez, en la carpeta «Multimedia» (código FOTOS) y sus
 * subcarpetas (Actuales › Habitación 1…, Pre-reforma…). Dos vistas:
 *   - Galería (por defecto): miniaturas por carpeta, en el orden del árbol; al pulsar, pantalla completa
 *     con flechas (el mismo visor de Comunicaciones). En cada carpeta, «Enlazar fotos»: elige fotos de
 *     otras carpetas para verlas también aquí SIN copiarlas (xs_file_relation.categoria_id). Las fotos
 *     enlazadas llevan el icono de enlace y «Quitar enlace» (la foto no se toca).
 *   - Lista: la pantalla de documentos de siempre, solo con Multimedia (subir, crear y ordenar carpetas,
 *     mover, renombrar). Las fotos repetidas no se pueden subir (huella del archivo).
 *
 * API: GET /files/objeto/im_property/:id?enlaces=1 · POST /files/urls · POST /files/:id/vinculos
 *      DELETE /files/:id/vinculos/:enlace · DELETE /files/:id (papelera) · GET /files/:id/descarga
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Images, List, Link2, Unlink, Trash2, Film, ImageOff, Check, Upload, Play, Globe } from 'lucide-react';
import Button from '../UI/Button';
import DocumentosObjeto from './DocumentosObjeto';
import { PantallaCompleta } from '../Comunicaciones/VisorComunicacion';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { AvisoError, AvisoOk, Ayuda, MICRO, VentanaModal } from '../UI/TemaPagina';

export const GRUPO_MULTIMEDIA = 'FOTOS';

async function pedir(url, opciones = {}) {
  const json = opciones.body && !(opciones.body instanceof FormData);
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), ...(json ? { 'Content-Type': 'application/json' } : {}) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(b.errors?.[0]?.message || b.message || `Error ${r.status}`); e.code = b.code; throw e; }
  return b;
}
// Vídeos también por la extensión (29/10/2026): un .MOV subido desde Windows llega como application/octet-stream.
const EXT_VIDEO = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', ogv: 'video/ogg' };
const extDe = (a) => String(a.extension || '').toLowerCase();
const esVideo = (a) => /^video\//.test(a.tipo_mime || '') || Boolean(EXT_VIDEO[extDe(a)]);
/** Para el visor: el tipo de vídeo correcto aunque el archivo se guardara sin él. */
const paraVisor = (a) => (esVideo(a) && !/^video\//.test(a.tipo_mime || '') ? { ...a, tipo_mime: EXT_VIDEO[extDe(a)] } : a);
const esHeic = (a) => ['heic', 'heif'].includes(String(a.extension || '').toLowerCase());
const esImagen = (a) => /^image\//.test(a.tipo_mime || '') && !esHeic(a);
// Foto 360° (29/10/2026): acceso directo de Windows (.url) a un visor web; se abre en el navegador.
const es360 = (a) => extDe(a) === 'url';
const porNombre = (a, b) => String(a.nombre_original).localeCompare(String(b.nombre_original), 'es', { numeric: true });

/** Carpetas de Multimedia en el orden del árbol: [{ c, nivel, ruta }]. */
function arbolMultimedia(categorias) {
  const raiz = categorias.find((c) => c.codigo === GRUPO_MULTIMEDIA);
  if (!raiz) return [];
  const hijos = (id) => categorias.filter((c) => Number(c.padre_id) === Number(id))
    .sort((a, b) => (Number(a.orden_catalogo) || 0) - (Number(b.orden_catalogo) || 0) || String(a.nombre).localeCompare(String(b.nombre), 'es'));
  const salida = [];
  const recorrer = (c, nivel, ruta) => {
    salida.push({ c, nivel, ruta });
    hijos(c.id).forEach((h) => recorrer(h, nivel + 1, [...ruta, h]));
  };
  recorrer(raiz, 0, [raiz]);
  return salida;
}

/** Miniatura: foto (carga diferida), vídeo o archivo que no se puede ver. */
/** Botón de «play» en medio: triángulo sobre cuadrado rojo, para que se vea que es un vídeo. */
const Play360 = ({ icono }) => (
  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <span className="grid h-14 w-14 place-items-center rounded-lg bg-destructive text-on-destructive shadow-lg">{icono}</span>
  </span>
);

function Miniatura({ a, url, t }) {
  // Sin nombre de archivo en la miniatura (29/10/2026, petición del usuario): ni se ve ni se lee en voz alta.
  if (es360(a)) {
    const d = url && typeof url === 'object' ? url : {};
    return (
      <span className="relative block h-full w-full">
        {d.imagen ? <img src={d.imagen} alt="" loading="lazy" className="h-full w-full object-cover" /> : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface2 text-on-surface2"><Globe size={40} /></span>
        )}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg bg-destructive px-3 py-2 text-lg font-black text-on-destructive shadow-lg">360°</span>
        </span>
      </span>
    );
  }
  if (esImagen(a) && url) return <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />;
  // Vídeo (29/10/2026): vista previa con el primer fotograma (solo se bajan los datos del principio).
  if (esVideo(a)) {
    return (
      <span className="relative block h-full w-full bg-surface2">
        {url && <video src={`${url}#t=0.5`} preload="metadata" muted playsInline className="pointer-events-none h-full w-full object-cover" aria-hidden="true" />}
        <Play360 icono={<Play size={28} fill="currentColor" />} />
      </span>
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface2 p-2 text-center text-on-surface2">
      {esVideo(a) ? <Film size={32} /> : <ImageOff size={32} />}
      <span className="text-xs font-bold">{esHeic(a) ? 'HEIC' : String(a.extension || '').toUpperCase()}</span>
      {esHeic(a) && <span className="sr-only">{t('heic', 'Formato HEIC: el navegador no lo muestra.')}</span>}
    </div>
  );
}

export default function GaleriaMultimedia({ propiedadId, puedeEscribir = false }) {
  const { t } = useTmTr('Multimedia');
  const { t: tc } = useTmTr('CategoriaArchivo');
  const [vista, setVista] = useState('galeria');
  const [datos, setDatos] = useState(null);
  const [urls, setUrls] = useState({});
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [completa, setCompleta] = useState(null);    // { items, indice }
  const [enlazar, setEnlazar] = useState(null);      // carpeta destino { c, ruta }
  const [marcadas, setMarcadas] = useState(() => new Set());
  const [borrando, setBorrando] = useState(null);    // archivo a la papelera (confirmación)
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await pedir(`/files/objeto/im_property/${propiedadId}?enlaces=1`);
      setDatos(data);
    } catch (e) { setError(e.message); }
  }, [propiedadId]);
  useEffect(() => { if (vista === 'galeria') cargar(); }, [cargar, vista]);

  const nombreCat = (c) => tc(c.codigo, c.nombre);
  const carpetas = useMemo(() => (datos ? arbolMultimedia(datos.categorias || []) : []), [datos]);
  const idsCarpetas = useMemo(() => new Set(carpetas.map((x) => Number(x.c.id))), [carpetas]);
  // Fotos de cada carpeta: las suyas y las enlazadas.
  const contenido = useMemo(() => {
    const m = new Map(carpetas.map((x) => [Number(x.c.id), []]));
    (datos?.archivos || []).filter((a) => a.principal && idsCarpetas.has(Number(a.categoria_id))).forEach((a) => m.get(Number(a.categoria_id)).push(a));
    (datos?.enlaces || []).filter((a) => idsCarpetas.has(Number(a.categoria_id))).forEach((a) => m.get(Number(a.categoria_id)).push(a));
    m.forEach((lista) => lista.sort((x, y) => Number(Boolean(x.es_enlace)) - Number(Boolean(y.es_enlace)) || porNombre(x, y)));
    return m;
  }, [datos, carpetas, idsCarpetas]);
  const propias = useMemo(() => (datos?.archivos || []).filter((a) => a.principal && idsCarpetas.has(Number(a.categoria_id))), [datos, idsCarpetas]);

  // Enlaces firmados (1 hora) para ver las fotos y los vídeos.
  useEffect(() => {
    const ids = propias.filter((a) => (esImagen(a) || esVideo(a) || es360(a)) && !urls[a.id]).map((a) => a.id);
    if (!ids.length) return;
    pedir('/files/urls', { method: 'POST', body: JSON.stringify({ ids }) })
      .then(({ data }) => setUrls((u) => ({ ...u, ...data })))
      .catch((e) => setError(e.message));
  }, [propias]); // eslint-disable-line react-hooks/exhaustive-deps

  const rutaDe = (categoriaId) => carpetas.find((x) => Number(x.c.id) === Number(categoriaId))?.ruta.slice(1).map(nombreCat).join(' › ') || '';
  const ver = (items, a) => {
    if (es360(a)) {
      const enlace = urls[a.id]?.enlace;
      if (enlace) window.open(enlace, '_blank', 'noopener');
      else setError(t('sin_enlace_360', 'No se ha podido leer la dirección de la foto 360°.'));
      return;
    }
    const visibles = items.filter((x) => !es360(x));
    setCompleta({ items: visibles.map(paraVisor), indice: visibles.findIndex((x) => x === a) });
  };
  const archivosVisor = useMemo(() => Object.fromEntries((completa?.items || []).map((a) => [a.id,
    esHeic(a) ? { error: t('heic', 'Formato HEIC: el navegador no lo muestra.') } : urls[a.id] ? { url: urls[a.id] } : { error: t('no_se_ve', 'Este tipo de archivo no se puede ver aquí.') }])), [completa, urls]); // eslint-disable-line react-hooks/exhaustive-deps
  const descargar = async (a) => {
    try {
      const { data } = await pedir(`/files/${a.id}/descarga`);
      const l = document.createElement('a'); l.href = data.url; l.rel = 'noopener';
      document.body.appendChild(l); l.click(); l.remove();
    } catch (e) { setError(e.message); }
  };

  const quitarEnlace = async (a) => {
    setError(''); setAviso('');
    try { await pedir(`/files/${a.id}/vinculos/${a.enlace_id}`, { method: 'DELETE' }); await cargar(); }
    catch (e) { setError(e.message); }
  };
  const enlacesDe = (a) => (datos?.enlaces || []).filter((x) => x.id === a.id);
  const confirmarPapelera = async () => {
    const a = borrando; setBorrando(null); setError(''); setAviso('');
    try { await pedir(`/files/${a.id}`, { method: 'DELETE' }); await cargar(); }
    catch (e) { setError(e.message); }
  };

  const abrirEnlazar = (x) => { setMarcadas(new Set()); setEnlazar(x); };
  const enlazarMarcadas = async () => {
    setOcupado(true); setError('');
    try {
      for (const id of marcadas) {
        // eslint-disable-next-line no-await-in-loop
        await pedir(`/files/${id}/vinculos`, { method: 'POST', body: JSON.stringify({ objeto_tabla: 'im_property', objeto_id: propiedadId, categoria_id: enlazar.c.id }) });
      }
      setAviso(t('enlazadas', '{n} foto(s) enlazada(s).').replace('{n}', marcadas.size));
      setEnlazar(null);
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  const botonesVista = (
    <div role="tablist" className="tab-bar flex gap-1">
      {[['galeria', t('vista_galeria', 'Galería'), <Images key="g" size={16} />], ['lista', t('vista_lista', 'Lista'), <List key="l" size={16} />]].map(([id, txt, icono]) => (
        <button key={id} type="button" role="tab" aria-selected={vista === id} onClick={() => setVista(id)}
          className={`tab-base inline-flex items-center gap-2 ${vista === id ? 'tab-active' : ''}`}>{icono}{txt}</button>
      ))}
    </div>
  );

  if (vista === 'lista') {
    return (
      <div className="space-y-4">
        {botonesVista}
        <DocumentosObjeto tabla="im_property" id={propiedadId} soloLectura={!puedeEscribir} grupo={GRUPO_MULTIMEDIA} conRaiz conEnlaces />
      </div>
    );
  }

  // Selector de «Enlazar fotos»: las fotos propias de las OTRAS carpetas que aún no están en la destino.
  const yaEnDestino = enlazar ? new Set((contenido.get(Number(enlazar.c.id)) || []).map((a) => a.id)) : new Set();
  const candidatas = enlazar ? carpetas
    .filter((x) => Number(x.c.id) !== Number(enlazar.c.id))
    .map((x) => ({ x, fotos: (contenido.get(Number(x.c.id)) || []).filter((a) => !a.es_enlace && !yaEnDestino.has(a.id)) }))
    .filter((g) => g.fotos.length) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {botonesVista}
        {puedeEscribir && <Button type="button" variant="secondary" leftIcon={<Upload size={16} />} onClick={() => setVista('lista')}>{t('subir', 'Subir fotos o crear carpetas')}</Button>}
      </div>
      <Ayuda>{t('ayuda_lista', 'Para subir fotos, crear carpetas o moverlas, usa la vista «Lista».')}</Ayuda>
      <AvisoError>{error}</AvisoError>
      <AvisoOk>{aviso}</AvisoOk>
      {!datos && !error && <p className={MICRO}>{t('cargando', 'Cargando…')}</p>}
      {datos && !carpetas.length && <p className="text-base font-bold">{t('sin_multimedia', 'Esta propiedad todavía no tiene la carpeta Multimedia.')}</p>}

      {carpetas.map((x) => {
        const items = contenido.get(Number(x.c.id)) || [];
        if (x.nivel === 0 && !items.length) return null; // la raíz solo si tiene algo suelto
        return (
          <section key={x.c.id} className="space-y-3" style={{ marginLeft: `${Math.max(0, x.nivel - 1) * 16}px` }}>
            <div className="flex flex-wrap items-center gap-3 border-b border-border pb-2">
              <h3 className={`${x.nivel <= 1 ? 'text-lg' : 'text-base'} font-black tracking-tight text-on-background`}>
                {`${x.nivel === 0 ? nombreCat(x.c) : x.ruta.slice(1).map(nombreCat).join(' › ')} (${items.length})`}
              </h3>
              {puedeEscribir && x.nivel > 0 && (
                <Button type="button" variant="secondary" leftIcon={<Link2 size={16} />} onClick={() => abrirEnlazar(x)}>{t('enlazar', 'Enlazar fotos')}</Button>
              )}
            </div>
            {!items.length ? <p className="text-sm font-bold">{t('vacia', 'Sin fotos.')}</p> : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {items.map((a) => (
                  <div key={`${a.id}-${a.enlace_id || 'p'}`} className="space-y-1">
                    <button type="button" onClick={() => ver(items, a)}
                      className="relative block aspect-square w-full overflow-hidden rounded-xl border-2 border-border bg-surface2 transition-colors hover:border-on-background">
                      <Miniatura a={a} url={urls[a.id]} t={t} />
                      {/* Subida diferida (01/11/2026): aún solo en el ordenador. */}
                      {Number(a.subida_pendiente) === 1 && (
                        <span className="absolute bottom-2 left-2 rounded-full border-2 border-on-destructive bg-destructive px-2 text-[10px] font-black uppercase tracking-widest text-on-destructive">{t('pendiente_subir', 'Pendiente de subir')}</span>
                      )}
                      {a.es_enlace && (
                        <span className="absolute left-2 top-2 rounded-full border-2 border-border bg-surface1 p-1 text-on-surface1"
                          title={t('es_enlace', 'Enlace (la foto está en «{c}»)').replace('{c}', rutaDe(datos.archivos.find((p) => p.id === a.id)?.categoria_id))}>
                          <Link2 size={14} />
                        </span>
                      )}
                    </button>
                    <div className="flex items-start gap-1">
                      <span className="block min-w-0 flex-1 cursor-text select-text truncate text-xs font-bold text-on-background">{a.nombre_original}</span>
                      {puedeEscribir && (a.es_enlace ? (
                        <button type="button" onClick={() => quitarEnlace(a)} title={t('quitar_enlace', 'Quitar enlace')} aria-label={t('quitar_enlace', 'Quitar enlace')}
                          className="shrink-0 rounded-lg p-1 text-on-surface2 hover:bg-surface-hover hover:text-on-surface-hover"><Unlink size={16} /></button>
                      ) : (
                        <button type="button" onClick={() => setBorrando(a)} title={t('papelera', 'Enviar a la papelera')} aria-label={t('papelera', 'Enviar a la papelera')}
                          className="shrink-0 rounded-lg p-1 text-on-surface2 hover:bg-surface-hover hover:text-on-surface-hover"><Trash2 size={16} /></button>
                      ))}
                    </div>
                    {borrando?.id === a.id && !a.es_enlace && (
                      <AvisoError>
                        <span>
                          {enlacesDe(a).length
                            ? t('confirmar_papelera_enlaces', '¿Enviar «{n}» a la papelera? Está enlazada en: {c}. Los enlaces dejarán de verse.')
                              .replace('{n}', a.nombre_original).replace('{c}', enlacesDe(a).map((e) => rutaDe(e.categoria_id)).join(', '))
                            : t('confirmar_papelera', '¿Enviar «{n}» a la papelera?').replace('{n}', a.nombre_original)}
                        </span>
                        <span className="mt-2 flex gap-2">
                          <button type="button" onClick={confirmarPapelera} className={`rounded-lg border border-current px-3 py-1 ${MICRO}`}>{t('papelera', 'Enviar a la papelera')}</button>
                          <button type="button" onClick={() => setBorrando(null)} className={`rounded-lg border border-current px-3 py-1 ${MICRO}`}>{t('cancelar', 'Cancelar')}</button>
                        </span>
                      </AvisoError>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {enlazar && (
        <VentanaModal titulo={t('enlazar_en', 'Enlazar fotos en «{c}»').replace('{c}', enlazar.ruta.slice(1).map(nombreCat).join(' › '))} onCerrar={() => setEnlazar(null)} ancho="max-w-6xl">
          <div className="space-y-4">
            <Ayuda>{t('enlazar_ayuda', '1. Pulsa las fotos que quieres que aparezcan también en «{c}»: se marcan en verde. 2. Pulsa «Enlazar». Las fotos no se copian: en «{c}» queda un enlace a la foto original.').split('{c}').join(enlazar.ruta.slice(1).map(nombreCat).join(' › '))}</Ayuda>
            {!candidatas.length && <p className="text-base font-bold">{t('nada_para_enlazar', 'No hay más fotos para enlazar.')}</p>}
            {candidatas.map(({ x, fotos }) => (
              <section key={x.c.id} className="space-y-2">
                <h4 className="text-base font-black text-on-surface1">{`${x.nivel === 0 ? nombreCat(x.c) : x.ruta.slice(1).map(nombreCat).join(' › ')} (${fotos.length})`}</h4>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {fotos.map((a) => {
                    const sel = marcadas.has(a.id);
                    return (
                      <div key={a.id} className="space-y-1">
                      <button type="button" aria-pressed={sel}
                        onClick={() => setMarcadas((m) => { const n = new Set(m); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })}
                        className={`relative block aspect-square w-full overflow-hidden rounded-xl border-4 ${sel ? 'border-success' : 'border-border'} bg-surface2`}>
                        <Miniatura a={a} url={urls[a.id]} t={t} />
                        {/* Casilla siempre visible: vacía = sin marcar; verde con ✓ = marcada para enlazar. */}
                        <span className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border-2 ${sel ? 'border-success bg-success text-on-success' : 'border-border bg-surface1 text-transparent'}`}><Check size={18} /></span>
                      </button>
                      <span className="block cursor-text select-text truncate text-xs font-bold text-on-background">{a.nombre_original}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEnlazar(null)}>{t('cancelar', 'Cancelar')}</Button>
              <Button type="button" leftIcon={<Link2 size={16} />} disabled={!marcadas.size || ocupado} loading={ocupado} onClick={enlazarMarcadas}>
                {t('enlazar_n', 'Enlazar ({n})').replace('{n}', marcadas.size)}
              </Button>
            </div>
          </div>
        </VentanaModal>
      )}

      {completa && (
        <PantallaCompleta items={completa.items} indice={completa.indice} archivos={archivosVisor} t={t}
          setIndice={(f) => setCompleta((c) => ({ ...c, indice: typeof f === 'function' ? f(c.indice) : f }))}
          onCerrar={() => setCompleta(null)} onDescargar={descargar} />
      )}
    </div>
  );
}
