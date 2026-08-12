/**
 * filesService.js
 * Servicio frontend para gestión de archivos (Cloudflare R2)
 *
 * BBDD  — No accede a BD directamente.
 * BACKEND — Llama a los endpoints de filesRoutes (/files/*).
 * FRONTEND — uploadFile usa XHR para progreso real; el resto usa apiFetch.
 *            La url_publica viene calculada del backend (CONCAT en SELECT).
 */

import apiFetch, { authHeaders } from './api';

const BASE = '/files';

// ── Subir archivo ─────────────────────────────────────────────────────────────
/**
 * @param {File}     file        Objeto File del input/drop
 * @param {Object}   meta        { tabla, nombre, descripcion? }
 * @param {string}   token       Access token JWT
 * @param {Function} onProgress  callback(percent) — progreso real via XHR
 */
export async function uploadFile(file, meta = {}, token, onProgress) {
  const formData = new FormData();
  formData.append('archivo', file);
  Object.entries(meta).forEach(([k, v]) => {
    if (v !== undefined && v !== '') formData.append(k, v);
  });

  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          xhr.status >= 200 && xhr.status < 300 ? resolve(data) : reject(data);
        } catch { reject({ success: false, message: 'Error de respuesta' }); }
      };

      xhr.onerror = () => reject({ success: false, message: 'Error de red' });
      xhr.send(formData);
    });
  }

  return apiFetch(`${BASE}/upload`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    formData,
  });
}

// ── Listar archivos ───────────────────────────────────────────────────────────
export async function listFiles(params = {}, token) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString();
  const response = await apiFetch(qs ? `${BASE}?${qs}` : BASE, { headers: authHeaders(token) });
  return response.json();
}

// ── Obtener un archivo ────────────────────────────────────────────────────────
export async function getFile(id, token) {
  const response = await apiFetch(`${BASE}/${id}`, { headers: authHeaders(token) });
  return response.json();
}

// ── Actualizar descripción ────────────────────────────────────────────────────
export async function updateFileDesc(id, descripcion, token) {
  const response = await apiFetch(`${BASE}/${id}`, {
    method:  'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body:    JSON.stringify({ descripcion }),
  });
  return response.json();
}

// ── Eliminar archivo ──────────────────────────────────────────────────────────
export async function deleteFile(id, token) {
  const response = await apiFetch(`${BASE}/${id}`, {
    method:  'DELETE',
    headers: authHeaders(token),
  });
  return response.json();
}

// ── Helpers de display ────────────────────────────────────────────────────────
export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const MIME_ICON = {
  'image/jpeg':    '🖼️',
  'image/jpg':     '🖼️',
  'image/png':     '🖼️',
  'image/webp':    '🖼️',
  'application/pdf': '📄',
  'text/plain':    '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/msword': '📃',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📃',
};

export function getFileIcon(mime) {
  return MIME_ICON[mime] ?? '📎';
}
