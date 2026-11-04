/**
 * SemaforoSubidas — semáforo de la subida diferida a R2 (01/11/2026, petición del usuario).
 *
 * En la barra de arriba. Sin archivos pendientes no se ve nada. Con pendientes: punto rojo con
 * el número (parpadea mientras reintenta). Al pulsarlo, la lista (archivo, cuándo se guardó,
 * intentos, último error), el último y el siguiente intento y «Reintentar ahora».
 * Se actualiza cada minuto y al momento cuando una pantalla avisa con el evento
 * «subidas-pendientes-cambiadas» (p. ej. tras subir documentos).
 *
 * API: GET /files/pendientes · POST /files/pendientes/reintentar (BACKEND/services/subidaDiferida.js)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudOff, RotateCcw, X } from 'lucide-react';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';

const INTERVALO_MS = 60 * 1000;
export const EVENTO_PENDIENTES = 'subidas-pendientes-cambiadas';

const hora = (v) => {
  if (!v) return '';
  const d = new Date(String(v).includes('T') ? v : String(v).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// Pestaña de la ficha donde se ve cada grupo de tipos (la raíz de la cadena); el resto, «Documentos».
// Facturas, Multimedia y Contratos ya se llaman como su pestaña: no se repite.
const SIN_PESTANA = ['FACTURAS_PERIODICAS', 'FOTOS', 'CONTRATOS_ALQUILER'];
// Pestaña de la ficha de la propiedad que se abre al pulsar la ruta.
const PESTANA_DE_RAIZ = { FACTURAS_PERIODICAS: 'facturas', FOTOS: 'multimedia', CONTRATOS_ALQUILER: 'contratos' };
const PESTANA_DE_OBJETO = { im_space: 'espacios', im_communication: 'comunicaciones' };
// Otras pantallas (sin abrir la ficha concreta).
const PANTALLA_DE_OBJETO = { m_party: '/gestion/terceros/todos', m_company: '/gestion/empresas', x_company_partner: '/gestion/empresas' };

export default function SemaforoSubidas() {
  const { t } = useTmTr('SubidaDiferida');
  const { t: tc } = useTmTr('CategoriaArchivo');
  const navegar = useNavigate();
  /** «Documentos › Otros documentos» (01/11/2026): la pestaña y la cadena de tipos, traducida. */
  const carpetaDe = (a) => {
    const cadena = (a.carpetas || []).map((c) => tc(c.codigo, c.nombre));
    const raiz = a.carpetas?.[0]?.codigo;
    // Ruta completa (01/11/2026): el objeto (p. ej. la propiedad) › la pestaña › los tipos.
    return [a.objeto?.nombre, !SIN_PESTANA.includes(raiz) && t('documentos', 'Documentos'), ...cadena].filter(Boolean).join(' › ');
  };
  /** Abre la pantalla (y en las propiedades, la ficha en su pestaña) donde está el documento. */
  const destinoDe = (a) => {
    const o = a.objeto || {};
    if (o.propiedad_id) {
      const pestana = PESTANA_DE_OBJETO[o.tabla] || PESTANA_DE_RAIZ[a.carpetas?.[0]?.codigo] || 'documentos';
      return `/cartera/propiedades?id=${o.propiedad_id}&pestana=${pestana}`;
    }
    return PANTALLA_DE_OBJETO[o.tabla] || null;
  };
  const ir = (a) => { const d = destinoDe(a); if (!d) return; setAbierto(false); navegar(d); };
  const [datos, setDatos] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const contenedor = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const r = await apiFetch('/files/pendientes', { headers: authHeaders() });
      const b = await r.json();
      if (b.success) setDatos(b.data);
    } catch { /* sin red: se vuelve a probar en un minuto */ }
  }, []);

  useEffect(() => {
    cargar();
    const reloj = window.setInterval(cargar, INTERVALO_MS);
    window.addEventListener(EVENTO_PENDIENTES, cargar);
    return () => { window.clearInterval(reloj); window.removeEventListener(EVENTO_PENDIENTES, cargar); };
  }, [cargar]);

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (ev) => { if (contenedor.current && !contenedor.current.contains(ev.target)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  const reintentar = async () => {
    setReintentando(true);
    try {
      const r = await apiFetch('/files/pendientes/reintentar', { method: 'POST', headers: authHeaders() });
      const b = await r.json();
      if (b.success) setDatos(b.data);
    } catch { /* se ve en el último error */ }
    finally { setReintentando(false); }
  };

  const total = datos?.total || 0;
  if (!total && !abierto) return null;   // sin pendientes no se muestra nada

  const ocupado = reintentando || datos?.procesando;
  const texto = t('pendientes', '{n} archivo(s) pendiente(s) de subir').replace('{n}', total);

  return (
    <div className="relative" ref={contenedor}>
      <button type="button" onClick={() => setAbierto((a) => !a)} aria-label={texto}
        className="relative grid h-9 min-w-9 place-items-center rounded-full border-2 border-on-destructive bg-destructive px-2 text-sm font-black text-on-destructive">
        <span className={ocupado ? 'animate-pulse' : ''}>{total}</span>
      </button>

      {abierto && (
        <div role="dialog" aria-label={t('titulo', 'Archivos pendientes de subir')}
          className="absolute right-0 z-50 mt-2 flex max-h-[calc(70vh-2.5rem)] w-[400px] flex-col rounded-xl border-2 border-border bg-surface1 text-on-surface1 shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <CloudOff size={18} />
            <h2 className="flex-1 text-sm font-black">{t('titulo', 'Archivos pendientes de subir')}</h2>
            <button type="button" onClick={() => setAbierto(false)} aria-label={t('cerrar', 'Cerrar')}
              className="rounded-md p-1 transition-colors hover:bg-surface-hover hover:text-on-surface-hover"><X size={18} /></button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3 text-xs font-bold">
            {total ? <>
              <p className="shrink-0">{t('explicacion', 'No hay conexión con el almacenamiento (Cloudflare R2). Estos archivos están guardados en el ordenador y se pueden ver; se subirán solos cuando vuelva la conexión.')}</p>
              {/* Si no caben, la lista se desplaza en vertical (barra propia). */}
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {datos.archivos.map((a) => (
                  <li key={a.id} className="rounded-lg border border-border px-3 py-2">
                    <p className="select-text truncate text-sm font-black">{a.nombre_original}</p>
                    {destinoDe(a)
                      ? <button type="button" onClick={() => ir(a)} className="block w-full break-words text-left underline-offset-2 hover:underline">{carpetaDe(a)}</button>
                      : <p className="select-text break-words">{carpetaDe(a)}</p>}
                  </li>
                ))}
              </ul>
              <p className="shrink-0">{t('ultimo_intento', 'Último intento')}: {hora(datos.ultimo_intento) || '—'} · {t('siguiente_intento', 'Siguiente intento')}: {hora(datos.siguiente_intento) || '—'}</p>
            </> : <p>{t('todo_subido', 'Ya se han subido todos.')}</p>}
            {total > 0 && (
              <button type="button" onClick={reintentar} disabled={ocupado}
                className="inline-flex shrink-0 self-start items-center gap-2 rounded-lg border-2 border-border px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-colors hover:bg-surface-hover hover:text-on-surface-hover disabled:opacity-50">
                <RotateCcw size={14} className={ocupado ? 'animate-spin' : ''} />
                {ocupado ? t('reintentando', 'Reintentando…') : t('reintentar', 'Reintentar ahora')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
