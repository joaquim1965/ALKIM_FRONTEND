/**
 * direccion.js — reparte una dirección escrita de una vez en sus campos (05/10/2026).
 *
 *   «C/Miquel Romeu, 39 2º2ª»  → { tipo_via: 'CL', via: 'Miquel Romeu', numero: '39', planta: '2', puerta: '2' }
 *   «Av. Pau Casals 5, esc. B, 3º 1ª» → { tipo_via: 'AV', via: 'Pau Casals', numero: '5', escalera: 'B', planta: '3', puerta: '1' }
 *   «Calle Horta 225, bajos 2» → { tipo_via: 'CL', via: 'Horta', numero: '225', planta: 'Bajos', puerta: '2' }
 *
 * Los códigos de tipo de vía son los de Hacienda (modelos 100, 180, 347).
 * Lo usa pages/Cartera/PropiedadesPage.jsx al salir del campo «Calle».
 */

export const TIPOS_VIA = [
  ['CL', 'Calle'], ['AV', 'Avenida'], ['PZ', 'Plaza'], ['PS', 'Paseo'], ['RB', 'Rambla'], ['RD', 'Ronda'],
  ['TR', 'Travesía'], ['PJ', 'Pasaje'], ['CM', 'Camino'], ['CR', 'Carretera'], ['GV', 'Gran Vía'],
  ['UR', 'Urbanización'], ['BO', 'Barrio'], ['PG', 'Polígono'], ['OT', 'Otro'],
];

// Abreviaturas habituales (castellano y catalán) → código. El orden importa: las largas antes.
const PREFIJOS = [
  [/^(gran\s+v[ií]a|g\.?\s*v[ií]a)\b\.?\s*/i, 'GV'],
  [/^(calle|carrer|c\/|c\.\s|cl\.?\s|c\s+(?=[a-záéíóúàèòç]))\s*/i, 'CL'],
  [/^(avenida|avinguda|avda\.?|av\.?|avd\.?)\s*/i, 'AV'],
  [/^(plaza|pla[çc]a|pza\.?|pl\.?)\s+/i, 'PZ'],
  [/^(paseo|passeig|p[ºo]\.?|pg\.?|ps\.?)\s+/i, 'PS'],
  [/^(rambla|rbla\.?)\s+/i, 'RB'],
  [/^(ronda|rda\.?)\s+/i, 'RD'],
  [/^(traves[ií]a|travessera|trav\.?)\s+/i, 'TR'],
  [/^(pasaje|passatge|ptge\.?|pje\.?)\s+/i, 'PJ'],
  [/^(camino|cam[ií]|cno\.?)\s+/i, 'CM'],
  [/^(carretera|ctra\.?|crta\.?)\s+/i, 'CR'],
  [/^(urbanizaci[oó]n|urbanitzaci[oó]|urb\.?)\s+/i, 'UR'],
  [/^(barrio|barri|bo\.?)\s+/i, 'BO'],
  [/^(pol[ií]gono|pol\.?)\s+/i, 'PG'],
];

// Plantas con nombre
const PLANTAS = [
  [/^(bajos?|bj\.?|baixos?|pb|planta\s+baja)$/i, 'Bajos'],
  [/^(entresuelo|entlo\.?|entl\.?|entresol|en)$/i, 'Entresuelo'],
  [/^(principal|pral\.?|pr)$/i, 'Principal'],
  [/^([aá]tico|[aà]tic|at)$/i, 'Ático'],
  [/^(sobre[aá]tico|sobre[aà]tic|sat)$/i, 'Sobreático'],
  [/^(s[oó]tano|soterrani|st)$/i, 'Sótano'],
];
const nombrePlanta = (s) => (PLANTAS.find(([re]) => re.test(s)) || [null, null])[1];

const limpiar = (s) => (s || '').replace(/[ºª°]/g, '').replace(/^[\s,.\-]+|[\s,.\-]+$/g, '');

