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
import { Contact, Plus, X, KeyRound, Wrench, EyeOff, RotateCcw } from 'lucide-react';
import Button from '../../components/UI/Button';
import DataTable from '../../components/UI/DataTable';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';

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

const Campo = ({ etiqueta, children, ancho = '' }) => (
  <label className={`block text-sm font-bold text-on-background ${ancho}`}>{etiqueta}{children}</label>
);
const Casilla = ({ etiqueta, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm font-bold text-on-background">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />{etiqueta}
  </label>
);
const Leyenda = ({ children }) => <legend className="mb-2 text-xs font-black uppercase tracking-widest">{children}</legend>;
const claseInput = 'mt-1.5 w-full rounded-lg border border-border bg-surface1 px-3 py-2 text-on-background';

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
    { id: 'nombre', label: t('col_nombre', 'Nombre'), sortField: 'nombre', render: (x) => <span className="font-bold text-on-background">{nombreDe(x)}{!Number(x.activo) && ` · ${t('de_baja', 'de baja')}`}</span> },
    { id: 'documento', label: t('col_documento', 'Documento'), sortField: 'documento', render: (x) => (x.datos_ocultos ? <EyeOff size={14} aria-label={t('oculto', 'Oculto')} /> : <span className="font-mono">{x.documento || '—'}</span>) },
    { id: 'papeles', label: t('col_papeles', 'Papeles'), render: (x) => [x.es_inquilino && t('papel_inquilino', 'Inquilino'), x.es_proveedor && `${t('papel_proveedor', 'Proveedor')}${x.gremio ? ` (${x.gremio})` : ''}`].filter(Boolean).join(' · ') || '—' },
    { id: 'contacto', label: t('col_contacto', 'Contacto'), render: (x) => [x.telefono, x.email].filter(Boolean).join(' · ') || '—' },
    { id: 'municipio', label: t('col_municipio', 'Municipio'), sortField: 'municipio', render: (x) => x.municipio || '—' },
    ...(bajas ? [{ id: 'reactivar', label: '', render: (x) => (!Number(x.activo) ? <Button size="xs" variant="outline" leftIcon={<RotateCcw size={14} />} onClick={() => reactivar(x)}>{t('reactivar', 'Reactivar')}</Button> : null) }] : []),
  ];

  const titulos = { inquilino: t('titulo_inquilinos', 'Inquilinos'), proveedor: t('titulo_proveedores', 'Proveedores'), todos: t('titulo_todos', 'Todos los terceros') };
  const iconos = { inquilino: <KeyRound size={20} />, proveedor: <Wrench size={20} />, todos: <Contact size={20} /> };
  const botonNuevo = { inquilino: t('nuevo_inquilino', 'Nuevo inquilino'), proveedor: t('nuevo_proveedor', 'Nuevo proveedor'), todos: t('nuevo', 'Nuevo tercero') };
  const juridica = form.tipo_persona === 'JURIDICA';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest">{t('seccion', 'Gestión')}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-on-background">{t('titulo', 'Terceros')}</h1>
          <p className="mt-2 text-sm">{t('subtitulo', 'Inquilinos, proveedores y demás personas o empresas con las que trabajas. Una persona, una ficha por papel.')}</p>
        </div>
        <Button variant="primary" size="lg" leftIcon={<Plus size={18} />} onClick={() => abrir()}>{botonNuevo[papel]}</Button>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label={t('titulo', 'Terceros')}>
        {PAPELES.map((p) => (
          <Button key={p} size="sm" variant={p === papel ? 'primary' : 'outline'} onClick={() => navegar(`/gestion/terceros/${p}`)}>{titulos[p]}</Button>
        ))}
      </nav>

      {error && !modal && <div role="alert" className="rounded-xl border border-destructive bg-surface1 px-4 py-3 text-sm text-destructive-text">{error}</div>}
      {aviso && <div role="status" className="rounded-xl border border-border bg-surface1 px-4 py-3 text-sm">{aviso}</div>}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface2 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-surface2 text-on-background">{iconos[papel]}</div>
          <div className="flex-1">
            <h2 className="font-black text-on-background">{titulos[papel]}</h2>
            <p className="text-xs">{terceros.length} {terceros.length === 1 ? t('tercero', 'tercero') : t('terceros', 'terceros')}</p>
          </div>
          <Casilla etiqueta={t('ver_bajas', 'Ver bajas')} checked={bajas} onChange={setBajas} />
        </div>
        {cargando
          ? <div className="px-5 py-12 text-center text-sm">{t('cargando', 'Cargando…')}</div>
          : (
            <div className="p-3">
              <DataTable
                columns={columnas} data={terceros} keyField="id" rowsPerPage={15}
                searchFn={(x, q) => `${nombreDe(x)} ${x.documento || ''} ${x.email || ''} ${x.telefono || ''} ${x.gremio || ''}`.toLowerCase().includes(q)}
                onEdit={(x) => abrir(x)}
                onDelete={(x) => (Number(x.activo) ? baja(x) : null)}
                emptyMessage={t('vacio', 'Todavía no hay terceros.')}
              />
            </div>
          )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-surface2 p-6 shadow-xl">
            <div className="flex justify-between gap-4">
              <h2 className="text-xl font-black text-on-background">{modal.tercero ? t('editar', 'Editar tercero') : botonNuevo[papel]}</h2>
              <button onClick={() => !guardando && setModal(null)} aria-label={t('cerrar', 'Cerrar')}><X size={20} /></button>
            </div>
            {ocultos && <p className="mt-3 flex items-center gap-2 text-sm"><EyeOff size={14} />{t('aviso_ocultos', 'Tercero confidencial: el documento, el IBAN, la fecha de nacimiento y los ingresos no se muestran con tu acceso.')}</p>}
            {error && <div role="alert" className="mt-4 text-sm text-destructive-text">{error}</div>}
            <form onSubmit={guardar} className="mt-5 space-y-6">
              <fieldset className="grid gap-4 sm:grid-cols-3">
                <Leyenda>{t('bloque_identidad', 'Identidad')}</Leyenda>
                <Campo etiqueta={t('tipo_persona', 'Tipo')}>
                  <select {...f('tipo_persona')} className={claseInput}>
                    <option value="FISICA">{t('persona_fisica', 'Persona física')}</option>
                    <option value="JURIDICA">{t('persona_juridica', 'Empresa')}</option>
                  </select>
                </Campo>
                <Campo etiqueta={juridica ? t('nombre_comercial', 'Nombre comercial') : t('nombre', 'Nombre')}><input autoFocus maxLength={100} {...f('nombre')} className={claseInput} /></Campo>
                {juridica
                  ? <Campo etiqueta={t('razon_social', 'Razón social')}><input maxLength={200} {...f('razon_social')} className={claseInput} /></Campo>
                  : <Campo etiqueta={t('apellidos', 'Apellidos')}><input maxLength={150} {...f('apellidos')} className={claseInput} /></Campo>}
                <Campo etiqueta={t('tipo_documento', 'Documento')}>
                  <select {...f('tipo_documento')} disabled={ocultos} className={claseInput}>
                    {TIPOS_DOC.map((v) => <option key={v} value={v}>{t(`doc_${v.toLowerCase()}`, v)}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={t('documento', 'Número')}><input maxLength={20} disabled={ocultos} value={ocultos ? '••••••' : form.documento} onChange={(e) => setForm((s) => ({ ...s, documento: e.target.value.toUpperCase() }))} className={`${claseInput} font-mono`} /></Campo>
                {!juridica && <Campo etiqueta={t('fecha_nacimiento', 'Fecha de nacimiento')}><input type="date" disabled={ocultos} {...f('fecha_nacimiento')} className={claseInput} /></Campo>}
                <Campo etiqueta={t('nacionalidad', 'Nacionalidad (ES, FR…)')}><input maxLength={2} value={form.nacionalidad} onChange={(e) => setForm((s) => ({ ...s, nacionalidad: e.target.value.toUpperCase() }))} className={claseInput} /></Campo>
              </fieldset>

              <fieldset className="grid gap-4 sm:grid-cols-3">
                <Leyenda>{t('bloque_contacto', 'Contacto y cobros')}</Leyenda>
                <Campo etiqueta={t('email', 'Email')}><input type="email" maxLength={150} {...f('email')} className={claseInput} /></Campo>
                <Campo etiqueta={t('telefono', 'Teléfono')}><input maxLength={30} {...f('telefono')} className={claseInput} /></Campo>
                <Campo etiqueta={t('iban', 'IBAN')}><input maxLength={40} disabled={ocultos} value={ocultos ? '••••••' : form.iban} onChange={(e) => setForm((s) => ({ ...s, iban: e.target.value.toUpperCase() }))} className={`${claseInput} font-mono`} /></Campo>
                <Campo etiqueta={t('domicilio', 'Dirección')} ancho="sm:col-span-3"><input maxLength={255} {...f('domicilio')} className={claseInput} /></Campo>
                <Campo etiqueta={t('codigo_postal', 'Código postal')}><input maxLength={10} {...f('codigo_postal')} className={claseInput} /></Campo>
                <Campo etiqueta={t('municipio', 'Municipio')}><input maxLength={100} {...f('municipio')} className={claseInput} /></Campo>
                <Campo etiqueta={t('provincia', 'Provincia')}><input maxLength={100} {...f('provincia')} className={claseInput} /></Campo>
              </fieldset>

              <fieldset className="grid gap-4 sm:grid-cols-3">
                <Leyenda>{t('bloque_rgpd', 'Protección de datos')}</Leyenda>
                <Casilla etiqueta={t('consentimiento_rgpd', 'Ha dado su consentimiento')} checked={form.consentimiento_rgpd} onChange={(v) => setForm((s) => ({ ...s, consentimiento_rgpd: v }))} />
                <Campo etiqueta={t('fecha_consentimiento', 'Fecha del consentimiento')}><input type="date" {...f('fecha_consentimiento')} className={claseInput} /></Campo>
                <Campo etiqueta={t('borrar_despues_de', 'Borrar después de')}><input type="date" {...f('borrar_despues_de')} className={claseInput} /></Campo>
                <Campo etiqueta={t('finalidad_rgpd', 'Finalidad')} ancho="sm:col-span-3"><input maxLength={255} {...f('finalidad_rgpd')} className={claseInput} /></Campo>
                <Casilla etiqueta={t('confidencial', 'Confidencial (solo lo ven quienes gestionan)')} checked={form.confidencial} onChange={(v) => setForm((s) => ({ ...s, confidencial: v }))} />
                <Casilla etiqueta={t('es_empresario', 'Empresario o profesional (retención en locales)')} checked={form.es_empresario} onChange={(v) => setForm((s) => ({ ...s, es_empresario: v }))} />
              </fieldset>

              <fieldset className="space-y-4 rounded-xl border border-border p-4">
                <Casilla etiqueta={t('ficha_inquilino', 'Es inquilino, avalista u ocupante')} checked={Boolean(inq)} onChange={(v) => setInq(v ? { ...INQUILINO } : null)} />
                {inq && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Campo etiqueta={t('situacion_laboral', 'Situación laboral')}>
                      <select {...fi('situacion_laboral')} className={claseInput}>
                        <option value="">—</option>
                        {SITUACIONES.map((v) => <option key={v} value={v}>{t(`situacion_${v.toLowerCase()}`, v)}</option>)}
                      </select>
                    </Campo>
                    <Campo etiqueta={t('empleador', 'Empleador')}><input maxLength={150} {...fi('empleador')} className={claseInput} /></Campo>
                    <Campo etiqueta={t('ingresos_mensuales', 'Ingresos mensuales (€)')}><input type="number" step="0.01" min="0" disabled={ocultos} {...fi('ingresos_mensuales')} className={claseInput} /></Campo>
                    <Campo etiqueta={t('email_contacto', 'Email de contacto')}><input type="email" maxLength={150} {...fi('email_contacto')} className={claseInput} /></Campo>
                    <Campo etiqueta={t('contacto_emergencia', 'Contacto de emergencia')}><input maxLength={150} {...fi('contacto_emergencia')} className={claseInput} /></Campo>
                    <Campo etiqueta={t('telefono_emergencia', 'Teléfono de emergencia')}><input maxLength={30} {...fi('telefono_emergencia')} className={claseInput} /></Campo>
                    <Campo etiqueta={t('idioma', 'Idioma de los documentos')}>
                      <select {...fi('idioma')} className={claseInput}>{IDIOMAS.map((v) => <option key={v} value={v}>{t(`idioma_${v}`, v.toUpperCase())}</option>)}</select>
                    </Campo>
                    <Campo etiqueta={t('valoracion', 'Valoración (1–5)')}><input type="number" min="1" max="5" {...fi('valoracion')} className={claseInput} /></Campo>
                    <Casilla etiqueta={t('seguro_impago', 'Seguro de impago')} checked={Boolean(inq.seguro_impago)} onChange={(v) => setInq((s) => ({ ...s, seguro_impago: v }))} />
                    {inq.seguro_impago && <>
                      <Campo etiqueta={t('seguro_compania', 'Compañía')}><input maxLength={100} {...fi('seguro_compania')} className={claseInput} /></Campo>
                      <Campo etiqueta={t('seguro_poliza', 'Póliza')}><input maxLength={50} {...fi('seguro_poliza')} className={claseInput} /></Campo>
                    </>}
                    <Campo etiqueta={t('incidencias', 'Incidencias')} ancho="sm:col-span-3"><textarea rows={2} {...fi('incidencias')} className={claseInput} /></Campo>
                  </div>
                )}
              </fieldset>

              <fieldset className="space-y-4 rounded-xl border border-border p-4">
                <Casilla etiqueta={t('ficha_proveedor', 'Es proveedor')} checked={Boolean(prov)} onChange={(v) => setProv(v ? { ...PROVEEDOR } : null)} />
                {prov && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Campo etiqueta={t('gremio', 'Gremio')}><input maxLength={50} {...fp('gremio')} className={claseInput} /></Campo>
                    <Campo etiqueta={t('tipo_iva_defecto', 'IVA habitual (%)')}><input type="number" step="0.01" min="0" max="100" {...fp('tipo_iva_defecto')} className={claseInput} /></Campo>
                    <Campo etiqueta={t('retencion_defecto', 'Retención habitual (%)')}><input type="number" step="0.01" min="0" max="100" {...fp('retencion_defecto')} className={claseInput} /></Campo>
                    <Campo etiqueta={t('forma_pago', 'Forma de pago')}>
                      <select {...fp('forma_pago')} className={claseInput}>
                        <option value="">—</option>
                        {FORMAS_PAGO.map((v) => <option key={v} value={v}>{t(`pago_${v.toLowerCase()}`, v)}</option>)}
                      </select>
                    </Campo>
                    <Campo etiqueta={t('dias_pago', 'Días de pago')}><input type="number" min="0" max="365" {...fp('dias_pago')} className={claseInput} /></Campo>
                    <Campo etiqueta={t('iban_pago', 'IBAN de pago (si es otro)')}><input maxLength={40} value={prov.iban_pago ?? ''} onChange={(e) => setProv((s) => ({ ...s, iban_pago: e.target.value.toUpperCase() }))} className={`${claseInput} font-mono`} /></Campo>
                  </div>
                )}
              </fieldset>

              <Campo etiqueta={t('notas', 'Notas')}><textarea rows={2} {...f('notas')} className={claseInput} /></Campo>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setModal(null)}>{t('cancelar', 'Cancelar')}</Button>
                <Button type="submit" loading={guardando}>{t('guardar', 'Guardar')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
