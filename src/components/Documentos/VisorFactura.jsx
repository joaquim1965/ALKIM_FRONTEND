/**
 * VisorFactura — ver y corregir una factura con sus datos para Hacienda (27-28/10/2026, petición del usuario).
 *
 * Pantalla casi completa, como el visor de archivos:
 *   - arriba a la IZQUIERDA, la X para cerrar (también Esc).
 *   - columna izquierda: los datos para Hacienda EDITABLES (tipo, fecha, año, emisor, NIF, nº,
 *     dirección, concepto, base, % IVA, IVA, total) + «Guardar», «Leer datos (PDF / IA)» y «Descargar».
 *   - parte central, grande: la factura (PDF, foto, Word/Excel).
 * Si se ha cambiado algo y se cierra: «Se han modificado datos del documento. ¿Guardar cambios?»
 * con Aceptar (elegido: Intro guarda y sale) y Cancelar (sale sin guardar).
 *
 * API: GET /propiedades/:id/facturas · PUT /propiedades/:id/facturas/:archivo · GET /files/:id/contenido
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ScanText, FileText, Check } from 'lucide-react';
import Button from '../UI/Button';
import CampoFecha from '../UI/CampoFecha';
import { VistaOffice, esOffice } from './VisorOffice';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { MICRO, CLASE_INPUT, AvisoError } from '../UI/TemaPagina';

// Nombre del archivo sin la extensión (28/10/2026): se edita aquí; la extensión no.
const sinExt = (n) => String(n || '').replace(/\.[^.]+$/, '');
const extDe = (a) => String(a.extension || (/\.([^.]+)$/.exec(a.nombre_original || '') || [])[1] || '').toLowerCase();
const esImagen = (a) => /^image\//.test(a.tipo_mime || '');
const esPdf = (a) => String(a.extension || '').toLowerCase() === 'pdf' || a.tipo_mime === 'application/pdf';
const VACIO = { nombre: '', tipo_hacienda: '', fecha: '', ejercicio: '', emisor_nombre: '', emisor_nif: '', numero_factura: '', direccion: '', concepto: '', base: '', tipo_iva: '', iva: '', total: '' };
const IMPORTES = ['base', 'iva', 'total'];
/** Base + IVA − total (28/10/2026): null si falta alguno; si pasa de 2 céntimos, la factura no cuadra. */
export const descuadreDe = (base, iva, total) => (base == null || iva == null || total == null ? null : Math.round((base + iva - total) * 100) / 100);
const fmt = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Importe de la BD (6.95) → como se escribe aquí (6,95). */
const aTexto = (k, v) => (v == null ? '' : (IMPORTES.includes(k) || k === 'tipo_iva') ? String(v).replace('.', ',') : String(v));
/** Lo escrito (1.234,56 · 6,95 · 6.95) → número para guardar. */
const aNumero = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(/,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

/** Etiqueta + campo. Fuera del componente: si no, cada tecla volvería a crear el campo y se perdería el foco. */
function Fila({ etiqueta, children }) {
  return (
    <label className="block space-y-1">
      <span className={`block ${MICRO}`}>{etiqueta}</span>
      {children}
    </label>
  );
}

/** «¿Guardar cambios?»: Aceptar elegido; Intro = Aceptar, Esc = Cancelar. */
function Confirmar({ texto, onAceptar, onCancelar, t }) {
  const aceptar = useRef(null);
  useEffect(() => {
    aceptar.current?.focus();
    const tecla = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onAceptar(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancelar(); }
    };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [onAceptar, onCancelar]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-modal-backdrop/80 p-4" role="alertdialog" aria-modal="true" aria-label={texto}>
      <div className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-surface1 p-6 text-on-surface1 shadow-2xl">
        <p className="text-lg font-black">{texto}</p>
        <div className="flex justify-end gap-2">
          <button ref={aceptar} type="button" onClick={onAceptar}
            className="rounded-xl border-2 border-primary-border bg-primary px-5 py-2 text-sm font-black text-on-primary outline-none ring-offset-2 focus:ring-4 focus:ring-primary">{t('aceptar', 'Aceptar')}</button>
          <button type="button" onClick={onCancelar}
            className="rounded-xl border-2 border-border px-5 py-2 text-sm font-black hover:bg-surface-hover hover:text-on-surface-hover">{t('cancelar', 'Cancelar')}</button>
        </div>
      </div>
    </div>
  );
}

export default function VisorFactura({ archivo, propiedadId, tiposHacienda = [], nombreHacienda, onCerrar, onDatos, onDescargar, onGuardado, soloLectura = false }) {
  const { t } = useTmTr('FacturaHacienda');
  const { t: td } = useTmTr('Documentos');
  const [original, setOriginal] = useState(null);  // valores al abrir (o tras guardar)
  const [form, setForm] = useState(null);
  const [fichero, setFichero] = useState(null);    // { url, blob } | { error }
  const [preguntar, setPreguntar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [forzar, setForzar] = useState(false);
  const [titulo, setTitulo] = useState(archivo.nombre_original);   // cambia si se renombra   // «Guardar igualmente» aunque base + IVA ≠ total

  const cambiado = Boolean(form && original && Object.keys(VACIO).some((k) => String(form[k] ?? '') !== String(original[k] ?? '')));

  useEffect(() => {
    let vivo = true;
    apiFetch(`/propiedades/${propiedadId}/facturas`, { headers: authHeaders() }).then((r) => r.json())
      .then((b) => {
        if (!vivo) return;
        const d = (b.data || []).find((x) => Number(x.archivo_id) === Number(archivo.id)) || {};
        const v = { ...VACIO, ...Object.fromEntries(Object.keys(VACIO).map((k) => [k, aTexto(k, d[k])])), tipo_hacienda: archivo.tipo_hacienda || '', nombre: sinExt(archivo.nombre_original) };
        setOriginal(v); setForm(v);
      })
      .catch(() => { if (vivo) { const v = { ...VACIO, tipo_hacienda: archivo.tipo_hacienda || '', nombre: sinExt(archivo.nombre_original) }; setOriginal(v); setForm(v); } });
    let url = null;
    (async () => {
      try {
        const r = await apiFetch(`/files/${archivo.id}/contenido${esImagen(archivo) ? '' : '?para=compartir'}`, { headers: authHeaders() });
        if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.message || `Error ${r.status}`); }
        const blob = await r.blob();
        url = URL.createObjectURL(blob);
        if (vivo) setFichero({ url, blob });
      } catch (e) { if (vivo) setFichero({ error: e.message }); }
    })();
    return () => { vivo = false; if (url) URL.revokeObjectURL(url); };
  }, [archivo.id, propiedadId]); // eslint-disable-line react-hooks/exhaustive-deps

  const dif = form ? descuadreDe(aNumero(form.base), aNumero(form.iva), aNumero(form.total)) : null;
  const descuadra = dif != null && Math.abs(dif) > 0.02;
  // ¿Solo ha cambiado el nombre? Entonces solo se renombra, sin pedir total ni tipo.
  const soloNombre = Boolean(form && original) && Object.keys(VACIO).filter((k) => k !== 'nombre').every((k) => String(form[k] ?? '') === String(original[k] ?? ''));
  const guardar = async (igualmente = false) => {
    if (soloNombre) {
      setGuardando(true); setError(''); setAviso('');
      try {
        const nombre = String(form.nombre || '').trim();
        if (nombre && nombre !== original.nombre) {
          await pedir(`/files/${archivo.id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) });
          setTitulo(`${nombre}${extDe(archivo) ? `.${extDe(archivo)}` : ''}`);
        }
        setOriginal(form); setAviso(t('fh_guardado', 'Datos guardados.')); onGuardado?.();
        return true;
      } catch (e) { setError(e.message); return false; }
      finally { setGuardando(false); }
    }
    if (aNumero(form.total) == null) { setError(t('fh_falta_total_visor', 'Falta el importe total.')); return false; }
    // Comprobación (28/10/2026): base imponible + IVA = importe total.
    if (descuadra && !igualmente) { setForzar(true); setError(''); return false; }
    if (!form.tipo_hacienda) { setError(t('fh_falta_tipo', 'Elige el tipo para Hacienda.')); return false; }
    setGuardando(true); setError(''); setAviso('');
    try {
      const cuerpo = {
        ...form, base: aNumero(form.base), iva: aNumero(form.iva), total: aNumero(form.total), tipo_iva: aNumero(form.tipo_iva),
        ejercicio: form.ejercicio || (form.fecha ? form.fecha.slice(0, 4) : null),
      };
      // Nombre del archivo (28/10/2026): si ha cambiado, se renombra el documento (el que se ve y con el que se descarga).
      const nombre = String(form.nombre || '').trim();
      if (nombre && nombre !== original.nombre) {
        await pedir(`/files/${archivo.id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) });
        setTitulo(`${nombre}${extDe(archivo) ? `.${extDe(archivo)}` : ''}`);
      }
      delete cuerpo.nombre;
      await pedir(`/propiedades/${propiedadId}/facturas/${archivo.id}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
      setOriginal(form); setForzar(false);
      setAviso(t('fh_guardado', 'Datos guardados.'));
      onGuardado?.();
      return true;
    } catch (e) { setError(e.message); return false; }
    finally { setGuardando(false); }
  };

  // Cerrar: si hay cambios, se pregunta antes.
  const pedirCierre = () => { if (cambiado && !soloLectura) setPreguntar(true); else onCerrar(); };
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape' && !preguntar) { e.preventDefault(); pedirCierre(); } };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const f = (k) => ({ value: form?.[k] ?? '', onChange: (e) => setForm((x) => ({ ...x, [k]: e.target.value })), disabled: soloLectura || guardando });

  let centro;
  if (!fichero) centro = <p className={MICRO}>{t('fh_leyendo', 'Cargando…')}</p>;
  else if (fichero.error) centro = <p className="text-base font-bold">{fichero.error}</p>;
  else if (esImagen(archivo)) centro = <img src={fichero.url} alt={archivo.nombre_original} className="max-h-full max-w-full rounded-xl object-contain" />;
  else if (esPdf(archivo)) centro = <iframe src={fichero.url} title={archivo.nombre_original} className="h-full w-full rounded-xl border border-border bg-surface1" />;
  else if (esOffice(archivo)) {
    centro = (
      <div className="custom-scrollbar h-full w-full overflow-y-auto rounded-xl border border-border bg-surface1 p-6 text-on-surface1">
        <VistaOffice blob={fichero.blob} extension={archivo.extension} t={td} />
      </div>
    );
  } else {
    centro = (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface1 p-8 text-on-surface1">
        <FileText size={48} />
        <Button type="button" leftIcon={<Download size={16} />} onClick={() => onDescargar(archivo)}>{td('descargar', 'Descargar')}</Button>
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-modal-backdrop text-on-background" role="dialog" aria-modal="true" aria-label={archivo.nombre_original}>
      {/* Cabecera: la X arriba a la IZQUIERDA (28/10/2026). */}
      <div className="flex items-center gap-3 border-b border-border bg-surface2 px-4 py-3 text-on-surface2">
        <button type="button" onClick={pedirCierre} title={`${td('cerrar', 'Cerrar')} (Esc)`} aria-label={td('cerrar', 'Cerrar')}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-border bg-surface1 text-on-surface1 transition-colors hover:bg-surface-hover hover:text-on-surface-hover"><X size={24} /></button>
        <span className="min-w-0 flex-1 truncate text-lg font-black">{titulo}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:flex-row">
        {/* Izquierda: los datos, editables */}
        <aside className="custom-scrollbar w-full shrink-0 space-y-3 overflow-y-auto rounded-2xl border border-border bg-surface1 p-4 text-on-surface1 md:w-96">
          {!form ? <p className={MICRO}>{t('fh_leyendo', 'Cargando…')}</p> : (<>
            <Fila etiqueta={td('nombre_archivo', 'Nombre del archivo')}>
              <div className="flex items-center gap-2">
                <input maxLength={190} {...f('nombre')} className={CLASE_INPUT} />
                {extDe(archivo) && <span className="shrink-0 select-none rounded-lg border border-border bg-surface2 px-3 py-2 font-mono text-sm font-bold text-on-surface2">.{extDe(archivo)}</span>}
              </div>
            </Fila>
            <Fila etiqueta={`${td('tipo_hacienda', 'Tipo para Hacienda')} *`}>
              <select {...f('tipo_hacienda')} className={CLASE_INPUT}>
                <option value="">{td('hacienda_elige', '— Elige —')}</option>
                {tiposHacienda.map(([k]) => <option key={k} value={k}>{nombreHacienda(k)}</option>)}
              </select>
            </Fila>
            <div className="grid grid-cols-2 gap-3">
              <Fila etiqueta={t('fh_fecha', 'Fecha')}>
                <CampoFecha value={form.fecha} disabled={soloLectura || guardando}
                  onChange={(e) => { const v = e.target.value; setForm((x) => ({ ...x, fecha: v, ejercicio: (!x.ejercicio || x.ejercicio === String(x.fecha || '').slice(0, 4)) && v ? v.slice(0, 4) : x.ejercicio })); }}
                  className={CLASE_INPUT} />
              </Fila>
              <Fila etiqueta={t('fh_ejercicio', 'Año (ejercicio)')}><input type="number" min="1990" max="2100" {...f('ejercicio')} className={`${CLASE_INPUT} font-mono`} /></Fila>
            </div>
            <Fila etiqueta={t('fh_emisor', 'Emisor (nombre)')}><input maxLength={200} {...f('emisor_nombre')} className={CLASE_INPUT} /></Fila>
            <div className="grid grid-cols-2 gap-3">
              <Fila etiqueta={t('fh_nif', 'NIF del emisor')}><input maxLength={20} {...f('emisor_nif')} className={`${CLASE_INPUT} font-mono`} /></Fila>
              <Fila etiqueta={t('fh_numero', 'Nº de factura')}><input maxLength={60} {...f('numero_factura')} className={`${CLASE_INPUT} font-mono`} /></Fila>
            </div>
            <Fila etiqueta={t('fh_direccion', 'Dirección')}><input maxLength={255} {...f('direccion')} className={CLASE_INPUT} /></Fila>
            <Fila etiqueta={t('fh_concepto', 'Concepto')}><input maxLength={255} {...f('concepto')} className={CLASE_INPUT} /></Fila>
            <div className="grid grid-cols-2 gap-3">
              <Fila etiqueta={t('fh_base', 'Base imponible')}><input inputMode="decimal" {...f('base')} className={`${CLASE_INPUT} text-right font-mono`} /></Fila>
              <Fila etiqueta={t('fh_tipo_iva', 'IVA aplicado (%)')}><input inputMode="decimal" {...f('tipo_iva')} className={`${CLASE_INPUT} text-right font-mono`} /></Fila>
              <Fila etiqueta={t('fh_iva', 'IVA (€)')}><input inputMode="decimal" {...f('iva')} className={`${CLASE_INPUT} text-right font-mono`} /></Fila>
              <Fila etiqueta={`${t('fh_total', 'Importe total')} *`}><input inputMode="decimal" {...f('total')} className={`${CLASE_INPUT} text-right font-mono font-black`} /></Fila>
            </div>
            {descuadra && (
              <AvisoError>
                <span>{t('fh_descuadre', 'Base imponible + IVA ({s}) no coincide con el importe total ({t}). Diferencia: {d}.')
                  .replace('{s}', fmt(aNumero(form.base) + aNumero(form.iva))).replace('{t}', fmt(aNumero(form.total))).replace('{d}', fmt(dif))}</span>
                {forzar && !soloLectura && (
                  <span className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => guardar(true)} className={`rounded-lg border border-current px-3 py-1 ${MICRO}`}>{t('fh_guardar_igual', 'Guardar igualmente')}</button>
                  </span>
                )}
              </AvisoError>
            )}
            <AvisoError>{error}</AvisoError>
            {aviso && <p className="text-sm font-black text-success" role="status">{aviso}</p>}
            <div className="flex flex-col gap-2 pt-1">
              {!soloLectura && <Button type="button" leftIcon={<Check size={16} />} loading={guardando} disabled={!cambiado || guardando} onClick={() => guardar()}>{t('fh_guardar', 'Guardar')}</Button>}
              {onDatos && !soloLectura && <Button type="button" variant="secondary" leftIcon={<ScanText size={16} />} onClick={() => onDatos(archivo)}>{t('fh_leer_otra_vez', 'Leer datos (PDF / IA)')}</Button>}
              <Button type="button" variant="secondary" leftIcon={<Download size={16} />} onClick={() => onDescargar(archivo)}>{td('descargar', 'Descargar')}</Button>
            </div>
          </>)}
        </aside>
        {/* Centro: la factura */}
        <div className="flex min-h-[50vh] min-w-0 flex-1 items-center justify-center">{centro}</div>
      </div>
      {preguntar && (
        <Confirmar t={t} texto={t('fh_guardar_cambios', 'Se han modificado datos del documento. ¿Guardar cambios?')}
          onAceptar={async () => { setPreguntar(false); if (await guardar()) onCerrar(); }}
          onCancelar={() => { setPreguntar(false); onCerrar(); }} />
      )}
    </div>,
    document.body
  );
}
