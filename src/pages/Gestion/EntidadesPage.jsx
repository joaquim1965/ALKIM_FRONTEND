/**
 * EntidadesPage — Gestión → Entidades (antes «Empresas»).
 *
 * Plan core inmobiliaria, fase 0a (01/10/2026). Personas, comunidades de bienes
 * y sociedades propias, con sus datos fiscales y sus socios o comuneros.
 *
 *   /companies/mine                     lista (las visibles para el usuario)
 *   /companies  ·  /companies/:id        alta, edición, baja
 *   /companies/:id/partners[/:fila]      socios y comuneros
 *   Documentos (fase 0c): components/Documentos/DocumentosObjeto.jsx
 *
 * Textos en s_dictionary, contexto «Entidades» (ES, EN, CA, FR):
 * DATABASE/MIGRATIONS/2026.10.01b - textos entidades.sql
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Plus, Users, Trash2, Pencil, FileText } from 'lucide-react';
import Button from '../../components/UI/Button';
import DataTable from '../../components/UI/DataTable';
import Tooltip from '../../components/UI/Tooltip';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import DocumentosObjeto from '../../components/Documentos/DocumentosObjeto';
import FichaConPestanas from '../../components/UI/FichaConPestanas';
import {
  CabeceraPagina, Panel, CabeceraPanel, Campo, Leyenda, AvisoError, AvisoAtencion, Ayuda, SinDato,
  VentanaModal, TablaTema, claseFila, TD, FilaVacia, CLASE_INPUT, Recuadro, BotonFila, BotonAnadir,
} from '../../components/UI/TemaPagina';
import { formatPorcentaje } from '../../utils/format';

const TIPOS = ['PERSONAL', 'CB', 'SC', 'SL', 'SA'];
// Orden de la lista: por forma (persona, CB, SC, SL, SA) y, dentro, por nombre (03/10/2026).
const ordenForma = (a, b) => (TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo)) || String(a.nombre).localeCompare(String(b.nombre), 'es');
const REGIMEN_FISCAL = ['IRPF', 'ATRIBUCION', 'IS'];
const REGIMEN_IVA = ['GENERAL', 'EXENTO', 'NO_SUJETO'];
const PERIODICIDAD = ['TRIMESTRAL', 'MENSUAL'];
const TIPOS_SOCIO = ['COMUNERO', 'SOCIO', 'ADMINISTRADOR'];
const TIPOS_DOCUMENTO = ['DNI', 'NIE', 'PASAPORTE'];

const VACIA = {
  nombre: '', tipo: 'PERSONAL', nif: '', razon_social: '', domicilio: '', codigo_postal: '',
  municipio: '', provincia: '', pais: 'ES', regimen_fiscal: 'IRPF', regimen_iva: 'NO_SUJETO',
  periodicidad_iva: 'TRIMESTRAL', fecha_alta: '', fecha_baja: '',
  // 04/10/2026: persona física, contacto y sociedad
  tipo_documento: '', fecha_caducidad_doc: '', fecha_nacimiento: '', nacionalidad: 'ES',
  email: '', telefono: '', epigrafe_iae: '', datos_registrales: '',
};
const REGIMEN_DE = {
  PERSONAL: ['IRPF', 'NO_SUJETO'], CB: ['ATRIBUCION', 'GENERAL'], SC: ['ATRIBUCION', 'GENERAL'],
  SL: ['IS', 'GENERAL'], SA: ['IS', 'GENERAL'],
};
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

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.message || (b.errors && b.errors[0]?.message) || `Error ${r.status}`);
  return b;
}


export default function EntidadesPage() {
  const { t } = useTmTr('Entidades');
  const [entidades, setEntidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [modal, setModal] = useState(null);          // { tipo: 'ficha', entidad } | { tipo: 'socios', entidad }
  const [form, setForm] = useState(VACIA);
  const [socios, setSocios] = useState([]);
  const [formSocio, setFormSocio] = useState(null);
  // Error al borrar (03/10/2026): se pinta dentro del panel, junto a la tabla,
  // y se trae a la vista. Antes salía arriba del todo y, con la página
  // desplazada, parecía que el botón de borrar no hacía nada.
  const [errorBorrar, setErrorBorrar] = useState('');
  // Campos rellenados con datos del DNI y aún sin guardar (04/10/2026).
  const [pendientes, setPendientes] = useState(new Set());
  const marca = (k) => (pendientes.has(k) ? ' ring-2 ring-warning-border' : '');
  const refErrorBorrar = useRef(null);
  useEffect(() => {
    if (errorBorrar) refErrorBorrar.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [errorBorrar]);

  const etiquetaTipo = (v) => t(`tipo_${v.toLowerCase()}`, v);
  const puedeEditar = (e) => ['PROPIETARIO', 'ADMINISTRADOR'].includes(e.rol);

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try { setEntidades([...((await pedir('/companies/mine')).data || [])].sort(ordenForma)); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const abrirFicha = (entidad = null, pestana = 'datos') => {
    setError(''); setAviso('');
    setForm(entidad
      ? Object.fromEntries(Object.keys(VACIA).map((k) => [k, k.startsWith('fecha') ? fecha(entidad[k]) : (entidad[k] ?? '')]))
      : VACIA);
    setPendientes(new Set());
    setModal({ tipo: 'ficha', entidad, pestana });
  };

  const esPF = form.tipo === 'PERSONAL';
  const cambiarTipo = (tipo) => setForm((f) => {
    const [rf, ri] = REGIMEN_DE[tipo] || REGIMEN_DE.PERSONAL;
    // Al crear, el régimen sigue a la forma; al editar se respeta lo guardado.
    // Al editar se respeta lo guardado, salvo que la forma nueva no admita el
    // régimen que había (una persona solo IRPF; una sociedad nunca IRPF).
    const incompatible = (tipo === 'PERSONAL') !== (f.regimen_fiscal === 'IRPF');
    return modal?.entidad && !incompatible ? { ...f, tipo } : { ...f, tipo, regimen_fiscal: rf, regimen_iva: ri };
  });

  const guardar = async (ev) => {
    ev.preventDefault();
    if (!form.nombre.trim()) return setError(t('falta_nombre', 'Indica el nombre.'));
    setGuardando(true); setError('');
    try {
      const edita = Boolean(modal.entidad);
      const b = await pedir(edita ? `/companies/${modal.entidad.id}` : '/companies', {
        method: edita ? 'PUT' : 'POST', body: JSON.stringify({ ...form, nombre: form.nombre.trim() }),
      });
      if (b.avisos?.length) setAviso(b.avisos.join(' '));
      setPendientes(new Set());
      setModal(null);
      await cargar();
      window.dispatchEvent(new Event('empresa-activa-cambiada'));
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };

  const eliminar = async (entidad) => {
    setError(''); setErrorBorrar(''); setAviso('');
    try {
      await pedir(`/companies/${entidad.id}`, { method: 'DELETE' });
      if (localStorage.getItem('empresaActiva') === String(entidad.id)) localStorage.setItem('empresaActiva', 'todas');
      await cargar();
      window.dispatchEvent(new Event('empresa-activa-cambiada'));
    } catch (e) { setErrorBorrar(`${entidad.nombre}: ${e.message}`); }
  };

  // ── Socios ────────────────────────────────────────────────────────────
  const abrirSocios = async (entidad) => {
    setError(''); setFormSocio(null);
    setModal({ tipo: 'socios', entidad });
    try { setSocios((await pedir(`/companies/${entidad.id}/partners`)).data || []); }
    catch (e) { setError(e.message); }
  };
  const nuevoSocio = () => setFormSocio({ socio_id: '', tipo: modal.entidad.tipo === 'CB' ? 'COMUNERO' : 'SOCIO', porcentaje: '', fecha_desde: hoy(), fecha_hasta: '', notas: '' });
  const editarSocio = (s) => setFormSocio({ id: s.id, socio_id: s.socio_id, tipo: s.tipo, porcentaje: s.porcentaje, fecha_desde: fecha(s.fecha_desde), fecha_hasta: fecha(s.fecha_hasta), notas: s.notas || '' });
  const guardarSocio = async (ev) => {
    ev.preventDefault(); setGuardando(true); setError('');
    try {
      const { id, ...datos } = formSocio;
      await pedir(`/companies/${modal.entidad.id}/partners${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) });
      setFormSocio(null);
      setSocios((await pedir(`/companies/${modal.entidad.id}/partners`)).data || []);
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };
  const quitarSocio = async (s) => {
    if (!window.confirm(t('confirmar_quitar_socio', '¿Quitar esta participación?'))) return;
    try {
      await pedir(`/companies/${modal.entidad.id}/partners/${s.id}`, { method: 'DELETE' });
      setSocios((await pedir(`/companies/${modal.entidad.id}/partners`)).data || []);
    } catch (e) { setError(e.message); }
  };
  const vigentes = socios.filter((s) => !s.fecha_hasta || fecha(s.fecha_hasta) >= hoy());
  const sumaVigente = vigentes.reduce((a, s) => a + Number(s.porcentaje), 0);
  const candidatos = useMemo(
    () => entidades.filter((e) => modal?.entidad && e.id !== modal.entidad.id),
    [entidades, modal]
  );

  const columnas = [
    { id: 'nombre', label: t('col_entidad', 'Entidad'), sortField: 'nombre', render: (x) => <span className="text-sm font-black tracking-tight">{x.nombre}</span> },
    { id: 'tipo', label: t('col_tipo', 'Tipo'), sortField: 'tipo', render: (x) => etiquetaTipo(x.tipo) },
    { id: 'nif', label: t('col_nif', 'NIF'), sortField: 'nif', render: (x) => (x.nif ? <span className="font-mono text-xs">{x.nif}</span> : <SinDato />) },
    { id: 'regimen_fiscal', label: t('col_regimen', 'Régimen'), sortField: 'regimen_fiscal', render: (x) => t(`regimen_${String(x.regimen_fiscal || '').toLowerCase()}`, x.regimen_fiscal) },
    { id: 'rol', label: t('col_acceso', 'Tu acceso'), sortField: 'rol', render: (x) => t(`rol_${String(x.rol || '').toLowerCase()}`, x.rol) },
  ];
  // Socios y Documentos van con las demás acciones, en la primera columna.
  const accionesExtra = (x) => (
    <>
      {x.tipo !== 'PERSONAL' && <BotonFila icono={<Users size={12} />} titulo={t('ver_socios', 'Socios')} onClick={() => abrirSocios(x)} />}
      <BotonFila icono={<FileText size={12} />} titulo={t('ver_documentos', 'Documentos')} onClick={() => abrirFicha(x, 'documentacion')} />
    </>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CabeceraPagina icono={<Building2 size={24} />} titulo={t('titulo', 'Entidades')} subtitulo={t('subtitulo', 'Personas, comunidades de bienes y sociedades: sus datos fiscales y sus socios.')} />

      {!modal && <AvisoError>{error}</AvisoError>}
      <AvisoAtencion>{aviso}</AvisoAtencion>

      <Panel className="overflow-hidden">
        <CabeceraPanel icono={<Building2 size={20} />} titulo={t('mis_entidades', 'Mis entidades')}
          anadir={{ texto: t('nueva', 'Nueva entidad'), onClick: () => abrirFicha() }}
          contador={`${entidades.length} ${entidades.length === 1 ? t('entidad', 'entidad') : t('entidades', 'entidades')}`} />
        {cargando
          ? <div className="px-5 py-12 text-center text-xs font-bold uppercase tracking-widest text-on-surface2">{t('cargando', 'Cargando…')}</div>
          : (
            <div className="space-y-3 p-3">
              {errorBorrar && (
                <div ref={refErrorBorrar} className="flex items-start gap-3">
                  <div className="flex-1"><AvisoError>{errorBorrar}</AvisoError></div>
                  <Button variant="ghost" size="sm" onClick={() => setErrorBorrar('')}>{t('cerrar', 'Cerrar')}</Button>
                </div>
              )}
              <DataTable
                columns={columnas} data={entidades} keyField="id" rowsPerPage={10} sinBarra
                searchFn={(x, q) => `${x.nombre} ${x.nif || ''}`.toLowerCase().includes(q)}
                onEdit={(x) => (puedeEditar(x) ? abrirFicha(x) : null)}
                onDelete={(x) => (puedeEditar(x) ? eliminar(x) : null)}
                extraActions={accionesExtra}
                emptyMessage={t('vacio', 'Todavía no hay entidades.')}
              />
            </div>
          )}
      </Panel>

      {/* Ficha con pestañas (03/10/2026): Datos y Documentación. La de
          documentación necesita la entidad guardada. */}
      {modal?.tipo === 'ficha' && (
        <FichaConPestanas
          titulo={modal.entidad ? modal.entidad.nombre : t('nueva', 'Nueva entidad')}
          subtitulo={modal.entidad ? etiquetaTipo(modal.entidad.tipo) : undefined}
          etiquetaCerrar={t('cerrar', 'Cerrar')}
          ancho="max-w-4xl"
          key={modal.vez || 0}
          inicial={modal.pestana}
          guardado={Boolean(modal.entidad)}
          onCerrar={() => {
            if (guardando) return;
            if (pendientes.size && !window.confirm(t('sin_guardar_dni', 'Hay datos del DNI sin guardar. ¿Cerrar sin guardar?'))) return;
            setModal(null);
          }}
          pestanas={[
            { id: 'datos', etiqueta: t('pestana_datos', 'Datos'), contenido: (
              <>
            {pendientes.size > 0 && <div className="mb-4"><AvisoAtencion>{t('dni_pendiente', 'Datos leídos del DNI: revisa los campos marcados y pulsa «Guardar».')}</AvisoAtencion></div>}
            <AvisoError>{error}</AvisoError>
            {/* La ficha cambia según la forma (04/10/2026). Los campos que se
                ocultan NO se borran: se conservan por si se vuelve a cambiar. */}
            <form onSubmit={guardar} className="mt-5 space-y-5">
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <Leyenda>{t('bloque_identidad', 'Identidad')}</Leyenda>
                <Campo etiqueta={t('nombre', 'Nombre corto')}><input autoFocus value={form.nombre} maxLength={150} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('tipo', 'Forma')}>
                  <select value={form.tipo} onChange={(e) => cambiarTipo(e.target.value)} className={CLASE_INPUT}>
                    {TIPOS.map((v) => <option key={v} value={v}>{etiquetaTipo(v)}</option>)}
                  </select>
                </Campo>
                <div className={esPF ? 'sm:col-span-2' : ''}>
                  <Campo etiqueta={esPF ? t('nombre_completo', 'Nombre y apellidos (como en el documento)') : t('razon_social_pj', 'Razón social')}><input value={form.razon_social} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))} className={CLASE_INPUT + marca('razon_social')} /></Campo>
                </div>
                {!esPF && <Campo etiqueta={t('nif_pj', 'NIF')}><input value={form.nif} maxLength={20} onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value.toUpperCase() }))} className={`${CLASE_INPUT} font-mono`} /></Campo>}
              </fieldset>

              {esPF && (
                <fieldset className="grid gap-4 sm:grid-cols-3">
                  <Leyenda>{t('bloque_documento', 'Documento de identidad')}</Leyenda>
                  <Campo etiqueta={t('tipo_documento', 'Tipo de documento')}>
                    <select value={form.tipo_documento} onChange={(e) => setForm((f) => ({ ...f, tipo_documento: e.target.value }))} className={CLASE_INPUT + marca('tipo_documento')}>
                      <option value="">—</option>
                      {TIPOS_DOCUMENTO.map((v) => <option key={v} value={v}>{t(`doc_${v.toLowerCase()}`, v)}</option>)}
                    </select>
                  </Campo>
                  <Campo etiqueta={t('numero_documento', 'Nº de documento')}><input value={form.nif} maxLength={20} onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value.toUpperCase() }))} className={`${CLASE_INPUT} font-mono${marca('nif')}`} /></Campo>
                  <Campo etiqueta={t('fecha_caducidad_doc', 'Caducidad del documento')}><input type="date" value={form.fecha_caducidad_doc} onChange={(e) => setForm((f) => ({ ...f, fecha_caducidad_doc: e.target.value }))} className={CLASE_INPUT + marca('fecha_caducidad_doc')} /></Campo>
                  <Campo etiqueta={t('fecha_nacimiento', 'Fecha de nacimiento')}><input type="date" max={hoy()} value={form.fecha_nacimiento} onChange={(e) => setForm((f) => ({ ...f, fecha_nacimiento: e.target.value }))} className={CLASE_INPUT + marca('fecha_nacimiento')} /></Campo>
                  <Campo etiqueta={t('nacionalidad', 'Nacionalidad (código país)')}><input value={form.nacionalidad} maxLength={2} onChange={(e) => setForm((f) => ({ ...f, nacionalidad: e.target.value.toUpperCase() }))} className={`${CLASE_INPUT} font-mono${marca('nacionalidad')}`} /></Campo>
                  <Campo etiqueta={t('fecha_baja', 'Fecha de baja')}><input type="date" value={form.fecha_baja} onChange={(e) => setForm((f) => ({ ...f, fecha_baja: e.target.value }))} className={CLASE_INPUT} /></Campo>
                </fieldset>
              )}

              <fieldset className="grid gap-4 sm:grid-cols-3">
                <Leyenda>{esPF ? t('domicilio_pf', 'Domicilio') : t('bloque_domicilio', 'Domicilio fiscal')}</Leyenda>
                <div className="sm:col-span-3"><Campo etiqueta={t('domicilio', 'Dirección')}><input value={form.domicilio} maxLength={255} onChange={(e) => setForm((f) => ({ ...f, domicilio: e.target.value }))} className={CLASE_INPUT + marca('domicilio')} /></Campo></div>
                <Campo etiqueta={t('codigo_postal', 'Código postal')}><input value={form.codigo_postal} maxLength={10} onChange={(e) => setForm((f) => ({ ...f, codigo_postal: e.target.value }))} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('municipio', 'Municipio')}><input value={form.municipio} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))} className={CLASE_INPUT + marca('municipio')} /></Campo>
                <Campo etiqueta={t('provincia', 'Provincia')}><input value={form.provincia} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))} className={CLASE_INPUT + marca('provincia')} /></Campo>
              </fieldset>

              <fieldset className="grid gap-4 sm:grid-cols-2">
                <Leyenda>{t('bloque_contacto', 'Contacto')}</Leyenda>
                <Campo etiqueta={t('email', 'Email')}><input type="email" value={form.email} maxLength={150} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('telefono', 'Teléfono')}><input type="tel" value={form.telefono} maxLength={30} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} className={CLASE_INPUT} /></Campo>
              </fieldset>

              {!esPF && (
                <fieldset className="grid gap-4 sm:grid-cols-3">
                  <Leyenda>{t('bloque_fiscal', 'Régimen fiscal')}</Leyenda>
                  <Campo etiqueta={t('regimen_fiscal', 'Impuesto directo')}>
                    <select value={form.regimen_fiscal} onChange={(e) => setForm((f) => ({ ...f, regimen_fiscal: e.target.value }))} className={CLASE_INPUT}>
                      {REGIMEN_FISCAL.filter((v) => v !== 'IRPF').map((v) => <option key={v} value={v}>{t(`regimen_${v.toLowerCase()}`, v)}</option>)}
                    </select>
                  </Campo>
                  <Campo etiqueta={t('regimen_iva', 'IVA')}>
                    <select value={form.regimen_iva} onChange={(e) => setForm((f) => ({ ...f, regimen_iva: e.target.value }))} className={CLASE_INPUT}>
                      {REGIMEN_IVA.map((v) => <option key={v} value={v}>{t(`iva_${v.toLowerCase()}`, v)}</option>)}
                    </select>
                  </Campo>
                  <Campo etiqueta={t('periodicidad_iva', 'Declaración de IVA')}>
                    <select value={form.periodicidad_iva} onChange={(e) => setForm((f) => ({ ...f, periodicidad_iva: e.target.value }))} className={CLASE_INPUT}>
                      {PERIODICIDAD.map((v) => <option key={v} value={v}>{t(`periodo_${v.toLowerCase()}`, v)}</option>)}
                    </select>
                  </Campo>
                  <Campo etiqueta={t('fecha_constitucion', 'Fecha de constitución')}><input type="date" value={form.fecha_alta} onChange={(e) => setForm((f) => ({ ...f, fecha_alta: e.target.value }))} className={CLASE_INPUT} /></Campo>
                  <Campo etiqueta={t('fecha_baja', 'Fecha de baja')}><input type="date" value={form.fecha_baja} onChange={(e) => setForm((f) => ({ ...f, fecha_baja: e.target.value }))} className={CLASE_INPUT} /></Campo>
                </fieldset>
              )}

              {!esPF && (
                <fieldset className="grid gap-4 sm:grid-cols-3">
                  <Leyenda>{t('bloque_actividad', 'Actividad y registro')}</Leyenda>
                  <Campo etiqueta={t('epigrafe_iae', 'Epígrafe IAE / CNAE')}><input value={form.epigrafe_iae} maxLength={20} onChange={(e) => setForm((f) => ({ ...f, epigrafe_iae: e.target.value }))} className={`${CLASE_INPUT} font-mono`} /></Campo>
                  {['SL', 'SA'].includes(form.tipo) && (
                    <div className="sm:col-span-2"><Campo etiqueta={t('datos_registrales', 'Datos registrales (Registro Mercantil, tomo, folio, hoja)')}><input value={form.datos_registrales} maxLength={255} onChange={(e) => setForm((f) => ({ ...f, datos_registrales: e.target.value }))} className={CLASE_INPUT} /></Campo></div>
                  )}
                </fieldset>
              )}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setModal(null)}>{t('cancelar', 'Cancelar')}</Button>
                <Button type="submit" loading={guardando} disabled={Boolean(modal.entidad) && !puedeEditar(modal.entidad)}>{t('guardar', 'Guardar')}</Button>
              </div>
            </form>
              </>
            ) },
            { id: 'documentacion', etiqueta: t('pestana_documentacion', 'Documentación'), requiereGuardado: true,
              ayudaDesactivada: t('guardar_antes', 'Guarda la entidad para añadir documentos.'),
              contenido: modal.entidad && (
                <DocumentosObjeto
                  tabla="m_company" id={modal.entidad.id} soloLectura={!puedeEditar(modal.entidad)}
                  ficha={form}
                  // Los datos elegidos del DNI van al formulario y a la pestaña
                  // Datos; se guardan con «Guardar» (decidido con el usuario).
                  onDatosDocumento={(cambios) => {
                    setForm((f) => ({ ...f, ...cambios }));
                    setPendientes(new Set(Object.keys(cambios)));
                    setModal((m) => ({ ...m, pestana: 'datos', vez: (m.vez || 0) + 1 }));
                  }}
                  // Al subir el DNI se actualiza la ficha: también el formulario
                  // abierto, para que «Guardar» en Datos no pise lo nuevo.
                  onDocumentoIdentidad={(doc) => {
                    // Todos los datos leídos del DNI (04/10/2026): antes faltaban
                    // nacimiento y nacionalidad, y «Guardar» en Datos los habría
                    // dejado vacíos.
                    setForm((f) => ({
                      ...f, tipo_documento: doc.tipo_documento, nif: doc.nif ?? f.nif,
                      fecha_caducidad_doc: doc.fecha_caducidad_doc ?? f.fecha_caducidad_doc,
                      fecha_nacimiento: doc.fecha_nacimiento ?? f.fecha_nacimiento,
                      nacionalidad: doc.nacionalidad ?? f.nacionalidad,
                    }));
                    cargar();
                  }}
                />
              ) },
          ]}
        />
      )}

      {modal?.tipo === 'socios' && (
        <VentanaModal icono={<Users size={20} />} titulo={t('socios_de', 'Socios de {entidad}').replace('{entidad}', modal.entidad.nombre)} onCerrar={() => setModal(null)}
          anadir={puedeEditar(modal.entidad) && !formSocio ? { texto: t('anadir_socio', 'Añadir socio'), onClick: nuevoSocio } : null}>
            <p className="text-sm font-bold text-on-surface1">{t('suma_vigente', 'Participación vigente: {n} %').replace('{n} %', formatPorcentaje(sumaVigente)).replace('{n}', formatPorcentaje(sumaVigente).slice(0, -2))}</p>
            <div className="mt-4"><AvisoError>{error}</AvisoError></div>

            <TablaTema className="mt-5" columnas={[{ texto: '' }, { texto: t('col_socio', 'Socio') }, { texto: t('col_papel', 'Papel') }, { texto: '%', derecha: true }, { texto: t('col_desde', 'Desde') }, { texto: t('col_hasta', 'Hasta') }]}>
                {socios.map((s, i) => (
                  <tr key={s.id} className={claseFila(i)}>
                    <td className={`${TD} whitespace-nowrap`}>
                      <BotonFila icono={<FileText size={14} />} titulo={t('documentos_socio', 'Documentos del socio')} onClick={() => setModal({ tipo: 'documentos', tabla: 'x_company_partner', id: s.id, titulo: `${s.socio_nombre} · ${modal.entidad.nombre}`, soloLectura: !puedeEditar(modal.entidad), volver: modal })} />
                      {puedeEditar(modal.entidad) && <>
                        <BotonFila icono={<Pencil size={14} />} titulo={t('editar_socio', 'Editar')} onClick={() => editarSocio(s)} />
                        <BotonFila icono={<Trash2 size={14} />} titulo={t('quitar_socio', 'Quitar')} onClick={() => quitarSocio(s)} />
                      </>}
                    </td>
                    <td className={`${TD} font-black tracking-tight`}>{s.socio_nombre}</td>
                    <td className={TD}>{t(`papel_${s.tipo.toLowerCase()}`, s.tipo)}</td>
                    <td className={`${TD} text-right font-mono`}>{formatPorcentaje(s.porcentaje)}</td>
                    <td className={`${TD} font-mono`}>{fecha(s.fecha_desde)}</td>
                    <td className={`${TD} font-mono`}>{fecha(s.fecha_hasta) || t('vigente', 'vigente')}</td>
                  </tr>
                ))}
                {!socios.length && <FilaVacia columnas={6}>{t('sin_socios', 'Sin socios registrados.')}</FilaVacia>}
            </TablaTema>


            {formSocio && (
              <Recuadro as="form" onSubmit={guardarSocio} className="mt-5 grid gap-4 sm:grid-cols-3">
                <Campo etiqueta={t('col_socio', 'Socio')}>
                  <select required value={formSocio.socio_id} onChange={(e) => setFormSocio((f) => ({ ...f, socio_id: e.target.value }))} className={CLASE_INPUT}>
                    <option value="">{t('elige', 'Elige…')}</option>
                    {candidatos.map((e) => <option key={e.id} value={e.id}>{e.nombre} ({etiquetaTipo(e.tipo)})</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={t('col_papel', 'Papel')}>
                  <select value={formSocio.tipo} onChange={(e) => setFormSocio((f) => ({ ...f, tipo: e.target.value }))} className={CLASE_INPUT}>
                    {TIPOS_SOCIO.map((v) => <option key={v} value={v}>{t(`papel_${v.toLowerCase()}`, v)}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={t('porcentaje', 'Porcentaje')}><input required type="number" step="0.001" min="0" max="100" value={formSocio.porcentaje} onChange={(e) => setFormSocio((f) => ({ ...f, porcentaje: e.target.value }))} className={`${CLASE_INPUT} font-mono`} /></Campo>
                <Campo etiqueta={t('col_desde', 'Desde')}><input required type="date" value={formSocio.fecha_desde} onChange={(e) => setFormSocio((f) => ({ ...f, fecha_desde: e.target.value }))} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('col_hasta', 'Hasta')}><input type="date" value={formSocio.fecha_hasta} onChange={(e) => setFormSocio((f) => ({ ...f, fecha_hasta: e.target.value }))} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('notas', 'Notas')}><input value={formSocio.notas} maxLength={255} onChange={(e) => setFormSocio((f) => ({ ...f, notas: e.target.value }))} className={CLASE_INPUT} /></Campo>
                <Ayuda className="sm:col-span-3">{t('ayuda_socio', 'Si el socio es una persona, créala antes como entidad de tipo Persona.')}</Ayuda>
                <div className="flex justify-end gap-3 sm:col-span-3">
                  <Button type="button" variant="secondary" onClick={() => setFormSocio(null)}>{t('cancelar', 'Cancelar')}</Button>
                  <Button type="submit" loading={guardando}>{t('guardar', 'Guardar')}</Button>
                </div>
              </Recuadro>
            )}
        </VentanaModal>
      )}

      {modal?.tipo === 'documentos' && (
        <VentanaModal ancho="max-w-4xl" icono={<FileText size={20} />} titulo={t('documentos_de', 'Documentos de {nombre}').replace('{nombre}', modal.titulo)} onCerrar={() => setModal(modal.volver || null)}>
            <DocumentosObjeto tabla={modal.tabla} id={modal.id} soloLectura={modal.soloLectura} />
        </VentanaModal>
      )}
    </div>
  );
}
