/**
 * DocumentosObjeto — pestaña «Documentos» común (fase 0c, 30/09/2026).
 *
 * Plan core inmobiliaria §8.4. Se usa en la ficha de cualquier objeto que
 * admita documentos (entidad, socio, tercero; después propiedad, contrato…):
 *
 *   <DocumentosObjeto tabla="m_company" id={3} />
 *
 * Muestra lo que falta (categorías obligatorias sin archivo), los archivos por
 * categoría (propios y vinculados), y permite subir, descargar (enlace firmado
 * de 5 minutos), editar, vincular a otra entidad y mandar a la papelera.
 *
 * API: /files/objeto/:objeto/:id · POST /files · PATCH /files/:id ·
 *      GET /files/:id/descarga · POST|DELETE /files/:id/vinculos · DELETE /files/:id
 * Textos: s_dictionary, contexto «Documentos» y «CategoriaArchivo» (4 idiomas).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Download, Trash2, Pencil, Plus, ChevronDown, Link2, Unlink, AlertTriangle, Lock, CheckCircle2, X, Eye, EyeOff, KeyRound } from 'lucide-react';
import ZonaArchivos, { VentanaEmergente } from '../UI/ZonaArchivos';
import TiposDocumento from './TiposDocumento';
import Button from '../UI/Button';
import Tooltip from '../UI/Tooltip';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { formatTamano } from '../../utils/format';
import { leerDocumentoIdentidad, leerDomicilio } from '../../utils/lectorDni';
import { normalizarImagen, LADO_DNI, LADO_A4 } from '../../utils/imagenes';
import { Campo, Casilla, AvisoError, AvisoOk, CLASE_INPUT, Recuadro, claseFila, BotonFila , BotonAnadir } from '../UI/TemaPagina';

const hoy = () => new Date().toISOString().slice(0, 10);
// Fecha AAAA-MM-DD en hora LOCAL (04/10/2026). El servidor manda las DATE como
// medianoche de Madrid en UTC («2029-10-10T22:00:00.000Z» = 11/10/2029): cortar
// el texto daba un día menos, y al guardar la fecha retrocedía un día cada vez.
const fecha = (v) => {
  if (!v) return '';
  const texto = String(v);
  if (!texto.includes('T')) return texto.slice(0, 10);
  const d = new Date(texto);
  if (Number.isNaN(d.getTime())) return texto.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const tamano = formatTamano;

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0]?.message || b.message || `Error ${r.status}`);
  return b;
}


// Categorías que son el documento de identidad de una persona: al subirlas se
// piden (y se guardan en la ficha) el tipo, el número y la caducidad (04/10/2026).
const CATEGORIAS_IDENTIDAD = ['DNI', 'DNI_ANVERSO', 'DNI_REVERSO'];
const TIPOS_DOCUMENTO = ['DNI', 'NIE', 'PASAPORTE'];
// Nacionalidad de la MRZ (3 letras) → código de 2 letras de la ficha.
const PAIS_2 = { ESP: 'ES', FRA: 'FR', PRT: 'PT', ITA: 'IT', DEU: 'DE', D: 'DE', GBR: 'GB', AND: 'AD', NLD: 'NL', BEL: 'BE', CHE: 'CH', USA: 'US', ARG: 'AR', MAR: 'MA', ROU: 'RO', COL: 'CO', VEN: 'VE', ECU: 'EC', PER: 'PE', CHN: 'CN' };
// Lado largo máximo al normalizar: DNI y firma 1600 px; el resto, A4 a 300 ppp.
const LADO_PEQUENO = ['DNI', 'DNI_ANVERSO', 'DNI_REVERSO', 'FIRMA'];

// Nombre con el que se guarda el archivo (04/10/2026, aprobados por el usuario).
// {E} entidad · {S} socio · {F} fecha del documento · {A} ejercicio · {D} descripción.
// Sin plantilla (Sin clasificar…), se queda el nombre original del archivo.
const PLANTILLAS = {
  DNI_ANVERSO: 'DNI {E} Anverso', DNI_REVERSO: 'DNI {E} Reverso', FIRMA: 'Firma {E}', DNI: 'DNI {E}',
  NIF_ENTIDAD: 'NIF {E}', ESCRITURA_CONSTITUCION: 'Docs constitucion {E}', ESTATUTOS: 'Estatutos {E}',
  PACTO_SOCIOS: 'Pacto de socios {E}', ALTA_CENSAL: 'Alta M036 {E} {F}', TITULARIDAD_REAL: 'Titularidad real {E}',
  NOMBRAMIENTO_ADMIN: 'Nombramiento administradores {E} {F}', PODERES: 'Poderes {E} {F}',
  CERT_BANCARIO: 'Certificado bancario {E} {D}', CUENTAS_ANUALES: 'Cuentas anuales {E} {A}', ACTAS: 'Acta {E} {F}',
  CONTRATO_GESTORIA: 'Contrato gestoria {E}', ESCRITURA_PARTICIPACIONES: 'Participaciones {S} {E}',
  CERT_DIGITAL: 'Certificado digital {E}',
  DESIGNACION_REPRESENTANTES: 'Designacion representantes {E} {F}',
};
function nombrePropuesto(codigo, objeto, s) {
  const plantilla = PLANTILLAS[codigo];
  if (!plantilla || !objeto) return '';
  // DNI de un socio: «DNI {socio}», no el de la entidad.
  const entidad = objeto.socio ? objeto.entidad_nombre : objeto.nombre;
  const texto = (codigo === 'DNI' && objeto.socio ? 'DNI {S}' : plantilla)
    .replace('{E}', entidad || '').replace('{S}', objeto.socio || '')
    .replace('{F}', s.fecha_documento || '').replace('{A}', s.ejercicio || '').replace('{D}', s.descripcion || '');
  return texto.replace(/\s+/g, ' ').trim();
}

// Certificado digital (04/10/2026): el navegador a veces no da tipo a un .p12.
const esCertificado = (f) => /\.(p12|pfx|cer|crt)$/i.test(f?.name || '');
const esP12 = (f) => /\.(p12|pfx)$/i.test(f?.name || '');
const conTipo = (f) => {
  if (/\.(p12|pfx)$/i.test(f.name) && f.type !== 'application/x-pkcs12') return new File([f], f.name, { type: 'application/x-pkcs12' });
  if (/\.(cer|crt)$/i.test(f.name) && f.type !== 'application/pkix-cert') return new File([f], f.name, { type: 'application/pkix-cert' });
  return f;
};

/** Campo de contraseña con el ojo para verla u ocultarla. */
function CampoContrasena({ valor, onCambio, etiquetaVer, etiquetaOcultar, ...resto }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="flex gap-2">
      <input type={ver ? 'text' : 'password'} value={valor} autoComplete="new-password" onChange={(e) => onCambio(e.target.value)} className={`${CLASE_INPUT} font-mono`} {...resto} />
      <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? etiquetaOcultar : etiquetaVer} title={ver ? etiquetaOcultar : etiquetaVer}
        className="rounded-xl border border-border px-3 hover:bg-surface-hover hover:text-on-surface-hover">{ver ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  );
}

