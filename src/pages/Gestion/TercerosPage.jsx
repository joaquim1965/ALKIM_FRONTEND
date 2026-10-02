/**
 * TercerosPage — Gestión → Terceros (inquilinos, proveedores, todos).
 *
 * Plan core inmobiliaria, fase 0b (30/09/2026). Un tercero es UNA persona o
 * empresa, única por documento, con una ficha por papel. Si se da de alta un
 * documento que ya existe, el servidor añade la ficha nueva al tercero que ya
 * hay en lugar de duplicarlo.
 *
 *   /terceros?papel=inquilino|proveedor|todos&bajas=0|1
 *   /terceros/:id  ·  /terceros/:id/(inquilino|proveedor)  ·  /terceros/:id/reactivar
 *
 * Textos en s_dictionary, contexto «Terceros» (ES, EN, CA, FR):
 * DATABASE/MIGRATIONS/2026.10.02b - textos terceros.sql
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Contact, Plus, KeyRound, Wrench, EyeOff, RotateCcw } from 'lucide-react';
import Button from '../../components/UI/Button';
import DataTable from '../../components/UI/DataTable';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import DocumentosObjeto from '../../components/Documentos/DocumentosObjeto';
import {
  CabeceraPagina, Panel, CabeceraPanel, Campo, Leyenda, Casilla, AvisoError, AvisoAtencion, SinDato,
  VentanaModal, CLASE_INPUT, Recuadro, Rotulo,
} from '../../components/UI/TemaPagina';

const PAPELES = ['inquilino', 'proveedor', 'todos'];
const TIPOS_DOC = ['NIF', 'NIE', 'PASAPORTE', 'CIF', 'OTRO'];
const SITUACIONES = ['CUENTA_AJENA', 'AUTONOMO', 'ESTUDIANTE', 'JUBILADO', 'DESEMPLEADO', 'OTRA'];
const FORMAS_PAGO = ['TRANSFERENCIA', 'DOMICILIACION', 'TARJETA', 'EFECTIVO', 'OTRA'];
const IDIOMAS = ['es', 'en', 'ca', 'fr'];

const VACIO = {
  tipo_persona: 'FISICA', nombre: '', apellidos: '', razon_social: '', tipo_documento: 'NIF', documento: '',
  fecha_nacimiento: '', nacionalidad: '', email: '', telefono: '', iban: '', domicilio: '', codigo_postal: '',
  municipio: '', provincia: '', pais: 'ES', es_empresario: false, consentimiento_rgpd: false,
  fecha_consentimiento: '', finalidad_rgpd: '', borrar_despues_de: '', confidencial: false, notas: '',
};
const INQUILINO = {
  situacion_laboral: '', empleador: '', ingresos_mensuales: '', email_contacto: '', contacto_emergencia: '',
  telefono_emergencia: '', idioma: 'es', seguro_impago: false, seguro_compania: '', seguro_poliza: '', valoracion: '', incidencias: '',
};
const PROVEEDOR = { gremio: '', tipo_iva_defecto: '', retencion_defecto: '', forma_pago: '', dias_pago: '', iban_pago: '' };

const fecha = (v) => (v ? String(v).slice(0, 10) : '');
const desde = (plantilla, datos) => Object.fromEntries(Object.keys(plantilla).map((k) => {
  const v = datos?.[k];
  if (typeof plantilla[k] === 'boolean') return [k, Boolean(Number(v))];
  if (k.startsWith('fecha') || k === 'borrar_despues_de') return [k, fecha(v)];
  return [k, v ?? plantilla[k]];
}));

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detalle = b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : null;
    throw Object.assign(new Error(detalle || b.message || `Error ${r.status}`), { cuerpo: b });
  }
  return b;
}


export default function TercerosPage() {
  const { t } = useTmTr('Terceros');
  const { papel: papelUrl } = useParams();
  const navegar = useNavigate();
  const papel = PAPELES.includes(papelUrl) ? papelUrl : 'todos';

  const [terceros, setTerceros] = useState([]);
  const [bajas, setBajas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [modal, setModal] = useState(null);           // { tercero: null | datos }
  const [form, setForm] = useState(VACIO);
  const [inq, setInq] = useState(null);               // null = sin ficha de inquilino
  const [prov, setProv] = useState(null);             // null = sin ficha de proveedor
  const [ocultos, setOcultos] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try { setTerceros((await pedir(`/terceros?papel=${papel}&bajas=${bajas ? 1 : 0}`)).data || []); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, [papel, bajas]);
  useEffect(() => { cargar(); }, [cargar]);

  const abrir = async (tercero = null) => {
    setError(''); setAviso('');
    if (!tercero) {
      setForm(VACIO); setOcultos(false);
      setInq(papel === 'inquilino' ? { ...INQUILINO } : null);
      setProv(papel === 'proveedor' ? { ...PROVEEDOR } : null);
      setModal({ tercero: null });
      return;
    }
    try {
      const d = (await pedir(`/terceros/${tercero.id}`)).data;
      setForm(desde(VACIO, d)); setOcultos(Boolean(d.datos_ocultos));
      setInq(d.inquilino ? desde(INQUILINO, d.inquilino) : null);
      setProv(d.proveedor ? desde(PROVEEDOR, d.proveedor) : null);
      setModal({ tercero: d });
    } catch (e) { setError(e.message); }
  };

  const guardar = async (ev) => {
    ev.preventDefault();
    if (!form.nombre.trim()) return setError(t('falta_nombre', 'Indica el nombre.'));
    setGuardando(true); setError('');
    try {
      const edita = Boolean(modal.tercero);
      const cuerpo = { ...form, nombre: form.nombre.trim(), inquilino: inq ? { ...inq } : undefined, proveedor: prov || undefined };
      if (ocultos) {
        delete cuerpo.documento; delete cuerpo.iban; delete cuerpo.fecha_nacimiento;
        if (cuerpo.inquilino) delete cuerpo.inquilino.ingresos_mensuales;
      }
      const b = await pedir(edita ? `/terceros/${modal.tercero.id}` : '/terceros', { method: edita ? 'PUT' : 'POST', body: JSON.stringify(cuerpo) });
      // Quitar una ficha que el tercero tenía y ya no está marcada.
      if (edita && modal.tercero.inquilino && !inq) await pedir(`/terceros/${modal.tercero.id}/inquilino`, { method: 'DELETE' });
      if (edita && modal.tercero.proveedor && !prov) await pedir(`/terceros/${modal.tercero.id}/proveedor`, { method: 'DELETE' });
      if (b.data?.existente) setAviso(t('aviso_existente', 'Ya existía un tercero con ese documento: se le ha añadido la ficha nueva y no se han cambiado sus datos.'));
      else if (b.avisos?.length) setAviso(b.avisos.join(' '));
      setModal(null);
      await cargar();
    } catch (e) {
      setError(e.cuerpo?.code === 'PARTY_EXISTS' ? t('ya_existe', 'Ya existe un tercero con ese documento y esa ficha.') : e.message);
    } finally { setGuardando(false); }
  };

  const baja = async (x) => {
    if (!window.confirm(t('confirmar_baja', '¿Dar de baja este tercero? Se conserva su historia.'))) return;
    try { await pedir(`/terceros/${x.id}`, { method: 'DELETE' }); await cargar(); } catch (e) { setError(e.message); }
  };
  const reactivar = async (x) => {
    try { await pedir(`/terceros/${x.id}/reactivar`, { method: 'POST' }); await cargar(); } catch (e) { setError(e.message); }
  };

  const nombreDe = (x) => x.razon_social || [x.nombre, x.apellidos].filter(Boolean).join(' ');
  const f = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const fi = (k) => ({ value: inq?.[k] ?? '', onChange: (e) => setInq((s) => ({ ...s, [k]: e.target.value })) });
  const fp = (k) => ({ value: prov?.[k] ?? '', onChange: (e) => setProv((s) => ({ ...s, [k]: e.target.value })) });

  const columnas = [
    { id: 'nombre', label: t('col_nombre', 'Nombre'), sortField: 'nombre', render: (x) => <span className="text-sm font-black tracking-tight">{nombreDe(x)}{!Number(x.activo) && ` · ${t('de_baja', 'de baja')}`}</span> },
    { id: 'documento', label: t('col_documento', 'Documento'), sortField: 'documento', render: (x) => (x.datos_ocultos ? <EyeOff size={14} aria-label={t('oculto', 'Oculto')} /> : (x.documento ? <span className="font-mono text-xs">{x.documento}</span> : <SinDato />)) },
    { id: 'papeles', label: t('col_papeles', 'Papeles'), render: (x) => [x.es_inquilino && t('papel_inquilino', 'Inquilino'), x.es_proveedor && `${t('papel_proveedor', 'Proveedor')}${x.gremio ? ` (${x.gremio})` : ''}`].filter(Boolean).join(' · ') || <SinDato /> },
    { id: 'contacto', label: t('col_contacto', 'Contacto'), render: (x) => [x.telefono, x.email].filter(Boolean).join(' · ') || <SinDato /> },
    { id: 'municipio', label: t('col_municipio', 'Municipio'), sortField: 'municipio', render: (x) => x.municipio || <SinDato /> },
  ];
  // Reactivar va con las demás acciones, en la primera columna (CRITERIOS «Los botones van SIEMPRE en la primera columna»).
  const accionReactivar = (x) => (!Number(x.activo)
    ? <button type="button" onClick={() => reactivar(x)} title={t('reactivar', 'Reactivar')} aria-label={t('reactivar', 'Reactivar')} className="rounded p-1 transition-all hover:bg-surface-hover"><RotateCcw size={12} /></button>
    : null);

  const titulos = { inquilino: t('titulo_inquilinos', 'Inquilinos'), proveedor: t('titulo_proveedores', 'Proveedores'), todos: t('titulo_todos', 'Todos los terceros') };
  const iconos = { inquilino: <KeyRound size={20} />, proveedor: <Wrench size={20} />, todos: <Contact size={20} /> };
  const botonNuevo = { inquilino: t('nuevo_inquilino', 'Nuevo inquilino'), proveedor: t('nuevo_proveedor', 'Nuevo proveedor'), todos: t('nuevo', 'Nuevo tercero') };
  const juridica = form.tipo_persona === 'JURIDICA';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CabeceraPagina icono={<Contact size={24} />} titulo={t('titulo', 'Terceros')} subtitulo={t('subtitulo', 'Inquilinos, proveedores y demás personas o empresas con las que trabajas. Una persona, una ficha por papel.')}>
        <Button variant="primary" size="lg" leftIcon={<Plus size={18} />} onClick={() => abrir()}>{botonNuevo[papel]}</Button>
      </CabeceraPagina>

      <nav className="flex flex-wrap gap-2" aria-label={t('titulo', 'Terceros')}>
        {PAPELES.map((p) => (
          <Button key={p} size="sm" variant={p === papel ? 'primary' : 'outline'} onClick={() => navegar(`/gestion/terceros/${p}`)}>{titulos[p]}</Button>
        ))}
      </nav>

      {!modal && <AvisoError>{error}</AvisoError>}
      <AvisoAtencion>{aviso}</AvisoAtencion>

      <Panel className="overflow-hidden">
        <CabeceraPanel icono={iconos[papel]} titulo={titulos[papel]}
          contador={`${terceros.length} ${terceros.length === 1 ? t('tercero', 'tercero') : t('terceros', 'terceros')}`}>
          <Casilla etiqueta={t('ver_bajas', 'Ver bajas')} checked={bajas} onChange={setBajas} />
        </CabeceraPanel>
        {cargando
          ? <div className="px-5 py-12 text-center text-xs font-bold uppercase tracking-widest text-on-surface2">{t('cargando', 'Cargando…')}</div>
          : (
            <div className="p-3">
              <DataTable
                columns={columnas} data={terceros} keyField="id" rowsPerPage={15}
                searchFn={(x, q) => `${nombreDe(x)} ${x.documento || ''} ${x.email || ''} ${x.telefono || ''} ${x.gremio || ''}`.toLowerCase().includes(q)}
                onEdit={(x) => abrir(x)}
                onDelete={(x) => (Number(x.activo) ? baja(x) : null)}
                extraActions={bajas ? accionReactivar : undefined}
                emptyMessage={t('vacio', 'Todavía no hay terceros.')}
              />
            </div>
          )}
      </Panel>

      {modal && (
        <VentanaModal ancho="max-w-4xl" icono={iconos[papel]} titulo={modal.tercero ? t('editar', 'Editar tercero') : botonNuevo[papel]} onCerrar={() => !guardando && setModal(null)}>
            {ocultos && <AvisoAtencion><span className="flex items-center gap-2"><EyeOff size={14} />{t('aviso_ocultos', 'Tercero confidencial: el documento, el IBAN, la fecha de nacimiento y los ingresos no se muestran con tu acceso.')}</span></AvisoAtencion>}
            <div className="mt-4"><AvisoError>{error}</AvisoError></div>
            <form onSubmit={guardar} className="mt-5 space-y-6">
              <fieldset className="grid gap-4 sm:grid-cols-3">
                <Leyenda>{t('bloque_identidad', 'Identidad')}</Leyenda>
                <Campo etiqueta={t('tipo_persona', 'Tipo')}>
                  <select {...f('tipo_persona')} className={CLASE_INPUT}>
                    <option value="FISICA">{t('persona_fisica', 'Persona física')}</option>
                    <option value="JURIDICA">{t('persona_juridica', 'Empresa')}</option>
                  </select>
                </Campo>
                <Campo etiqueta={juridica ? t('nombre_comercial', 'Nombre comercial') : t('nombre', 'Nombre')}><input autoFocus maxLength={100} {...f('nombre')} className={CLASE_INPUT} /></Campo>
                {juridica
                  ? <Campo etiqueta={t('razon_social', 'Razón social')}><input maxLength={200} {...f('razon_social')} className={CLASE_INPUT} /></Campo>
                  : <Campo etiqueta={t('apellidos', 'Apellidos')}><input maxLength={150} {...f('apellidos')} className={CLASE_INPUT} /></Campo>}
                <Campo etiqueta={t('tipo_documento', 'Documento')}>
                  <select {...f('tipo_documento')} disabled={ocultos} className={CLASE_INPUT}>
                    {TIPOS_DOC.map((v) => <option key={v} value={v}>{t(`doc_${v.toLowerCase()}`, v)}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={t('documento', 'Número')}><input maxLength={20} disabled={ocultos} value={ocultos ? '••••••' : form.documento} onChange={(e) => setForm((s) => ({ ...s, documento: e.target.value.toUpperCase() }))} className={`${CLASE_INPUT} font-mono`} /></Campo>
                {!juridica && <Campo etiqueta={t('fecha_nacimiento', 'Fecha de nacimiento')}><input type="date" disabled={ocultos} {...f('fecha_nacimiento')} className={CLASE_INPUT} /></Campo>}
                <Campo etiqueta={t('nacionalidad', 'Nacionalidad (ES, FR…)')}><input maxLength={2} value={form.nacionalidad} onChange={(e) => setForm((s) => ({ ...s, nacionalidad: e.target.value.toUpperCase() }))} className={CLASE_INPUT} /></Campo>
              </fieldset>

              <fieldset className="grid gap-4 sm:grid-cols-3">
                <Leyenda>{t('bloque_contacto', 'Contacto y cobros')}</Leyenda>
                <Campo etiqueta={t('email', 'Email')}><input type="email" maxLength={150} {...f('email')} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('telefono', 'Teléfono')}><input maxLength={30} {...f('telefono')} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('iban', 'IBAN')}><input maxLength={40} disabled={ocultos} value={ocultos ? '••••••' : form.iban} onChange={(e) => setForm((s) => ({ ...s, iban: e.target.value.toUpperCase() }))} className={`${CLASE_INPUT} font-mono`} /></Campo>
                <Campo etiqueta={t('domicilio', 'Dirección')} ancho="sm:col-span-3"><input maxLength={255} {...f('domicilio')} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('codigo_postal', 'Código postal')}><input maxLength={10} {...f('codigo_postal')} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('municipio', 'Municipio')}><input maxLength={100} {...f('municipio')} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('provincia', 'Provincia')}><input maxLength={100} {...f('provincia')} className={CLASE_INPUT} /></Campo>
              </fieldset>

              <fieldset className="grid gap-4 sm:grid-cols-3">
                <Leyenda>{t('bloque_rgpd', 'Protección de datos')}</Leyenda>
                <Casilla etiqueta={t('consentimiento_rgpd', 'Ha dado su consentimiento')} checked={form.consentimiento_rgpd} onChange={(v) => setForm((s) => ({ ...s, consentimiento_rgpd: v }))} />
                <Campo etiqueta={t('fecha_consentimiento', 'Fecha del consentimiento')}><input type="date" {...f('fecha_consentimiento')} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('borrar_despues_de', 'Borrar después de')}><input type="date" {...f('borrar_despues_de')} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('finalidad_rgpd', 'Finalidad')} ancho="sm:col-span-3"><input maxLength={255} {...f('finalidad_rgpd')} className={CLASE_INPUT} /></Campo>
                <Casilla etiqueta={t('confidencial', 'Confidencial (solo lo ven quienes gestionan)')} checked={form.confidencial} onChange={(v) => setForm((s) => ({ ...s, confidencial: v }))} />
                <Casilla etiqueta={t('es_empresario', 'Empresario o profesional (retención en locales)')} checked={form.es_empresario} onChange={(v) => setForm((s) => ({ ...s, es_empresario: v }))} />
              </fieldset>

              <Recuadro as="fieldset" className="space-y-4">
                <Casilla etiqueta={t('ficha_inquilino', 'Es inquilino, avalista u ocupante')} checked={Boolean(inq)} onChange={(v) => setInq(v ? { ...INQUILINO } : null)} />
                {inq && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Campo etiqueta={t('situacion_laboral', 'Situación laboral')}>
                      <select {...fi('situacion_laboral')} className={CLASE_INPUT}>
                        <option value="">—</option>
                        {SITUACIONES.map((v) => <option key={v} value={v}>{t(`situacion_${v.toLowerCase()}`, v)}</option>)}
                      </select>
                    </Campo>
                    <Campo etiqueta={t('empleador', 'Empleador')}><input maxLength={150} {...fi('empleador')} className={CLASE_INPUT} /></Campo>
                    <Campo etiqueta={t('ingresos_mensuales', 'Ingresos mensuales (€)')}><input type="number" step="0.01" min="0" disabled={ocultos} {...fi('ingresos_mensuales')} className={CLASE_INPUT} /></Campo>
                    <Campo etiqueta={t('email_contacto', 'Email de contacto')}><input type="email" maxLength={150} {...fi('email_contacto')} className={CLASE_INPUT} /></Campo>
                    <Campo etiqueta={t('contacto_emergencia', 'Contacto de emergencia')}><input maxLength={150} {...fi('contacto_emergencia')} className={CLASE_INPUT} /></Campo>
                    <Campo etiqueta={t('telefono_emergencia', 'Teléfono de emergencia')}><input maxLength={30} {...fi('telefono_emergencia')} className={CLASE_INPUT} /></Campo>
                    <Campo etiqueta={t('idioma', 'Idioma de los documentos')}>
                      <select {...fi('idioma')} className={CLASE_INPUT}>{IDIOMAS.map((v) => <option key={v} value={v}>{t(`idioma_${v}`, v.toUpperCase())}</option>)}</select>
                    </Campo>
                    <Campo etiqueta={t('valoracion', 'Valoración (1–5)')}><input type="number" min="1" max="5" {...fi('valoracion')} className={CLASE_INPUT} /></Campo>
                    <Casilla etiqueta={t('seguro_impago', 'Seguro de impago')} checked={Boolean(inq.seguro_impago)} onChange={(v) => setInq((s) => ({ ...s, seguro_impago: v }))} />
                    {inq.seguro_impago && <>
                      <Campo etiqueta={t('seguro_compania', 'Compañía')}><input maxLength={100} {...fi('seguro_compania')} className={CLASE_INPUT} /></Campo>
                      <Campo etiqueta={t('seguro_poliza', 'Póliza')}><input maxLength={50} {...fi('seguro_poliza')} className={CLASE_INPUT} /></Campo>
                    </>}
                    <Campo etiqueta={t('incidencias', 'Incidencias')} ancho="sm:col-span-3"><textarea rows={2} {...fi('incidencias')} className={CLASE_INPUT} /></Campo>
                  </div>
                )}
              </Recuadro>

              <Recuadro as="fieldset" className="space-y-4">
                <Casilla etiqueta={t('ficha_proveedor', 'Es proveedor')} checked={Boolean(prov)} onChange={(v) => setProv(v ? { ...PROVEEDOR } : null)} />
                {prov && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Campo etiqueta={t('gremio', 'Gremio')}><input maxLength={50} {...fp('gremio')} className={CLASE_INPUT} /></Campo>
                    <Campo etiqueta={t('tipo_iva_defecto', 'IVA habitual (%)')}><input type="number" step="0.01" min="0" max="100" {...fp('tipo_iva_defecto')} className={CLASE_INPUT} /></Campo>
                    <Campo etiqueta={t('retencion_defecto', 'Retención habitual (%)')}><input type="number" step="0.01" min="0" max="100" {...fp('retencion_defecto')} className={CLASE_INPUT} /></Campo>
                    <Campo etiqueta={t('forma_pago', 'Forma de pago')}>
                      <select {...fp('forma_pago')} className={CLASE_INPUT}>
                        <option value="">—</option>
                        {FORMAS_PAGO.map((v) => <option key={v} value={v}>{t(`pago_${v.toLowerCase()}`, v)}</option>)}
                      </select>
                    </Campo>
                    <Campo etiqueta={t('dias_pago', 'Días de pago')}><input type="number" min="0" max="365" {...fp('dias_pago')} className={CLASE_INPUT} /></Campo>
                    <Campo etiqueta={t('iban_pago', 'IBAN de pago (si es otro)')}><input maxLength={40} value={prov.iban_pago ?? ''} onChange={(e) => setProv((s) => ({ ...s, iban_pago: e.target.value.toUpperCase() }))} className={`${CLASE_INPUT} font-mono`} /></Campo>
                  </div>
                )}
              </Recuadro>

              <Campo etiqueta={t('notas', 'Notas')}><textarea rows={2} {...f('notas')} className={CLASE_INPUT} /></Campo>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setModal(null)}>{t('cancelar', 'Cancelar')}</Button>
                <Button type="submit" loading={guardando}>{t('guardar', 'Guardar')}</Button>
              </div>
            </form>

            {modal.tercero && (
              <Recuadro as="section" className="mt-6 space-y-3">
                <Rotulo>{t('bloque_documentos', 'Documentos')}</Rotulo>
                <DocumentosObjeto tabla="m_party" id={modal.tercero.id} />
              </Recuadro>
            )}
        </VentanaModal>
      )}
    </div>
  );
}
