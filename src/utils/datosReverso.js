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

const limpiar = (l) => recortarSeguro(String(l).replace(/[’`´]/g, "'").replace(/[^A-Za-zÀ-ÿÑñÇç0-9 .,'ºª/-]/g, ' ').replace(/\s+/g, ' ').trim());
// En la calle se conserva el número final («C. Mayor 2»): solo se quitan restos de 1 carácter.
const recortarSeguro = (l) => l.replace(/^([^A-Za-z0-9À-ÿ]\s*)+/, '').replace(/(\s+[^A-Za-z0-9À-ÿ])+$/, '').trim();
// Línea con sentido: sin «<», mayoría de letras y al menos una palabra de 4 letras
// en MAYÚSCULAS (el DNI imprime todo en mayúsculas; la basura del fondo, no).
const util = (l) => {
  if (l.length < 3 || l.includes('<')) return false;
  const letras = (l.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  const mayusculas = (l.match(/[A-ZÀ-ÝÑÇ]/g) || []).length;
  return letras / l.replace(/\s/g, '').length >= 0.6 && mayusculas / Math.max(1, letras) >= 0.8 && /[A-ZÀ-ÝÑÇ]{4,}/.test(l);
};

// Municipio y provincia no llevan números: fuera los restos («11 BARCELONA»).
const sinNumeros = (l) => l.replace(/\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim();

/** Texto OCR del reverso → { domicilio, municipio, provincia, nacimiento_lugar } (lo que se encuentre). */
export function leerReverso(texto) {
  const lineas = String(texto || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const iDom = lineas.findIndex((l) => /DOMIC/i.test(l));
  if (iDom < 0) return {};
  const iNac = lineas.findIndex((l, i) => i > iDom && /LUGAR|NACIM|HIJO|HIO\/A|FILL/i.test(l));
  const fin = iNac > 0 ? iNac : Math.min(lineas.length, iDom + 4);
  const bloque = [];
  // Si el OCR juntó la etiqueta y el dato en la misma línea, lo de detrás vale.
  const resto = limpiar(lineas[iDom].replace(/.*DOMIC\S*/i, ''));
  if (util(resto)) bloque.push(resto);
  for (let i = iDom + 1; i < fin; i += 1) { const l = limpiar(lineas[i]); if (util(l)) bloque.push(l); }
  // El DNI imprime el domicilio en 3 líneas: calle, municipio y provincia.
  const r = {};
  if (bloque[0]) r.domicilio = bloque[0];
  if (bloque[1]) r.municipio = sinNumeros(bloque[1]);
  if (bloque[2]) r.provincia = sinNumeros(bloque[2]);
  if (iNac > 0 && /LUGAR|NACIM/i.test(lineas[iNac])) {
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
