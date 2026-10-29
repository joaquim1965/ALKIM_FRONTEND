/**
 * VisorComunicacion — ver una comunicación con los inquilinos (27/10/2026).
 *
 * Dos pestañas:
 *   - «Texto» (la inicial): fecha, habitación, canal, estado… y el texto entero.
 *   - «Fotos y documentos»: la lista de adjuntos. Al pulsar una foto se ve a
 *     PANTALLA COMPLETA con ◀ ▶ (y las flechas del teclado; Esc cierra).
 *     PDF: pestaña nueva del navegador. Word/Excel: visor de la aplicación.
 *     Audios: se oyen aquí mismo.
 *
 * «Enviar por WhatsApp»: la ventana Compartir del sistema (Web Share API) con el
 * texto y TODOS los adjuntos; el grupo o la persona se elige dentro de WhatsApp.
 * Funciona en el móvil y en Windows (Chrome/Edge con la app de WhatsApp). El
 * texto se copia además al portapapeles (con varios archivos WhatsApp a veces
 * lo pierde). Si el navegador no puede compartir archivos (plan B): se
 * descargan los adjuntos y se copia el texto, para adjuntarlos con el clip.
 *
 * Los archivos se piden al backend (GET /files/:id/contenido, con permisos y
 * auditoría) al abrir el visor, para que «Enviar» funcione en el mismo clic.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, ChevronRight, X, Download, Send, Copy, Pencil, FileText, Image as ImageIcon, Music, Eye, CheckCircle2, RotateCcw,
} from 'lucide-react';
import Button from '../UI/Button';
import { VentanaEmergente } from '../UI/ZonaArchivos';
import { esOffice, VistaOffice } from '../Documentos/VisorOffice';
import { apiFetch, authHeaders } from '../../services/api';
import { claseFila, BotonFila, AvisoError, AvisoOk, MICRO } from '../UI/TemaPagina';

const esImagen = (a) => /^image\//.test(a.tipo_mime || '');
const esAudio = (a) => /^audio\//.test(a.tipo_mime || '');
const esPdf = (a) => String(a.extension || '').toLowerCase() === 'pdf' || a.tipo_mime === 'application/pdf';
const MAX_COMPARTIR = 64 * 1024 * 1024;
// Extensiones que Chrome deja compartir (lista de Chromium, share_service_impl): el resto da «Permission denied».
const EXT_COMPARTIBLES = new Set(['bmp', 'css', 'csv', 'ehtml', 'flac', 'gif', 'htm', 'html', 'ico', 'jfif', 'jpeg', 'jpg', 'm4a', 'm4v', 'mp3', 'mp4', 'mpeg', 'mpg', 'oga', 'ogg', 'ogm', 'ogv', 'opus', 'pdf', 'pjp', 'pjpeg', 'png', 'shtm', 'shtml', 'svg', 'svgz', 'text', 'tif', 'tiff', 'txt', 'wav', 'weba', 'webm', 'webp', 'xbm']);
const tamano = (b) => {
  const n = Number(b) || 0;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;
};
const fechaEs = (f) => (f ? String(f).slice(0, 10).split('-').reverse().join('/') : '');

/** Descarga un Blob con su nombre. */
function guardarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Tipos de adjunto, en el orden en que se listan y se recorren (27/10/2026).
const esVideo = (a) => /^video\//.test(a.tipo_mime || '');
export const TIPOS_ADJUNTO = [
  ['foto', esImagen, 'Fotos'],
  ['pdf', esPdf, 'PDF'],
  ['office', esOffice, 'Word / Excel'],
  ['audio', esAudio, 'Audios'],
  ['video', esVideo, 'Vídeos'],
  ['otro', () => true, 'Otros documentos'],
];
const tipoDe = (a) => TIPOS_ADJUNTO.findIndex(([, es]) => es(a));
/** Adjuntos ordenados por tipo (fotos, PDF, Word/Excel, audios, vídeos, otros) y, dentro, por nombre. */
const ordenarAdjuntos = (lista) => [...lista].sort((a, b) => tipoDe(a) - tipoDe(b)
  || String(a.nombre_original).localeCompare(String(b.nombre_original), 'es', { numeric: true }));

/**
 * Pantalla completa (27/10/2026): fotos Y documentos, en el orden de la lista.
 * Sin carrusel: en el primero no sale ◀ y en el último no sale ▶ (tampoco con el teclado).
 */
