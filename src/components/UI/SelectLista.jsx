/**
 * SelectLista — desplegable propio que NUNCA se sale de la ventana (06/10/2026).
 *
 * La lista de un <select> del navegador la pinta el sistema y no se le puede
 * limitar la altura: con muchas opciones bajaba fuera de la pantalla. Aquí la
 * lista se abre hacia abajo (o hacia arriba si abajo no cabe), se limita al
 * hueco que queda en la ventana y se desplaza con la barra o con la rueda.
 *
 * Teclado: flechas, Inicio/Fin, Re Pág/Av Pág, Intro o Espacio para elegir,
 * Esc para cerrar, y escribir letras salta a la opción que empieza así.
 *
 *   <SelectLista id="x" value={v} onChange={setV} opciones={[{ value: '', label: 'Todos' }, ...]} />
 */
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

const MARGEN = 12;        // separación con el borde de la ventana
const MINIMO = 160;       // por debajo de esto, mejor abrir hacia arriba

export default function SelectLista({ id, value, onChange, opciones = [], className = '', ariaLabel, disabled = false }) {
  const auto = useId();
  const idLista = `${id || auto}-lista`;
  const boton = useRef(null);
  const lista = useRef(null);
  const busqueda = useRef({ texto: '', hasta: 0 });
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(0);
  const [pos, setPos] = useState(null);

  const elegida = Math.max(0, opciones.findIndex((o) => String(o.value) === String(value)));

  const colocar = () => {
    const r = boton.current?.getBoundingClientRect();
    if (!r) return;
    const abajo = window.innerHeight - r.bottom - MARGEN;
    const arriba = r.top - MARGEN;
    const haciaArriba = abajo < MINIMO && arriba > abajo;
    setPos({ left: r.left, width: r.width, ...(haciaArriba ? { bottom: window.innerHeight - r.top + 4, maxHeight: arriba - 4 } : { top: r.bottom + 4, maxHeight: abajo - 4 }) });
  };

  const abrir = () => { if (disabled) return; setActiva(elegida); colocar(); setAbierta(true); };
  const cerrar = (devolverFoco = true) => { setAbierta(false); if (devolverFoco) boton.current?.focus(); };
  const elegir = (i) => { const o = opciones[i]; if (o && !o.disabled) onChange?.(o.value); cerrar(); };

  // Recolocar al hacer scroll o cambiar el tamaño; cerrar al pulsar fuera.
  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (e) => { if (!boton.current?.contains(e.target) && !lista.current?.contains(e.target)) cerrar(false); };
    const mover = (e) => { if (lista.current?.contains(e.target)) return; colocar(); };
    document.addEventListener('mousedown', fuera);
    window.addEventListener('resize', colocar);
    window.addEventListener('scroll', mover, true);
    return () => { document.removeEventListener('mousedown', fuera); window.removeEventListener('resize', colocar); window.removeEventListener('scroll', mover, true); };
  }, [abierta]); // eslint-disable-line react-hooks/exhaustive-deps

  // La opción activa siempre a la vista.
  useLayoutEffect(() => {
    if (!abierta) return;
    lista.current?.querySelector(`[data-i="${activa}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [abierta, activa, pos]);

  const mover = (d) => setActiva((a) => Math.min(opciones.length - 1, Math.max(0, a + d)));
  const teclado = (e) => {
    if (disabled) return;
    if (!abierta) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    const pagina = Math.max(1, Math.floor((lista.current?.clientHeight || 300) / 36));
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); mover(1); break;
      case 'ArrowUp': e.preventDefault(); mover(-1); break;
      case 'PageDown': e.preventDefault(); mover(pagina); break;
      case 'PageUp': e.preventDefault(); mover(-pagina); break;
      case 'Home': e.preventDefault(); setActiva(0); break;
      case 'End': e.preventDefault(); setActiva(opciones.length - 1); break;
      case 'Enter': case ' ': e.preventDefault(); elegir(activa); break;
      case 'Escape': e.preventDefault(); cerrar(); break;
      case 'Tab': cerrar(false); break;
      default:
        if (e.key.length === 1) {
          const ahora = Date.now();
          const b = busqueda.current;
          b.texto = (ahora < b.hasta ? b.texto : '') + e.key.toLowerCase(); b.hasta = ahora + 700;
          const i = opciones.findIndex((o) => String(o.label).toLowerCase().startsWith(b.texto));
          if (i >= 0) setActiva(i);
        }
    }
  };

  return (
    <>
      <button
        ref={boton} id={id} type="button" disabled={disabled}
        role="combobox" aria-haspopup="listbox" aria-expanded={abierta} aria-controls={idLista} aria-label={ariaLabel}
        aria-activedescendant={abierta ? `${idLista}-${activa}` : undefined}
        onClick={() => (abierta ? cerrar() : abrir())} onKeyDown={teclado}
        className={`flex items-center gap-3 text-left ${className}`}
      >
        <ChevronDown size={16} strokeWidth={2.5} className={`shrink-0 transition-transform ${abierta ? 'rotate-180' : ''}`} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{opciones[elegida]?.label}</span>
      </button>
      {abierta && pos && createPortal(
        <ul
          ref={lista} id={idLista} role="listbox" tabIndex={-1}
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight, zIndex: 1000 }}
          className="custom-scrollbar overflow-y-auto overscroll-contain rounded-xl border border-border bg-background py-1 text-sm font-bold text-on-background shadow-2xl"
        >
          {opciones.map((o, i) => (
            <li
              key={`${o.value}-${i}`} id={`${idLista}-${i}`} data-i={i} role="option" aria-selected={i === elegida} aria-disabled={o.disabled || undefined}
              onMouseEnter={() => setActiva(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(i)}
              className={`cursor-pointer px-4 py-2 ${i === activa ? 'bg-surface-hover text-on-surface-hover' : ''} ${i === elegida ? 'font-black underline underline-offset-4' : ''} ${o.disabled ? 'opacity-60' : ''}`}
            >
              {o.label}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
}
