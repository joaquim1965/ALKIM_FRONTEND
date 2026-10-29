/**
 * LecturaContrato.jsx — al subir un CONTRATO DE ARRENDAMIENTO (Contratos → Documentos
 * de la propiedad) se lee solo y se pasa a Contratos → Datos con la forma estándar
 * (components/Documentos/ComparadorCampos.jsx, docs/NORMAS_DESARROLLO.md §12). 16/10/2026.
 *
 * Arriba, a dónde va: contrato nuevo o uno que ya existe y, si la propiedad tiene
 * espacios, el espacio (se propone el que nombra el contrato: «habitación nº 2»).
 * Debajo, los inquilinos (nombre, apellidos, DNI, teléfono, email): al aplicar se dan de
 * alta en Terceros o, si ya están (por DNI), se sustituyen sus datos por los del contrato
 * (16/10/2026). Y qué datos del contrato se pasan: modalidad, tipo, fechas, renta, día y
 * forma de pago, fianza, actualización y vivienda habitual. El espacio propuesto es el
 * elegido al subir el documento.
 *
 * API: POST /propiedades/:id/contratos/leer · POST /propiedades/:id/contratos/inquilinos
 *      GET/POST/PUT /propiedades/:id/contratos[/:contrato]
 *      GET /recibos/catalogos
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FileSignature, Sparkles, Check } from 'lucide-react';
import Button from '../../components/UI/Button';
import Toggle from '../../components/UI/Toggle';
import { VentanaModal, AvisoError, AvisoAtencion, Ayuda, Campo, CLASE_INPUT, TablaTema, claseFila, TD, Rotulo } from '../../components/UI/TemaPagina';
import ComparadorCampos, { eleccionInicial, valoresElegidos, cambiosElegidos } from '../../components/Documentos/ComparadorCampos';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { formatImporte } from '../../utils/format';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

const hoy = () => new Date().toISOString().slice(0, 10);
const fechaEs = (f) => (f ? f.split('-').reverse().join('/') : '');
const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const str = (v) => (v == null || v === '' ? null : String(v));

/** Contrato existente → valores con los nombres de los campos del comparador. */
function actualesDe(c) {
  if (!c) return {};
  return {
    modalidad_id: str(c.modalidad_id), tipo_id: str(c.tipo_id),
    fecha_inicio: c.fecha_inicio, fecha_fin: c.fecha_fin, renta_mensual: c.renta_mensual, dia_pago: c.dia_pago,
    forma_pago: c.forma_pago, fianza_importe: c.fianza_importe, fianza_depositada_en: c.fianza_depositada_en,
    indice_actualizacion: c.indice_actualizacion,
    es_vivienda_habitual_inquilino: c.es_vivienda_habitual_inquilino == null ? null : String(Number(c.es_vivienda_habitual_inquilino)),
  };
}

/** Espacio que nombra el contrato («Habitación 2») → id del espacio, si hay uno claro. */
function espacioDe(texto, alquilables) {
  if (!texto) return '';
  const [, clase, num] = sinAcentos(texto).match(/^(\S+)\s+(\S+)$/) || [];
  if (!num) return '';
  const raiz = clase?.startsWith('habit') ? 'habit' : clase?.slice(0, 4);
  const conNumero = (s) => new RegExp(`(^|[^0-9a-z])${num}($|[^0-9a-z])`).test(sinAcentos(s));
  const c = alquilables.filter((e) => conNumero(`${e.codigo} ${e.nombre}`) && (!raiz || sinAcentos(`${e.nombre} ${e.tipo_nombre || ''}`).includes(raiz)));
  const d = c.length ? c : alquilables.filter((e) => conNumero(e.codigo) || conNumero(e.nombre));
  return d.length === 1 ? String(d[0].id) : '';
}