function PantallaCompleta({ items, indice, setIndice, archivos, onCerrar, onDescargar, t }) {
  const item = items[indice];
  const datos = archivos[item?.id];
  const hayAnterior = indice > 0;
  const haySiguiente = indice < items.length - 1;
  const anterior = useCallback(() => setIndice((i) => Math.max(0, i - 1)), [setIndice]);
  const siguiente = useCallback(() => setIndice((i) => Math.min(items.length - 1, i + 1)), [items.length, setIndice]);
  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); anterior(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); siguiente(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCerrar(); }
    };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [anterior, siguiente, onCerrar]);
  if (!item) return null;
  const BOTON = 'grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-border bg-surface1 text-on-surface1 transition-colors hover:bg-surface-hover hover:text-on-surface-hover';
  // El hueco de la flecha se mantiene (invisible) para que el documento no salte de sitio.
  const flecha = (visible, onClick, titulo, icono) => (
    <button type="button" onClick={onClick} disabled={!visible} aria-hidden={!visible} tabIndex={visible ? 0 : -1}
      className={`${BOTON} ${visible ? '' : 'invisible'}`} title={titulo} aria-label={titulo}>{icono}</button>
  );

  let contenido;
  if (Number(item.cifrado)) contenido = <p className="text-base font-bold">{t('cifrado', 'Archivo cifrado: descárgalo desde Documentos.')}</p>;
  else if (!datos) contenido = <p className={MICRO}>{t('cargando', 'Cargando…')}</p>;
  else if (datos.error) {
    contenido = (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface1 p-8 text-center text-on-surface1">
        <p className="text-base font-bold">{datos.error}</p>
        <Button type="button" leftIcon={<Download size={16} />} onClick={() => onDescargar(item)}>{t('descargar', 'Descargar')}</Button>
      </div>
    );
  }
  else if (esImagen(item)) contenido = <img src={datos.url} alt={item.nombre_original} className="max-h-full max-w-full rounded-xl object-contain" />;
  else if (esPdf(item)) contenido = <iframe src={datos.url} title={item.nombre_original} className="h-full w-full rounded-xl border border-border bg-surface1" />;
  else if (esAudio(item)) contenido = <audio controls autoPlay={false} src={datos.url} className="w-full max-w-2xl"><track kind="captions" /></audio>;
  else if (esVideo(item)) contenido = <video controls src={datos.url} className="max-h-full max-w-full rounded-xl"><track kind="captions" /></video>;
  else if (esOffice(item)) {
    contenido = (
      <div className="custom-scrollbar h-full w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-surface1 p-6 text-on-surface1">
        <VistaOffice key={item.id} blob={datos.blob} extension={item.extension} t={t} />
      </div>
    );
  } else {
    contenido = (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface1 p-8 text-center text-on-surface1">
        <FileText size={48} />
        <p className="text-base font-bold">{t('no_se_ve', 'Este tipo de archivo no se puede ver aquí.')}</p>
        <Button type="button" leftIcon={<Download size={16} />} onClick={() => onDescargar(item)}>{t('descargar', 'Descargar')}</Button>
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-modal-backdrop text-on-background" role="dialog" aria-modal="true" aria-label={item.nombre_original}>
      <div className="flex items-center gap-3 p-4">
        {/* La X arriba a la IZQUIERDA (28/10/2026, como el visor de facturas). */}
        <button type="button" onClick={onCerrar} className={BOTON} title={t('cerrar_esc', 'Cerrar (Esc)')} aria-label={t('cerrar', 'Cerrar')}><X size={26} /></button>
        <span className="rounded-lg border border-border bg-surface1 px-3 py-1 font-mono text-base font-black text-on-surface1">{indice + 1} / {items.length}</span>
        <span className="min-w-0 flex-1 truncate text-base font-bold">{item.nombre_original}</span>
        {datos?.blob && (
          <button type="button" onClick={() => onDescargar(item)} className={BOTON} title={t('descargar', 'Descargar')} aria-label={t('descargar', 'Descargar')}><Download size={24} /></button>
        )}
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center gap-3 px-3 pb-4">
        {items.length > 1 && flecha(hayAnterior, anterior, t('anterior', 'Anterior (←)'), <ChevronLeft size={32} />)}
        <div className="flex h-full min-w-0 flex-1 items-center justify-center">{contenido}</div>
        {items.length > 1 && flecha(haySiguiente, siguiente, t('siguiente', 'Siguiente (→)'), <ChevronRight size={32} />)}
      </div>
    </div>,
    document.body
  );
}

