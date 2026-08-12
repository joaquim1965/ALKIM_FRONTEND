/**
 * FileUpload.jsx
 * Subida de archivos a Cloudflare R2
 *
 * BBDD  — No accede a BD. Los campos tabla + nombre forman el uid en backend.
 * BACKEND — POST /files/upload (multipart). Responde con el registro s_files completo.
 * FRONTEND
 *   Modo A — integrado en página de entidad:
 *     <FileUpload tabla="contratos" nombre="Juan García" onUploaded={fn} />
 *     Los campos tabla/nombre llegan por props y no se muestran al usuario.
 *   Modo B — standalone (panel admin):
 *     <FileUpload />
 *     El usuario escribe tabla y nombre manualmente.
 *   Drag & drop + selector. Barra de progreso real (XHR).
 *   Al completar muestra uid, url_publica copiable y botón abrir en Chrome.
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, X, ExternalLink, Copy, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { uploadFile, formatBytes, getFileIcon } from '../../services/filesService';

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.txt,.md,.rtf,.doc,.docx';
const MAX_MB   = 20;

const TABLAS_CONOCIDAS = [
  'contratos', 'activos', 'empresas', 'clientes',
  'proveedores', 'usuarios', 'tesoreria', 'general',
];

export default function FileUpload({ tabla: tablaProp, nombre: nombreProp, onUploaded }) {
  const token        = localStorage.getItem('accessToken');
  const inputRef     = useRef(null);
  const modoIntegrado = Boolean(tablaProp && nombreProp);

  const [dragging,    setDragging]    = useState(false);
  const [file,        setFile]        = useState(null);
  const [tabla,       setTabla]       = useState(tablaProp ?? '');
  const [tablaCustom, setTablaCustom] = useState('');
  const [nombre,      setNombre]      = useState(nombreProp ?? '');
  const [desc,        setDesc]        = useState('');
  const [progress,    setProgress]    = useState(0);
  const [uploading,   setUploading]   = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');
  const [copied,      setCopied]      = useState(false);

  const tablaEfectiva  = tablaProp  ?? (tabla === '__custom__' ? tablaCustom : tabla);
  const nombreEfectivo = nombreProp ?? nombre;

  // ── Selección de archivo ──────────────────────────────────────────────────
  const handleSelect = useCallback((selected) => {
    if (!selected) return;
    if (selected.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera el límite de ${MAX_MB} MB`); return;
    }
    setFile(selected); setError(''); setResult(null); setProgress(0);
    // El nombre de la entidad se propone desde el archivo, sin duplicar su extensión.
    if (!modoIntegrado && !nombre.trim()) {
      setNombre(selected.name.replace(/\.[^.]+$/, '') || selected.name);
    }
  }, [modoIntegrado, nombre]);

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => { e.preventDefault(); setDragging(false); handleSelect(e.dataTransfer.files?.[0]); };

  // ── Subida ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    if (!tablaEfectiva)  { setError('Indica la tabla'); return; }
    if (!nombreEfectivo) { setError('Indica el nombre'); return; }

    setUploading(true); setError(''); setProgress(0);
    try {
      const res = await uploadFile(
        file,
        { tabla: tablaEfectiva, nombre: nombreEfectivo, descripcion: desc || undefined },
        token,
        setProgress
      );
      if (res.success) {
        setResult(res.data);
        setFile(null);
        if (inputRef.current) inputRef.current.value = '';
        onUploaded?.(res.data);
      } else {
        setError(res.message ?? 'Error al subir');
      }
    } catch (err) {
      setError(err?.message ?? 'Error inesperado');
    } finally {
      setUploading(false);
    }
  };

  const copyURL = () => {
    navigator.clipboard.writeText(result.url_publica);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const resetAll = () => {
    setFile(null); setResult(null); setError(''); setProgress(0); setDesc('');
    if (!modoIntegrado) { setNombre(''); }
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-surface1 border border-border rounded-xl p-5 space-y-4 max-w-xl">
      <h3 className="text-on-surface1 font-semibold text-sm flex items-center gap-2">
        <Upload size={16} className="text-primary" />
        Subir archivo
        {modoIntegrado && (
          <span className="text-xs font-normal text-on-surface2 ml-1">
            → {tablaProp} / {nombreProp}
          </span>
        )}
      </h3>

      {/* Resultado exitoso */}
      {result && (
        <div className="bg-success-bg border border-success-border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-success-text font-medium text-sm">
            <CheckCircle size={16} /> Archivo subido correctamente
          </div>
          <p className="text-xs font-mono text-on-surface2 truncate">{result.uid}</p>
          <div className="flex items-center gap-2">
            <input readOnly value={result.url_publica}
              className="flex-1 text-xs bg-surface2 border border-border rounded px-2 py-1 text-on-surface2 truncate" />
            <button onClick={copyURL} title="Copiar URL"
              className="p-1.5 rounded bg-surface2 border border-border hover:bg-surface-hover text-on-surface2">
              {copied ? <CheckCircle size={14} className="text-success-text" /> : <Copy size={14} />}
            </button>
            <a href={result.url_publica} target="_blank" rel="noopener noreferrer" title="Abrir archivo"
               className="p-1.5 rounded bg-surface2 border border-border hover:bg-surface-hover text-on-surface2">
              <ExternalLink size={14} />
            </a>
          </div>
          <button onClick={resetAll} className="text-xs text-link hover:text-link-hover underline">
            Subir otro archivo
          </button>
        </div>
      )}

      {!result && (
        <>
          {/* Campos tabla + nombre — solo en modo standalone */}
          {!modoIntegrado && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-on-surface2 mb-1 block">Tabla <span className="text-destructive-text">*</span></label>
                <select value={tabla} onChange={(e) => setTabla(e.target.value)}
                  aria-label="Tabla"
                  data-speech-label="Tabla"
                  className="w-full text-sm bg-input border border-border rounded px-2 py-1.5 text-on-surface1 focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— selecciona —</option>
                  {TABLAS_CONOCIDAS.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="__custom__">Otra…</option>
                </select>
                {tabla === '__custom__' && (
                  <input type="text" value={tablaCustom}
                    onChange={(e) => setTablaCustom(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="nombre_tabla"
                    className="mt-1 w-full text-sm bg-input border border-border rounded px-2 py-1 text-on-surface1 focus:outline-none focus:ring-2 focus:ring-ring" />
                )}
              </div>
              <div>
                <label className="text-xs text-on-surface2 mb-1 block">Nombre <span className="text-destructive-text">*</span></label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                  placeholder="Juan García"
                  className="w-full text-sm bg-input border border-border rounded px-2 py-1.5 text-on-surface1 focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          )}

          {/* Drag & drop */}
          <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${dragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/60 hover:bg-surface-hover'}`}>
            <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => handleSelect(e.target.files?.[0])} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">{getFileIcon(file.type)}</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-on-surface1 truncate max-w-xs">{file.name}</p>
                  <p className="text-xs text-on-surface2">{formatBytes(file.size)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  title="Quitar archivo"
                  className="ml-auto text-on-surface2 hover:text-destructive-text">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="text-on-surface2 text-sm space-y-1">
                <FileText size={28} className="mx-auto mb-2 opacity-50" />
                <p>Arrastra un archivo o <span className="text-link underline">selecciona</span></p>
                <p className="text-xs">JPG · PNG · PDF · Excel · Word · TXT — máx. {MAX_MB} MB</p>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-on-surface2 mb-1 block">Descripción (opcional)</label>
            <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe el archivo…"
              className="w-full text-sm bg-input border border-border rounded px-2 py-1.5 text-on-surface1 focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Progreso */}
          {uploading && (
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-surface2 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-on-surface2 text-right">{progress}%</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive-text text-xs">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button onClick={handleUpload} disabled={!file || uploading}
            className="w-full py-2 rounded-lg bg-primary text-on-primary text-sm font-medium
              hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
            {uploading ? `Subiendo… ${progress}%` : 'Subir archivo'}
          </button>
        </>
      )}
    </div>
  );
}
