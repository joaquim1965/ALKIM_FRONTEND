/**
 * mrz.js — lectura de las líneas «<<<» (MRZ) de un documento de identidad (04/10/2026).
 *
 * Formato TD1 (DNI español, NIE, tarjetas): 3 líneas de 30 caracteres.
 *   1: tipo(2) país(3) nº soporte(9) control(1) opcional(15) → en el DNI, el nº de DNI va en 15..23
 *   2: nacimiento AAMMDD(6) control(1) sexo(1) caducidad AAMMDD(6) control(1) nacionalidad(3) opcional(11) control global(1)
 *   3: APELLIDO1<APELLIDO2<<NOMBRE
 * Formato TD3 (pasaporte): 2 líneas de 44.
 *
 * Solo se da por bueno si cuadran los dígitos de control de nacimiento y
 * caducidad: así no se confunde un anverso con un reverso.
 * Sin dependencias: lo usa components/Documentos/DocumentosObjeto.jsx con el
 * texto que saca Tesseract (utils/lectorDni.js).
 */

const PESOS = [7, 3, 1];
const valor = (c) => (c === '<' ? 0 : /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55);
export const digitoControl = (texto) => String([...texto].reduce((s, c, i) => s + valor(c) * PESOS[i % 3], 0) % 10);

// En campos numéricos el OCR confunde letras parecidas.
const A_NUMERO = { O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', B: '8', G: '6', T: '7' };
const numerico = (s) => [...s].map((c) => A_NUMERO[c] || c).join('');

/** Limpia una línea leída por el OCR. */
function limpiar(linea) {
  return linea.toUpperCase()
    .replace(/[«‹＜]/g, '<').replace(/\s+/g, '')
    .replace(/[^A-Z0-9<]/g, '');
}

function fecha(aammdd, futuro) {
  if (!/^\d{6}$/.test(aammdd)) return null;
  const aa = Number(aammdd.slice(0, 2));
  const actual = new Date().getFullYear() % 100;
  // Caducidad: siempre 20AA. Nacimiento: si AA es mayor que el año actual, 19AA.
  const siglo = futuro ? 2000 : (aa > actual ? 1900 : 2000);
  const mes = aammdd.slice(2, 4); const dia = aammdd.slice(4, 6);
  if (Number(mes) < 1 || Number(mes) > 12 || Number(dia) < 1 || Number(dia) > 31) return null;
  return `${siglo + aa}-${mes}-${dia}`;
}

function nombres(linea) {
  const [apellidos = '', nombre = ''] = linea.split('<<');
  const bonito = (s) => s.split('<').filter(Boolean).join(' ').toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
  return { apellidos: bonito(apellidos), nombre: bonito(nombre) };
}

/** Tipo de documento a partir del código de la MRZ y del número. */
function tipoDocumento(codigo, numero) {
  if (codigo.startsWith('P')) return 'PASAPORTE';
  if (/^[XYZ]\d{7}[A-Z]$/.test(numero || '')) return 'NIE';
  return 'DNI';
}

/** TD1 a partir de 3 líneas de ~30 caracteres. */
function leerTd1(l1, l2, l3) {
  const a = l1.padEnd(30, '<').slice(0, 30);
  const b = l2.padEnd(30, '<').slice(0, 30);
  const nac = numerico(b.slice(0, 6)); const cNac = numerico(b[6]);
  const cad = numerico(b.slice(8, 14)); const cCad = numerico(b[14]);
  if (digitoControl(nac) !== cNac || digitoControl(cad) !== cCad) return null;
  const opcional = a.slice(15, 30).replace(/<+$/, '');
  let numero = null;
  const dni = opcional.match(/^(\d{8}[A-Z])/) || opcional.match(/^([XYZ]\d{7}[A-Z])/);
  if (dni) numero = dni[1];
  else numero = a.slice(5, 14).replace(/<+$/, '') || null;   // otros países: nº del documento
  return {
    formato: 'TD1', codigo: a.slice(0, 2).replace(/<+$/, ''), pais: a.slice(2, 5),
    numero, soporte: a.slice(5, 14).replace(/<+$/, ''),
    nacimiento: fecha(nac, false), sexo: b[7] === '<' ? null : b[7], caducidad: fecha(cad, true),
    nacionalidad: b.slice(15, 18).replace(/<+$/, ''), ...nombres(l3 || ''),
    tipo_documento: tipoDocumento(a.slice(0, 2), numero),
  };
}

/** TD3 (pasaporte) a partir de 2 líneas de ~44 caracteres. */
function leerTd3(l1, l2) {
  const b = l2.padEnd(44, '<').slice(0, 44);
  const nac = numerico(b.slice(13, 19)); const cNac = numerico(b[19]);
  const cad = numerico(b.slice(21, 27)); const cCad = numerico(b[27]);
  if (digitoControl(nac) !== cNac || digitoControl(cad) !== cCad) return null;
  const numero = b.slice(0, 9).replace(/<+$/, '');
  return {
    formato: 'TD3', codigo: l1.slice(0, 2).replace(/<+$/, ''), pais: l1.slice(2, 5),
    numero, nacimiento: fecha(nac, false), sexo: b[20] === '<' ? null : b[20], caducidad: fecha(cad, true),
    nacionalidad: b.slice(10, 13).replace(/<+$/, ''), ...nombres(l1.slice(5)), tipo_documento: 'PASAPORTE',
  };
}

/**
 * Busca una MRZ válida en el texto del OCR.
 * Devuelve { valida: true, ...datos } o { valida: false, pareceReverso }.
 * `pareceReverso`: hay líneas con muchos «<» aunque no cuadren los controles.
 */
export function leerMrz(texto) {
  const lineas = String(texto || '').split(/\r?\n/).map(limpiar).filter((l) => l.length >= 20);
  for (let i = 0; i < lineas.length; i += 1) {
    if (i + 2 < lineas.length) {
      const r = leerTd1(lineas[i], lineas[i + 1], lineas[i + 2]);
      if (r) return { valida: true, ...r };
    }
    if (i + 1 < lineas.length && lineas[i].length >= 40) {
      const r = leerTd3(lineas[i], lineas[i + 1]);
      if (r) return { valida: true, ...r };
    }
    // Línea 2 de un TD1 sin la línea 1 bien leída
    if (i + 1 < lineas.length) {
      const r = leerTd1('<'.repeat(30), lineas[i], lineas[i + 1]);
      if (r) return { valida: true, ...r, numero: null };
    }
  }
  const pareceReverso = lineas.filter((l) => (l.match(/</g) || []).length >= 5).length >= 2;
  return { valida: false, pareceReverso };
}