export default function VisorComunicacion({
  comunicacion: c, t, nombreCanal, nombreSentido, puedeEscribir, nombrePiso = '', onCerrar, onEditar, onCambiarEstado,
}) {
  const [pestana, setPestana] = useState('texto');
  const [archivos, setArchivos] = useState({});        // id → { blob, url } | { error }
  const [completa, setCompleta] = useState(null);      // índice del adjunto a pantalla completa
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const urls = useRef([]);

  // Ordenados por tipo; la pantalla completa los recorre en este mismo orden.
  const adjuntos = ordenarAdjuntos(c.adjuntos || []);
  const texto = [c.asunto, c.texto].filter(Boolean).join('\n\n');

  // Trae los adjuntos al abrir (para verlos y para poder compartirlos en el mismo clic).
  useEffect(() => {
    let vivo = true;
    const pendientes = adjuntos.filter((a) => !Number(a.cifrado));
    const traer = async (a) => {
      if (Number(a.tamanyo_bytes) > MAX_COMPARTIR) return { error: t('demasiado_grande', 'Demasiado grande para traerlo aquí: descárgalo.') };
      const r = await apiFetch(`/files/${a.id}/contenido${esImagen(a) || esAudio(a) ? '' : '?para=compartir'}`, { headers: authHeaders() });
      if (!r.ok) { const b = await r.json().catch(() => ({})); return { error: b.message || `Error ${r.status}` }; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      return { blob, url };
    };
    (async () => {
      // Las fotos primero, de tres en tres.
      const orden = [...pendientes.filter(esImagen), ...pendientes.filter((a) => !esImagen(a))];
      for (let i = 0; i < orden.length; i += 3) {
        const tanda = orden.slice(i, i + 3);
        const res = await Promise.all(tanda.map((a) => traer(a).catch((e) => ({ error: e.message }))));
        if (!vivo) return;
        setArchivos((x) => ({ ...x, ...Object.fromEntries(tanda.map((a, j) => [a.id, res[j]])) }));
      }
    })();
    return () => { vivo = false; urls.current.forEach((u) => URL.revokeObjectURL(u)); urls.current = []; };
  }, [c.id, adjuntos.map((a) => a.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const listos = adjuntos.filter((a) => archivos[a.id]?.blob);
  const fallidos = adjuntos.filter((a) => archivos[a.id]?.error || Number(a.cifrado));
  const preparando = adjuntos.length > listos.length + fallidos.length;

  const descargar = (a) => {
    const d = archivos[a.id];
    if (d?.blob) { guardarBlob(d.blob, a.nombre_original); return; }
    // Sin traer (grande o error): enlace de descarga del backend.
    apiFetch(`/files/${a.id}/descarga`, { headers: authHeaders() }).then((r) => r.json()).then((b) => {
      if (!b?.data?.url) throw new Error(b?.message || 'Error');
      const enlace = document.createElement('a'); enlace.href = b.data.url; enlace.rel = 'noopener';
      document.body.appendChild(enlace); enlace.click(); enlace.remove();
    }).catch((e) => setError(e.message));
  };

  // Ver: TODO (fotos y documentos) a pantalla completa, en el orden de la lista (27/10/2026).
  const ver = (a) => setCompleta(adjuntos.findIndex((x) => x.id === a.id));

  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setAviso(t('texto_copiado', 'Texto copiado. Pégalo en WhatsApp.')); }
    catch { setError(t('no_copia', 'El navegador no ha dejado copiar el texto.')); }
  };

  // Enviar por WhatsApp: ventana Compartir con texto + adjuntos; plan B, descargar.
  // Plan B: el texto copiado y los archivos descargados, para adjuntarlos en WhatsApp con el clip.
  const planB = (lista, extra = '') => {
    lista.forEach((a, i) => setTimeout(() => guardarBlob(archivos[a.id].blob, a.nombre_original), i * 400));
    setAviso(`${extra}${t('plan_b', 'Este navegador no puede compartir archivos. El texto está copiado y se han descargado {n} archivo(s): en WhatsApp, elige el grupo, pega el texto y adjúntalos con el clip 📎.').replace('{n}', lista.length)}`);
  };

  // Enviar por WhatsApp (27/10/2026, más robusto): ventana Compartir con texto + adjuntos.
  //  - Solo van los archivos que el navegador acepta compartir (Chrome no admite p. ej. Word);
  //    los demás se descargan para adjuntarlos a mano.
  //  - Si Compartir falla por cualquier motivo (que no sea cancelar), se pasa solo al plan B
  //    y se dice el motivo.
  const enviar = async () => {
    setError(''); setAviso('');
    // Se copia ANTES de abrir Compartir; sin await para no gastar el permiso del clic.
    navigator.clipboard?.writeText(texto).catch(() => {});
    const fichero = (a) => new File([archivos[a.id].blob], a.nombre_original, { type: a.tipo_mime || archivos[a.id].blob.type });
    const hayShare = typeof navigator.share === 'function';
    // Chrome rechaza con «Permission denied» TODO el envío si un archivo no tiene una extensión
    // de su lista (Word, Excel, HEIC, ZIP…), aunque canShare diga que sí: se filtran antes.
    const admite = (a) => EXT_COMPARTIBLES.has(String(a.nombre_original || '').split('.').pop().toLowerCase())
      && typeof navigator.canShare === 'function' && navigator.canShare({ files: [fichero(a)] });
    const aCompartir = hayShare ? listos.filter(admite) : [];
    const aDescargar = listos.filter((a) => !aCompartir.includes(a));
    const faltan = fallidos.length ? ` ${t('no_incluidos', 'No van incluidos (descárgalos aparte): {n}.').replace('{n}', fallidos.map((a) => a.nombre_original).join(', '))}` : '';
    if (!hayShare || (listos.length && !aCompartir.length)) { planB(listos, ''); if (faltan) setError(faltan.trim()); return; }
    const datos = aCompartir.length ? { text: texto, files: aCompartir.map(fichero) } : { text: texto };
    try {
      if (aCompartir.length && !navigator.canShare(datos)) throw Object.assign(new Error(t('demasiados', 'demasiados archivos o demasiado grandes para compartir de una vez')), { name: 'DataError' });
      await navigator.share(datos);
      aDescargar.forEach((a, i) => setTimeout(() => guardarBlob(archivos[a.id].blob, a.nombre_original), i * 400));
      setAviso(`${t('compartido', 'Enviado a la ventana Compartir. Si en WhatsApp no aparece el texto, pégalo: está copiado.')}${aDescargar.length ? ` ${t('descargados_aparte', 'Estos no se pueden compartir y se han descargado para adjuntarlos con el clip 📎: {n}.').replace('{n}', aDescargar.map((a) => a.nombre_original).join(', '))}` : ''}${faltan}`);
    } catch (e) {
      if (e?.name === 'AbortError') return;   // el usuario cerró la ventana Compartir
      console.warn('[Comunicaciones] Compartir:', e?.name, e?.message);
      planB(listos, `${t('no_compartir', 'No se ha podido abrir la ventana Compartir')} (${e?.message || e?.name}). `);
      if (faltan) setError(faltan.trim());
    }
  };

  const Dato = ({ etiqueta, children }) => (children ? (
    <div className="flex flex-wrap gap-x-2 text-base"><span className={`${MICRO} pt-1`}>{etiqueta}</span><span className="font-bold">{children}</span></div>
  ) : null);
  const icono = (a) => (esImagen(a) ? <ImageIcon size={20} /> : esAudio(a) ? <Music size={20} /> : <FileText size={20} />);

  return (
    <VentanaEmergente titulo={c.asunto} etiquetaCerrar={t('cerrar', 'Cerrar')} onCerrar={onCerrar} ancho="max-w-5xl" cerrarIzquierda>
      <div className="space-y-4">
        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" leftIcon={<Send size={16} />} onClick={enviar} disabled={preparando}>
            {preparando ? t('preparando', 'Preparando adjuntos…') : t('enviar_whatsapp', 'Enviar por WhatsApp')}
          </Button>
          <Button type="button" variant="secondary" leftIcon={<Copy size={16} />} onClick={copiar}>{t('copiar_texto', 'Copiar texto')}</Button>
          {puedeEscribir && (c.estado === 'ABIERTA'
            ? <Button type="button" variant="secondary" leftIcon={<CheckCircle2 size={16} />} onClick={() => onCambiarEstado('RESUELTA')}>{t('marcar_resuelta', 'Marcar como enviada')}</Button>
            : <Button type="button" variant="secondary" leftIcon={<RotateCcw size={16} />} onClick={() => onCambiarEstado('ABIERTA')}>{t('reabrir', 'Marcar como pendiente')}</Button>)}
          {puedeEscribir && <Button type="button" variant="secondary" leftIcon={<Pencil size={16} />} onClick={onEditar}>{t('editar_corto', 'Editar')}</Button>}
        </div>
        <AvisoError>{error}</AvisoError>
        <AvisoOk>{aviso}</AvisoOk>

        {/* Pestañas */}
        <div role="tablist" className="tab-bar flex gap-1">
          {[['texto', t('pestana_texto', 'Texto')], ['adjuntos', `${t('pestana_adjuntos', 'Fotos y documentos')} (${adjuntos.length})`]].map(([id, txt]) => (
            <button key={id} type="button" role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}
              className={`tab-base ${pestana === id ? 'tab-active' : ''}`}>{txt}</button>
          ))}
        </div>

        {pestana === 'texto' && (
          <div className="space-y-4">
            <div className="grid gap-2 rounded-2xl border border-border bg-surface2 p-4 text-on-surface2 sm:grid-cols-2">
              <Dato etiqueta={t('fecha', 'Fecha')}>{fechaEs(c.fecha)}</Dato>
              <Dato etiqueta={t('periodo', 'Periodo (año)')}>{c.ejercicio ? String(c.ejercicio) : ''}</Dato>
              <Dato etiqueta={t('habitacion', 'Habitación')}>{c.espacio_id ? `${c.espacio_codigo} · ${c.espacio_nombre}` : (nombrePiso || t('piso_entero_corto', 'Piso entero'))}</Dato>
              <Dato etiqueta={t('canal', 'Canal')}>{nombreCanal(c.canal)}</Dato>
              <Dato etiqueta={t('estado', 'Estado')}>{c.estado === 'ABIERTA' ? t('estado_abierta', 'Pendiente') : `${t('estado_resuelta', 'Enviada')}${c.fecha_resolucion ? ` (${fechaEs(c.fecha_resolucion)})` : ''}`}</Dato>
              <Dato etiqueta={t('contrato', 'Contrato (opcional)')}>{c.contrato_codigo || ''}</Dato>
              <Dato etiqueta={t('anotada_por', 'Anotada por')}>{c.creado_por_nombre || ''}</Dato>
            </div>
            {c.texto
              ? <div className="whitespace-pre-wrap break-words rounded-2xl border border-border p-4 text-lg leading-relaxed">{c.texto}</div>
              : <p className={MICRO}>{t('sin_texto', 'Sin texto.')}</p>}
          </div>
        )}

        {pestana === 'adjuntos' && (
          adjuntos.length === 0
            ? <p className={MICRO}>{t('sin_adjuntos', 'No tiene fotos ni documentos.')}</p>
            : (
              <ul className="overflow-hidden rounded-2xl border border-border">
                {adjuntos.map((a, i) => {
                  const d = archivos[a.id];
                  // Subtítulo de cada tipo (Fotos, PDF, Word / Excel…) delante de su primer adjunto.
                  const tipo = tipoDe(a);
                  const nuevoTipo = i === 0 || tipoDe(adjuntos[i - 1]) !== tipo;
                  const cuantos = adjuntos.filter((x) => tipoDe(x) === tipo).length;
                  const [claveTipo, , textoTipo] = TIPOS_ADJUNTO[tipo];
                  return (
                    <React.Fragment key={a.id}>
                    {nuevoTipo && (
                      <li className={`border-b border-border bg-surface2 px-4 py-1.5 text-on-surface1 ${MICRO}`}>{t(`tipo_${claveTipo}`, textoTipo)} ({cuantos})</li>
                    )}
                    <li className={claseFila(i, { clic: true })}>
                      <div className="flex flex-wrap items-center gap-3 px-4 py-2">
                        {/* Miniatura (o icono): al pulsarla, pantalla completa */}
                        <button type="button" onClick={() => ver(a)} title={t('ver_completa', 'Ver a pantalla completa')} aria-label={t('ver_completa', 'Ver a pantalla completa')}
                          className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border">
                          {esImagen(a) && d?.url ? <img src={d.url} alt="" className="h-20 w-20 object-cover" /> : icono(a)}
                        </button>
                        <button type="button" onClick={() => ver(a)} className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-base font-bold">{a.nombre_original}</span>
                          <span className="block font-mono text-sm">{tamano(a.tamanyo_bytes)}{!d && !Number(a.cifrado) ? ` · ${t('cargando', 'Cargando…')}` : ''}</span>
                          {d?.error && <span className="block text-sm font-bold">{d.error}</span>}
                        </button>
                        <span className="flex shrink-0 items-center gap-1">
                          <BotonFila icono={<Eye size={18} />} titulo={t('ver', 'Ver')} onClick={() => ver(a)} />
                          <BotonFila icono={<Download size={18} />} titulo={t('descargar', 'Descargar')} onClick={() => descargar(a)} />
                        </span>
                        {esAudio(a) && d?.url && <audio controls src={d.url} className="w-full"><track kind="captions" /></audio>}
                      </div>
                    </li>
                    </React.Fragment>
                  );
                })}
              </ul>
            )
        )}
      </div>

      {completa != null && completa >= 0 && (
        <PantallaCompleta items={adjuntos} indice={completa} setIndice={setCompleta} archivos={archivos} t={t}
          onCerrar={() => setCompleta(null)} onDescargar={descargar} />
      )}
    </VentanaEmergente>
  );
}
