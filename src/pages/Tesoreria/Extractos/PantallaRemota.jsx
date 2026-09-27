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
import RFB from '@novnc/novnc';
import { apiFetch, authHeaders } from '../../../services/api';
import { useTmTr } from '../../../contexts/TmTrContext';

const urlWebSocket = (ruta) => {
  const base = import.meta.env.VITE_API_URL || window.location.origin;
  return base.replace(/^http/, 'ws').replace(/\/$/, '') + ruta;
};

const PantallaRemota = () => {
  const { t } = useTmTr('Extractos');
  const marco = useRef(null);
  const [estado, setEstado] = useState('conectando'); // conectando | conectada | error
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let rfb = null;
    let vivo = true;
    let reintento = null;

    const conectar = async () => {
      if (!vivo) return;
      setEstado('conectando');
      try {
        const r = await apiFetch('/crawler/pantalla/permiso', { method: 'POST', headers: authHeaders() });
        const cuerpo = await r.json().catch(() => ({}));
        if (!r.ok || !cuerpo.success) throw new Error(cuerpo.message || `Error ${r.status}`);
        if (!vivo) return;
        rfb = new RFB(marco.current, urlWebSocket(cuerpo.data.ruta));
        rfb.scaleViewport = true;     // la pantalla del servidor cabe en el panel
        rfb.resizeSession = false;    // y no cambia de tamaño: el guion se graba a esa medida
        rfb.focusOnClick = true;
        rfb.addEventListener('connect', () => { setEstado('conectada'); setMensaje(''); rfb.focus(); });
        rfb.addEventListener('disconnect', () => {
          rfb = null;
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

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-black">
      <div ref={marco} className="h-full w-full" />
      {estado !== 'conectada' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-white">
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