// Comparar sin tildes, mayúsculas ni signos («Romeo Comas» = «ROMEO COMAS»).
const igualTexto = (a, b) => String(a || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  === String(b || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
// Texto libre del reverso: menos fiable, se marca «revisar».
const REVISAR = ['domicilio', 'municipio', 'provincia'];

/**
 * @param ficha               (opcional) datos ACTUALES de la ficha abierta, para comparar.
 * @param onDatosDocumento    (opcional) recibe los datos leídos del DNI que el usuario
 *                            eligió: la ficha los muestra y se guardan con «Guardar».
 *                            Sin él, se guardan al subir (PATCH /companies/:id/documento).
 */
export default function DocumentosObjeto({ tabla, id, soloLectura = false, onDocumentoIdentidad, ficha = null, onDatosDocumento }) {
  const { t } = useTmTr('Documentos');
  const { t: tc } = useTmTr('CategoriaArchivo');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [subida, setSubida] = useState(null);
  const [editandoTipos, setEditandoTipos] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');   // '' = todos los grupos   // lápiz de «Tipos de documentos»          // formulario de subida
  const [edicion, setEdicion] = useState(null);        // { archivo, campos }
  const [vinculo, setVinculo] = useState(null);        // { archivo, entidad_id }
  const [entidades, setEntidades] = useState([]);

  const nombreCat = (c) => tc(c.codigo || c.categoria_codigo, c.nombre || c.categoria_nombre);

  const cargar = useCallback(async () => {
    setError('');
    try { setDatos((await pedir(`/files/objeto/${tabla}/${id}`)).data); }
    catch (e) { setError(e.message); }
  }, [tabla, id]);
  useEffect(() => { cargar(); }, [cargar]);

  const porCategoria = useMemo(() => {
    const grupos = new Map();
    for (const a of datos?.archivos || []) {
      const k = a.categoria_codigo || 'SIN_CLASIFICAR';
      if (!grupos.has(k)) grupos.set(k, { codigo: k, nombre: a.categoria_nombre, archivos: [] });
      grupos.get(k).archivos.push(a);
    }
    return [...grupos.values()];
  }, [datos]);

  const nuevaSubida = (categoria = null) => {
    setAviso(''); setError('');
    const c = categoria || datos?.categorias?.[0];
    const d = datos?.objeto?.documento;
    setSubida({
      ficheros: [], categoria_id: c?.id || '', fecha_documento: '', ejercicio: '', fecha_caducidad: fecha(d?.fecha_caducidad_doc),
      confidencial: Boolean(Number(c?.confidencial)), descripcion: '', detalles: [],
      doc: { tipo_documento: d?.tipo_documento || 'DNI', nif: d?.nif || '', fecha_caducidad_doc: fecha(d?.fecha_caducidad_doc) },
    });
  };
  // Cada archivo lleva SU tipo y SU nombre (04/10/2026): anverso y reverso del
  // DNI se suben juntos y cada uno sale con su nombre. El nombre es el
  // propuesto por el tipo, salvo que el usuario lo cambie.
  const categoria = (id) => datos?.categorias.find((x) => String(x.id) === String(id));
  const idDeCodigo = (codigo) => datos?.categorias.find((x) => x.codigo === codigo)?.id;
  const nombreDe = (d, s) => (d.nombreManual ? d.nombre.trim() : nombrePropuesto(categoria(d.categoria_id)?.codigo, datos?.objeto, s));
  /** Detalles por archivo al cambiar la lista: se conservan los que ya había. */
  const detallesPara = (ficheros, s) => ficheros.map((_, i) => {
    if (s.detalles?.[i]) return s.detalles[i];
    const base = categoria(s.categoria_id)?.codigo;
    // Dos archivos de DNI: el primero anverso, el segundo reverso.
    let cat = s.categoria_id;
    if (esCertificado(ficheros[i]) && idDeCodigo('CERT_DIGITAL')) return { categoria_id: idDeCodigo('CERT_DIGITAL'), nombre: '', nombreManual: false, contrasena: '' };
    if (['DNI_ANVERSO', 'DNI_REVERSO'].includes(base) && ficheros.length > 1 && i < 2) cat = idDeCodigo(i === 0 ? 'DNI_ANVERSO' : 'DNI_REVERSO') || cat;
    return { categoria_id: cat, nombre: '', nombreManual: false };
  });
  // ¿Alguno de los archivos es el DNI de una persona?
  const esIdentidad = (s) => Boolean(datos?.objeto?.documento)
    && (s?.detalles || [{ categoria_id: s?.categoria_id }]).some((d) => CATEGORIAS_IDENTIDAD.includes(categoria(d.categoria_id)?.codigo));
  // ── Lectura del DNI (04/10/2026) ──────────────────────────────────────
  // Al soltar imágenes de DNI de una persona, el navegador lee las líneas «<<<»:
  // la que las tiene es el REVERSO, la otra el ANVERSO. De esas líneas salen
  // tipo, número, caducidad, nacimiento y nacionalidad; si chocan con lo que ya
  // tiene la ficha, se pregunta (decidido con el usuario).
  const leidos = useRef(new WeakMap());
  const fichaDoc = datos?.objeto?.documento ? { ...datos.objeto.documento, ...(ficha || {}) } : null;
  const ETIQUETAS_DOC = {
    razon_social: t('nombre_completo', 'Nombre y apellidos'),
    tipo_documento: t('tipo_documento', 'Tipo de documento'), nif: t('numero_documento', 'Nº de documento'),
    fecha_caducidad_doc: t('fecha_caducidad', 'Caduca el'), fecha_nacimiento: t('fecha_nacimiento', 'Fecha de nacimiento'),
    nacionalidad: t('nacionalidad', 'Nacionalidad'), domicilio: t('domicilio', 'Dirección'), municipio: t('municipio', 'Municipio'),
    provincia: t('provincia', 'Provincia'), pais: t('pais', 'País'),
  };
  const verValor = (k, v) => (v && k.startsWith('fecha') ? fecha(v).split('-').reverse().join('/') : (v || '—'));
  /**
   * Recalcula tipos de archivo y la tabla «Datos del documento» a partir de lo leído.
   * Marcado de salida: lo que la ficha tiene vacío. Lo que choca o es igual, sin marcar.
   */
  const aplicarLecturas = (s) => {
    const rev = idDeCodigo('DNI_REVERSO'); const anv = idDeCodigo('DNI_ANVERSO');
    const entradas = s.ficheros.map((f) => leidos.current.get(f) || null);
    const lect = entradas.map((e) => e?.resultado || null);
    const hayReverso = lect.some((r) => r?.valida || r?.pareceReverso);
    const detalles = s.detalles.map((d, i) => {
      if (d.categoriaManual || !CATEGORIAS_IDENTIDAD.includes(categoria(d.categoria_id)?.codigo) || !lect[i] || !hayReverso) return d;
      return { ...d, categoria_id: (lect[i].valida || lect[i].pareceReverso) ? (rev || d.categoria_id) : (anv || d.categoria_id) };
    });
    const mrz = lect.find((r) => r?.valida) || null;
    const dom = entradas.find((e) => e?.domicilio && Object.keys(e.domicilio).length)?.domicilio || {};
    if (!mrz && !dom.domicilio) return { ...s, detalles, mrz: null, filas: [] };
    const leido = {
      ...(mrz ? {
        razon_social: [mrz.nombre, mrz.apellidos].filter(Boolean).join(' ') || null,
        tipo_documento: mrz.tipo_documento, nif: mrz.numero || null, fecha_caducidad_doc: mrz.caducidad,
        fecha_nacimiento: mrz.nacimiento, nacionalidad: PAIS_2[mrz.nacionalidad] || null,
        pais: mrz.pais === 'ESP' && mrz.tipo_documento === 'DNI' ? 'ES' : null,
      } : {}),
      domicilio: dom.domicilio || null, municipio: dom.municipio || null, provincia: dom.provincia || null,
    };
    const usar = { ...(s.usar || {}) };
    const filas = Object.entries(leido).filter(([, v]) => v).map(([k, v]) => {
      const enFicha = fichaDoc?.[k] ? (k.startsWith('fecha') ? fecha(fichaDoc[k]) : fichaDoc[k]) : '';
      const igual = enFicha && igualTexto(enFicha, v);
      // El domicilio (texto libre) nunca va marcado de salida: hay que revisarlo.
      if (usar[k] === undefined) usar[k] = !enFicha && !REVISAR.includes(k);
      return { campo: k, ficha: enFicha, leido: v, igual, distinto: Boolean(enFicha) && !igual, revisar: REVISAR.includes(k) };
    });
    return { ...s, detalles, mrz, filas, usar };
  };
  // Lanza la lectura de las imágenes nuevas que vayan como DNI de una persona.
  useEffect(() => {
    if (!subida || !fichaDoc) return;
    subida.ficheros.forEach((f, i) => {
      const cod = categoria(subida.detalles[i]?.categoria_id)?.codigo;
      if (!CATEGORIAS_IDENTIDAD.includes(cod) || leidos.current.has(f) || !/^image\//.test(f.type)) return;
      const entrada = { estado: 'leyendo', resultado: null, domicilio: null };
      leidos.current.set(f, entrada);
      setSubida((x) => (x ? { ...x, version: (x.version || 0) + 1 } : x));
      leerDocumentoIdentidad(f)
        .then(async (r) => {
          entrada.resultado = r;
          entrada.estado = r.valida || r.pareceReverso ? 'reverso' : 'anverso';
          // En el reverso, además, el domicilio (texto libre).
          if (entrada.estado === 'reverso') {
            entrada.estado = 'domicilio';
            setSubida((x) => (x ? aplicarLecturas(x) : x));
            try { entrada.domicilio = await leerDomicilio(f); } catch { entrada.domicilio = {}; }
            entrada.estado = 'reverso';
          }
        })
        .catch(() => { entrada.estado = 'error'; })
        .finally(() => setSubida((x) => (x ? aplicarLecturas(x) : x)));
    });
  }, [subida?.ficheros, subida?.detalles, fichaDoc?.nif]); // eslint-disable-line react-hooks/exhaustive-deps
  const leyendo = (s) => s.ficheros.some((f) => ['leyendo', 'domicilio'].includes(leidos.current.get(f)?.estado));
  /** Datos que pasan a la ficha: los marcados de la tabla, o lo escrito a mano si no se leyó nada. */
  const cambiosFicha = (s) => {
    if (s.filas?.length) return Object.fromEntries(s.filas.filter((f) => s.usar?.[f.campo] && !f.igual).map((f) => [f.campo, f.leido]));
    if (!esIdentidad(s)) return {};
    return Object.fromEntries(Object.entries({ tipo_documento: s.doc.tipo_documento, nif: s.doc.nif.trim(), fecha_caducidad_doc: s.doc.fecha_caducidad_doc })
      .filter(([k, v]) => v && !igualTexto(v, k.startsWith('fecha') ? fecha(fichaDoc?.[k]) : fichaDoc?.[k])));
  };

  // ── Certificado digital: leerlo antes de subir (titular, NIF, caducidad) ──
  const leerCertificado = async (i) => {
    const f = subida.ficheros[i]; const det = subida.detalles[i] || {};
    const poner = (c) => setSubida((x) => { const detalles = [...x.detalles]; detalles[i] = { ...detalles[i], ...c }; return { ...x, detalles }; });
    poner({ leyendoCert: true, cert: null, certError: '' });
    try {
      const fd = new FormData(); fd.append('archivo', f); if (det.contrasena) fd.append('contrasena', det.contrasena);
      poner({ leyendoCert: false, cert: (await pedir('/files/certificado/leer', { method: 'POST', body: fd })).data });
    } catch (e) { poner({ leyendoCert: false, certError: e.message }); }
  };
  // Un .cer/.crt no lleva contraseña: se lee en cuanto se añade.
  useEffect(() => {
    if (!subida) return;
    subida.ficheros.forEach((f, i) => {
      const d = subida.detalles[i];
      if (d && categoria(d.categoria_id)?.codigo === 'CERT_DIGITAL' && !esP12(f) && !d.cert && !d.certError && !d.leyendoCert) leerCertificado(i);
    });
  }, [subida?.ficheros, subida?.detalles]); // eslint-disable-line react-hooks/exhaustive-deps
  const certPendiente = (s) => s.ficheros.some((f, i) => categoria(s.detalles[i]?.categoria_id)?.codigo === 'CERT_DIGITAL' && !s.detalles[i]?.cert);

  const algunaCaduca = (s) => (s?.detalles || []).some((d) => Number(categoria(d.categoria_id)?.caduca) === 1 && !CATEGORIAS_IDENTIDAD.includes(categoria(d.categoria_id)?.codigo));

  const subir = async (ev) => {
    ev.preventDefault();
    if (!subida.ficheros.length) return setError(t('falta_fichero', 'Elige al menos un archivo.'));
    setOcupado(true); setError('');
    try {
      for (const [i, fichero] of subida.ficheros.entries()) {
        const det = subida.detalles[i] || { categoria_id: subida.categoria_id, nombreManual: false, nombre: '' };
        const esDni = CATEGORIAS_IDENTIDAD.includes(categoria(det.categoria_id)?.codigo) && Boolean(datos?.objeto?.documento);
        // Solo se guarda la versión normalizada (decidido con el usuario).
        const cod = categoria(det.categoria_id)?.codigo;
        const normalizado = await normalizarImagen(fichero, LADO_PEQUENO.includes(cod) ? LADO_DNI : LADO_A4);
        const fd = new FormData();
        fd.append('archivo', normalizado);
        fd.append('objeto_tabla', tabla);
        fd.append('objeto_id', id);
        const cadDni = cambiosFicha(subida).fecha_caducidad_doc || fecha(fichaDoc?.fecha_caducidad_doc) || subida.doc.fecha_caducidad_doc;
        const valores = { ...subida, categoria_id: det.categoria_id, fecha_caducidad: esDni ? (cadDni || '') : subida.fecha_caducidad };
        for (const k of ['categoria_id', 'fecha_documento', 'ejercicio', 'fecha_caducidad', 'descripcion']) if (valores[k] !== '') fd.append(k, valores[k]);
        fd.append('confidencial', subida.confidencial ? '1' : '0');
        if (nombreDe(det, subida)) fd.append('nombre', nombreDe(det, subida));
        if (det.contrasena) fd.append('contrasena', det.contrasena);
        await pedir('/files', { method: 'POST', body: fd });
      }
      // Datos del DNI: a la ficha abierta, que los guarda con «Guardar» (04/10/2026).
      // Sin ficha abierta (otras pantallas), se guardan ya.
      const cambios = cambiosFicha(subida);
      if (Object.keys(cambios).length) {
        if (onDatosDocumento) onDatosDocumento(cambios);
        else if (esIdentidad(subida)) {
          const doc = { tipo_documento: cambios.tipo_documento || fichaDoc?.tipo_documento || 'DNI', ...cambios };
          await pedir(`/companies/${id}/documento`, { method: 'PATCH', body: JSON.stringify(doc) });
          onDocumentoIdentidad?.(doc);
        }
      }
      setAviso(t('subidos', '{n} archivo(s) subido(s).').replace('{n}', subida.ficheros.length));
      setSubida(null);
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  // Ver: se abre en una PESTAÑA NUEVA del navegador (PDF, imagen). Descargar:
  // se guarda con su nombre original (backend ?modo=ver, 03/10/2026).
  //
  // La pestaña se abre en el mismo clic, ANTES de pedir el enlace: si se abre
  // después del `await`, el navegador ya no lo cuenta como acción del usuario
  // y lo bloquea como ventana emergente (o la abre en la misma pestaña).
  const descargar = async (a, modo = 'descarga') => {
    const ventana = modo === 'ver' ? window.open('', '_blank') : null;
    if (ventana) ventana.document.title = a.nombre_original || 'Documento';
    try {
      const { data } = await pedir(`/files/${a.id}/descarga${modo === 'ver' ? '?modo=ver' : ''}`);
      if (ventana) { ventana.opener = null; ventana.location.href = data.url; }
      else if (modo === 'ver') window.open(data.url, '_blank', 'noopener');
      else {
        const enlace = document.createElement('a');
        enlace.href = data.url; enlace.rel = 'noopener';
        document.body.appendChild(enlace); enlace.click(); enlace.remove();
      }
    } catch (e) { ventana?.close(); setError(e.message); }
  };

  // Certificado: se descarga descifrado (solo propietario/administrador, queda auditado).
  const descargarCifrado = async (a) => {
    try {
      const r = await apiFetch(`/files/${a.id}/descifrado`, { headers: authHeaders() });
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.message || `Error ${r.status}`); }
      const url = URL.createObjectURL(await r.blob());
      const enlace = document.createElement('a'); enlace.href = url; enlace.download = a.nombre_original;
      document.body.appendChild(enlace); enlace.click(); enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { setError(e.message); }
  };
  // Contraseña del certificado: el ojo la pide al servidor y la vuelve a ocultar.
  const [claves, setClaves] = useState({});
  const verContrasena = async (a) => {
    if (claves[a.id]) return setClaves((c) => { const n = { ...c }; delete n[a.id]; return n; });
    try { const { data } = await pedir(`/files/${a.id}/secreto`); setClaves((c) => ({ ...c, [a.id]: data.contrasena || '—' })); }
    catch (e) { setError(e.message); }
  };

  // Papelera del recuadro: borra el tipo elegido en el desplegable (04/10/2026).
  const TIPOS_FIJOS = ['SIN_CLASIFICAR', 'DNI', 'DNI_ANVERSO', 'DNI_REVERSO', 'FIRMA', 'CERT_DIGITAL'];
  const borrarTipoElegido = async () => {
    const c = datos?.categorias.find((x) => x.codigo === filtroTipo);
    if (!c) return;
    setError('');
    try {
      const { data } = await pedir(`/files/categorias/${c.id}/uso?objeto=${encodeURIComponent(tabla)}`);
      const n = Number(data.archivos);
      const pregunta = n
        ? t('aviso_huerfanos', 'Hay documentos en este grupo que quedarán huérfanos ({n}). Pasarán a «Sin clasificar». ¿Borrar el tipo «{tipo}»?').replace('{n}', n).replace('{tipo}', nombreCat(c))
        : t('confirmar_borrar_tipo', '¿Borrar el tipo «{tipo}»?').replace('{tipo}', nombreCat(c));
      if (!window.confirm(pregunta)) return;
      await pedir(`/files/categorias/${c.id}?objeto=${encodeURIComponent(tabla)}`, { method: 'DELETE' });
      setFiltroTipo('');
      await cargar();
    } catch (e) { setError(e.message); }
  };

  const guardarEdicion = async (ev) => {
    ev.preventDefault();
    setOcupado(true); setError('');
    try {
      const c = edicion.campos;
      await pedir(`/files/${edicion.archivo.id}`, { method: 'PATCH', body: JSON.stringify({ ...c, confidencial: Boolean(c.confidencial) }) });
      setEdicion(null);
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  const papelera = async (a) => {
    if (!window.confirm(t('confirmar_papelera', '¿Mover «{nombre}» a la papelera? Se puede restaurar durante 30 días.').replace('{nombre}', a.nombre_original))) return;
    try { await pedir(`/files/${a.id}`, { method: 'DELETE' }); await cargar(); }
    catch (e) { setError(e.message); }
  };

  const abrirVinculo = async (a) => {
    setError('');
    try {
      if (!entidades.length) setEntidades((await pedir('/companies/mine')).data || []);
      setVinculo({ archivo: a, entidad_id: '' });
    } catch (e) { setError(e.message); }
  };
  const vincular = async (ev) => {
    ev.preventDefault();
    if (!vinculo.entidad_id) return;
    setOcupado(true);
    try {
      await pedir(`/files/${vinculo.archivo.id}/vinculos`, { method: 'POST', body: JSON.stringify({ objeto_tabla: 'm_company', objeto_id: Number(vinculo.entidad_id) }) });
      setVinculo(null);
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };
  const desvincular = async (a, v) => {
    try { await pedir(`/files/${a.id}/vinculos/${v.id}`, { method: 'DELETE' }); await cargar(); }
    catch (e) { setError(e.message); }
  };

  if (!datos && !error) return <p className="py-6 text-center text-xs font-bold uppercase tracking-widest">{t('cargando', 'Cargando…')}</p>;

  return (
    <div className="space-y-4">
      {!subida && <AvisoError>{error}</AvisoError>}
      <AvisoOk>{aviso}</AvisoOk>

      {datos && (
        <Recuadro as="section" aria-label={t('grupos_documentos', 'Grupos de documentos')} className="text-on-surface2">
          {/* Como Bancos y cuentas (04/10/2026): los 3 botones redondos al
              principio y, al lado, el desplegable que filtra los grupos.
                + subir (con el tipo elegido) · lápiz: tipos de documento
                (el elegido, o la lista) · papelera: borrar el tipo elegido. */}
          <div className="flex w-full flex-col items-end gap-4 md:flex-row">
            {!soloLectura && (
              <div className="flex shrink-0 items-center gap-4">
                <BotonAnadir texto={t('subir', 'Subir documentos')} onClick={() => nuevaSubida(datos.categorias.find((c) => c.codigo === filtroTipo) || null)} />
                <Tooltip texto={t('editar_tipos', 'Añadir, cambiar o borrar tipos de documento')}>
                  <Button variant="secondary" isIconOnly rounded="full" onClick={() => setEditandoTipos(filtroTipo || true)}
                    aria-label={t('editar_tipos', 'Añadir, cambiar o borrar tipos de documento')} className="h-[45px] w-[45px] shrink-0">
                    <Pencil size={18} />
                  </Button>
                </Tooltip>
                <Tooltip texto={filtroTipo ? t('borrar_tipo', 'Borrar el tipo elegido') : t('elige_tipo_borrar', 'Elige un tipo en el desplegable para borrarlo')}>
                  <button type="button" onClick={borrarTipoElegido} disabled={!filtroTipo || TIPOS_FIJOS.includes(filtroTipo)}
                    aria-label={t('borrar_tipo', 'Borrar el tipo elegido')}
                    className="grid h-[45px] w-[45px] shrink-0 place-items-center rounded-full border-2 border-destructive-border bg-destructive text-on-destructive transition-colors hover:border-on-background disabled:cursor-not-allowed disabled:opacity-40">
                    <Trash2 size={19} />
                  </button>
                </Tooltip>
              </div>
            )}
            <div className="w-full flex-1 space-y-1.5">
              <label htmlFor={`filtro-tipo-${tabla}-${id}`} className="ml-1 text-[11px] font-black uppercase tracking-widest">{t('grupos_documentos', 'Grupos de documentos')}</label>
              <div className="relative">
                <select id={`filtro-tipo-${tabla}-${id}`} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
                  className="input-base h-[45px] w-full appearance-none rounded-xl border-border bg-background px-4 text-sm font-bold">
                  <option value="">{t('todos_tipos', 'Todos los tipos')}</option>
                  {datos.categorias.map((c) => {
                    const falta = datos.faltan.some((f) => f.id === c.id);
                    const n = (datos.archivos || []).filter((x) => x.categoria_id === c.id).length;
                    return <option key={c.id} value={c.codigo}>{nombreCat(c)}{Number(c.obligatorio) ? ' *' : ''} · {falta ? `⚠ ${t('falta', 'falta')}` : n}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>
        </Recuadro>
      )}


      {/* Subida en ventana emergente estándar: zona para arrastrar o elegir del
          explorador (03/10/2026). */}
      {subida && (
        <VentanaEmergente titulo={t('subir', 'Subir documentos')} etiquetaCerrar={t('cerrar', 'Cerrar')} onCerrar={() => !ocupado && setSubida(null)}>
        <form onSubmit={subir} className="space-y-4">
          <AvisoError>{error}</AvisoError>
          {/* Primer campo: el tipo de documento (04/10/2026). Vale para los
              archivos que se añadan; cada uno se puede cambiar abajo. */}
          <Campo etiqueta={t('categoria', 'Tipo de documento')}>
            <select autoFocus value={subida.categoria_id} onChange={(e) => {
              const c = datos.categorias.find((x) => String(x.id) === e.target.value);
              setSubida((x) => ({
                ...x, categoria_id: e.target.value, confidencial: Boolean(Number(c?.confidencial)),
                detalles: x.detalles.map((d) => (d.categoriaManual ? d : { ...d, categoria_id: e.target.value })),
              }));
            }} className={CLASE_INPUT}>
              {datos.categorias.map((c) => <option key={c.id} value={c.id}>{nombreCat(c)}{Number(c.obligatorio) ? ' *' : ''}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('ficheros', 'Archivos (PDF, imagen, Word, Excel; máx. 20 MB cada uno)')}>
            <ZonaArchivos
              ficheros={subida.ficheros} onCambio={(lista) => setSubida((s) => { const ficheros = lista.map(conTipo); return { ...s, ficheros, detalles: detallesPara(ficheros, { ...s, detalles: s.ficheros.length === ficheros.length ? s.detalles : s.detalles.filter((_, i) => s.ficheros[i] && ficheros.some((f) => f.name === s.ficheros[i].name && f.size === s.ficheros[i].size)) }) }; })}
              textoPrincipal={t('arrastra', 'Arrastra aquí los archivos')}
              textoSecundario={t('o_elige', 'o pulsa para elegirlos del ordenador')}
              textoQuitar={t('quitar_fichero', 'Quitar')}
            />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-3">

            <Campo etiqueta={t('fecha_documento', 'Fecha del documento')}><input type="date" max={hoy()} value={subida.fecha_documento} onChange={(e) => setSubida((s) => ({ ...s, fecha_documento: e.target.value }))} className={CLASE_INPUT} /></Campo>
            <Campo etiqueta={t('ejercicio', 'Ejercicio')}><input type="number" min="1990" max="2100" value={subida.ejercicio} onChange={(e) => setSubida((s) => ({ ...s, ejercicio: e.target.value }))} className={CLASE_INPUT} /></Campo>
            {algunaCaduca(subida) && (
              <Campo etiqueta={t('fecha_caducidad', 'Caduca el')}><input type="date" value={subida.fecha_caducidad} onChange={(e) => setSubida((s) => ({ ...s, fecha_caducidad: e.target.value }))} className={CLASE_INPUT} /></Campo>
            )}
            <div className="sm:col-span-2"><Campo etiqueta={t('descripcion', 'Descripción')}><input maxLength={500} value={subida.descripcion} onChange={(e) => setSubida((s) => ({ ...s, descripcion: e.target.value }))} className={CLASE_INPUT} /></Campo></div>
          </div>
          {/* Un tipo y un nombre por archivo */}
          {subida.ficheros.length > 0 && (
            <div className="space-y-2">
              {subida.ficheros.map((fich, i) => {
                const det = subida.detalles[i] || { categoria_id: subida.categoria_id, nombre: '', nombreManual: false };
                const cambiar = (c) => setSubida((s) => {
                  const detalles = [...s.detalles]; detalles[i] = { ...det, ...c };
                  const conf = detalles.some((d) => Number(categoria(d.categoria_id)?.confidencial) === 1);
                  return { ...s, detalles, confidencial: s.confidencial || conf };
                });
                return (
                  <div key={`${fich.name}-${i}`} className="grid gap-3 rounded-2xl border border-border p-3 sm:grid-cols-2">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-black sm:col-span-2">
                      <span className="truncate">{fich.name}</span>
                      {leidos.current.get(fich) && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-bold">
                          {{
                            leyendo: t('leyendo', 'Leyendo la imagen…'),
                            reverso: t('es_reverso', 'Reconocido: reverso (líneas «<<<»)'),
                            domicilio: t('leyendo_domicilio', 'Reverso: leyendo el domicilio…'),
                            anverso: t('es_anverso', 'Sin líneas «<<<»: anverso'),
                            error: t('no_leido', 'No se ha podido leer: elige el tipo'),
                          }[leidos.current.get(fich).estado]}
                        </span>
                      )}
                    </p>
                    <Campo etiqueta={t('categoria', 'Tipo de documento')}>
                      <select value={det.categoria_id} onChange={(e) => cambiar({ categoria_id: e.target.value, categoriaManual: true })} className={CLASE_INPUT}>
                        {datos.categorias.map((c) => <option key={c.id} value={c.id}>{nombreCat(c)}{Number(c.obligatorio) ? ' *' : ''}</option>)}
                      </select>
                    </Campo>
                    <Campo etiqueta={t('nombre_archivo', 'Nombre del archivo')}>
                      <input value={det.nombreManual ? det.nombre : nombreDe(det, subida)} placeholder={fich.name.replace(/\.[^.]+$/, '')} maxLength={190}
                        onChange={(e) => cambiar({ nombre: e.target.value, nombreManual: true })} className={CLASE_INPUT} />
                    </Campo>
                    {categoria(det.categoria_id)?.codigo === 'CERT_DIGITAL' && (
                      <div className="space-y-2 sm:col-span-2">
                        {esP12(fich) && (
                          <Campo etiqueta={t('contrasena_cert', 'Contraseña del certificado')}>
                            <div className="flex flex-wrap gap-2">
                              <div className="min-w-[220px] flex-1">
                                <CampoContrasena valor={det.contrasena || ''} onCambio={(v) => cambiar({ contrasena: v, cert: null, certError: '' })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); leerCertificado(i); } }}
                                  etiquetaVer={t('ver_contrasena', 'Ver contraseña')} etiquetaOcultar={t('ocultar_contrasena', 'Ocultar contraseña')} />
                              </div>
                              <Button type="button" variant="secondary" size="sm" leftIcon={<KeyRound size={14} />} loading={det.leyendoCert} disabled={!det.contrasena} onClick={() => leerCertificado(i)}>{t('leer_cert', 'Leer certificado')}</Button>
                            </div>
                          </Campo>
                        )}
                        {det.cert && (
                          <p className="rounded-xl border border-success-border px-3 py-2 text-sm font-bold">
                            {t('cert_leido', 'Certificado leído')}: {[det.cert.titular, det.cert.nif && `NIF ${det.cert.nif}`,
                              det.cert.hasta && `${t('caduca', 'caduca')} ${det.cert.hasta.split('-').reverse().join('/')}`, det.cert.emisor].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {det.certError && <AvisoError>{det.certError}</AvisoError>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {subida.filas?.length > 0 && (
            <div className="rounded-2xl border border-border p-4 text-sm font-bold">
              <p className="font-black">{t('datos_leidos', 'Datos del documento')}</p>
              <p className="mt-1 text-xs">{t('datos_leidos_ayuda', 'Marca los que quieras pasar a la ficha. Se guardan al pulsar «Guardar» en la pestaña Datos.')}</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase tracking-widest">
                      <th className="py-1 pr-2">{t('usar', 'Usar')}</th><th className="py-1 pr-2">{t('campo', 'Campo')}</th>
                      <th className="py-1 pr-2">{t('en_ficha', 'En la ficha')}</th><th className="py-1">{t('en_dni', 'Leído del DNI')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subida.filas.map((f) => (
                      <tr key={f.campo} className="border-b border-border align-top">
                        <td className="py-1.5 pr-2">
                          {f.igual ? <span className="text-xs">{t('igual', 'igual')}</span> : (
                            <input type="checkbox" className="h-5 w-5" aria-label={`${t('usar', 'Usar')} ${ETIQUETAS_DOC[f.campo]}`}
                              checked={Boolean(subida.usar?.[f.campo])}
                              onChange={(e) => setSubida((x) => ({ ...x, usar: { ...x.usar, [f.campo]: e.target.checked } }))} />
                          )}
                        </td>
                        <td className="py-1.5 pr-2">{ETIQUETAS_DOC[f.campo]}
                          {f.revisar && <span className="ml-1 rounded-full border border-warning-border px-1.5 text-[10px] uppercase">{t('revisar', 'revisar')}</span>}
                          {f.distinto && <span className="ml-1 rounded-full border border-destructive px-1.5 text-[10px] uppercase">{t('distinto', 'distinto')}</span>}
                        </td>
                        <td className="py-1.5 pr-2 font-mono">{verValor(f.campo, f.ficha)}</td>
                        <td className="py-1.5 font-mono">{verValor(f.campo, f.leido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {esIdentidad(subida) && !subida.mrz && (
            <fieldset className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-3">
              <legend className="px-2 text-[11px] font-black uppercase tracking-widest">{t('datos_documento', 'Datos del documento de identidad (se guardan también en la ficha)')}</legend>
              <Campo etiqueta={t('tipo_documento', 'Tipo de documento')}>
                <select value={subida.doc.tipo_documento} onChange={(e) => setSubida((s) => ({ ...s, doc: { ...s.doc, tipo_documento: e.target.value } }))} className={CLASE_INPUT}>
                  {TIPOS_DOCUMENTO.map((v) => <option key={v} value={v}>{v === 'PASAPORTE' ? t('pasaporte', 'Pasaporte') : v}</option>)}
                </select>
              </Campo>
              <Campo etiqueta={t('numero_documento', 'Nº de documento')}>
                <input value={subida.doc.nif} maxLength={20} onChange={(e) => setSubida((s) => ({ ...s, doc: { ...s.doc, nif: e.target.value.toUpperCase() } }))} className={`${CLASE_INPUT} font-mono`} />
              </Campo>
              <Campo etiqueta={t('fecha_caducidad', 'Caduca el')}>
                <input type="date" value={subida.doc.fecha_caducidad_doc} onChange={(e) => setSubida((s) => ({ ...s, doc: { ...s.doc, fecha_caducidad_doc: e.target.value } }))} className={CLASE_INPUT} />
              </Campo>
            </fieldset>
          )}
          <Casilla etiqueta={t('confidencial', 'Confidencial (solo lo ven quienes gestionan)')} checked={subida.confidencial} onChange={(v) => setSubida((s) => ({ ...s, confidencial: v }))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSubida(null)} disabled={ocupado}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado} disabled={!subida.ficheros.length || leyendo(subida) || certPendiente(subida)}>{t('subir_boton', 'Subir')}</Button>
          </div>
        </form>
        </VentanaEmergente>
      )}

      {porCategoria.length === 0 && <p className="text-xs font-bold uppercase tracking-widest">{t('sin_documentos', 'Todavía no hay documentos.')}</p>}

      {filtroTipo && !porCategoria.some((g) => g.codigo === filtroTipo) && (
        <p className="flex items-center gap-2 text-sm font-bold">
          {t('sin_docs_tipo', 'No hay documentos de este tipo.')}
          {!soloLectura && <Button size="xs" leftIcon={<Upload size={14} />} onClick={() => nuevaSubida(datos.categorias.find((c) => c.codigo === filtroTipo))}>{t('subir', 'Subir documentos')}</Button>}
        </p>
      )}
      {porCategoria.filter((g) => !filtroTipo || g.codigo === filtroTipo).map((g) => (
        <section key={g.codigo} className="overflow-hidden rounded-2xl border border-border">
          <h3 className="flex items-center gap-3 border-b border-border bg-table-header px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-on-table-header">
            {/* «+» delante del nombre del grupo: subir otro documento de este tipo (04/10/2026). */}
            {!soloLectura && (
              <button type="button" onClick={() => nuevaSubida(datos.categorias.find((c) => c.codigo === g.codigo) || null)}
                aria-label={t('subir_tipo', 'Subir «{tipo}»').replace('{tipo}', nombreCat(g))} title={t('subir_tipo', 'Subir «{tipo}»').replace('{tipo}', nombreCat(g))}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-on-table-header transition-colors hover:bg-surface-hover hover:text-on-surface-hover">
                <Plus size={16} />
              </button>
            )}
            <span>{nombreCat(g)} · {g.archivos.length}</span>
          </h3>
          <ul>
            {g.archivos.map((a, i) => (
              <li key={a.id} className={`flex flex-wrap items-center gap-3 px-4 py-2 ${claseFila(i)}`}>
                {/* Acciones a la izquierda, como en todas las listas */}
                <span className="flex shrink-0 items-center gap-0.5">
                  {!Number(a.cifrado) && <BotonFila icono={<Eye size={15} />} titulo={t('ver', 'Ver')} onClick={() => descargar(a, 'ver')} />}
                  <BotonFila icono={<Download size={15} />} titulo={t('descargar', 'Descargar')} onClick={() => (Number(a.cifrado) ? descargarCifrado(a) : descargar(a))} />
                  {!soloLectura && <>
                    <BotonFila icono={<Pencil size={15} />} titulo={t('editar', 'Editar')} onClick={() => setEdicion({ archivo: a, campos: { nombre: String(a.nombre_original || '').replace(/\.[^.]+$/, ''), categoria_id: a.categoria_id, fecha_documento: fecha(a.fecha_documento), ejercicio: a.ejercicio || '', fecha_caducidad: fecha(a.fecha_caducidad), descripcion: a.descripcion || '', confidencial: Boolean(Number(a.confidencial)) } })} />
                    {a.principal && <BotonFila icono={<Trash2 size={15} />} titulo={t('papelera', 'Mover a la papelera')} onClick={() => papelera(a)} />}
                  </>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black tracking-tight">
                    {Number(a.confidencial) === 1 && <Lock size={13} className="mr-1 inline" aria-label={t('confidencial_corto', 'Confidencial')} />}
                    {Number(a.cifrado) === 1 && <KeyRound size={13} className="mr-1 inline" aria-label={t('cifrado', 'Guardado cifrado')} />}
                    {Number(a.cifrado)
                      ? <span title={t('cifrado', 'Guardado cifrado')}>{a.nombre_original}</span>
                      : <button type="button" onClick={() => descargar(a, 'ver')} title={t('ver', 'Ver')} className="truncate text-left underline-offset-2 hover:underline">{a.nombre_original}</button>}
                  </p>
                  <p className="text-xs font-bold">
                    {[fecha(a.fecha_documento), a.ejercicio && `${t('ejercicio', 'Ejercicio')} ${a.ejercicio}`, tamano(a.tamanyo_bytes),
                      a.fecha_caducidad && `${t('caduca', 'caduca')} ${fecha(a.fecha_caducidad)}`,
                      !a.principal && t('vinculado', 'vinculado desde otro objeto'), a.descripcion].filter(Boolean).join(' · ')}
                  </p>
                  {Number(a.con_contrasena) === 1 && (
                    <p className="flex items-center gap-2 text-xs font-bold">
                      {t('contrasena_cert', 'Contraseña del certificado')}:
                      <span className="font-mono">{claves[a.id] ?? '••••••••'}</span>
                      <button type="button" onClick={() => verContrasena(a)} aria-label={claves[a.id] ? t('ocultar_contrasena', 'Ocultar contraseña') : t('ver_contrasena', 'Ver contraseña')}
                        title={claves[a.id] ? t('ocultar_contrasena', 'Ocultar contraseña') : t('ver_contrasena', 'Ver contraseña')} className="rounded p-1 hover:bg-surface-hover hover:text-on-surface-hover">
                        {claves[a.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </p>
                  )}
                  {a.vinculos?.length > 0 && (
                    <p className="text-xs font-bold">
                      {t('se_ve_en', 'También se ve en')}: {a.vinculos.map((v) => (
                        <span key={v.id} className="mr-2">{v.objeto_tabla} {v.objeto_id}
                          {!soloLectura && a.principal && <button type="button" className="ml-1" aria-label={t('desvincular', 'Desvincular')} onClick={() => desvincular(a, v)}><Unlink size={12} className="inline" /></button>}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {edicion && (
        <Recuadro as="form" onSubmit={guardarEdicion} className="space-y-3">
          <div className="flex justify-between text-on-surface2">
            <h3 className="font-black tracking-tight">{t('editar_titulo', 'Editar «{nombre}»').replace('{nombre}', edicion.archivo.nombre_original)}</h3>
            <BotonFila icono={<X size={18} />} titulo={t('cerrar', 'Cerrar')} onClick={() => setEdicion(null)} />
          </div>
          {/* El tipo (etiqueta) es el primer campo (04/10/2026). */}
          <Campo etiqueta={t('categoria', 'Tipo de documento')}>
            <select autoFocus value={edicion.campos.categoria_id} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, categoria_id: Number(e.target.value) } }))} className={CLASE_INPUT}>
              {!datos.categorias.some((c) => c.id === Number(edicion.campos.categoria_id)) && <option value={edicion.campos.categoria_id}>{edicion.archivo.categoria_nombre}</option>}
              {datos.categorias.map((c) => <option key={c.id} value={c.id}>{nombreCat(c)}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('nombre_archivo', 'Nombre del archivo')}>
            <div className="flex gap-2">
              <input value={edicion.campos.nombre} maxLength={190} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, nombre: e.target.value } }))} className={CLASE_INPUT} />
              <Button type="button" variant="secondary" size="sm"
                onClick={() => setEdicion((s) => ({ ...s, campos: { ...s.campos, nombre: nombrePropuesto(categoria(s.campos.categoria_id)?.codigo, datos?.objeto, s.campos) || s.campos.nombre } }))}>
                {t('nombre_propuesto', 'Nombre propuesto')}
              </Button>
            </div>
          </Campo>
          {Number(edicion.archivo.cifrado) === 1 && /\.(p12|pfx)$/i.test(edicion.archivo.nombre_original || '') && (
            <Campo etiqueta={t('nueva_contrasena', 'Nueva contraseña del certificado (vacío = no cambia)')}>
              <CampoContrasena valor={edicion.campos.contrasena || ''} onCambio={(v) => setEdicion((s) => ({ ...s, campos: { ...s.campos, contrasena: v } }))}
                etiquetaVer={t('ver_contrasena', 'Ver contraseña')} etiquetaOcultar={t('ocultar_contrasena', 'Ocultar contraseña')} />
            </Campo>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta={t('fecha_documento', 'Fecha del documento')}><input type="date" value={edicion.campos.fecha_documento} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, fecha_documento: e.target.value } }))} className={CLASE_INPUT} /></Campo>
            <Campo etiqueta={t('ejercicio', 'Ejercicio')}><input type="number" min="1990" max="2100" value={edicion.campos.ejercicio} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, ejercicio: e.target.value } }))} className={CLASE_INPUT} /></Campo>
            <Campo etiqueta={t('fecha_caducidad', 'Caduca el')}><input type="date" value={edicion.campos.fecha_caducidad} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, fecha_caducidad: e.target.value } }))} className={CLASE_INPUT} /></Campo>
            <div className="sm:col-span-2"><Campo etiqueta={t('descripcion', 'Descripción')}><input maxLength={500} value={edicion.campos.descripcion} onChange={(e) => setEdicion((s) => ({ ...s, campos: { ...s.campos, descripcion: e.target.value } }))} className={CLASE_INPUT} /></Campo></div>
          </div>
          <Casilla etiqueta={t('confidencial', 'Confidencial (solo lo ven quienes gestionan)')} checked={edicion.campos.confidencial} onChange={(v) => setEdicion((s) => ({ ...s, campos: { ...s.campos, confidencial: v } }))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEdicion(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado}>{t('guardar', 'Guardar')}</Button>
          </div>
        </Recuadro>
      )}

      {editandoTipos && (
        <TiposDocumento tabla={tabla} t={t} nombreCat={nombreCat} onCerrar={() => setEditandoTipos(false)} onCambio={cargar}
          editarCodigo={typeof editandoTipos === 'string' ? editandoTipos : null} />
      )}

      {vinculo && (
        <Recuadro as="form" onSubmit={vincular} className="space-y-3">
          <h3 className="font-black tracking-tight text-on-surface2">{t('vincular_titulo', 'Que «{nombre}» se vea también en…').replace('{nombre}', vinculo.archivo.nombre_original)}</h3>
          <Campo etiqueta={t('entidad', 'Entidad')}>
            <select value={vinculo.entidad_id} onChange={(e) => setVinculo((s) => ({ ...s, entidad_id: e.target.value }))} className={CLASE_INPUT}>
              <option value="">—</option>
              {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Campo>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setVinculo(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={ocupado} disabled={!vinculo.entidad_id}>{t('vincular_boton', 'Vincular')}</Button>
          </div>
        </Recuadro>
      )}
    </div>
  );
}
