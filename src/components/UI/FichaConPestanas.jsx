/**
 * FichaConPestanas — ventana de ficha con pestañas (01/10/2026, fase 1).
 *
 * Pieza genérica del Plan core inmobiliaria: propiedades, unidades, contratos…
 * comparten la misma forma: un título, unas pestañas y el contenido de la
 * activa. Las pestañas que necesitan un registro ya guardado (Espacios,
 * Documentos) se marcan con `requiereGuardado` y se ven desactivadas al crear.
 *
 *   <FichaConPestanas
 *     titulo="Pasaje Oliveras" onCerrar={...}
 *     pestanas={[{ id: 'datos', etiqueta: 'Datos', contenido: <...> },
 *                { id: 'docs', etiqueta: 'Documentos', requiereGuardado: true, contenido: <...> }]}
 *     guardado={Boolean(id)} />
 */
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function FichaConPestanas({ titulo, subtitulo, pestanas, guardado = true, inicial, onCerrar, etiquetaCerrar = 'Cerrar', ancho = 'max-w-5xl' }) {
  const [activa, setActiva] = useState(inicial || pestanas[0]?.id);
  useEffect(() => { if (!pestanas.some((p) => p.id === activa)) setActiva(pestanas[0]?.id); }, [pestanas, activa]);
  const actual = pestanas.find((p) => p.id === activa);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className={`animate-in zoom-in-95 flex max-h-[92vh] w-full ${ancho} flex-col overflow-hidden rounded-3xl border border-border bg-surface1 shadow-2xl duration-200`}>
        <div className="flex items-start justify-between gap-4 border-b border-border bg-surface2 px-6 pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black leading-none tracking-tight text-on-background">{titulo}</h2>
            {subtitulo && <p className="mt-2 text-xs font-bold uppercase tracking-widest text-on-surface2">{subtitulo}</p>}
            <div role="tablist" className="tab-bar mt-4">
              {pestanas.map((p) => {
                const desactivada = p.requiereGuardado && !guardado;
                return (
                  <button
                    key={p.id} type="button" role="tab" aria-selected={p.id === activa} disabled={desactivada}
                    title={desactivada ? p.ayudaDesactivada : undefined}
                    onClick={() => setActiva(p.id)}
                    /* Colores de pestaña del tema (styles/utilities.css, 03/10/2026). */
                    className={`tab-base ${!desactivada && p.id === activa ? 'tab-active' : ''}`}
                  >
                    {p.etiqueta}{p.contador != null ? ` · ${p.contador}` : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <button type="button" onClick={onCerrar} aria-label={etiquetaCerrar} className="mt-1 rounded-full p-2 text-on-surface2 transition-colors hover:bg-surface-hover hover:text-on-surface-hover"><X size={20} /></button>
        </div>
        <div role="tabpanel" className="tab-content custom-scrollbar flex-1 overflow-y-auto rounded-none border-0 p-6">{actual?.contenido}</div>
      </div>
    </div>
  );
}
