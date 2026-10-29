/**
 * GarantiasPestana — pestaña «Garantías» de la ficha de la propiedad (28/10/2026, petición del usuario).
 *
 * Inventario de los bienes con garantía (muebles, electrodomésticos…): cada uno con su factura de
 * compra, proveedor, fecha y fin de garantía (3 años por defecto). Las reparaciones cuelgan de su
 * bien, con su factura y su garantía (6 meses por defecto), y alargan el fin si acaban más tarde.
 * Plazos por defecto: Fiscalidad → Parámetros fiscales. Estados: Vigente (verde) / Caducada (rojo).
 *
 *   - «Facturas de electrodomésticos y mobiliario sin pasar a garantías»: las de tipo
 *     Electrodomésticos que aún no son un bien, con «Añadir a garantías» (rellenado de la factura).
 *   - «Ver»: la factura en el visor de facturas. «Reclamar»: el texto con los datos para el proveedor.
 *
 *   - Zona para cargar el documento (29/10/2026, petición del usuario): se sube a la propiedad y
 *     se leen sus datos (texto del PDF, gratis) para rellenar el formulario; si no salen, botón
 *     «Leer con IA». Factura de compra → Facturas › Muebles y electrodomésticos; factura de
 *     reparación → Facturas › Reparaciones y mantenimiento (las dos con sus datos para Hacienda
 *     al guardar); reparación en garantía SIN factura (interruptor «Con factura» No) → su parte o
 *     albarán va a ELECTRODOMESTICOS, sin importe y sin contar en Hacienda.
 *
 * API: /propiedades/:id/garantias[/:eq[/reparaciones[/:rep]]] · POST /files (subir) ·
 *      POST /propiedades/:id/facturas/leer · PUT /propiedades/:id/facturas/:archivo
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Pencil, Trash2, Eye, Wrench, Copy, Check, X, Megaphone, Sparkles, FileSearch, Unlink } from 'lucide-react';
import Button from '../../components/UI/Button';
import CampoFecha from '../../components/UI/CampoFecha';
import Toggle from '../../components/UI/Toggle';
import ZonaArchivos from '../../components/UI/ZonaArchivos';
import VisorFactura from '../../components/Documentos/VisorFactura';
import { TIPOS_HACIENDA } from '../../components/Documentos/DocumentosObjeto';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { formatImporte } from '../../utils/format';
import {
  Campo, AvisoError, AvisoOk, AvisoAtencion, CLASE_INPUT, Recuadro, TablaTema, TD, claseFila, BotonFila, BotonAnadir, FilaVacia, MICRO, Ayuda, VentanaModal,
} from '../../components/UI/TemaPagina';

async function pedir(url, opciones = {}) {
  const json = opciones.body && !(opciones.body instanceof FormData);
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), ...(json ? { 'Content-Type': 'application/json' } : {}) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}
const pad = (n) => String(n).padStart(2, '0');
/** Fecha + meses (igual que el backend): si el día no existe, el último del mes. */
export function sumarMeses(fecha, meses) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || '')) || meses === '' || meses == null) return '';
  const [y, m, d] = fecha.split('-').map(Number);
  const total = (m - 1) + Number(meses);
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, ultimo))}`;
}
const fechaEs = (f) => (f ? String(f).slice(0, 10).split('-').reverse().join('/') : '');
const euros = (v) => (v == null || v === '' ? '' : formatImporte(v, '€'));
const sinExt = (n) => String(n || '').replace(/\.[^.]+$/, '');
const BIEN_VACIO = { espacio_id: '', nombre: '', marca: '', modelo: '', numero_serie: '', archivo_id: '', proveedor_nombre: '', proveedor_nif: '', fecha_compra: '', importe: '', garantia_meses: '', fin_garantia: '', notas: '', finManual: false };
const REP_VACIA = { archivo_id: '', fecha: '', proveedor_nombre: '', descripcion: '', importe: '', garantia_meses: '', fin_garantia: '', finManual: false, conFactura: true };
/** Campos solo de pantalla: no se envían. */
const limpio = ({ id, equipo, finManual, conFactura, ...resto }) => resto;
const numero = (v) => (v == null || v === '' ? null : Number(String(v).replace(',', '.')));
const LECTURA_VACIA = { leyendo: '', avisos: [], leido_por: null, datos: null, subido: null };
const aTexto = (v) => (v == null ? '' : String(v));
const importeTexto = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));

/** Estado con los colores del tema: Vigente = éxito (verde), Caducada = destructivo (rojo). */
function Estado({ estado, t }) {
  const v = estado === 'VIGENTE';
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 ${MICRO} ${v ? 'border-success bg-success text-on-success' : 'border-destructive bg-destructive text-on-destructive'}`}>
      {v ? t('vigente', 'Vigente') : t('caducada', 'Caducada')}
    </span>
  );
}

