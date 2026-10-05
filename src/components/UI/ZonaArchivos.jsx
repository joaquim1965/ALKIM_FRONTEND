/**
 * ZonaArchivos — zona estándar para elegir archivos (03/10/2026).
 *
 * Un recuadro grande donde se pueden SOLTAR archivos arrastrados o PULSAR para
 * abrir el explorador del ordenador. Debajo, la lista de lo elegido con un
 * botón para quitar cada uno. Se usa dentro de VentanaEmergente para subir
 * documentos (components/Documentos/DocumentosObjeto.jsx).
 *
 *   <ZonaArchivos ficheros={lista} onCambio={setLista} multiple
 *     textoPrincipal="Arrastra aquí los archivos" textoSecundario="o pulsa para elegirlos" />
 */
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, X, FileText } from 'lucide-react';
import { formatTamano } from '../../utils/format';

export default function ZonaArchivos({
  ficheros = [], onCambio, multiple = true, accept,
  textoPrincipal = 'Arrastra aquí los archivos', textoSecundario = 'o pulsa para elegirlos del ordenador',
  textoQuitar = 'Quitar',
}) {
  const entrada = useRef(null);
  const [encima, setEncima] = useState(false);

  const anadir = (lista) => {
    const nuevos = [...lista];
    if (!nuevos.length) return;
    onCambio(multiple ? [...ficheros, ...nuevos] : nuevos.slice(0, 1));
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); anadir(e.dataTransfer.files); }}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors
          ${encima ? 'border-primary bg-surface-hover' : 'border-border bg-surface2 hover:border-on-background'}`}
      >
        <UploadCloud size={40} className="text-on-surface1" />
        <span className="text-base font-black tracking-tight text-on-surface1">{textoPrincipal}</span>
        <span className="text-sm font-bold text-on-surface1">{textoSecundario}</span>
      </button>
      <input
        ref={entrada} type="file" multiple={multiple} accept={accept} className="hidden"
        onChange={(e) => { anadir(e.target.files); e.target.value = ''; }}
      />
      {ficheros.length > 0 && (
        <ul className="space-y-1">
          {ficheros.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface2 px-3 py-2 text-sm font-bold text-on-surface1">
              <FileText size={16} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 font-mono text-xs">{formatTamano(f.size)}</span>
              <button type="button" aria-label={`${textoQuitar} ${f.name}`} title={textoQuitar}
                onClick={() => onCambio(ficheros.filter((_, j) => j !== i))}
                className="rounded-full p-1 hover:bg-surface-hover hover:text-on-surface-hover">
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * VentanaEmergente — popup estándar que se pinta en <body> (portal), para que
 * funcione también abierto desde DENTRO de otra ventana (la ficha con pestañas
 * usa una animación con `transform`, que encierra a los `position: fixed`).
 */
export function VentanaEmergente({ titulo, onCerrar, etiquetaCerrar = 'Cerrar', ancho = 'max-w-2xl', children }) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-modal-backdrop/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className={`flex max-h-[92vh] w-full ${ancho} flex-col overflow-hidden rounded-3xl border border-border bg-surface1 shadow-2xl`}>
        <div className="flex items-center justify-between gap-4 border-b border-border bg-surface2 p-5">
          <h2 className="truncate text-xl font-black leading-none tracking-tight text-on-background">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label={etiquetaCerrar} className="rounded-full p-2 text-on-surface2 transition-colors hover:bg-surface-hover hover:text-on-surface-hover">
            <X size={20} />
          </button>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6 text-on-surface1">{children}</div>
      </div>
    </div>,
    document.body
  );
}