/** Devuelve solo los campos que ha sabido leer; null si no hay nada que repartir. */
export function separarDireccion(texto) {
  let resto = String(texto || '').trim().replace(/\s+/g, ' ');
  if (!resto) return null;
  const r = {};

  for (const [re, codigo] of PREFIJOS) {
    const p = resto.match(re);
    if (p) {
      r.tipo_via = codigo;
      resto = resto.slice(p[0].length);
      // «Gran Via 600»: el propio prefijo es el nombre de la vía.
      if (/^\d/.test(resto)) resto = `${p[0].trim()} ${resto}`;
      break;
    }
  }

  // Nombre de la vía: hasta la coma o hasta el primer número (o «s/n»).
  const m = resto.match(/^(.+?)(?:\s*,\s*|\s+)(?:n[ºo°]?\.?\s*)?(\d+[a-z]?|s\/n)\b(.*)$/i);
  if (!m) { if (r.tipo_via) r.via = limpiar(resto); return r.tipo_via ? r : null; }
  r.via = limpiar(m[1]);
  r.numero = m[2].toUpperCase() === 'S/N' ? 'S/N' : m[2].toUpperCase();
  let cola = m[3].trim().replace(/^[,\s]+/, '');

  const esc = cola.match(/\b(?:esc(?:alera)?\.?)\s*([a-z0-9]+)\b/i);
  if (esc) { r.escalera = esc[1].toUpperCase(); cola = cola.replace(esc[0], ' '); }
  cola = cola.replace(/\b(?:planta|piso|pl)\.?\s*/gi, '').replace(/\b(?:puerta|pta)\.?\s*/gi, ' ').trim().replace(/^[,\s]+|[,\s]+$/g, '');

  // «local 4», «tienda 2»: es la puerta, no una planta.
  const local = cola.match(/^(local|tienda|botiga|nave|parking|plaza|trastero)\.?\s*([a-z0-9]*)$/i);
  if (local) { r.puerta = `${local[1][0].toUpperCase()}${local[1].slice(1).toLowerCase()}${local[2] ? ` ${local[2].toUpperCase()}` : ''}`; cola = ''; }

  if (cola) {
    // «2º2ª», «2º 2ª», «2-2», «2 2», «2º A», «bajos 2», «ático»
    const partes = cola.replace(/[ºª°]/g, ' ').split(/[\s,\-/]+/).filter(Boolean);
    if (partes.length) {
      const p0 = nombrePlanta(partes[0]);
      r.planta = p0 || partes[0].toUpperCase();
      if (partes[1]) r.puerta = partes.slice(1).join(' ').toUpperCase();
    }
  }
  return r;
}

/** Hay algo que repartir: la calle lleva un número detrás. */
export const pareceDireccionCompleta = (texto) => /[a-záéíóúàèòç].*\d/i.test(String(texto || ''));

// ── Dirección montada (05/10/2026) ──────────────────────────────────────
const ABREV_VIA = { CL: 'C/', AV: 'Av.', PZ: 'Pl.', PS: 'Pº', RB: 'Rbla.', RD: 'Rda.', TR: 'Trav.', PJ: 'Pje.', CM: 'Cno.', CR: 'Ctra.', GV: '', UR: 'Urb.', BO: 'Bº', PG: 'Pol.', OT: '' };
const nombreVia = (c) => (TIPOS_VIA.find(([k]) => k === c) || [])[1] || '';
const ordinal = (v, letra) => (/^\d+$/.test(String(v)) ? `${v}${letra}` : v);

/** «2º 2ª», «Bajos 1», «esc. B, 3º 1ª» */
function pisoPuerta(d) {
  const piso = [d.planta && ordinal(d.planta, 'º'), d.puerta && ordinal(d.puerta, 'ª')].filter(Boolean).join(' ');
  return [d.escalera && `esc. ${d.escalera}`, piso].filter(Boolean).join(', ');
}
function calle(d, abreviada) {
  if (!d.via) return '';
  const tipo = d.tipo_via ? (abreviada ? ABREV_VIA[d.tipo_via] : nombreVia(d.tipo_via)) : '';
  // «Gran Via» ya lleva el tipo en el nombre
  const yaLoDice = tipo && d.via.toLowerCase().startsWith(tipo.toLowerCase().replace(/[./º]/g, ''));
  return `${tipo && !yaLoDice ? `${tipo}${tipo.endsWith('/') ? ' ' : ' '}` : ''}${d.via}`.replace('/ ', '/ ');
}

/** Corta, para contratos y listas: «C/ Miquel Romeu, 39, 2º 2ª». */
export function abreviarDireccion(d = {}) {
  return [calle(d, true), d.numero, pisoPuerta(d)].filter(Boolean).join(', ');
}

/** Completa: «Calle Miquel Romeu, 39, 2º 2ª, 08032 Barcelona (Barcelona)». */
export function direccionCompleta(d = {}) {
  const lugar = [d.codigo_postal, d.municipio].filter(Boolean).join(' ');
  const prov = d.provincia && d.provincia !== d.municipio ? ` (${d.provincia})` : (d.provincia ? ` (${d.provincia})` : '');
  return [calle(d, false), d.numero, pisoPuerta(d), lugar && `${lugar}${prov}`].filter(Boolean).join(', ');
}

/** La que se usa en documentos: la propia si la hay, si no la automática. */
export const direccionCorta = (d = {}) => (d.direccion_corta || '').trim() || abreviarDireccion(d);
