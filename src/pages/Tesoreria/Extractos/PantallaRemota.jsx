/**
 * PantallaRemota.jsx — el navegador del servidor, dentro de la web (27/09/2026).
 *
 * Cuando el backend es el de producción no hay monitor: la grabación abre
 * Chrome en una pantalla virtual del servidor y aquí se ve y se maneja con
 * noVNC (ratón y teclado). La conexión es un WebSocket al propio backend
 * (`/pantalla/ws`) con un permiso de un solo uso que se pide justo antes.
 * Ver BACKEND/services/pantallaRemota.js.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Scan, ZoomIn } from 'lucide-react';
import RFB from '@novnc/novnc';
import { apiFetch, authHeaders } from '../../../services/api';
import { useTmTr } from '../../../contexts/TmTrContext';

const urlWebSocket = (ruta) => {
  const base = import.meta.env.VITE_API_URL || window.location.origin;
  return base.replace(/^http/, 'ws').replace(/\/$/, '') + ruta;
};

/**
 * Abre la pantalla remota en una ventana aparte del navegador, a todo el
 * tamaño del monitor (27/09/2026). Si ya está abierta, la trae delante.
 */
export const abrirPantallaRemota = () => {
  const ancho = window.screen?.availWidth || 1400;
  const alto = window.screen?.availHeight || 1000;
  const ventana = window.open('/pantalla-remota', 'alkim-pantalla-remota',
    `popup,width=${ancho},height=${alto},left=0,top=0`);
  ventana?.focus();
  return ventana;
};

const PantallaRemota = ({ onTerminada = null }) => {
  const { t } = useTmTr('Extractos');
  const marco = useRef(null);
  const caja = useRef(null);
  const rfbRef = useRef(null);
  const [estado, setEstado] = useState('conectando'); // conectando | conectada | error
  const [mensaje, setMensaje] = useState('');
  // Ajustada al panel (se ve entera, más pequeña) o a tamaño real (se ve
  // nítida y grande, con barras de desplazamiento): los captchas son
  // diminutos al ajustar.
  const [ajustada, setAjustada] = useState(true);
  const [completa, setCompleta] = useState(false);
  const ajustadaRef = useRef(true);
  ajustadaRef.current = ajustada;

  useEffect(() => { if (rfbRef.current) rfbRef.current.scaleViewport = ajustada; }, [ajustada]);
  useEffect(() => {
    const cambio = () => setCompleta(document.fullscreenElement === caja.current);
    document.addEventListener('fullscreenchange', cambio);
    return () => document.removeEventListener('fullscreenchange', cambio);
  }, []);
  const pantallaCompleta = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else caja.current?.requestFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    let rfb = null;
    let vivo = true;
    let reintento = null;
    let yaConecto = false;

    const conectar = async () => {
      if (!vivo) return;
      setEstado('conectando');
      try {
        const r = await apiFetch('/crawler/pantalla/permiso', { method: 'POST', headers: authHeaders() });
        const cuerpo = await r.json().catch(() => ({}));
        // 409 = ya no hay grabación abierta. Si ya se había visto, ha terminado.
        if (r.status === 409 && yaConecto && onTerminada) { onTerminada(); return; }
        if (!r.ok || !cuerpo.success) throw new Error(cuerpo.message || `Error ${r.status}`);
        if (!vivo) return;
        rfb = new RFB(marco.current, urlWebSocket(cuerpo.data.ruta));
        rfbRef.current = rfb;
        rfb.scaleViewport = ajustadaRef.current; // la pantalla del servidor cabe en el panel
        rfb.resizeSession = false;    // y no cambia de tamaño: el guion se graba a esa medida
        rfb.focusOnClick = true;
        rfb.addEventListener('connect', () => { yaConecto = true; setEstado('conectada'); setMensaje(''); rfb.focus(); });
        rfb.addEventListener('disconnect', () => {
          rfb = null;
          rfbRef.current = null;
          if (!vivo) return;
          // Se reintenta: el navegador puede tardar un poco en abrirse.
          setEstado('conectando');
          reintento = window.setTimeout(conectar, 2000);
        });
      } catch (error) {
        if (!vivo) return;
        setEstado('error');
        setMensaje(error.message);
        reintento = window.setTimeout(conectar, 3000);
      }
    };

    conectar();
    return () => {
      vivo = false;
      window.clearTimeout(reintento);
      if (rfb) rfb.disconnect();
    };
  }, []);

  const boton = 'flex items-center gap-1 rounded border border-border bg-surface1 px-2 py-1 text-xs text-on-surface1 hover:bg-surface-hover';
  return (
    <div ref={caja} className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-background">
      <div ref={marco} className="h-full w-full" />
      <div className="absolute right-2 top-2 z-10 flex gap-2">
        <button type="button" className={boton} onClick={() => setAjustada((a) => !a)}
          title={ajustada ? t('remote_screen_real_hint', 'Ver a tamaño real: más grande y nítido, con barras para desplazarse') : t('remote_screen_fit_hint', 'Ver la pantalla entera, ajustada al panel')}>
          {ajustada ? <ZoomIn size={14} /> : <Scan size={14} />}
          {ajustada ? t('remote_screen_real', 'Tamaño real') : t('remote_screen_fit', 'Ajustar')}
        </button>
        <button type="button" className={boton} onClick={pantallaCompleta}
          title={t('remote_screen_fullscreen_hint', 'Pantalla completa (Esc para salir)')}>
          {completa ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {completa ? t('remote_screen_exit_fullscreen', 'Salir') : t('remote_screen_fullscreen', 'Pantalla completa')}
        </button>
      </div>
      {estado !== 'conectada' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-on-background">
          <span>{estado === 'error'
            ? t('remote_screen_error', 'No se puede conectar con el navegador del servidor. Reintentando…')
            : t('remote_screen_connecting', 'Conectando con el navegador del servidor…')}</span>
          {mensaje && <span className="text-xs opacity-70">{mensaje}</span>}
        </div>
      )}
    </div>
  );
};

export default PantallaRemota;
