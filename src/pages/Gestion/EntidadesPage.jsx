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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Users, Trash2, Pencil, FileText } from 'lucide-react';
import Button from '../../components/UI/Button';
import DataTable from '../../components/UI/DataTable';
import Tooltip from '../../components/UI/Tooltip';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import DocumentosObjeto from '../../components/Documentos/DocumentosObjeto';
import {
  CabeceraPagina, Panel, CabeceraPanel, Campo, Leyenda, AvisoError, AvisoAtencion, Ayuda, SinDato,
  VentanaModal, TablaTema, claseFila, TD, FilaVacia, CLASE_INPUT, Recuadro, BotonFila,
} from '../../components/UI/TemaPagina';
import { formatPorcentaje } from '../../utils/format';

const TIPOS = ['PERSONAL', 'CB', 'SL', 'SA', 'SC'];
const REGIMEN_FISCAL = ['IRPF', 'ATRIBUCION', 'IS'];
const REGIMEN_IVA = ['GENERAL', 'EXENTO', 'NO_SUJETO'];
const PERIODICIDAD = ['TRIMESTRAL', 'MENSUAL'];
const TIPOS_SOCIO = ['COMUNERO', 'SOCIO', 'ADMINISTRADOR'];

const VACIA = {
  nombre: '', tipo: 'PERSONAL', nif: '', razon_social: '', domicilio: '', codigo_postal: '',
  municipio: '', provincia: '', pais: 'ES', regimen_fiscal: 'IRPF', regimen_iva: 'NO_SUJETO',
  periodicidad_iva: 'TRIMESTRAL', fecha_alta: '', fecha_baja: '',
};
const REGIMEN_DE = {
  PERSONAL: ['IRPF', 'NO_SUJETO'], CB: ['ATRIBUCION', 'GENERAL'], SC: ['ATRIBUCION', 'GENERAL'],
  SL: ['IS', 'GENERAL'], SA: ['IS', 'GENERAL'],
};
const hoy = () => new Date().toISOString().slice(0, 10);
const fecha = (v) => (v ? String(v).slice(0, 10) : '');

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

  const etiquetaTipo = (v) => t(`tipo_${v.toLowerCase()}`, v);
  const puedeEditar = (e) => ['PROPIETARIO', 'ADMINISTRADOR'].includes(e.rol);

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try { setEntidades((await pedir('/companies/mine')).data || []); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const abrirFicha = (entidad = null) => {
    setError(''); setAviso('');
    setForm(entidad
      ? Object.fromEntries(Object.keys(VACIA).map((k) => [k, k.startsWith('fecha') ? fecha(entidad[k]) : (entidad[k] ?? '')]))
      : VACIA);
    setModal({ tipo: 'ficha', entidad });
  };

  const cambiarTipo = (tipo) => setForm((f) => {
    const [rf, ri] = REGIMEN_DE[tipo] || REGIMEN_DE.PERSONAL;
    // Al crear, el régimen sigue a la forma; al editar se respeta lo guardado.
    return modal?.entidad ? { ...f, tipo } : { ...f, tipo, regimen_fiscal: rf, regimen_iva: ri };
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
      if (b.avisos?.length) setAviso(t('aviso_nif', b.avisos[0]));
      setModal(null);
      await cargar();
      window.dispatchEvent(new Event('empresa-activa-cambiada'));
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };

  const eliminar = async (entidad) => {
    setError('');
    try {
      await pedir(`/companies/${entidad.id}`, { method: 'DELETE' });
      if (localStorage.getItem('empresaActiva') === String(entidad.id)) localStorage.setItem('empresaActiva', 'todas');
      await cargar();
      window.dispatchEvent(new Event('empresa-activa-cambiada'));
    } catch (e) { setError(e.message); }
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
      <BotonFila icono={<FileText size={12} />} titulo={t('ver_documentos', 'Documentos')} onClick={() => setModal({ tipo: 'documentos', tabla: 'm_company', id: x.id, titulo: x.nombre, soloLectura: !puedeEditar(x) })} />
    </>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CabeceraPagina icono={<Building2 size={24} />} titulo={t('titulo', 'Entidades')} subtitulo={t('subtitulo', 'Personas, comunidades de bienes y sociedades: sus datos fiscales y sus socios.')} />

      {!modal && <AvisoError>{error}</AvisoError>}
      <AvisoAtencion>{aviso}</AvisoAtencion>

      <Panel className="overflow-hidden">
        <CabeceraPanel icono={<Building2 size={20} />} titulo={t('mis_entidades', 'Mis entidades')}
          contador={`${entidades.length} ${entidades.length === 1 ? t('entidad', 'entidad') : t('entidades', 'entidades')}`} />
        {cargando
          ? <div className="px-5 py-12 text-center text-xs font-bold uppercase tracking-widest text-on-surface2">{t('cargando', 'Cargando…')}</div>
          : (
            <div className="space-y-3 p-3">
              {/* Nueva entidad: el círculo azul con «+» a la izquierda, igual que
                  en Bancos y cuentas (01/10/2026). Antes era un botón con texto
                  en la cabecera. */}
              <div className="flex items-center gap-4">
                <Tooltip texto={t('nueva', 'Nueva entidad')}>
                  <button
                    type="button" onClick={() => abrirFicha()} aria-label={t('nueva', 'Nueva entidad')}
                    className="grid h-[45px] w-[45px] shrink-0 place-items-center rounded-full border-2 border-primary-border bg-primary text-on-primary transition-colors hover:border-on-background"
                  >
                    <Plus size={20} />
                  </button>
                </Tooltip>
              </div>
              <DataTable
                columns={columnas} data={entidades} keyField="id" rowsPerPage={10}
                searchFn={(x, q) => `${x.nombre} ${x.nif || ''}`.toLowerCase().includes(q)}
                onEdit={(x) => (puedeEditar(x) ? abrirFicha(x) : null)}
                onDelete={(x) => (puedeEditar(x) ? eliminar(x) : null)}
                extraActions={accionesExtra}
                emptyMessage={t('vacio', 'Todavía no hay entidades.')}
              />
            </div>
          )}
      </Panel>

      {modal?.tipo === 'ficha' && (
        <VentanaModal icono={<Building2 size={20} />} titulo={modal.entidad ? t('editar', 'Editar entidad') : t('nueva', 'Nueva entidad')} onCerrar={() => !guardando && setModal(null)}>
            <AvisoError>{error}</AvisoError>
            <form onSubmit={guardar} className="mt-5 space-y-5">
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <Leyenda>{t('bloque_identidad', 'Identidad')}</Leyenda>
                <Campo etiqueta={t('nombre', 'Nombre corto')}><input autoFocus value={form.nombre} maxLength={150} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('tipo', 'Forma')}>
                  <select value={form.tipo} onChange={(e) => cambiarTipo(e.target.value)} className={CLASE_INPUT}>
                    {TIPOS.map((v) => <option key={v} value={v}>{etiquetaTipo(v)}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={t('nif', 'NIF / CIF')}><input value={form.nif} maxLength={20} onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value.toUpperCase() }))} className={`${CLASE_INPUT} font-mono`} /></Campo>
                <Campo etiqueta={t('razon_social', 'Razón social / nombre completo')}><input value={form.razon_social} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))} className={CLASE_INPUT} /></Campo>
              </fieldset>
              <fieldset className="grid gap-4 sm:grid-cols-3">
                <Leyenda>{t('bloque_domicilio', 'Domicilio fiscal')}</Leyenda>
                <div className="sm:col-span-3"><Campo etiqueta={t('domicilio', 'Dirección')}><input value={form.domicilio} maxLength={255} onChange={(e) => setForm((f) => ({ ...f, domicilio: e.target.value }))} className={CLASE_INPUT} /></Campo></div>
                <Campo etiqueta={t('codigo_postal', 'Código postal')}><input value={form.codigo_postal} maxLength={10} onChange={(e) => setForm((f) => ({ ...f, codigo_postal: e.target.value }))} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('municipio', 'Municipio')}><input value={form.municipio} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('provincia', 'Provincia')}><input value={form.provincia} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))} className={CLASE_INPUT} /></Campo>
              </fieldset>
              <fieldset className="grid gap-4 sm:grid-cols-3">
                <Leyenda>{t('bloque_fiscal', 'Régimen fiscal')}</Leyenda>
                <Campo etiqueta={t('regimen_fiscal', 'Impuesto directo')}>
                  <select value={form.regimen_fiscal} onChange={(e) => setForm((f) => ({ ...f, regimen_fiscal: e.target.value }))} className={CLASE_INPUT}>
                    {REGIMEN_FISCAL.map((v) => <option key={v} value={v}>{t(`regimen_${v.toLowerCase()}`, v)}</option>)}
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
                <Campo etiqueta={t('fecha_alta', 'Fecha de alta')}><input type="date" value={form.fecha_alta} onChange={(e) => setForm((f) => ({ ...f, fecha_alta: e.target.value }))} className={CLASE_INPUT} /></Campo>
                <Campo etiqueta={t('fecha_baja', 'Fecha de baja')}><input type="date" value={form.fecha_baja} onChange={(e) => setForm((f) => ({ ...f, fecha_baja: e.target.value }))} className={CLASE_INPUT} /></Campo>
              </fieldset>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setModal(null)}>{t('cancelar', 'Cancelar')}</Button>
                <Button type="submit" loading={guardando}>{t('guardar', 'Guardar')}</Button>
              </div>
            </form>
        </VentanaModal>
      )}

      {modal?.tipo === 'socios' && (
        <VentanaModal icono={<Users size={20} />} titulo={t('socios_de', 'Socios de {entidad}').replace('{entidad}', modal.entidad.nombre)} onCerrar={() => setModal(null)}>
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

            {puedeEditar(modal.entidad) && !formSocio && (
              <div className="mt-4">
                <Tooltip texto={t('anadir_socio', 'Añadir socio')}>
                  <button
                    type="button" onClick={nuevoSocio} aria-label={t('anadir_socio', 'Añadir socio')}
                    className="grid h-[45px] w-[45px] shrink-0 place-items-center rounded-full border-2 border-primary-border bg-primary text-on-primary transition-colors hover:border-on-background"
                  >
                    <Plus size={20} />
                  </button>
                </Tooltip>
              </div>
            )}

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
