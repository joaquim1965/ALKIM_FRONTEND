/**
 * ordenTipos — orden en que se ven los tipos de documento (06/10/2026).
 *
 * El catálogo trae cada tipo con su orden (orden_catalogo) y, si es subtipo,
 * el tipo bajo el que va (padre_id). Devuelve la lista plana en el orden en que
 * se pinta: cada tipo principal seguido de sus subtipos, con `nivel` 0 ó 1.
 * «Sin clasificar» (sin fila en el catálogo) queda siempre al final.
 * Solo afecta a cómo se ven: los documentos de cada tipo no cambian.
 */
export function ordenArbol(tipos = []) {
  const n = (v) => (v == null ? null : Number(v));
  const ids = new Set(tipos.map((c) => n(c.id)));
  const posicion = (c) => (c.codigo === 'SIN_CLASIFICAR' ? Infinity : Number(c.orden_catalogo ?? c.orden ?? 0));
  const ordenados = [...tipos].sort((a, b) => posicion(a) - posicion(b));
  // Un subtipo cuyo padre no está (o es a su vez subtipo) se muestra como principal.
  const padreDe = (c) => {
    const p = n(c.padre_id);
    if (p == null || p === n(c.id) || !ids.has(p)) return null;
    const padre = tipos.find((x) => n(x.id) === p);
    return padre && n(padre.padre_id) == null ? p : null;
  };
  const salida = [];
  for (const c of ordenados) {
    if (padreDe(c) != null) continue;
    salida.push({ ...c, padre_id: null, nivel: 0 });
    for (const h of ordenados) if (padreDe(h) === n(c.id)) salida.push({ ...h, padre_id: n(c.id), nivel: 1 });
  }
  return salida;
}

/**
 * Nueva lista tras soltar `idMovido` sobre `idDestino`.
 * zona: 'antes' | 'despues' (cambia el orden) · 'dentro' (lo deja de subtipo).
 * Un tipo se mueve con sus subtipos; un tipo con subtipos no puede ser subtipo.
 */
export function moverTipo(lista, idMovido, idDestino, zona) {
  const plano = ordenArbol(lista);
  const movido = plano.find((c) => c.id === idMovido);
  let destino = plano.find((c) => c.id === idDestino);
  if (!movido || !destino || movido.id === destino.id) return null;
  const tieneHijos = plano.some((c) => c.padre_id === movido.id);
  if (destino.padre_id === movido.id) return null;                         // sobre su propio subtipo
  if (zona === 'dentro' && (tieneHijos || destino.nivel === 1)) return null;
  if (tieneHijos && destino.nivel === 1) destino = plano.find((c) => c.id === destino.padre_id);   // con subtipos: solo entre principales

  const bloque = plano.filter((c) => c.id === movido.id || c.padre_id === movido.id);
  const resto = plano.filter((c) => !bloque.includes(c));
  const finDeBloque = (idPadre) => {           // índice tras el último subtipo de idPadre
    let i = resto.findIndex((c) => c.id === idPadre);
    while (i + 1 < resto.length && resto[i + 1].padre_id === idPadre) i += 1;
    return i + 1;
  };

  let i; let padre;
  if (zona === 'dentro') { padre = destino.id; i = finDeBloque(destino.id); }
  else if (destino.nivel === 1 && !tieneHijos) {
    padre = destino.padre_id;
    i = resto.findIndex((c) => c.id === destino.id) + (zona === 'despues' ? 1 : 0);
  } else {
    padre = null;
    i = zona === 'antes' ? resto.findIndex((c) => c.id === destino.id) : finDeBloque(destino.id);
  }
  const nuevos = bloque.map((c) => (c.id === movido.id ? { ...c, padre_id: padre } : c));
  resto.splice(i, 0, ...nuevos);
  return ordenArbol(resto.map((c, k) => ({ ...c, orden_catalogo: (k + 1) * 10 })));
}