export default function LecturaContrato({ propiedadId, archivo, posicion, espacios = [], onCerrar, onAplicado }) {
  const { t } = useTmTr('Contratos');
  const [lectura, setLectura] = useState(null);       // { leidos, inquilino, leido_por, avisos }
  const [contratos, setContratos] = useState([]);
  const [cat, setCat] = useState({ modalidades: [], tipos: [] });
  const [inquilinos, setInquilinos] = useState([]);   // leídos y editables: { nombre, apellidos, nif, telefono, email, tercero_id }
  const [contratoId, setContratoId] = useState('');   // '' = contrato nuevo
  const [espacioId, setEspacioId] = useState('');     // '' sin elegir · 'entera' · id
  const [eleccion, setEleccion] = useState({});
  // Inquilinos leídos en un contrato que ya existe (26/10/2026, petición del usuario):
  // NO = reemplazan a los del contrato · SÍ = se añaden al final (p. ej. una novación
  // que suma un inquilino). En un contrato nuevo no aplica.
  const [anadirInquilinos, setAnadirInquilinos] = useState(false);
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');

  const alquilables = useMemo(() => espacios.filter((e) => !Number(e.es_comun) && Number(e.activo ?? 1)), [espacios]);
  const contrato = contratos.find((c) => String(c.id) === String(contratoId)) || null;
  const nuevo = !contrato;
  const CAMPOS = useMemo(() => [
    { c: 'modalidad_id', nombre: t('modalidad', 'Modalidad'), tipo: 'lista', sinOtro: true, opciones: cat.modalidades.map((m) => [String(m.id), t(`mod_${m.codigo.toLowerCase()}`, m.nombre)]) },
    { c: 'tipo_id', nombre: t('tipo_contrato', 'Tipo de contrato'), tipo: 'lista', sinOtro: true, opciones: cat.tipos.map((x) => [String(x.id), t(`tipo_${x.codigo.toLowerCase()}`, x.nombre)]) },
    { c: 'fecha_inicio', nombre: t('inicio', 'Inicio'), tipo: 'fecha' },
    { c: 'fecha_fin', nombre: t('fin', 'Fin (opcional)'), tipo: 'fecha' },
    { c: 'renta_mensual', nombre: t('renta', 'Renta mensual (€)'), tipo: 'importe' },
    { c: 'dia_pago', nombre: t('dia_pago', 'Día de pago'), tipo: 'numero' },
    { c: 'forma_pago', nombre: t('forma_pago', 'Forma de pago'), tipo: 'lista', sinOtro: true, opciones: [['TRANSFERENCIA', t('fp_transferencia', 'Transferencia')], ['DOMICILIACION', t('fp_domiciliacion', 'Domiciliación')], ['EFECTIVO', t('fp_efectivo', 'Efectivo')]] },
    { c: 'fianza_importe', nombre: t('fianza', 'Fianza (€)'), tipo: 'importe' },
    { c: 'fianza_depositada_en', nombre: t('fianza_en', 'Fianza depositada en'), tipo: 'texto' },
    { c: 'indice_actualizacion', nombre: t('actualizacion', 'Actualización de la renta'), tipo: 'lista', sinOtro: true, opciones: [['IRAV', 'IRAV'], ['IPC', 'IPC'], ['FIJO', t('act_fijo', 'Importe fijo pactado')], ['NINGUNO', t('act_ninguno', 'No se actualiza')]] },
    { c: 'es_vivienda_habitual_inquilino', nombre: t('vivienda_habitual', 'Es la vivienda habitual del inquilino'), tipo: 'lista', sinOtro: true, opciones: [['1', t('si', 'Sí')], ['0', t('no', 'No')]] },
  ], [t, cat]);

  /** Lo leído con los códigos pasados a ids de los catálogos. */
  const leidosDe = (d, catalogo) => {
    const r = { ...d };
    if (d.modalidad_codigo) r.modalidad_id = str(catalogo.modalidades.find((m) => m.codigo === d.modalidad_codigo)?.id);
    if (d.tipo_codigo) r.tipo_id = str(catalogo.tipos.find((x) => x.codigo === d.tipo_codigo)?.id);
    if (typeof d.es_vivienda_habitual_inquilino === 'boolean') r.es_vivienda_habitual_inquilino = d.es_vivienda_habitual_inquilino ? '1' : '0';
    delete r.modalidad_codigo; delete r.tipo_codigo; delete r.espacio_texto; delete r.inquilinos;
    return r;
  };
  const leidos = useMemo(() => leidosDe(lectura?.leidos || {}, cat), [lectura, cat]);
  const actuales = useMemo(() => actualesDe(contrato), [contrato]);

  const leer = async (modo) => {
    setOcupado(modo); setError('');
    try {
      const [{ data }, con, cats] = await Promise.all([
        pedir(`/propiedades/${propiedadId}/contratos/leer`, { method: 'POST', body: JSON.stringify({ archivo_id: archivo.id, modo }) }),
        pedir(`/propiedades/${propiedadId}/contratos`), pedir('/recibos/catalogos'),
      ]);
      const lista = con.data || [];
      const catalogo = cats.data || { modalidades: [], tipos: [] };
      setContratos(lista); setCat(catalogo);
      setInquilinos((data.leidos.inquilinos || []).map((x) => ({ nombre: '', apellidos: '', telefono: '', email: '', ...Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v ?? ''])) })));
      setLectura(data);
      // Espacio: el elegido al subir el documento; si no, el que nombra el texto.
      // Con «Leer datos» de un documento ya subido: su vínculo con un espacio, o la propiedad entera.
      const vinculado = (archivo.vinculos || []).find((x) => x.objeto_tabla === 'im_space' && alquilables.some((e) => e.id === Number(x.objeto_id)));
      const alSubir = archivo.destino ? (archivo.destino === 'base' ? 'entera' : String(archivo.destino))
        : (vinculado ? String(vinculado.objeto_id) : (archivo.vinculos ? 'entera' : ''));
      const espacioLeido = alSubir || espacioDe(data.leidos.espacio_texto, alquilables) || '';
      // Contrato propuesto (27/10/2026, más estricto): misma fecha de inicio Y (alguno de los inquilinos
      // leídos ya está en él, o —si los inquilinos son nuevos— es del mismo espacio). Antes bastaba la
      // fecha: el contrato de MR-H3 (Deicy) se propuso sobre el de MR-H1 (Fabiana), que empezaba el mismo
      // día, y al aplicar le cambió los inquilinos y el espacio. Si no, contrato nuevo.
      const l = leidosDe(data.leidos, catalogo);
      const ids = (data.leidos.inquilinos || []).map((x) => String(x.tercero_id || '')).filter(Boolean);
      const delEspacio = (c) => (espacioLeido === 'entera' ? !(c.espacios || []).length
        : Boolean(espacioLeido) && (c.espacios || []).some((e) => String(e.espacio_id) === espacioLeido));
      const mismo = lista.find((c) => l.fecha_inicio && c.fecha_inicio === l.fecha_inicio
        && (ids.length ? (c.partes || []).some((p) => ids.includes(String(p.tercero_id))) : delEspacio(c))) || null;
      setContratoId(mismo ? String(mismo.id) : '');
      setEspacioId((e) => e || alSubir || (mismo ? (mismo.espacios.length === 1 ? String(mismo.espacios[0].espacio_id) : (mismo.espacios.length ? '' : 'entera')) : espacioDe(data.leidos.espacio_texto, alquilables)));
      setEleccion(eleccionInicial(CAMPOS, l, actualesDe(mismo)));
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };
  useEffect(() => { leer('propio'); }, [archivo.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Las opciones de las listas llegan con la lectura: se recalcula la elección inicial una vez.
  useEffect(() => { if (lectura) setEleccion(eleccionInicial(CAMPOS, leidos, actuales)); }, [CAMPOS]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarContrato = (id) => {
    setContratoId(id);
    const c = contratos.find((x) => String(x.id) === String(id));
    if (c) setEspacioId(c.espacios.length === 1 ? String(c.espacios[0].espacio_id) : (c.espacios.length ? '' : 'entera'));
    setEleccion(eleccionInicial(CAMPOS, leidos, actualesDe(c)));
  };

  // AÑADIR con «Contrato nuevo» (26/10/2026): el interruptor ya no queda bloqueado; se elige
  // solo el contrato existente más probable: primero el que ya tiene a alguno de los inquilinos
  // leídos y es del mismo espacio, luego el de esos inquilinos, luego el del espacio; entre
  // iguales, el de inicio más reciente. Si no hay ninguno, se explica.
  const cambiarModoInquilinos = (v) => {
    setError('');
    if (!v || !nuevo) { setAnadirInquilinos(v); return; }
    const ids = inquilinos.map((x) => String(x.tercero_id || '')).filter(Boolean);
    const puntos = (c) => ((c.partes || []).some((p) => ids.includes(String(p.tercero_id))) ? 2 : 0)
      + (espacioId && (c.espacios || []).some((e) => String(e.espacio_id) === String(espacioId)) ? 1 : 0);
    const candidato = [...contratos].filter((c) => puntos(c) > 0)
      .sort((a, b) => puntos(b) - puntos(a) || String(b.fecha_inicio || '').localeCompare(String(a.fecha_inicio || '')))[0];
    if (!candidato) { setError(t('anadir_sin_contrato', 'No hay ningún contrato de este espacio ni de estos inquilinos al que añadirlos. Elige uno en «Va a contratos».')); return; }
    cambiarContrato(String(candidato.id));
    setAnadirInquilinos(true);
  };

  const cambios = lectura ? cambiosElegidos(CAMPOS, leidos, actuales, eleccion) : {};
  const espaciosActuales = contrato ? contrato.espacios.map((e) => String(e.espacio_id)) : [];
  const espaciosNuevos = espacioId && espacioId !== 'entera' ? [espacioId] : [];
  const cambiaEspacio = alquilables.length > 0 && espacioId && espaciosNuevos.join() !== espaciosActuales.join();
  // Sin nombre y apellidos (o razón social si es CIF) NO se da de alta en Terceros ni va al contrato (27/10/2026).
  const completo = (x) => String(x.nif || '').trim() && String(x.nombre || '').trim() && (x.tipo_documento === 'CIF' || String(x.apellidos || '').trim());
  const conNif = inquilinos.filter(completo);
  const titularesActuales = contrato ? (contrato.partes || []).filter((p) => ['TITULAR', 'COTITULAR'].includes(p.rol)).map((p) => p.documento).join(',') : '';
  const cambianInquilinos = conNif.length > 0;
  const n = Object.keys(cambios).length + (cambiaEspacio ? 1 : 0) + (cambianInquilinos ? 1 : 0);
  const cambiarInquilino = (i, k, v) => setInquilinos((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const aplicar = async () => {
    if (!n) return onCerrar();
    const v = valoresElegidos(CAMPOS, leidos, actuales, eleccion);
    setOcupado('aplicar'); setError('');
    try {
      const cuerpo = {};
      for (const k of ['modalidad_id', 'tipo_id', 'dia_pago']) if (k in cambios && v[k] != null) cuerpo[k] = Number(v[k]);
      for (const k of ['fecha_inicio', 'fecha_fin', 'renta_mensual', 'forma_pago', 'fianza_importe', 'fianza_depositada_en', 'indice_actualizacion']) if (k in cambios) cuerpo[k] = v[k];
      if ('es_vivienda_habitual_inquilino' in cambios) cuerpo.es_vivienda_habitual_inquilino = v.es_vivienda_habitual_inquilino === '1';
      // Inquilinos: alta o actualización en Terceros y, en el contrato, el primero titular y el resto cotitulares.
      let terceroPrincipal = null;
      if (cambianInquilinos) {
        const { data: guardados } = await pedir(`/propiedades/${propiedadId}/contratos/inquilinos`, { method: 'POST', body: JSON.stringify({
          inquilinos: conNif.map((x) => ({ nif: x.nif, tipo_documento: x.tipo_documento || null, nombre: x.nombre, apellidos: x.apellidos, telefono: x.telefono, email: x.email })),
        }) });
        const leidasPartes = guardados.filter((g) => g.id).map((g, i) => ({ tercero_id: g.id, rol: i ? 'COTITULAR' : 'TITULAR' }));
        if (anadirInquilinos && contrato) {
          // Añadir: se quedan todas las partes que ya tenía (titular, cotitulares, avalistas…)
          // y los leídos que aún no estaban van al final como cotitulares.
          const previas = (contrato.partes || []).map((p) => ({ tercero_id: p.tercero_id || null, entidad_id: p.entidad_id || null, rol: p.rol }));
          const ya = new Set(previas.filter((p) => p.tercero_id).map((p) => String(p.tercero_id)));
          const hayTitular = previas.some((p) => p.rol === 'TITULAR');
          cuerpo.partes = [...previas, ...leidasPartes.filter((x) => !ya.has(String(x.tercero_id))).map((x) => ({ ...x, rol: hayTitular ? 'COTITULAR' : x.rol }))];
        } else cuerpo.partes = leidasPartes;
        terceroPrincipal = guardados.find((g) => g.id)?.id || null;
      }
      if (cambiaEspacio || (nuevo && alquilables.length)) cuerpo.espacios = espaciosNuevos.map(Number);
      if (nuevo) {
        if (alquilables.length && !espacioId) throw new Error(t('falta_espacio', 'Elige el espacio que se alquila (o «Propiedad entera»).'));
        const faltan = [[t('modalidad', 'Modalidad'), !v.modalidad_id], [t('tipo_contrato', 'Tipo de contrato'), !v.tipo_id], [t('inicio', 'Inicio'), !v.fecha_inicio], [t('renta', 'Renta mensual (€)'), !v.renta_mensual]]
          .filter(([, f]) => f).map(([k]) => k);
        if (faltan.length) throw new Error(`${t('faltan_datos_contrato', 'Para crear el contrato falta')}: ${faltan.join(', ')}.`);
        const vigente = !v.fecha_fin || v.fecha_fin >= hoy();
        await pedir(`/propiedades/${propiedadId}/contratos`, { method: 'POST', body: JSON.stringify({
          explotacion: 'TITULARES', forma_pago: 'TRANSFERENCIA', dia_pago: 1, ...cuerpo,
          modalidad_id: Number(v.modalidad_id), tipo_id: Number(v.tipo_id), fecha_inicio: v.fecha_inicio, renta_mensual: v.renta_mensual,
          estado: vigente && terceroPrincipal ? 'VIGENTE' : (vigente ? 'BORRADOR' : 'FINALIZADO'),
        }) });
      } else {
        // Con recibos ya emitidos no se cambian ni la renta ni la fecha de inicio (como en el formulario).
        if (Number(contrato.recibos)) { delete cuerpo.renta_mensual; delete cuerpo.fecha_inicio; }
        if (Object.keys(cuerpo).length) await pedir(`/propiedades/${propiedadId}/contratos/${contrato.id}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
      }
      await onAplicado?.();
      onCerrar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };

  const conRecibos = contrato && Number(contrato.recibos) > 0 && ('renta_mensual' in cambios || 'fecha_inicio' in cambios);
  const textoResumen = nuevo
    ? t('resumen_contrato_nuevo', 'Se crea un contrato nuevo en Contratos → Datos.')
    : `${t('resumen_contrato_editar', 'Se actualiza el contrato {c}.').replace('{c}', contrato.codigo)}${conRecibos ? ` ${t('resumen_con_recibos', 'Ya tiene recibos: la renta y la fecha de inicio no se cambian.')}` : ''}`;

  return (
    <VentanaModal titulo={`${t('contrato_titulo', 'Datos del contrato de arrendamiento')}${posicion ? ` · ${posicion}` : ''}`} icono={<FileSignature size={20} />} onCerrar={() => !ocupado && onCerrar()} ancho="max-w-5xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Ayuda>
            {archivo.nombre_original || archivo.nombre}
            {lectura?.leido_por ? ` · ${t('leido_por', 'Leído con')} ${lectura.leido_por}` : ''}
          </Ayuda>
          <Button type="button" variant="secondary" size="sm" loading={ocupado === 'ia'} disabled={Boolean(ocupado)} leftIcon={<Sparkles size={16} />} onClick={() => leer('ia')}>
            {t('leer_ia', 'Leer con IA')}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta={t('va_a_contrato', 'Va a Contratos ▸')}>
            <select value={contratoId} onChange={(e) => cambiarContrato(e.target.value)} className={CLASE_INPUT} disabled={Boolean(ocupado)}>
              <option value="">{t('contrato_nuevo', 'Contrato nuevo')}</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} · {c.espacios.length ? c.espacios.map((e) => e.nombre || e.codigo).join(' + ') : t('entera', 'Propiedad entera')} · {fechaEs(c.fecha_inicio)} · {formatImporte(c.renta_mensual, '€')}
                </option>
              ))}
            </select>
          </Campo>
          {alquilables.length > 0 && (
            <Campo etiqueta={t('espacio', 'Espacio')}>
              <select value={espacioId} onChange={(e) => setEspacioId(e.target.value)} className={CLASE_INPUT} disabled={Boolean(ocupado)}>
                <option value="">{t('elige_espacio', '— Elige el espacio —')}</option>
                {alquilables.map((e) => <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}</option>)}
                <option value="entera">{t('entera', 'Propiedad entera')}</option>
              </select>
            </Campo>
          )}
        </div>
        {lectura && <Ayuda>{textoResumen}{lectura.leidos?.espacio_texto ? ` ${t('contrato_nombra', 'El contrato nombra: {e}.').replace('{e}', lectura.leidos.espacio_texto)}` : ''}</Ayuda>}

        <AvisoError>{error}</AvisoError>
        {lectura?.avisos?.map((a) => <AvisoAtencion key={a}>{a}</AvisoAtencion>)}
        {ocupado === 'propio' && !lectura && <Ayuda>{t('leyendo', 'Leyendo el documento…')}</Ayuda>}
        {lectura && inquilinos.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Rotulo>{t('inquilinos_contrato', 'Inquilinos del contrato')}</Rotulo>
              {/* Siempre visible y activo (26/10/2026): con «Contrato nuevo», AÑADIR elige el contrato existente. */}
              <Toggle checked={!nuevo && anadirInquilinos} onChange={cambiarModoInquilinos}
                label={t('inquilinos_modo', 'Inquilinos leídos')} textoSi={t('anadir', 'Añadir')} textoNo={t('reemplazar', 'Reemplazar')} />
            </div>
            {nuevo && contratos.length > 0 && (
              <Ayuda>{t('anadir_elige_contrato2', 'Para añadir estos inquilinos a un contrato que ya existe (p. ej. una novación), pon AÑADIR: se elige solo el contrato en «Va a contratos» (puedes cambiarlo).')}</Ayuda>
            )}
            <TablaTema columnas={[
              { texto: t('nombre', 'Nombre') }, { texto: t('apellidos', 'Apellidos') }, { texto: t('tipo_doc', 'Tipo doc.') }, { texto: t('nro_doc', 'Nro doc.') },
              { texto: t('telefono', 'Teléfono') }, { texto: t('email', 'Email') }, { texto: t('en_terceros', 'En Terceros') },
            ]}>
              {inquilinos.map((x, i) => (
                <tr key={i} className={claseFila(i)}>
                  {['nombre', 'apellidos', 'tipo_documento', 'nif', 'telefono', 'email'].map((k) => (
                    <td key={k} className={TD}>
                      {k === 'tipo_documento' ? (
                        <select value={x.tipo_documento || ''} onChange={(e) => cambiarInquilino(i, 'tipo_documento', e.target.value)} aria-label={k} className={CLASE_INPUT}>
                          {['DNI', 'NIE', 'PASAPORTE', 'CIF', 'OTRO'].map((o) => <option key={o} value={o}>{o === 'PASAPORTE' ? t('pasaporte', 'Pasaporte') : o}</option>)}
                        </select>
                      ) : (
                      <input value={x[k] || ''} onChange={(e) => cambiarInquilino(i, k, k === 'nif' ? e.target.value.toUpperCase() : e.target.value)}
                        aria-label={k} className={`${CLASE_INPUT} ${k === 'nif' || k === 'telefono' ? 'font-mono' : ''}`} />
                      )}
                    </td>
                  ))}
                  <td className={`${TD} whitespace-nowrap text-xs font-black uppercase tracking-widest`}>
                    {!completo(x) ? t('falta_nombre', 'Falta nombre y apellidos: no se da de alta') : x.tercero_id ? t('se_actualiza', 'Se actualiza') : t('alta_nueva', 'Alta nueva')}
                  </td>
                </tr>
              ))}
            </TablaTema>
            <Ayuda>{!nuevo && anadirInquilinos
              ? t('ayuda_inquilinos_anadir', 'Al aplicar, los inquilinos se dan de alta en Terceros (o se actualizan sus datos) y se añaden al final del contrato como cotitulares; los que ya tenía se quedan.')
              : t('ayuda_inquilinos', 'Al aplicar, los inquilinos se dan de alta en Terceros o, si ya están, se sustituyen sus datos por estos. El primero queda como titular del contrato.')}{titularesActuales ? ` ${t('titulares_antes', 'Ahora en el contrato')}: ${titularesActuales}.` : ''}</Ayuda>
          </div>
        )}
        {lectura && <ComparadorCampos campos={CAMPOS} leidos={leidos} actuales={actuales} eleccion={eleccion} t={t}
          onElegir={(c, cambio) => setEleccion((e) => ({ ...e, [c]: { ...e[c], ...cambio } }))} />}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={Boolean(ocupado)} onClick={onCerrar}>{t('no_pasar', 'No pasar a ningún formulario')}</Button>
          <Button type="button" loading={ocupado === 'aplicar'} disabled={Boolean(ocupado) || !lectura} leftIcon={<Check size={16} />} onClick={aplicar}>
            {n ? `${t('aplicar', 'Aplicar')} (${n})` : t('aplicar', 'Aplicar')}
          </Button>
        </div>
      </div>
    </VentanaModal>
  );
}
