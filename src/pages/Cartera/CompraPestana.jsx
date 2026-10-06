/**
 * CompraPestana — pestañas «Compra» y «Mejoras» de la ficha de la propiedad (05/10/2026).
 * `tipo`: 'compra' (gastos de adquisición) o 'mejoras'; `cabecera`: lo que va
 * encima (en Compra, el resumen de la compra).
 *
 * Desglose de lo que costó comprarla (notaría, registro, gestoría, inmobiliaria,
 * impuestos, tasación…): base, IVA y TOTAL. El total suma al valor de
 * adquisición y se reparte solo entre los titulares (pestaña Titulares).
 *
 * Al añadir un gasto se puede subir su factura (queda en Documentos, tipo
 * «Facturas de la compra») y leerla: primero «Leer factura» (gratis, PDF con
 * texto) y, si falta algo, «Leer con IA» (proveedor de Auxiliares ▸ Claves de IA).
 *
 * API: /propiedades/:id/gastos-compra[/:gasto] · /propiedades/:id/gastos-compra/leer · /files
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, FileText, ScanText, Sparkles, Check, AlertTriangle } from 'lucide-react';
import Button from '../../components/UI/Button';
import ZonaArchivos from '../../components/UI/ZonaArchivos';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { formatImporte } from '../../utils/format';
import {
  Campo, Casilla, AvisoError, AvisoOk, SinDato, CLASE_INPUT, TablaTema, claseFila, TD, BotonFila, BotonAnadir, FilaVacia,
} from '../../components/UI/TemaPagina';
import CampoFecha from '../../components/UI/CampoFecha';

async function pedir(url, opciones = {}) {
  const json = opciones.body && !(opciones.body instanceof FormData);
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), ...(json ? { 'Content-Type': 'application/json' } : {}) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

export const CONCEPTOS = [
  ['NOTARIA', 'Notaría'], ['REGISTRO', 'Registro de la Propiedad'], ['GESTORIA', 'Gestoría'],
  ['INMOBILIARIA', 'Inmobiliaria / intermediación'], ['IMPUESTO', 'Impuestos (ITP, IVA + AJD)'], ['TASACION', 'Tasación'], ['OTROS', 'Otros'],
];
// Mejoras (05/10/2026): la misma pantalla con otra lista de conceptos y otra ruta.
export const CONCEPTOS_MEJORA = [['OBRA', 'Obra / reforma'], ['INSTALACIONES', 'Instalaciones (luz, agua, gas, clima)'], ['EQUIPAMIENTO', 'Equipamiento fijo (cocina, baños)'], ['OTROS', 'Otros']];
const TIPOS = {
  compra: { ruta: 'gastos-compra', conceptos: null, categoria: 'FACTURA_COMPRA', conceptoInicial: 'NOTARIA' },
  mejoras: { ruta: 'mejoras', conceptos: CONCEPTOS_MEJORA, categoria: 'FACTURA_MEJORA', conceptoInicial: 'OBRA' },
};
const VACIO = { concepto: 'NOTARIA', descripcion: '', emisor_nombre: '', emisor_nif: '', numero_factura: '', fecha: '', base: '', iva: '', total: '', sin_justificante: false, archivo_id: null, leido_por: null, notas: '' };
const euros = (v) => (v == null || v === '' ? null : formatImporte(v, ''));
const fechaEs = (f) => (f ? f.split('-').reverse().join('/') : null);
const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));

export default function CompraPestana({ propiedadId, puedeEscribir, onCambio, tipo = 'compra', cabecera = null, version = 0 }) {
  const { t } = useTmTr(tipo === 'mejoras' ? 'Mejoras' : 'Compra');
  const cfg = TIPOS[tipo];
  const LISTA = cfg.conceptos || CONCEPTOS;
  const [datos, setDatos] = useState(null);
  const [form, setForm] = useState(null);
  const [fichero, setFichero] = useState([]);
  const [archivoNombre, setArchivoNombre] = useState('');
  const [catFactura, setCatFactura] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [avisosLectura, setAvisosLectura] = useState([]);
  const [ocupado, setOcupado] = useState(null);

  const cargar = useCallback(async () => {
    try { setDatos((await pedir(`/propiedades/${propiedadId}/${cfg.ruta}`)).data); }
    catch (e) { setError(e.message); setDatos({ lineas: [], totales: {} }); }
  }, [propiedadId]);
  useEffect(() => { cargar(); }, [cargar, version]);   // version: sube cuando se pasa una factura desde Documentos
  useEffect(() => {
    pedir('/files/categorias?objeto=im_property')
      .then((b) => setCatFactura((b.data || []).find((c) => c.codigo === cfg.categoria)?.id || null)).catch(() => {});
  }, []);

  const nuevo = () => { setError(''); setAviso(''); setAvisosLectura([]); setFichero([]); setArchivoNombre(''); setForm({ ...VACIO, concepto: cfg.conceptoInicial }); };
  const editar = (g) => {
    setError(''); setAviso(''); setAvisosLectura([]); setFichero([]); setArchivoNombre(g.archivo_nombre || '');
    setForm({ id: g.id, ...Object.fromEntries(Object.keys(VACIO).map((k) => [k, k === 'sin_justificante' ? Boolean(Number(g[k])) : (g[k] ?? (VACIO[k] === null ? null : ''))])) });
  };

  // Sube la factura (si no estaba ya) y devuelve su id.
  const subirFactura = async () => {
    if (form.archivo_id) return form.archivo_id;
    if (!fichero[0]) throw new Error(t('falta_factura', 'Elige primero la factura.'));
    if (!catFactura) throw new Error(t('falta_tipo', 'Falta el tipo «Facturas de la compra»: reinicia el backend.'));
    const fd = new FormData();
    fd.append('archivo', fichero[0]);
    fd.append('objeto_tabla', 'im_property');
    fd.append('objeto_id', propiedadId);
    fd.append('categoria_id', catFactura);
    fd.append('confidencial', '0');
    const { data } = await pedir('/files', { method: 'POST', body: fd });
    setForm((f) => ({ ...f, archivo_id: data.id }));
    setArchivoNombre(data.nombre_original || fichero[0].name);
    setFichero([]);
    return data.id;
  };

  const leer = async (modo) => {
    setOcupado(modo); setError(''); setAvisosLectura([]);
    try {
      const archivoId = await subirFactura();
      const { data } = await pedir(`/propiedades/${propiedadId}/gastos-compra/leer`, { method: 'POST', body: JSON.stringify({ archivo_id: archivoId, modo }) });
      const d = data.datos || {};
      // Solo rellena lo que ha leído; lo que ya estaba escrito se respeta si no lo ha encontrado.
      setForm((f) => ({
        ...f, archivo_id: archivoId,
        ...Object.fromEntries(Object.entries(d).filter(([k, v]) => v != null && v !== '' && k in VACIO).map(([k, v]) => [k, String(v)])),
        leido_por: data.leido_por || f.leido_por,
      }));
      setAvisosLectura([...(data.avisos || []), ...(data.leido_por ? [`${t('leido_con', 'Leído con')}: ${data.leido_por}. ${t('revisa', 'Revisa los datos antes de guardar.')}`] : [])]);
    } catch (e) { setError(e.message); }
    finally { setOcupado(null); }
  };

  const guardar = async (ev) => {
    ev.preventDefault();
    setOcupado('guardar'); setError('');
    try {
      let archivoId = form.archivo_id;
      if (!archivoId && fichero[0]) archivoId = await subirFactura();
      const { id, ...resto } = form;
      const cuerpo = { ...resto, archivo_id: archivoId || null, base: num(resto.base), iva: num(resto.iva), total: num(resto.total) };
      const { data } = await pedir(`/propiedades/${propiedadId}/${cfg.ruta}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(cuerpo) });
      setForm(null); setFichero([]);
      setAviso(tipo === 'mejoras' ? t('guardada', 'Mejora guardada.') : data?.titulares
        ? t('repartido', 'Guardado. El total se ha repartido entre {n} titular(es) como gastos de adquisición.').replace('{n}', data.titulares)
        : t('guardado_sin_titulares', 'Guardado. Cuando añadas los titulares, el total se les repartirá.'));
      await cargar(); onCambio?.();
    } catch (e) { setError(e.message); }
    finally { setOcupado(null); }
  };

  const borrar = async (g) => {
    if (!window.confirm(t('confirmar_borrar', '¿Borrar el gasto «{c}»? La factura se queda en Documentos.').replace('{c}', g.emisor_nombre || g.concepto))) return;
    try { await pedir(`/propiedades/${propiedadId}/${cfg.ruta}/${g.id}`, { method: 'DELETE' }); await cargar(); onCambio?.(); } catch (e) { setError(e.message); }
  };

  const verFactura = async (archivoId) => {
    const ventana = window.open('', '_blank');
    try { const { data } = await pedir(`/files/${archivoId}/descarga?modo=ver`); ventana.opener = null; ventana.location.href = data.url; }
    catch (e) { ventana?.close(); setError(e.message); }
  };

  // Base + IVA = total: si se escriben base e IVA, el total se propone solo.
  const cambiarImporte = (k, v) => setForm((f) => {
    const n = { ...f, [k]: v };
    if ((k === 'base' || k === 'iva') && num(n.base) != null && (num(n.iva) != null) && (f.total === '' || num(f.total) === Math.round(((num(f.base) || 0) + (num(f.iva) || 0)) * 100) / 100)) {
      n.total = String(Math.round((num(n.base) + num(n.iva)) * 100) / 100);
    }
    return n;
  });
  const fc = (k) => ({ value: form?.[k] ?? '', onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });
  const nombreConcepto = (c) => t(`concepto_${c}`, (LISTA.find(([v]) => v === c) || [null, c])[1]);
  const descuadre = form && num(form.base) != null && num(form.iva) != null && num(form.total) != null
    && Math.abs(num(form.base) + num(form.iva) - num(form.total)) > 0.02;

  if (!datos) return <p className="text-xs font-bold uppercase tracking-widest">{t('cargando', 'Cargando…')}</p>;

  return (
    <div className="space-y-5">
      {cabecera}
      <AvisoError>{error}</AvisoError>
      <AvisoOk>{aviso}</AvisoOk>
      <div className="flex items-center gap-3">
        {puedeEscribir && !form && <BotonAnadir texto={tipo === 'mejoras' ? t('nueva', 'Añadir mejora') : t('nuevo', 'Añadir gasto de compra')} onClick={nuevo} pequeno />}
        <p className="text-sm font-bold">{tipo === 'mejoras'
          ? t('ayuda', 'Obras que aumentan el valor (no reparaciones). El TOTAL suma a la base de amortización del inmueble. La fecha de la factura decide el año.')
          : t('ayuda', 'Lo que costó comprarla. El TOTAL suma al valor de adquisición y se reparte entre los titulares.')}</p>
      </div>

      {form && (
        <form onSubmit={guardar} className="grid gap-4 rounded-2xl border border-border p-4 rejilla-campos">
          {/* Factura y lectura */}
          <div className="space-y-2 sm:col-span-full">
            {form.archivo_id
              ? (
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  <FileText size={16} /> {archivoNombre || t('factura_subida', 'Factura subida')}
                  <BotonFila texto={t('ver', 'Ver')} onClick={() => verFactura(form.archivo_id)} />
                </div>
              )
              : !form.sin_justificante && (
                <ZonaArchivos ficheros={fichero} onCambio={setFichero} multiple={false} accept=".pdf,.jpg,.jpeg,.png,.webp"
                  textoPrincipal={t('arrastra', 'Arrastra aquí la factura (PDF o foto)')} textoSecundario={t('o_elige', 'o pulsa para elegirla')} />
              )}
            {(form.archivo_id || fichero[0]) && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" loading={ocupado === 'propio'} disabled={Boolean(ocupado)} leftIcon={<ScanText size={16} />} onClick={() => leer('propio')}>
                  {t('leer_factura', 'Leer factura')}
                </Button>
                <Button type="button" variant="secondary" size="sm" loading={ocupado === 'ia'} disabled={Boolean(ocupado)} leftIcon={<Sparkles size={16} />} onClick={() => leer('ia')}>
                  {t('leer_ia', 'Leer con IA')}
                </Button>
              </div>
            )}
            {avisosLectura.map((a) => <p key={a} className="flex items-start gap-2 text-sm font-bold"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{a}</p>)}
          </div>

          <Campo etiqueta={t('concepto', 'Concepto')} ancho="sm:col-span-2">
            <select {...fc('concepto')} className={CLASE_INPUT}>{LISTA.map(([v]) => <option key={v} value={v}>{nombreConcepto(v)}</option>)}</select>
          </Campo>
          <Campo etiqueta={t('emisor', 'Emisor')} ancho="sm:col-span-2"><input maxLength={200} {...fc('emisor_nombre')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('nif', 'NIF del emisor')}><input maxLength={20} {...fc('emisor_nif')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('numero', 'Nº de factura')}><input maxLength={60} {...fc('numero_factura')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('fecha', 'Fecha')}><CampoFecha {...fc('fecha')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('base', 'Base')}><input inputMode="decimal" value={form.base} onChange={(e) => cambiarImporte('base', e.target.value)} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('iva', 'IVA')}><input inputMode="decimal" value={form.iva} onChange={(e) => cambiarImporte('iva', e.target.value)} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('total', 'Total')}><input required inputMode="decimal" {...fc('total')} className={`${CLASE_INPUT} font-mono font-black`} /></Campo>
          <Campo etiqueta={t('descripcion', 'Descripción')} ancho="sm:col-span-2"><input maxLength={200} {...fc('descripcion')} className={CLASE_INPUT} /></Campo>
          <div className="flex items-end pb-2 sm:col-span-full">
            <Casilla etiqueta={t('sin_justificante', 'Sin factura ni justificante')} checked={form.sin_justificante} onChange={(v) => setForm((f) => ({ ...f, sin_justificante: v }))} />
          </div>
          {form.sin_justificante && <p className="flex items-start gap-2 text-sm font-bold sm:col-span-full"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{t('aviso_sin_justificante', 'Sin justificante, Hacienda puede no aceptar este gasto si te lo pide.')}</p>}
          {descuadre && <p className="flex items-start gap-2 text-sm font-bold sm:col-span-full"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{t('descuadre', 'Base + IVA no coincide con el total (puede haber suplidos o retenciones).')}</p>}
          <div className="flex justify-end gap-2 sm:col-span-full">
            <Button type="button" variant="secondary" onClick={() => setForm(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado === 'guardar'} disabled={Boolean(ocupado)} leftIcon={<Check size={16} />}>{t('guardar', 'Guardar')}</Button>
          </div>
        </form>
      )}

      <TablaTema columnas={[
        { texto: '' }, { texto: t('concepto', 'Concepto') }, { texto: t('emisor', 'Emisor') }, { texto: t('fecha', 'Fecha') },
        { texto: t('base', 'Base'), derecha: true }, { texto: t('iva', 'IVA'), derecha: true }, { texto: t('total', 'Total'), derecha: true }, { texto: t('factura', 'Factura') },
      ]}>
        {datos.lineas.length === 0 && <FilaVacia columnas={8}>{(tipo === 'mejoras' ? t('vacio', 'Todavía no hay mejoras.') : t('vacio', 'Todavía no hay gastos de compra.'))}</FilaVacia>}
        {datos.lineas.map((g, i) => (
          <tr key={g.id} className={claseFila(i)}>
            <td className={`${TD} whitespace-nowrap`}>
              {puedeEscribir && <BotonFila icono={<Pencil size={15} />} titulo={t('editar', 'Editar')} onClick={() => editar(g)} />}
              {puedeEscribir && <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar', 'Borrar')} onClick={() => borrar(g)} />}
            </td>
            <td className={TD}>{nombreConcepto(g.concepto)}{g.descripcion ? <div className="text-xs">{g.descripcion}</div> : null}</td>
            <td className={TD}>{g.tercero_nombre || g.emisor_nombre || <SinDato />}{g.emisor_nif ? <div className="font-mono text-xs">{g.emisor_nif}</div> : null}</td>
            <td className={TD}>{fechaEs(g.fecha) || <SinDato />}</td>
            <td className={`${TD} text-right font-mono`}>{euros(g.base) || <SinDato />}</td>
            <td className={`${TD} text-right font-mono`}>{euros(g.iva) || <SinDato />}</td>
            <td className={`${TD} text-right font-mono font-black`}>{euros(g.total)}</td>
            <td className={TD}>
              {g.archivo_id
                ? <BotonFila icono={<FileText size={15} />} titulo={g.archivo_nombre || t('ver', 'Ver')} onClick={() => verFactura(g.archivo_id)} />
                : Number(g.sin_justificante) ? <span className="text-xs font-black uppercase">{t('sin_justificante_corto', 'Sin justificante')}</span> : <SinDato />}
            </td>
          </tr>
        ))}
        {datos.lineas.length > 0 && (
          <tr className="bg-table-header text-on-table-header">
            <td className={TD} />
            <td className={`${TD} font-black uppercase`} colSpan={3}>{(tipo === 'mejoras' ? t('total_mejoras', 'Total mejoras') : t('total_compra', 'Total gastos de compra'))}</td>
            <td className={`${TD} text-right font-mono font-black`}>{euros(datos.totales.base)}</td>
            <td className={`${TD} text-right font-mono font-black`}>{euros(datos.totales.iva)}</td>
            <td className={`${TD} text-right font-mono font-black`}>{euros(datos.totales.total)}</td>
            <td className={TD} />
          </tr>
        )}
      </TablaTema>
    </div>
  );
}