export default function GarantiasPestana({ propiedadId, espacios = [], puedeEscribir = false }) {
  const { t } = useTmTr('Garantias');
  const { t: td } = useTmTr('Documentos');
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [bien, setBien] = useState(null);           // formulario de bien { id|null, ... }
  const [rep, setRep] = useState(null);             // formulario de reparación { equipo, id|null, ... }
  const [abiertos, setAbiertos] = useState(() => new Set());
  const [borrando, setBorrando] = useState(null);   // { tipo: 'bien'|'rep', id, equipo, texto }
  const [reclamar, setReclamar] = useState(null);   // texto para el proveedor
  const [visor, setVisor] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroEspacio, setFiltroEspacio] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [lec, setLec] = useState(LECTURA_VACIA); // documento cargado / leído en el formulario abierto

  const cargar = useCallback(async () => {
    try { setD((await pedir(`/propiedades/${propiedadId}/garantias`)).data); }
    catch (e) { setError(e.message); }
  }, [propiedadId]);
  useEffect(() => { cargar(); }, [cargar]);

  const factura = (id) => d?.facturas.find((f) => Number(f.archivo_id) === Number(id));
  const nombreFactura = (f) => [fechaEs(f.fecha || f.fecha_documento), f.emisor_nombre || sinExt(f.nombre_original), euros(f.total)].filter(Boolean).join(' · ');
  const nombreHacienda = (v) => td(`hacienda_${v}`, (TIPOS_HACIENDA.find(([k]) => k === v) || [null, v])[1]);
  const verFactura = (id) => {
    const f = factura(id);
    if (f && !f.es_factura) { descargar({ id: f.archivo_id }); return; } // parte / albarán: no es una factura
    if (f) setVisor({ id: f.archivo_id, nombre_original: f.nombre_original, extension: f.extension, tipo_mime: f.tipo_mime, tipo_hacienda: f.tipo_hacienda });
  };
  const lugar = (e) => (e.espacio_id ? `${e.espacio_codigo} · ${e.espacio_nombre}` : t('piso', 'Piso'));
  const descargar = async (a) => {
    try {
      const { data } = await pedir(`/files/${a.id}/descarga`);
      const l = document.createElement('a'); l.href = data.url; l.rel = 'noopener';
      document.body.appendChild(l); l.click(); l.remove();
    } catch (err) { setError(err.message); }
  };

  // ── Documento: subir, leer (PDF / IA) y pasar los datos al formulario (29/10/2026) ──
  /** Sube el archivo a la propiedad con el tipo que toca y lo lee. tipo: compra | reparacion | garantia. */
  const subirDocumento = async (archivo, tipo, aplicar) => {
    const categoria = d?.categorias?.[tipo];
    if (!categoria) { setError(t('sin_tipo_doc', 'No está el tipo de documento donde guardarlo (Muebles y electrodomésticos / Reparaciones y mantenimiento / Electrodomésticos).')); return; }
    setError(''); setLec({ ...LECTURA_VACIA, leyendo: 'subir' });
    try {
      const fd = new FormData();
      fd.append('archivo', archivo);
      fd.append('objeto_tabla', 'im_property');
      fd.append('objeto_id', propiedadId);
      fd.append('categoria_id', categoria);
      fd.append('confidencial', '0');
      if (tipo !== 'garantia') fd.append('tipo_hacienda', tipo === 'compra' ? 'ELECTRODOMESTICO' : 'GASTO_CORRIENTE');
      const { data } = await pedir('/files', { method: 'POST', body: fd });
      const subido = { id: data.id, factura: tipo !== 'garantia' };
      aplicar({ archivo_id: String(data.id) });
      await cargar();
      await leerDocumento(data.id, 'propio', aplicar, subido);
    } catch (e) { setError(e.message); setLec(LECTURA_VACIA); }
  };
  /** Lee el documento (modo propio = texto del PDF; ia = con IA) y rellena el formulario. */
  const leerDocumento = async (archivoId, modo, aplicar, subido) => {
    setError(''); setLec((l) => ({ ...l, leyendo: modo, ...(subido ? { subido } : {}) }));
    try {
      const { data } = await pedir(`/propiedades/${propiedadId}/facturas/leer`, { method: 'POST', body: JSON.stringify({ archivo_id: archivoId, modo }) });
      const datos = data.lectura?.datos || {};
      aplicar(datos);
      const vacio = !Object.values(datos).some((v) => v != null && v !== '');
      setLec((l) => ({
        ...l, leyendo: '', datos, leido_por: data.lectura?.leido_por || null,
        avisos: [...(data.lectura?.avisos || []), ...(vacio && modo === 'propio' && !(data.lectura?.avisos || []).length ? [t('nada_leido', 'No se ha encontrado ningún dato en el documento. Prueba «Leer con IA».')] : [])],
      }));
    } catch (e) { setError(e.message); setLec((l) => ({ ...l, leyendo: '' })); }
  };
  /** Lo leído → formulario del bien: se pone lo que se ha encontrado; el nombre del bien solo si está vacío. */
  const aplicarBien = (x) => setBien((b) => {
    if (!b) return b;
    const n = { ...b };
    if (x.archivo_id) n.archivo_id = x.archivo_id;
    if (x.descripcion && !n.nombre) n.nombre = String(x.descripcion).slice(0, 150);
    if (x.emisor_nombre) n.proveedor_nombre = x.emisor_nombre;
    if (x.emisor_nif) n.proveedor_nif = x.emisor_nif;
    if (x.total != null && x.total !== '') n.importe = importeTexto(x.total);
    if (x.fecha) { n.fecha_compra = x.fecha; if (!b.finManual) n.fin_garantia = sumarMeses(n.fecha_compra, n.garantia_meses); }
    return n;
  });
  const aplicarRep = (x) => setRep((b) => {
    if (!b) return b;
    const n = { ...b };
    if (x.archivo_id) n.archivo_id = x.archivo_id;
    if (x.descripcion && !n.descripcion) n.descripcion = String(x.descripcion).slice(0, 255);
    if (x.emisor_nombre) n.proveedor_nombre = x.emisor_nombre;
    if (x.total != null && x.total !== '' && b.conFactura) n.importe = importeTexto(x.total);
    if (x.fecha) { n.fecha = x.fecha; if (!b.finManual) n.fin_garantia = sumarMeses(n.fecha, n.garantia_meses); }
    return n;
  });
  /**
   * Factura subida desde aquí: al guardar, sus datos para Hacienda (como en la pestaña Facturas),
   * con lo que se ha leído y lo que hay en el formulario. Sin importe no se guardan: se avisa.
   */
  const datosHacienda = async ({ archivo, fecha, emisor, nif, importe, concepto }) => {
    if (!lec.subido?.factura || String(lec.subido.id) !== String(archivo)) return '';
    const total = numero(importe) ?? numero(lec.datos?.total);
    if (total == null) return ` ${t('hacienda_pendiente', 'La factura queda sin datos para Hacienda: complétalos en la pestaña Facturas.')}`;
    const x = lec.datos || {};
    const fe = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || '')) ? fecha : (x.fecha || null);
    try {
      await pedir(`/propiedades/${propiedadId}/facturas/${archivo}`, {
        method: 'PUT',
        body: JSON.stringify({
          fecha: fe, ejercicio: fe ? Number(fe.slice(0, 4)) : null, emisor_nombre: emisor || x.emisor_nombre || null,
          emisor_nif: nif || x.emisor_nif || null, numero_factura: x.numero_factura || null, direccion: x.direccion || null,
          concepto: x.descripcion || concepto || null, base: x.base ?? null, tipo_iva: x.tipo_iva ?? null, iva: x.iva ?? null, total,
          tipo_hacienda: factura(archivo)?.tipo_hacienda || 'ELECTRODOMESTICO', leido_por: lec.leido_por || null,
        }),
      });
      return ` ${t('hacienda_ok', 'Datos de la factura guardados también para Hacienda.')}`;
    } catch (e) {
      return ` ${t('hacienda_error', 'No se han podido guardar los datos de la factura para Hacienda:')} ${e.message}`;
    }
  };
  /** Zona del documento dentro de cada formulario. */
  const zonaDocumento = (archivoId, tipo, aplicar, quitar) => (
    <div className="space-y-2 sm:col-span-full">
      {!archivoId ? (
        <ZonaArchivos ficheros={[]} multiple={false} accept=".pdf,image/*"
          onCambio={(l) => { if (l[0]) subirDocumento(l[0], tipo, aplicar); }}
          textoPrincipal={tipo === 'garantia' ? t('arrastra_parte', 'Arrastra aquí el parte o albarán de la reparación') : t('arrastra_factura', 'Arrastra aquí la factura para leer sus datos')}
          textoSecundario={t('o_elige', 'o pulsa para elegirla del ordenador')}
          textoQuitar={t('quitar', 'Quitar')} textoCuenta={() => ''} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" leftIcon={<Eye size={16} />} onClick={() => verFactura(archivoId)}>{t('ver', 'Ver')}</Button>
          <Button type="button" variant="secondary" leftIcon={<FileSearch size={16} />} disabled={Boolean(lec.leyendo)} loading={lec.leyendo === 'propio'}
            onClick={() => leerDocumento(archivoId, 'propio', aplicar)}>{t('leer', 'Leer datos del documento')}</Button>
          <Button type="button" leftIcon={<Sparkles size={16} />} disabled={Boolean(lec.leyendo)} loading={lec.leyendo === 'ia'}
            onClick={() => leerDocumento(archivoId, 'ia', aplicar)}>{t('leer_ia', 'Leer con IA')}</Button>
          <Button type="button" variant="secondary" leftIcon={<Unlink size={16} />} disabled={Boolean(lec.leyendo)}
            onClick={() => { quitar(); setLec(LECTURA_VACIA); }}>{t('quitar_doc', 'Quitar el documento')}</Button>
        </div>
      )}
      {lec.leyendo === 'subir' && <p className={MICRO}>{t('subiendo', 'Subiendo y leyendo el documento…')}</p>}
      {lec.leyendo && lec.leyendo !== 'subir' && <p className={MICRO}>{lec.leyendo === 'ia' ? t('leyendo_ia', 'Leyendo con IA…') : t('leyendo', 'Leyendo el documento…')}</p>}
      {lec.avisos.length > 0 && <AvisoAtencion>{lec.avisos.map((a) => <span key={a} className="block">{a}</span>)}</AvisoAtencion>}
      {lec.leido_por && !lec.leyendo && <Ayuda>{t('leido', 'Datos leídos ({p}): revísalos antes de guardar.').replace('{p}', lec.leido_por)}</Ayuda>}
    </div>
  );

  // ── Bien ──
  const nuevoBien = (f = null) => {
    setError(''); setAviso(''); setRep(null); setLec(LECTURA_VACIA);
    const fecha = f ? (f.fecha || f.fecha_documento || '') : '';
    const meses = String(d?.meses?.compra ?? 36);
    setBien({
      ...BIEN_VACIO, garantia_meses: meses, fecha_compra: fecha, fin_garantia: sumarMeses(fecha, meses),
      ...(f ? {
        nombre: f.concepto || sinExt(f.nombre_original), archivo_id: String(f.archivo_id),
        proveedor_nombre: f.emisor_nombre || '', proveedor_nif: f.emisor_nif || '', importe: importeTexto(f.total),
      } : {}),
    });
  };
  const editarBien = (e) => {
    setError(''); setAviso(''); setRep(null); setLec(LECTURA_VACIA);
    setBien({
      ...Object.fromEntries(Object.keys(BIEN_VACIO).map((k) => [k, aTexto(e[k])])),
      id: e.id, importe: importeTexto(e.importe), finManual: true,
    });
  };
  const cambiarBien = (k, v) => setBien((b) => {
    const n = { ...b, [k]: v };
    if (k === 'fin_garantia') n.finManual = true;
    if ((k === 'fecha_compra' || k === 'garantia_meses') && !b.finManual) n.fin_garantia = sumarMeses(n.fecha_compra, n.garantia_meses);
    if (k === 'archivo_id' && v) {
      const f = factura(v);
      if (f) {
        if (!n.proveedor_nombre) n.proveedor_nombre = f.emisor_nombre || '';
        if (!n.proveedor_nif) n.proveedor_nif = f.emisor_nif || '';
        if (!n.importe && f.total != null) n.importe = importeTexto(f.total);
        if (!n.nombre) n.nombre = f.concepto || sinExt(f.nombre_original);
        if (!n.fecha_compra && (f.fecha || f.fecha_documento)) {
          n.fecha_compra = f.fecha || f.fecha_documento;
          if (!b.finManual) n.fin_garantia = sumarMeses(n.fecha_compra, n.garantia_meses);
        }
      }
    }
    return n;
  });
  const guardarBien = async (ev) => {
    ev.preventDefault();
    setOcupado(true); setError('');
    try {
      const { id } = bien;
      await pedir(`/propiedades/${propiedadId}/garantias${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(limpio(bien)) });
      const extra = await datosHacienda({ archivo: bien.archivo_id, fecha: bien.fecha_compra, emisor: bien.proveedor_nombre, nif: bien.proveedor_nif, importe: bien.importe, concepto: bien.nombre });
      setBien(null); setLec(LECTURA_VACIA); setAviso(`${t('guardado', 'Guardado.')}${extra}`); await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  // ── Reparación ──
  const nuevaRep = (e) => {
    setError(''); setAviso(''); setBien(null); setLec(LECTURA_VACIA);
    setAbiertos((s) => new Set(s).add(e.id));
    setRep({ ...REP_VACIA, equipo: e.id, garantia_meses: String(d?.meses?.reparacion ?? 6) });
  };
  const editarRep = (e, r) => {
    setError(''); setAviso(''); setBien(null); setLec(LECTURA_VACIA);
    setRep({
      ...Object.fromEntries(Object.keys(REP_VACIA).map((k) => [k, aTexto(r[k])])),
      equipo: e.id, id: r.id, importe: importeTexto(r.importe), finManual: true,
      conFactura: Number(r.importe) > 0 || Boolean(factura(r.archivo_id)?.es_factura),
    });
  };
  const cambiarRep = (k, v) => setRep((b) => {
    const n = { ...b, [k]: v };
    if (k === 'fin_garantia') n.finManual = true;
    if ((k === 'fecha' || k === 'garantia_meses') && !b.finManual) n.fin_garantia = sumarMeses(n.fecha, n.garantia_meses);
    if (k === 'archivo_id' && v) {
      const f = factura(v);
      if (f) {
        if (!n.proveedor_nombre) n.proveedor_nombre = f.emisor_nombre || '';
        if (!n.importe && f.total != null) n.importe = importeTexto(f.total);
        if (!n.descripcion) n.descripcion = f.concepto || '';
        if (!n.fecha && (f.fecha || f.fecha_documento)) {
          n.fecha = f.fecha || f.fecha_documento;
          if (!b.finManual) n.fin_garantia = sumarMeses(n.fecha, n.garantia_meses);
        }
      }
    }
    return n;
  });
  const guardarRep = async (ev) => {
    ev.preventDefault();
    setOcupado(true); setError('');
    try {
      const { id, equipo } = rep;
      const cuerpo = { ...limpio(rep), ...(rep.conFactura ? {} : { importe: '' }) };
      await pedir(`/propiedades/${propiedadId}/garantias/${equipo}/reparaciones${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(cuerpo) });
      const extra = rep.conFactura
        ? await datosHacienda({ archivo: rep.archivo_id, fecha: rep.fecha, emisor: rep.proveedor_nombre, importe: rep.importe, concepto: rep.descripcion })
        : '';
      setRep(null); setLec(LECTURA_VACIA); setAviso(`${t('guardado', 'Guardado.')}${extra}`); await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  // ── Borrar: una sola confirmación, en rojo debajo de la fila ──
  const confirmarBorrado = async () => {
    const b = borrando; setBorrando(null); setError('');
    try {
      await pedir(b.tipo === 'bien' ? `/propiedades/${propiedadId}/garantias/${b.id}` : `/propiedades/${propiedadId}/garantias/${b.equipo}/reparaciones/${b.id}`, { method: 'DELETE' });
      await cargar();
    } catch (e) { setError(e.message); }
  };
  const avisoBorrar = (tipo, id) => (borrando?.tipo === tipo && borrando?.id === id ? (
    <tr key={`b-${tipo}-${id}`}>
      <td colSpan={8} className="px-4 pb-2">
        <AvisoError>
          <span>{borrando.texto}</span>
          <span className="mt-2 flex gap-2">
            <button type="button" onClick={confirmarBorrado} className={`rounded-lg border border-current px-3 py-1 ${MICRO}`}>{t('borrar', 'Borrar')}</button>
            <button type="button" onClick={() => setBorrando(null)} className={`rounded-lg border border-current px-3 py-1 ${MICRO}`}>{t('cancelar', 'Cancelar')}</button>
          </span>
        </AvisoError>
      </td>
    </tr>
  ) : null);

  // ── Reclamar: el texto con los datos para el proveedor ──
  const textoReclamar = (e) => {
    const f = factura(e.archivo_id);
    const ultima = e.reparaciones[e.reparaciones.length - 1];
    return [
      t('rec_saludo', 'Buenos días:'), '',
      t('rec_intro', 'Les escribo para reclamar la garantía del siguiente bien, que ha dejado de funcionar correctamente:'), '',
      `${t('rec_bien', 'Bien')}: ${[e.nombre, e.marca, e.modelo].filter(Boolean).join(' · ')}`,
      e.numero_serie ? `${t('rec_serie', 'Nº de serie')}: ${e.numero_serie}` : null,
      `${t('rec_compra', 'Fecha de compra')}: ${fechaEs(e.fecha_compra)}`,
      f?.numero_factura ? `${t('rec_factura', 'Nº de factura')}: ${f.numero_factura}` : null,
      e.importe != null ? `${t('rec_importe', 'Importe')}: ${euros(e.importe)}` : null,
      ultima ? `${t('rec_reparado', 'Última reparación')}: ${fechaEs(ultima.fecha)}${ultima.descripcion ? ` (${ultima.descripcion})` : ''}` : null,
      `${t('rec_fin', 'Garantía vigente hasta')}: ${fechaEs(e.fin_efectivo)}`,
      `${t('rec_lugar', 'Dónde está')}: ${lugar(e)}`, '',
      `${t('rec_averia', 'Descripción de la avería')}: …`, '',
      t('rec_adjunto', 'Adjunto la factura de compra. Quedo a la espera de su respuesta.'), '',
      t('rec_gracias', 'Gracias.'),
    ].filter((x) => x != null).join('\n');
  };

  if (!d && !error) return <p className={MICRO}>{t('cargando', 'Cargando…')}</p>;
  if (!d) return <AvisoError>{error}</AvisoError>;

  const lista = d.bienes.filter((e) => (!filtroEstado || e.estado === filtroEstado)
    && (!filtroEspacio || (filtroEspacio === 'piso' ? !e.espacio_id : String(e.espacio_id) === filtroEspacio)));
  const opcionesFactura = (actual) => [
    ...d.facturas.map((f) => <option key={f.archivo_id} value={f.archivo_id}>{nombreFactura(f)}{f.tipo_hacienda ? ` (${nombreHacienda(f.tipo_hacienda)})` : ''}</option>),
    ...(actual && !factura(actual) ? [<option key="x" value={actual}>{t('factura_no_disponible', 'Factura no disponible')}</option>] : []),
  ];
  const fb = (k) => ({ value: bien?.[k] ?? '', onChange: (e) => cambiarBien(k, e.target.value) });
  const fr = (k) => ({ value: rep?.[k] ?? '', onChange: (e) => cambiarRep(k, e.target.value) });
  const opcionesLugar = espacios.map((s) => <option key={s.id} value={s.id}>{s.codigo} · {s.nombre}</option>);

  return (
    <div className="space-y-4">
      <AvisoError>{error}</AvisoError>
      <AvisoOk>{aviso}</AvisoOk>
      <div className="flex flex-wrap items-center gap-3">
        {puedeEscribir && !bien && <BotonAnadir texto={t('nuevo', 'Añadir bien')} onClick={() => nuevoBien()} pequeno />}
        <label className="flex items-center gap-2 text-sm font-bold">
          {t('estado', 'Estado')}
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={`${CLASE_INPUT} w-auto`}>
            <option value="">{t('todos', 'Todos')}</option>
            <option value="VIGENTE">{t('vigente', 'Vigente')}</option>
            <option value="CADUCADA">{t('caducada', 'Caducada')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          {t('donde', 'Dónde')}
          <select value={filtroEspacio} onChange={(e) => setFiltroEspacio(e.target.value)} className={`${CLASE_INPUT} w-auto`}>
            <option value="">{t('todo', 'Piso y habitaciones')}</option>
            <option value="piso">{t('piso', 'Piso')}</option>
            {opcionesLugar}
          </select>
        </label>
      </div>
      <Ayuda>
        {t('ayuda', 'Plazos por defecto: {c} meses una compra y {r} una reparación (Fiscalidad → Parámetros fiscales). Una reparación alarga la garantía si acaba más tarde.')
          .replace('{c}', d.meses.compra).replace('{r}', d.meses.reparacion)}
      </Ayuda>

      {/* Facturas de electrodomésticos que aún no son un bien */}
      {puedeEscribir && d.pendientes.length > 0 && (
        <AvisoAtencion>
          <p>{t('pendientes', 'Facturas de electrodomésticos y mobiliario sin pasar a garantías:')}</p>
          <ul className="mt-2 space-y-1">
            {d.pendientes.map((p) => (
              <li key={p.archivo_id} className="flex flex-wrap items-center gap-2">
                <span>{nombreFactura(p)}{p.concepto ? ` · ${p.concepto}` : ''}</span>
                <button type="button" onClick={() => nuevoBien(p)} className={`rounded-lg border border-current px-2 py-0.5 ${MICRO}`}>{t('pasar', 'Añadir a garantías')}</button>
              </li>
            ))}
          </ul>
        </AvisoAtencion>
      )}

      {/* Formulario de bien */}
      {bien && (
        <Recuadro as="form" onSubmit={guardarBien} className="grid gap-4 rejilla-campos">
          <h3 className="font-black tracking-tight text-on-surface2 sm:col-span-full">{bien.id ? t('editar', 'Editar bien') : t('nuevo', 'Añadir bien')}</h3>
          <Campo etiqueta={t('factura_compra', 'Factura de compra')} ancho="sm:col-span-full">
            <select {...fb('archivo_id')} className={CLASE_INPUT}>
              <option value="">{t('sin_factura', '— Sin factura —')}</option>
              {opcionesFactura(bien.archivo_id)}
            </select>
          </Campo>
          {puedeEscribir && zonaDocumento(bien.archivo_id, 'compra', aplicarBien, () => setBien((b) => ({ ...b, archivo_id: '' })))}
          <Campo etiqueta={`${t('bien', 'Bien')} *`} ancho="sm:col-span-2"><input required maxLength={150} {...fb('nombre')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('donde', 'Dónde')}>
            <select {...fb('espacio_id')} className={CLASE_INPUT}><option value="">{t('piso', 'Piso')}</option>{opcionesLugar}</select>
          </Campo>
          <Campo etiqueta={t('marca', 'Marca')}><input maxLength={80} {...fb('marca')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('modelo', 'Modelo')}><input maxLength={80} {...fb('modelo')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('serie', 'Nº de serie')}><input maxLength={80} {...fb('numero_serie')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('proveedor', 'Proveedor')} ancho="sm:col-span-2"><input maxLength={200} {...fb('proveedor_nombre')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('nif', 'NIF del proveedor')}><input maxLength={20} {...fb('proveedor_nif')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={`${t('fecha_compra', 'Fecha de compra')} *`}>
            <CampoFecha required value={bien.fecha_compra} onChange={(e) => cambiarBien('fecha_compra', e.target.value)} className={CLASE_INPUT} />
          </Campo>
          <Campo etiqueta={t('importe', 'Importe')}><input inputMode="decimal" {...fb('importe')} className={`${CLASE_INPUT} text-right font-mono`} /></Campo>
          <Campo etiqueta={t('meses', 'Garantía (meses)')}><input type="number" min="0" max="600" {...fb('garantia_meses')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('fin', 'Fin de garantía')}>
            <CampoFecha value={bien.fin_garantia} onChange={(e) => cambiarBien('fin_garantia', e.target.value)} className={CLASE_INPUT} />
          </Campo>
          <Campo etiqueta={t('notas', 'Notas')} ancho="sm:col-span-full"><input maxLength={2000} {...fb('notas')} className={CLASE_INPUT} /></Campo>
          <div className="flex justify-end gap-2 sm:col-span-full">
            <Button type="button" variant="secondary" leftIcon={<X size={16} />} disabled={ocupado} onClick={() => setBien(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado} disabled={ocupado} leftIcon={<Check size={16} />}>{t('guardar', 'Guardar')}</Button>
          </div>
        </Recuadro>
      )}

      {/* Formulario de reparación */}
      {rep && (
        <Recuadro as="form" onSubmit={guardarRep} className="grid gap-4 rejilla-campos">
          <h3 className="font-black tracking-tight text-on-surface2 sm:col-span-full">
            {(rep.id ? t('editar_rep', 'Editar reparación de «{b}»') : t('nueva_rep', 'Añadir reparación de «{b}»'))
              .replace('{b}', d.bienes.find((e) => e.id === rep.equipo)?.nombre || '')}
          </h3>
          <Campo etiqueta={t('con_factura', 'Con factura')}>
            <div className="flex h-full items-center gap-3">
              <Toggle checked={rep.conFactura} onChange={(v) => setRep((b) => ({ ...b, conFactura: v, ...(v ? {} : { importe: '' }) }))} />
              {!rep.conFactura && <span className="text-xs font-bold">{t('en_garantia', 'En garantía: sin coste')}</span>}
            </div>
          </Campo>
          <Campo etiqueta={rep.conFactura ? t('factura_rep', 'Factura de la reparación') : t('parte_rep', 'Parte o albarán de la reparación')} ancho="sm:col-span-full">
            <select {...fr('archivo_id')} className={CLASE_INPUT}>
              <option value="">{t('sin_factura', '— Sin factura —')}</option>
              {opcionesFactura(rep.archivo_id)}
            </select>
          </Campo>
          {puedeEscribir && zonaDocumento(rep.archivo_id, rep.conFactura ? 'reparacion' : 'garantia', aplicarRep, () => setRep((b) => ({ ...b, archivo_id: '' })))}
          <Campo etiqueta={`${t('fecha', 'Fecha')} *`}>
            <CampoFecha required value={rep.fecha} onChange={(e) => cambiarRep('fecha', e.target.value)} className={CLASE_INPUT} />
          </Campo>
          <Campo etiqueta={t('proveedor', 'Proveedor')} ancho="sm:col-span-2"><input maxLength={200} {...fr('proveedor_nombre')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('descripcion', 'Qué se reparó')} ancho="sm:col-span-full"><input maxLength={255} {...fr('descripcion')} className={CLASE_INPUT} /></Campo>
          {rep.conFactura && <Campo etiqueta={t('importe', 'Importe')}><input inputMode="decimal" {...fr('importe')} className={`${CLASE_INPUT} text-right font-mono`} /></Campo>}
          <Campo etiqueta={t('meses', 'Garantía (meses)')}><input type="number" min="0" max="600" {...fr('garantia_meses')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('fin', 'Fin de garantía')}>
            <CampoFecha value={rep.fin_garantia} onChange={(e) => cambiarRep('fin_garantia', e.target.value)} className={CLASE_INPUT} />
          </Campo>
          <div className="flex justify-end gap-2 sm:col-span-full">
            <Button type="button" variant="secondary" leftIcon={<X size={16} />} disabled={ocupado} onClick={() => setRep(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado} disabled={ocupado} leftIcon={<Check size={16} />}>{t('guardar', 'Guardar')}</Button>
          </div>
        </Recuadro>
      )}

      {/* Lista: vigentes primero (las que caducan antes arriba), luego caducadas */}
      <TablaTema columnas={[
        { texto: '' }, { texto: t('estado', 'Estado') }, { texto: t('bien', 'Bien') }, { texto: t('donde', 'Dónde') }, { texto: t('proveedor', 'Proveedor') },
        { texto: t('comprado', 'Comprado') }, { texto: t('fin', 'Fin de garantía') }, { texto: t('importe', 'Importe'), derecha: true },
      ]}>
        {lista.length === 0 && <FilaVacia columnas={8}>{d.bienes.length ? t('nada_filtro', 'Ningún bien con este filtro.') : t('vacio', 'Todavía no hay bienes con garantía.')}</FilaVacia>}
        {lista.map((e, i) => (
          <React.Fragment key={e.id}>
            <tr className={claseFila(i)}>
              <td className={`${TD} whitespace-nowrap`}>
                <BotonFila icono={<ChevronRight size={15} className={`transition-transform ${abiertos.has(e.id) ? 'rotate-90' : ''}`} />} titulo={t('reparaciones', 'Reparaciones')}
                  onClick={() => setAbiertos((s) => { const n = new Set(s); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })} />
                {e.con_factura && <BotonFila icono={<Eye size={15} />} titulo={t('ver_factura', 'Ver la factura')} onClick={() => verFactura(e.archivo_id)} />}
                <BotonFila icono={<Megaphone size={15} />} titulo={t('reclamar', 'Reclamar garantía')} onClick={() => setReclamar(textoReclamar(e))} />
                {puedeEscribir && <BotonFila icono={<Wrench size={15} />} titulo={t('nueva_rep_corto', 'Añadir reparación')} onClick={() => nuevaRep(e)} />}
                {puedeEscribir && <BotonFila icono={<Pencil size={15} />} titulo={t('editar', 'Editar bien')} onClick={() => editarBien(e)} />}
                {puedeEscribir && (
                  <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar', 'Borrar')}
                    onClick={() => setBorrando({ tipo: 'bien', id: e.id, texto: t('confirmar_bien', '¿Borrar «{b}» de las garantías? La factura no se borra.').replace('{b}', e.nombre) })} />
                )}
              </td>
              <td className={TD}><Estado estado={e.estado} t={t} /></td>
              <td className={TD}>
                <span className="font-black">{e.nombre}</span>
                {(e.marca || e.modelo) && <span className="block text-xs font-bold">{[e.marca, e.modelo].filter(Boolean).join(' · ')}</span>}
                {e.reparaciones.length > 0 && <span className="block text-xs font-bold">{t('n_reparaciones', '{n} reparación(es)').replace('{n}', e.reparaciones.length)}</span>}
                {!e.con_factura && <span className="block text-xs font-bold">{t('falta_factura', 'Le falta la factura')}</span>}
              </td>
              <td className={TD}>{lugar(e)}</td>
              <td className={TD}>{e.proveedor_nombre}</td>
              <td className={`${TD} font-mono`}>{fechaEs(e.fecha_compra)}</td>
              <td className={`${TD} font-mono font-black`}>{fechaEs(e.fin_efectivo)}</td>
              <td className={`${TD} text-right font-mono`}>{euros(e.importe)}</td>
            </tr>
            {avisoBorrar('bien', e.id)}
            {abiertos.has(e.id) && e.reparaciones.length === 0 && (
              <tr className={claseFila(i)}><td colSpan={8} className="px-4 pb-3 pl-14 text-xs font-bold">{t('sin_reparaciones', 'Sin reparaciones.')}</td></tr>
            )}
            {abiertos.has(e.id) && e.reparaciones.map((r) => (
              <React.Fragment key={`r${r.id}`}>
                <tr className={claseFila(i)}>
                  <td className={`${TD} whitespace-nowrap pl-10`}>
                    {r.con_factura && <BotonFila icono={<Eye size={15} />} titulo={t('ver_factura', 'Ver la factura')} onClick={() => verFactura(r.archivo_id)} />}
                    {puedeEscribir && <BotonFila icono={<Pencil size={15} />} titulo={t('editar_rep_corto', 'Editar reparación')} onClick={() => editarRep(e, r)} />}
                    {puedeEscribir && (
                      <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar', 'Borrar')}
                        onClick={() => setBorrando({ tipo: 'rep', id: r.id, equipo: e.id, texto: t('confirmar_rep', '¿Borrar esta reparación? La factura no se borra.') })} />
                    )}
                  </td>
                  <td className={`${TD} ${MICRO}`}><Wrench size={13} className="mr-1 inline" />{t('reparacion', 'Reparación')}</td>
                  <td className={TD}>
                    {r.descripcion}
                    {!(Number(r.importe) > 0) && !factura(r.archivo_id)?.es_factura
                      ? <span className="block text-xs font-bold">{t('rep_garantia', 'En garantía (sin factura)')}</span>
                      : !r.con_factura && <span className="block text-xs font-bold">{t('falta_factura', 'Le falta la factura')}</span>}
                  </td>
                  <td className={TD} />
                  <td className={TD}>{r.proveedor_nombre}</td>
                  <td className={`${TD} font-mono`}>{fechaEs(r.fecha)}</td>
                  <td className={`${TD} font-mono`}>{fechaEs(r.fin_garantia)}</td>
                  <td className={`${TD} text-right font-mono`}>{euros(r.importe)}</td>
                </tr>
                {avisoBorrar('rep', r.id)}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </TablaTema>

      {reclamar && (
        <VentanaModal titulo={t('reclamar', 'Reclamar garantía')} onCerrar={() => setReclamar(null)}>
          <div className="space-y-4">
            <Ayuda>{t('reclamar_ayuda', 'Completa la avería, copia el texto y envíalo al proveedor con la factura (botón «Ver» → Descargar).')}</Ayuda>
            <textarea rows={16} value={reclamar} onChange={(e) => setReclamar(e.target.value)} className={`${CLASE_INPUT} text-base leading-relaxed`} />
            <div className="flex justify-end">
              <Button type="button" leftIcon={<Copy size={16} />}
                onClick={() => navigator.clipboard?.writeText(reclamar).then(() => setAviso(t('copiado', 'Texto copiado.'))).catch(() => {})}>
                {t('copiar', 'Copiar texto')}
              </Button>
            </div>
          </div>
        </VentanaModal>
      )}
      {visor && (
        <VisorFactura archivo={visor} propiedadId={propiedadId} tiposHacienda={TIPOS_HACIENDA} nombreHacienda={nombreHacienda}
          soloLectura={!puedeEscribir} onCerrar={() => { setVisor(null); cargar(); }} onGuardado={() => {}} onDatos={null} onDescargar={descargar} />
      )}
    </div>
  );
}
