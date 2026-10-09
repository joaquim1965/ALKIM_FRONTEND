/**
 * ordenTipos — orden en que se ven los tipos de documento (06/10/2026).
 *
 * El catálogo trae cada tipo con su orden (orden_catalogo) y, si es subtipo,
 * el tipo bajo el que va (padre_id). Devuelve la lista plana en el orden en que
 * se pinta: cada tipo seguido de sus subtipos (y estos de los suyos), con
 * `nivel` = profundidad (0 = principal).
 *
 * Varios niveles (09/10/2026, petición del usuario): un subtipo puede tener sus
 * propios subtipos («DOCS DEL PISO ↳ Multimedia ↳ Atico»), hasta NIVEL_MAXIMO.
 * «Sin clasificar» (sin fila en el catálogo) queda siempre al final.
 * Solo afecta a cómo se ven: los documentos de cada tipo no cambian.
 */
export const NIVEL_MAXIMO = 5;   // 0..5: seis niveles de profundidad como mucho

const num = (v) => (v == null ? null : Number(v));

export function ordenArbol(tipos = []) {
  const porId = new Map(tipos.map((c) => [num(c.id), c]));
  const posicion = (c) => (c.codigo === 'SIN_CLASIFICAR' ? Infinity : Number(c.orden_catalogo ?? c.orden ?? 0));
  const ordenados = [...tipos].sort((a, b) => posicion(a) - posicion(b));
  // Padre válido: existe y no forma un ciclo; si no, el tipo se muestra como principal.
  const padreDe = (c) => {
    const p = num(c.padre_id);
    if (p == null || p === num(c.id) || !porId.has(p)) return null;
    const vistos = new Set([num(c.id)]);
    for (let a = p; a != null; a = num(porId.get(a)?.padre_id)) {
      if (vistos.has(a)) return null;   // ciclo
      vistos.add(a);
      if (!porId.has(a)) break;
    }
    return p;
  };
  const hijos = new Map();
  for (const c of ordenados) {
    const p = padreDe(c);
    if (!hijos.has(p)) hijos.set(p, []);
    hijos.get(p).push(c);
  }
  const salida = [];
  const recorrer = (padre, nivel) => {
    for (const c of hijos.get(padre) || []) {
      salida.push({ ...c, padre_id: padre, nivel });
      recorrer(num(c.id), nivel + 1);
    }
  };
  recorrer(null, 0);
  return salida;
}

/** Ids de un tipo y de todo lo que cuelga de él (en la lista de ordenArbol). */
export function subarbol(plano, id) {
  const ids = new Set([num(id)]);
  for (const c of plano) if (ids.has(num(c.padre_id))) ids.add(num(c.id));
  return ids;
}

/**
 * Nueva lista tras soltar `idMovido` sobre `idDestino`.
 * zona: 'antes' | 'despues' (al mismo nivel que el destino) · 'dentro' (subtipo del destino).
 * Un tipo se mueve con todos sus subtipos. No se puede soltar dentro de sí mismo
 * ni de uno de sus subtipos, ni pasar de NIVEL_MAXIMO. null = no se puede.
 */
export function moverTipo(lista, idMovido, idDestino, zona) {
  const plano = ordenArbol(lista);
  const movido = plano.find((c) => num(c.id) === num(idMovido));
  const destino = plano.find((c) => num(c.id) === num(idDestino));
  if (!movido || !destino || movido.id === destino.id) return null;
  const bloqueIds = subarbol(plano, movido.id);
  if (bloqueIds.has(num(destino.id))) return null;                       // dentro de sí mismo
  // Profundidad que ocupa el bloque movido (0 si no tiene subtipos).
  const alto = Math.max(0, ...plano.filter((c) => bloqueIds.has(num(c.id))).map((c) => c.nivel - movido.nivel));
  const nivelNuevo = zona === 'dentro' ? destino.nivel + 1 : destino.nivel;
  if (nivelNuevo + alto > NIVEL_MAXIMO) return null;

  const bloque = plano.filter((c) => bloqueIds.has(num(c.id)));
  const resto = plano.filter((c) => !bloqueIds.has(num(c.id)));
  const finDe = (id) => {                      // índice tras el último descendiente de id
    const ids = subarbol(resto, id);
    let i = resto.findIndex((c) => num(c.id) === num(id));
    while (i + 1 < resto.length && ids.has(num(resto[i + 1].id))) i += 1;
    return i + 1;
  };
  let i; let padre;
  if (zona === 'dentro') { padre = num(destino.id); i = finDe(destino.id); }
  else {
    padre = num(destino.padre_id);
    i = zona === 'antes' ? resto.findIndex((c) => num(c.id) === num(destino.id)) : finDe(destino.id);
  }
  const nuevos = bloque.map((c) => (c.id === movido.id ? { ...c, padre_id: padre } : c));
  resto.splice(i, 0, ...nuevos);
  return ordenArbol(resto.map((c, k) => ({ ...c, orden_catalogo: (k + 1) * 10 })));
}
