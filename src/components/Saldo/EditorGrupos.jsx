import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Grupos: crear, ordenar y repartir las cuentas (26/08/2026).
 *
 * Dos listas, y en ese orden:
 *
 *   1. **Todas las cuentas**, cada una con su desplegable de grupo. La que no
 *      se quiera ver se deja en «VACÍO», que no es un grupo de verdad: es la
 *      manera de decir «esta cuenta no sale en el panel». Antes había que
 *      buscarla dentro de un grupo para moverla; así están todas a la vista.
 *   2. **Los grupos**, cada uno con su número de orden delante. Ese número es
 *      el que manda: el 1 sale arriba del panel, el 2 debajo, y así.
 *
 * Todo se guarda al momento en el fichero de configuración, que sigue siendo la
 * verdad; esto es solo una manera cómoda de escribirlo.
 */
export const VACIO = 'VACÍO';
/** Lo que se lee en pantalla: «SIN GRUPO» dice mejor lo que es (26/09/2026). */
export const SIN_GRUPO = 'SIN GRUPO';

export default function EditorGrupos({ config, cuentas, t, onGuardar, guardando }) {
  const [nombre, setNombre] = useState('');
  const grupos = config?.grupos || [];

  /** El grupo donde está escrita una cuenta. Si no está en ninguno, «VACÍO». */
  const grupoDe = (clave) => {
    const suyo = grupos.find((g) => (g.cuentas || []).includes(clave));
    return suyo ? suyo.nombre : VACIO;
  };

  const guardar = (nuevos) => onGuardar({ ...config, grupos: nuevos });

  const crear = () => {
    const limpio = nombre.trim();
    if (!limpio) return;
    const repetido = grupos.some((g) => g.nombre.toLowerCase() === limpio.toLowerCase());
    if (repetido || [VACIO, SIN_GRUPO].includes(limpio.toUpperCase())) return;
    guardar([...grupos, { nombre: limpio, cuentas: [] }]);
    setNombre('');
  };

  // Al borrar un grupo sus cuentas no se pierden: se quedan en «VACÍO», o sea,
  // fuera del panel hasta que se les dé otro sitio.
  const borrar = (nombreGrupo) => guardar(grupos.filter((g) => g.nombre !== nombreGrupo));

  const mover = (clave, aGrupo) => guardar(grupos.map((g) => ({
    ...g,
    cuentas: g.nombre === aGrupo
      ? [...(g.cuentas || []).filter((c) => c !== clave), clave]
      : (g.cuentas || []).filter((c) => c !== clave),
  })));

  /** El número de orden: 1 es el primero del panel. */
  const ordenar = (nombreGrupo, numero) => {
    const destino = Math.max(1, Math.min(grupos.length, Number(numero) || 1)) - 1;
    const actual = grupos.findIndex((g) => g.nombre === nombreGrupo);
    if (actual < 0 || actual === destino) return;
    const copia = [...grupos];
    copia.splice(destino, 0, copia.splice(actual, 1)[0]);
    guardar(copia);
  };

  // Las desactivadas no se reparten: no hay nada que vigilar en una cuenta
  // apagada, y llenarían la lista de ruido.
  // Las que no tienen grupo, arriba del todo y en naranja: son las que hay que
  // colocar (26/09/2026, petición del usuario).
  // Después, por grupos y en el orden de cada grupo: es el orden del panel, y
  // las flechas ▲ ▼ lo cambian dentro del grupo (26/09/2026).
  const posicion = (clave) => {
    const gi = grupos.findIndex((g) => (g.cuentas || []).includes(clave));
    return gi < 0 ? [-1, 0] : [gi, grupos[gi].cuentas.indexOf(clave)];
  };
  const activas = cuentas.filter((c) => c.activa)
    .map((c, i) => ({ c, i, p: posicion(c.clave) }))
    .sort((a, b) => (a.p[0] - b.p[0]) || (a.p[1] - b.p[1]) || (a.i - b.i))
    .map(({ c }) => c);

  /** La vecina de arriba (-1) o de abajo (+1) en el mismo grupo, de las que se ven. */
  const vecinaDe = (clave, paso) => {
    const g = grupoDe(clave);
    if (g === VACIO) return null;
    const mismas = activas.filter((c) => grupoDe(c.clave) === g).map((c) => c.clave);
    return mismas[mismas.indexOf(clave) + paso] || null;
  };

  /** Subir o bajar: se intercambia con la vecina en el fichero. */
  const desplazar = (clave, paso) => {
    const vecina = vecinaDe(clave, paso);
    if (!vecina) return;
    const g = grupoDe(clave);
    guardar(grupos.map((gr) => {
      if (gr.nombre !== g) return gr;
      const lista = [...(gr.cuentas || [])];
      const a = lista.indexOf(clave);
      const b = lista.indexOf(vecina);
      [lista[a], lista[b]] = [lista[b], lista[a]];
      return { ...gr, cuentas: lista };
    }));
  };

  return (
    <div className="space-y-3 px-3 pb-3 pt-2">

      {/* 1 · Todas las cuentas, con su grupo al lado */}
      <div className="rounded-xl border-2 border-border">
        {activas.map((cuenta) => (
          <div key={cuenta.clave} className={`flex items-center gap-2 border-b border-border px-2 py-1 last:border-b-0 ${grupoDe(cuenta.clave) === VACIO ? 'bg-warning text-on-warning' : ''}`}>
            <span className="min-w-0 flex-1 truncate text-xs font-black">{cuenta.clave}</span>
            <select
              value={grupoDe(cuenta.clave)} disabled={guardando}
              onChange={(e) => mover(cuenta.clave, e.target.value)}
              aria-label={`${t('grupo_de')} ${cuenta.clave}`}
              className="w-[112px] shrink-0 cursor-pointer rounded-lg border-2 border-border bg-surface2 px-1 py-1 text-xs font-bold text-on-surface2 outline-none focus:border-primary"
            >
              <option value={VACIO}>{SIN_GRUPO}</option>
              {grupos.map((g) => <option key={g.nombre} value={g.nombre}>{g.nombre}</option>)}
            </select>
            <span className="flex shrink-0 items-center">
              <button
                type="button" disabled={guardando || !vecinaDe(cuenta.clave, -1)}
                onClick={() => desplazar(cuenta.clave, -1)}
                aria-label={`${t('subir', 'Subir')} ${cuenta.clave}`}
                className="grid h-6 w-5 place-items-center rounded hover:bg-surface2 hover:text-on-surface2 disabled:opacity-25"
              ><ChevronUp size={14} /></button>
              <button
                type="button" disabled={guardando || !vecinaDe(cuenta.clave, 1)}
                onClick={() => desplazar(cuenta.clave, 1)}
                aria-label={`${t('bajar', 'Bajar')} ${cuenta.clave}`}
                className="grid h-6 w-5 place-items-center rounded hover:bg-surface2 hover:text-on-surface2 disabled:opacity-25"
              ><ChevronDown size={14} /></button>
            </span>
          </div>
        ))}
        {!activas.length && (
          <p className="px-2 py-2 text-xs font-bold text-on-surface2">{t('sin_cuentas')}</p>
        )}
      </div>

      {/* 2 · Crear un grupo */}
      <div className="flex items-center gap-2">
        <input
          value={nombre} onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') crear(); }}
          placeholder={t('grupo_nuevo')} aria-label={t('grupo_nuevo')}
          className="min-w-0 flex-1 rounded-lg border-2 border-border bg-surface2 px-2 py-1.5 text-sm font-bold text-on-surface2 outline-none focus:border-primary"
        />
        <button
          type="button" onClick={crear} disabled={!nombre.trim() || guardando}
          title={t('grupo_crear')} aria-label={t('grupo_crear')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-success-border bg-success text-on-success transition-colors hover:border-on-surface1 disabled:opacity-40"
        >
          <Plus size={17} />
        </button>
      </div>

      {/* 3 · Los grupos, con su número de orden */}
      {grupos.map((grupo, i) => (
        <div key={grupo.nombre} className="flex items-center gap-2 rounded-xl border-2 border-border px-2 py-1.5">
          <input
            type="number" min="1" max={grupos.length} value={i + 1} disabled={guardando}
            onChange={(e) => ordenar(grupo.nombre, e.target.value)}
            aria-label={`${t('grupo_orden')}: ${grupo.nombre}`} title={t('grupo_orden')}
            className="w-11 shrink-0 rounded-lg border-2 border-border bg-surface2 px-1 py-1 text-center font-mono text-sm font-black text-on-surface2 outline-none focus:border-primary"
          />
          <span className="min-w-0 flex-1 truncate text-xs font-black uppercase tracking-widest text-success-border">
            {grupo.nombre}
          </span>
          <span className="text-[10px] font-bold text-on-surface2">
            {activas.filter((c) => grupoDe(c.clave) === grupo.nombre).length}
          </span>
          {/* Papelera: gris hasta que se pasa por encima, y entonces roja. El
              rojo avisa de que eso borra; no es un adorno. */}
          <button
            type="button" onClick={() => borrar(grupo.nombre)} disabled={guardando}
            title={t('grupo_borrar')} aria-label={`${t('grupo_borrar')}: ${grupo.nombre}`}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-border bg-surface2 text-on-surface2 transition-colors hover:border-destructive-border hover:bg-destructive hover:text-on-destructive"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {!grupos.length && (
        <p className="py-2 text-center text-xs font-bold text-on-surface2">{t('grupo_ninguno')}</p>
      )}
    </div>
  );
}
