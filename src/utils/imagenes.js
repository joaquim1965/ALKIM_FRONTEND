/**
 * imagenes.js — normaliza las imágenes antes de subirlas (04/10/2026).
 *
 * Decidido con el usuario: se guarda SOLO la versión normalizada.
 *   - Lado largo máximo: 1600 px en DNI y firma (≈470 ppp sobre la tarjeta);
 *     3508 px en el resto (A4 a 300 ppp: se imprime bien).
 *   - JPEG al 85 %, girada según la foto, sin datos ocultos (GPS, móvil, fecha).
 *   - PNG con transparencia (firma): se queda PNG y se recorta el margen vacío.
 *   - PDF, Word, Excel…: no se tocan.
 */
export const LADO_DNI = 1600;
export const LADO_A4 = 3508;
const TIPOS = /^image\/(jpeg|jpg|png|webp)$/;

const tieneTransparencia = (d) => { for (let i = 3; i < d.length; i += 16) if (d[i] < 250) return true; return false; };

/** Caja de lo no transparente (para recortar el margen de una firma). */
function cajaVisible(d, w, h) {
  let x0 = w; let y0 = h; let x1 = -1; let y1 = -1;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const m = 8;
  return { x: Math.max(0, x0 - m), y: Math.max(0, y0 - m), w: Math.min(w, x1 + m + 1) - Math.max(0, x0 - m), h: Math.min(h, y1 + m + 1) - Math.max(0, y0 - m) };
}

const aBlob = (c, tipo, calidad) => new Promise((ok) => c.toBlob(ok, tipo, calidad));

/**
 * Devuelve un File nuevo normalizado (o el mismo si no es una imagen).
 * @param {File} file
 * @param {number} maxLado  lado largo máximo en píxeles
 */
export async function normalizarImagen(file, maxLado = LADO_A4) {
  if (!TIPOS.test(file.type)) return file;
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  // Primero a tamaño completo para saber si hay transparencia.
  let c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  let ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  bmp.close?.();
  let png = false;
  if (file.type === 'image/png' || file.type === 'image/webp') {
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    if (tieneTransparencia(d)) {
      png = true;
      const caja = cajaVisible(d, c.width, c.height);
      if (caja && (caja.w < c.width || caja.h < c.height)) {
        const r = document.createElement('canvas'); r.width = caja.w; r.height = caja.h;
        r.getContext('2d').drawImage(c, caja.x, caja.y, caja.w, caja.h, 0, 0, caja.w, caja.h);
        c = r;
      }
    }
  }
  const escala = Math.min(1, maxLado / Math.max(c.width, c.height));
  const salida = document.createElement('canvas');
  salida.width = Math.max(1, Math.round(c.width * escala));
  salida.height = Math.max(1, Math.round(c.height * escala));
  ctx = salida.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (!png) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, salida.width, salida.height); }
  ctx.drawImage(c, 0, 0, salida.width, salida.height);
  const blob = await aBlob(salida, png ? 'image/png' : 'image/jpeg', 0.85);
  if (!blob) return file;
  const base = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.${png ? 'png' : 'jpg'}`, { type: png ? 'image/png' : 'image/jpeg', lastModified: Date.now() });
}
