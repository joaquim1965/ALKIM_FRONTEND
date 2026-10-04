/**
 * datosReverso.js — domicilio y lugar de nacimiento del reverso del DNI (04/10/2026).
 *
 * Es TEXTO LIBRE leído con el diccionario de español: menos fiable que las
 * líneas «<<<». La pantalla lo marca «revisar». Disposición del DNI español:
 *   DOMICILIO
 *   <calle y número>
 *   <municipio>
 *   <provincia>
 *   LUGAR DE NACIMIENTO
 *   <municipio>
 *   <provincia>
 *   HIJO/A DE …   EQUIPO …   y las líneas «<<<»
 */
const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'i', 'en']);

/** «C. PAU CASALS 5» → «C. Pau Casals 5»; «SANT JUST D'ESVERN» → «Sant Just d'Esvern». */
export function tituloEs(texto) {
  return String(texto || '').toLowerCase().split(' ').filter(Boolean).map((p, i) => {
    if (i > 0 && MINUSCULAS.has(p)) return p;
    const m = p.match(/^(d'|l')(.+)$/);
    if (m) return (i > 0 ? m[1] : m[1].toUpperCase()) + m[2].charAt(0).toUpperCase() + m[2].slice(1);
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
}

const limpiar = (l) => String(l).replace(/[’`´]/g, "'").replace(/[^A-Za-zÀ-ÿÑñÇç0-9 .,'ºª/-]/g, ' ').replace(/\s+/g, ' ').trim();
const util = (l) => l.length >= 3 && (l.match(/[A-Za-zÀ-ÿ]/g) || []).length >= 3 && !l.includes('<');

/** Texto OCR del reverso → { domicilio, municipio, provincia, nacimiento_lugar } (lo que se encuentre). */
export function leerReverso(texto) {
  const lineas = String(texto || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const iDom = lineas.findIndex((l) => /DOMIC/i.test(l));
  if (iDom < 0) return {};
  const iNac = lineas.findIndex((l, i) => i > iDom && /LUGAR|NACIM/i.test(l));
  const fin = iNac > 0 ? iNac : Math.min(lineas.length, iDom + 4);
  const bloque = [];
  // Si el OCR juntó la etiqueta y el dato en la misma línea, lo de detrás vale.
  const resto = limpiar(lineas[iDom].replace(/.*DOMIC\S*/i, ''));
  if (util(resto)) bloque.push(resto);
  for (let i = iDom + 1; i < fin; i += 1) { const l = limpiar(lineas[i]); if (util(l)) bloque.push(l); }
  const r = {};
  if (bloque.length >= 3) {
    r.domicilio = bloque.slice(0, bloque.length - 2).join(' ');
    r.municipio = bloque[bloque.length - 2];
    r.provincia = bloque[bloque.length - 1];
  } else if (bloque.length === 2) {
    [r.domicilio, r.municipio] = bloque;
  } else if (bloque.length === 1) {
    [r.domicilio] = bloque;
  }
  if (iNac > 0) {
    const nac = [];
    for (let i = iNac + 1; i < lineas.length && nac.length < 2; i += 1) {
      if (/HIJO|EQUIPO|</i.test(lineas[i])) break;
      const l = limpiar(lineas[i]); if (util(l)) nac.push(l);
    }
    if (nac.length) r.nacimiento_lugar = nac.join(', ');
  }
  for (const k of Object.keys(r)) r[k] = tituloEs(r[k]);
  return r;
}
