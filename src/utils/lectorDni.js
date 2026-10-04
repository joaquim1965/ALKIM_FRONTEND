/**
 * lectorDni.js — reconoce el reverso de un DNI/NIE/pasaporte (04/10/2026).
 *
 * Lee con Tesseract (en el NAVEGADOR: la imagen no sale del equipo) la franja
 * inferior de la imagen y busca las líneas «<<<» (utils/mrz.js). Si cuadran
 * los dígitos de control → reverso, con sus datos (número, caducidad,
 * nacimiento, nacionalidad).
 *
 * Tesseract se sirve desde la propia web: FRONTEND/public/tesseract/
 * (tesseract.min.js, worker.min.js, núcleo .wasm.js y lang/eng.traineddata.gz).
 * Se carga solo la primera vez que hace falta.
 */
import { leerMrz } from './mrz';
import { leerReverso } from './datosReverso';

const BASE = '/tesseract';
let trabajador = null;
let trabajadorEs = null;   // español, sin lista de letras: para el domicilio

function cargarScript() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = `${BASE}/tesseract.min.js`;
    s.onload = () => ok(window.Tesseract);
    s.onerror = () => mal(new Error('No se ha podido cargar el lector de texto.'));
    document.head.appendChild(s);
  });
}

async function obtenerTrabajador() {
  if (trabajador) return trabajador;
  trabajador = (async () => {
    const T = await cargarScript();
    const w = await T.createWorker('eng', 1, {
      workerPath: `${BASE}/worker.min.js`, corePath: BASE, langPath: `${BASE}/lang`, gzip: true,
    });
    await w.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<', tessedit_pageseg_mode: '6' });
    return w;
  })();
  try { return await trabajador; } catch (e) { trabajador = null; throw e; }
}

async function obtenerTrabajadorEs() {
  if (trabajadorEs) return trabajadorEs;
  trabajadorEs = (async () => {
    const T = await cargarScript();
    return T.createWorker('spa', 1, { workerPath: `${BASE}/worker.min.js`, corePath: BASE, langPath: `${BASE}/lang`, gzip: true });
  })();
  try { return await trabajadorEs; } catch (e) { trabajadorEs = null; throw e; }
}

/** Recorte (fracción inferior `desde`..1) en gris, 1400 px de ancho y con contraste estirado. */
async function preparar(file, desde, ancho = 1400) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const y = Math.round(bmp.height * desde);
  const alto = bmp.height - y;
  const escala = ancho / bmp.width;
  const c = document.createElement('canvas');
  c.width = ancho; c.height = Math.max(1, Math.round(alto * escala));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, y, bmp.width, alto, 0, 0, c.width, c.height);
  bmp.close?.();
  const img = ctx.getImageData(0, 0, c.width, c.height); const d = img.data;
  let min = 255; let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = g; if (g < min) min = g; if (g > max) max = g;
  }
  const rango = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) { const v = ((d[i] - min) * 255) / rango; d[i] = d[i + 1] = d[i + 2] = v; }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Lee una imagen. Devuelve { valida, pareceReverso, ...datos de la MRZ }.
 * Prueba la mitad inferior y, si no sale, la imagen entera (foto con márgenes).
 */
export async function leerDocumentoIdentidad(file) {
  if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) return { valida: false, pareceReverso: false, noImagen: true };
  const w = await obtenerTrabajador();
  let mejor = { valida: false, pareceReverso: false };
  for (const desde of [0.5, 0]) {
    const { data } = await w.recognize(await preparar(file, desde));
    const r = leerMrz(data.text);
    if (r.valida) return r;
    if (r.pareceReverso) mejor = r;
  }
  return mejor;
}

/**
 * Domicilio, municipio, provincia y lugar de nacimiento del REVERSO
 * (texto libre: hay que revisarlo). Devuelve también el texto leído.
 */
export async function leerDomicilio(file) {
  if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) return {};
  const w = await obtenerTrabajadorEs();
  const { data } = await w.recognize(await preparar(file, 0, 2000));
  return { ...leerReverso(data.text), texto: data.text };
}
