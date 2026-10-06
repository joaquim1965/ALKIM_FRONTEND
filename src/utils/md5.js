/**
 * md5.js — MD5 de un archivo en el navegador (05/10/2026). crypto.subtle no
 * tiene MD5, así que va aquí (RFC 1321). Lo usa components/UI/ZonaArchivos.jsx
 * para descartar archivos repetidos (mismo nombre, tamaño y MD5).
 */
const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

/** MD5 (hex) de un ArrayBuffer / Uint8Array. */
export function md5Bytes(datos) {
  const bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  const n = bytes.length;
  const total = (((n + 8) >> 6) + 1) << 6;
  const m = new Uint8Array(total);
  m.set(bytes); m[n] = 0x80;
  const vista = new DataView(m.buffer);
  vista.setUint32(total - 8, (n * 8) >>> 0, true);
  vista.setUint32(total - 4, Math.floor(n / 0x20000000), true);
  let a0 = 0x67452301; let b0 = 0xefcdab89; let c0 = 0x98badcfe; let d0 = 0x10325476;
  const M = new Uint32Array(16);
  for (let off = 0; off < total; off += 64) {
    for (let j = 0; j < 16; j++) M[j] = vista.getUint32(off + j * 4, true);
    let A = a0; let B = b0; let C = c0; let D = d0;
    for (let i = 0; i < 64; i++) {
      let F; let g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  return [a0, b0, c0, d0].map((x) => [0, 8, 16, 24].map((s) => ((x >>> s) & 0xff).toString(16).padStart(2, '0')).join('')).join('');
}

const cache = new WeakMap();
/** MD5 de un File (se guarda para no recalcularlo). */
export async function md5Archivo(file) {
  if (!cache.has(file)) cache.set(file, file.arrayBuffer().then(md5Bytes));
  return cache.get(file);
}
