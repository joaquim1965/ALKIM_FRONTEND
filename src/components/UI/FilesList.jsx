/**
 * FilesList.jsx
 * Lista de archivos de s_files con URL pública y acciones
 *
 * BBDD  — Muestra campos de s_files. url_publica viene calculada del backend.
 * BACKEND — GET /files con filtros opcionales (tabla, page, limit).
 * FRONTEND
 *   Modo A — integrado: <FilesList tabla="contratos" /> → solo archivos de contratos.
 *   Modo B — global: <FilesList /> → todos los archivos con filtro de tabla.
 *   Botones: copiar URL, abrir en Chrome (ExternalLink), eliminar con confirmación.
 */

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Copy, Trash2, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { listFiles, deleteFile, formatBytes, getFileIcon } from '../../services/filesService';

const TABLAS = ['contratos', 'activos', 'empresas', 'clientes', 'proveedores', 'usuarios', 'tesoreria', 'general'];
const LIMIT  = 15;

export default function FilesList({ tabla: tablaProp, refreshKey = 0 }) {
  const token         = localStorage.getItem('accessToken');
  const modoIntegrado = Boolean(tablaProp);

  const [files,       setFiles]      = useState([]);
  const [total,       setTotal]      = useState(0);
  const [page,        setPage]       = useState(1);
  const [tablaFiltro, setTablaFiltro]= useState(tablaProp ?? '');
  const [loading,     setLoading]    = useState(false);
  const [error,       setError]      = useState('');
  const [copiedId,    setCopiedId]   = useState(null);
  const [deleting,    setDeleting]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: LIMIT };
      if (tablaFiltro) params.tabla = tablaFiltro;
      const res = await listFiles(params, token);
      if (res.success) {
        setFiles(res.data.rows);
        setTotal(res.data.total);
      } else {
        setError(res.message ?? 'Error al cargar');
      }
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  }, [page, tablaFiltro, token, refreshKey]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tablaFiltro]);

  const copyURL = (f) => {
    navigator.clipboard.writeText(f.url_publica);
    setCopiedId(f.id); setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (f) => {
    if (!window.confirm(`¿Eliminar "${f.uid}"?`)) return;
    setDeleting(f.id);
    try {
      const res = await deleteFile(f.id, token);
      if (res.success) load();
      else setError(res.message ?? 'Error al eliminar');
    } catch { setError('Error de conexión'); }
    finally { setDeleting(null); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="bg-surface1 border border-border rounded-xl overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface2">
        <span className="text-sm font-semibold text-on-surface1">
          Archivos <span className="text-on-surface2 font-normal">({total})</span>
        </span>
        <div className="flex items-center gap-2">
          {!modoIntegrado && (
            <select value={tablaFiltro} onChange={(e) => setTablaFiltro(e.target.value)}
              className="text-xs bg-input border border-border rounded px-2 py-1 text-on-surface1 focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Todas las tablas</option>
              {TABLAS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <button onClick={load} title="Recargar"
            className="p-1.5 rounded hover:bg-surface-hover text-on-surface2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive-text text-xs px-4 py-2 bg-destructive-bg">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {loading && files.length === 0 ? (
        <div className="text-center text-on-surface2 text-sm py-10">Cargando…</div>
      ) : files.length === 0 ? (
        <div className="text-center text-on-surface2 text-sm py-10">No hay archivos</div>
      ) : (
        <div className="divide-y divide-border">
          {files.map((f) => (
            <div key={f.id} data-speech-label={`Archivo ${f.nombre_original || f.nombre}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors">
              <span className="text-xl shrink-0">{getFileIcon(f.tipo_mime)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface1 truncate">{f.uid}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-on-surface2">{f.nombre}</span>
                  <span className="text-xs text-on-surface2">·</span>
                  <span className="text-xs text-on-surface2">{f.extension.toUpperCase()}</span>
                  <span className="text-xs text-on-surface2">·</span>
                  <span className="text-xs text-on-surface2">{formatBytes(f.tamanyo_bytes)}</span>
                  <span className="text-xs text-on-surface2">·</span>
                  <span className="text-xs text-on-surface2">
                    {new Date(f.fecha_alta).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <p className="text-xs text-link truncate mt-0.5" title={f.url_publica}>
                  {f.url_publica}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => copyURL(f)} title="Copiar URL"
                  className="p-1.5 rounded hover:bg-surface2 text-on-surface2">
                  {copiedId === f.id
                    ? <CheckCircle size={14} className="text-success-text" />
                    : <Copy size={14} />}
                </button>
                <a href={f.url_publica} target="_blank" rel="noopener noreferrer" title="Abrir archivo"
                   className="p-1.5 rounded hover:bg-surface2 text-on-surface2">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => handleDelete(f)} disabled={deleting === f.id}
                  title="Eliminar"
                  className="p-1.5 rounded hover:bg-destructive-bg text-on-surface2 hover:text-destructive-text disabled:opacity-40">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface2 text-xs text-on-surface2">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-1 rounded border border-border hover:bg-surface-hover disabled:opacity-40">← Ant</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2 py-1 rounded border border-border hover:bg-surface-hover disabled:opacity-40">Sig →</button>
          </div>
        </div>
      )}
    </div>
  );
}
