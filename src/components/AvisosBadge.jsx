import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertCircle, Info, TriangleAlert, Check } from 'lucide-react';
import { apiFetch, authHeaders } from '../services/api';

/**
 * Indicador global de avisos.
 *
 * Existe para un caso concreto: la descarga automática de las 9:30 puede pedir
 * verificación del banco, y el modal de 2FA solo aparece si alguien tiene
 * abierta la pantalla de Extractos. A esa hora no la tiene nadie. Este
 * indicador vive en la cabecera, así que el aviso llega mires donde mires.
 *
 * Consulta cada minuto. No es tiempo real y no hace falta que lo sea: la
 * ventana para atender un 2FA son diez minutos.
 */
const INTERVALO_MS = 60 * 1000;

const ICONOS = {
  error: <AlertCircle size={16} className="text-destructive-text" />,
  aviso: <TriangleAlert size={16} className="text-warning" />,
  info: <Info size={16} className="text-info" />,
};

const AvisosBadge = () => {
  const navigate = useNavigate();
  const [contador, setContador] = useState({ total: 0, errores: 0 });
  const [avisos, setAvisos] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);

  const cargarContador = async () => {
    try {
      const respuesta = await apiFetch('/avisos/contador', { headers: authHeaders() });
      const res = await respuesta.json();
      if (res.success) setContador(res.data);
    } catch {
      // Un fallo de red no debe ensuciar la consola cada minuto.
    }
  };

  const cargarAvisos = async () => {
    try {
      const respuesta = await apiFetch('/avisos', { headers: authHeaders() });
      const res = await respuesta.json();
      if (res.success) setAvisos(res.data);
    } catch { /* silencio */ }
  };

  useEffect(() => {
    cargarContador();
    const temporizador = window.setInterval(cargarContador, INTERVALO_MS);
    return () => window.clearInterval(temporizador);
  }, []);

  // Cerrar al pulsar fuera: un panel que se queda abierto tapando la pantalla molesta.
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (evento) => {
      if (contenedor.current && !contenedor.current.contains(evento.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  const alternar = async () => {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (siguiente) await cargarAvisos();
  };

  const marcarLeido = async (avid, evento) => {
    evento.stopPropagation();
    await apiFetch(`/avisos/${avid}/leido`, { method: 'POST', headers: authHeaders() });
    setAvisos((previos) => previos.filter((a) => a.avid !== avid));
    cargarContador();
  };

  const marcarTodos = async () => {
    await apiFetch('/avisos/leidos', { method: 'POST', headers: authHeaders() });
    setAvisos([]);
    setContador({ total: 0, errores: 0 });
  };

  const abrirAviso = (aviso) => {
    if (!aviso.enlace) return;
    setAbierto(false);
    navigate(aviso.enlace);
  };

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        onClick={alternar}
        aria-label={contador.total ? `${contador.total} avisos pendientes` : 'Sin avisos'}
        className="relative rounded-lg p-2 text-on-surface1 transition-colors hover:bg-surface-hover hover:text-on-surface-hover"
      >
        <Bell size={20} />
        {contador.total > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1
              text-[10px] font-bold ${contador.errores > 0
                ? 'bg-destructive text-on-destructive animate-pulse'
                : 'bg-warning text-on-warning'}`}
          >
            {contador.total > 9 ? '9+' : contador.total}
          </span>
        )}
      </button>

      {abierto && (
        <div
          className="absolute right-0 z-50 mt-2 max-h-[70vh] w-[360px] overflow-y-auto rounded-xl
            border border-border bg-surface1 shadow-xl custom-scrollbar"
          role="dialog"
          aria-label="Avisos"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold">Avisos</h2>
            {avisos.length > 0 && (
              <button
                type="button"
                onClick={marcarTodos}
                className="text-xs underline opacity-70 hover:opacity-100"
              >
                Marcar todos como leídos
              </button>
            )}
          </div>

          {avisos.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm opacity-50">No hay avisos pendientes.</p>
          ) : (
            <ul>
              {avisos.map((aviso) => (
                <li
                  key={aviso.avid}
                  onClick={() => abrirAviso(aviso)}
                  className={`flex gap-3 border-b border-border px-4 py-3 transition-colors
                    ${aviso.enlace ? 'cursor-pointer hover:bg-surface-hover hover:text-on-surface-hover' : ''}`}
                >
                  <span className="mt-0.5 shrink-0">{ICONOS[aviso.severidad] || ICONOS.info}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{aviso.titulo}</p>
                    {aviso.mensaje && <p className="mt-0.5 text-xs opacity-75">{aviso.mensaje}</p>}
                    <p className="mt-1 text-[11px] opacity-50">
                      {new Date(aviso.creado_en).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(evento) => marcarLeido(aviso.avid, evento)}
                    title="Marcar como leído"
                    className="h-fit shrink-0 rounded p-1 opacity-50 transition-opacity hover:opacity-100"
                  >
                    <Check size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default AvisosBadge;
