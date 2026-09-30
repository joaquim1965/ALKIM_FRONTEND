/**
 * EntidadesPage — Gestión → Entidades (antes «Empresas»).
 *
 * Plan core inmobiliaria, fase 0a (01/10/2026). Personas, comunidades de bienes
 * y sociedades propias, con sus datos fiscales y sus socios o comuneros.
 *
 *   /companies/mine                     lista (las visibles para el usuario)
 *   /companies  ·  /companies/:id        alta, edición, baja
 *   /companies/:id/partners[/:fila]      socios y comuneros
 *
 * Textos en s_dictionary, contexto «Entidades» (ES, EN, CA, FR):
 * DATABASE/MIGRATIONS/2026.10.01b - textos entidades.sql
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, X, Users, Trash2, Pencil } from 'lucide-react';
import Button from '../../components/UI/Button';
import DataTable from '../../components/UI/DataTable';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';

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

const Campo = ({ etiqueta, children }) => (
  <label className="block text-sm font-bold text-on-background">{etiqueta}{children}</label>
);
const claseInput = 'mt-1.5 w-full rounded-lg border border-border bg-surface1 px-3 py-2 text-on-background';

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
    { id: 'nombre', label: t('col_entidad', 'Entidad'), sortField: 'nombre', render: (x) => <span className="font-bold text-on-background">{x.nombre}</span> },
    { id: 'tipo', label: t('col_tipo', 'Tipo'), sortField: 'tipo', render: (x) => etiquetaTipo(x.tipo) },
    { id: 'nif', label: t('col_nif', 'NIF'), sortField: 'nif', render: (x) => <span className="font-mono">{x.nif || '—'}</span> },
    { id: 'regimen_fiscal', label: t('col_regimen', 'Régimen'), sortField: 'regimen_fiscal', render: (x) => t(`regimen_${String(x.regimen_fiscal || '').toLowerCase()}`, x.regimen_fiscal) },
    { id: 'rol', label: t('col_acceso', 'Tu acceso'), sortField: 'rol', render: (x) => t(`rol_${String(x.rol || '').toLowerCase()}`, x.rol) },
    {
      id: 'socios', label: t('col_socios', 'Socios'), render: (x) => (x.tipo === 'PERSONAL' ? '—' : (
        <Button size="xs" variant="outline" leftIcon={<Users size={14} />} onClick={() => abrirSocios(x)}>{t('ver_socios', 'Socios')}</Button>
      )),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest">{t('seccion', 'Gestión')}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-on-background">{t('titulo', 'Entidades')}</h1>
          <p className="mt-2 text-sm">{t('subtitulo', 'Personas, comunidades de bienes y sociedades: sus datos fiscales y sus socios.')}</p>
        </div>
        <Button variant="primary" size="lg" leftIcon={<Plus size={18} />} onClick={() => abrirFicha()}>{t('nueva', 'Nueva entidad')}</Button>
      </header>

      {error && !modal && <div role="alert" className="rounded-xl border border-destructive bg-surface1 px-4 py-3 text-sm text-destructive-text">{error}</div>}
      {aviso && <div role="status" className="rounded-xl border border-border bg-surface1 px-4 py-3 text-sm">{aviso}</div>}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface2 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-surface2 text-on-background"><Building2 size={20} /></div>
          <div>
            <h2 className="font-black text-on-background">{t('mis_entidades', 'Mis entidades')}</h2>
            <p className="text-xs">{entidades.length} {entidades.length === 1 ? t('entidad', 'entidad') : t('entidades', 'entidades')}</p>
          </div>
        </div>
        {cargando
          ? <div className="px-5 py-12 text-center text-sm">{t('cargando', 'Cargando…')}</div>
          : (
            <div className="p-3">
              <DataTable
                columns={columnas} data={entidades} keyField="id" rowsPerPage={10}
                searchFn={(x, q) => `${x.nombre} ${x.nif || ''}`.toLowerCase().includes(q)}
                onEdit={(x) => (puedeEditar(x) ? abrirFicha(x) : null)}
                onDelete={(x) => (puedeEditar(x) ? eliminar(x) : null)}
                emptyMessage={t('vacio', 'Todavía no hay entidades.')}
              />
            </div>
          )}
      </section>

      {modal?.tipo === 'ficha' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface2 p-6 shadow-xl">
            <div className="flex justify-between gap-4">
              <h2 className="text-xl font-black text-on-background">{modal.entidad ? t('editar', 'Editar entidad') : t('nueva', 'Nueva entidad')}</h2>
              <button onClick={() => !guardando && setModal(null)} aria-label={t('cerrar', 'Cerrar')}><X size={20} /></button>
            </div>
            {error && <div role="alert" className="mt-4 text-sm text-destructive-text">{error}</div>}
            <form onSubmit={guardar} className="mt-5 space-y-5">
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-2 text-xs font-black uppercase tracking-widest">{t('bloque_identidad', 'Identidad')}</legend>
                <Campo etiqueta={t('nombre', 'Nombre corto')}><input autoFocus value={form.nombre} maxLength={150} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className={claseInput} /></Campo>
                <Campo etiqueta={t('tipo', 'Forma')}>
                  <select value={form.tipo} onChange={(e) => cambiarTipo(e.target.value)} className={claseInput}>
                    {TIPOS.map((v) => <option key={v} value={v}>{etiquetaTipo(v)}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={t('nif', 'NIF / CIF')}><input value={form.nif} maxLength={20} onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value.toUpperCase() }))} className={`${claseInput} font-mono`} /></Campo>
                <Campo etiqueta={t('razon_social', 'Razón social / nombre completo')}><input value={form.razon_social} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))} className={claseInput} /></Campo>
              </fieldset>
              <fieldset className="grid gap-4 sm:grid-cols-3">
                <legend className="mb-2 text-xs font-black uppercase tracking-widest">{t('bloque_domicilio', 'Domicilio fiscal')}</legend>
                <div className="sm:col-span-3"><Campo etiqueta={t('domicilio', 'Dirección')}><input value={form.domicilio} maxLength={255} onChange={(e) => setForm((f) => ({ ...f, domicilio: e.target.value }))} className={claseInput} /></Campo></div>
                <Campo etiqueta={t('codigo_postal', 'Código postal')}><input value={form.codigo_postal} maxLength={10} onChange={(e) => setForm((f) => ({ ...f, codigo_postal: e.target.value }))} className={claseInput} /></Campo>
                <Campo etiqueta={t('municipio', 'Municipio')}><input value={form.municipio} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))} className={claseInput} /></Campo>
                <Campo etiqueta={t('provincia', 'Provincia')}><input value={form.provincia} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))} className={claseInput} /></Campo>
              </fieldset>
              <fieldset className="grid gap-4 sm:grid-cols-3">
                <legend className="mb-2 text-xs font-black uppercase tracking-widest">{t('bloque_fiscal', 'Régimen fiscal')}</legend>
                <Campo etiqueta={t('regimen_fiscal', 'Impuesto directo')}>
                  <select value={form.regimen_fiscal} onChange={(e) => setForm((f) => ({ ...f, regimen_fiscal: e.target.value }))} className={claseInput}>
                    {REGIMEN_FISCAL.map((v) => <option key={v} value={v}>{t(`regimen_${v.toLowerCase()}`, v)}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={t('regimen_iva', 'IVA')}>
                  <select value={form.regimen_iva} onChange={(e) => setForm((f) => ({ ...f, regimen_iva: e.target.value }))} className={claseInput}>
                    {REGIMEN_IVA.map((v) => <option key={v} value={v}>{t(`iva_${v.toLowerCase()}`, v)}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={t('periodicidad_iva', 'Declaración de IVA')}>
                  <select value={form.periodicidad_iva} onChange={(e) => setForm((f) => ({ ...f, periodicidad_iva: e.target.value }))} className={claseInput}>
                    {PERIODICIDAD.map((v) => <option key={v} value={v}>{t(`periodo_${v.toLowerCase()}`, v)}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={t('fecha_alta', 'Fecha de alta')}><input type="date" value={form.fecha_alta} onChange={(e) => setForm((f) => ({ ...f, fecha_alta: e.target.value }))} className={claseInput} /></Campo>
                <Campo etiqueta={t('fecha_baja', 'Fecha de baja')}><input type="date" value={form.fecha_baja} onChange={(e) => setForm((f) => ({ ...f, fecha_baja: e.target.value }))} className={claseInput} /></Campo>
              </fieldset>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setModal(null)}>{t('cancelar', 'Cancelar')}</Button>
                <Button type="submit" loading={guardando}>{t('guardar', 'Guardar')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal?.tipo === 'socios' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface2 p-6 shadow-xl">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-on-background">{t('socios_de', 'Socios de {entidad}').replace('{entidad}', modal.entidad.nombre)}</h2>
                <p className="mt-1 text-sm">{t('suma_vigente', 'Participación vigente: {n} %').replace('{n}', sumaVigente.toFixed(3))}</p>
              </div>
              <button onClick={() => setModal(null)} aria-label={t('cerrar', 'Cerrar')}><X size={20} /></button>
            </div>
            {error && <div role="alert" className="mt-4 text-sm text-destructive-text">{error}</div>}

            <table className="mt-5 w-full text-sm">
              <thead><tr className="bg-table-header text-on-table-header text-left text-xs uppercase tracking-wider">
                <th className="p-2">{t('col_socio', 'Socio')}</th><th>{t('col_papel', 'Papel')}</th><th className="text-right">%</th><th>{t('col_desde', 'Desde')}</th><th>{t('col_hasta', 'Hasta')}</th><th />
              </tr></thead>
              <tbody>
                {socios.map((s) => (
                  <tr key={s.id} className="bg-table-row text-on-table-row border-b border-border transition-colors duration-100 hover:bg-table-row-hover hover:text-on-table-row-hover">
                    <td className="py-2 font-bold">{s.socio_nombre}</td>
                    <td>{t(`papel_${s.tipo.toLowerCase()}`, s.tipo)}</td>
                    <td className="text-right font-mono">{Number(s.porcentaje).toFixed(3)}</td>
                    <td className="font-mono">{fecha(s.fecha_desde)}</td>
                    <td className="font-mono">{fecha(s.fecha_hasta) || t('vigente', 'vigente')}</td>
                    <td className="whitespace-nowrap text-right">
                      {puedeEditar(modal.entidad) && <>
                        <Button size="xs" variant="ghost" aria-label={t('editar_socio', 'Editar')} onClick={() => editarSocio(s)}><Pencil size={14} /></Button>
                        <Button size="xs" variant="ghost" aria-label={t('quitar_socio', 'Quitar')} onClick={() => quitarSocio(s)}><Trash2 size={14} /></Button>
                      </>}
                    </td>
                  </tr>
                ))}
                {!socios.length && <tr className="bg-table-row text-on-table-row"><td colSpan={6} className="py-6 text-center">{t('sin_socios', 'Sin socios registrados.')}</td></tr>}
              </tbody>
            </table>

            {puedeEditar(modal.entidad) && !formSocio && (
              <div className="mt-4"><Button leftIcon={<Plus size={16} />} onClick={nuevoSocio}>{t('anadir_socio', 'Añadir socio')}</Button></div>
            )}

            {formSocio && (
              <form onSubmit={guardarSocio} className="mt-5 grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-3">
                <Campo etiqueta={t('col_socio', 'Socio')}>
                  <select required value={formSocio.socio_id} onChange={(e) => setFormSocio((f) => ({ ...f, socio_id: e.target.value }))} className={claseInput}>
                    <option value="">{t('elige', 'Elige…')}</option>
                    {candidatos.map((e) => <option key={e.id} value={e.id}>{e.nombre} ({etiquetaTipo(e.tipo)})</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={t('col_papel', 'Papel')}>
                  <select value={formSocio.tipo} onChange={(e) => setFormSocio((f) => ({ ...f, tipo: e.target.value }))} className={claseInput}>
                    {TIPOS_SOCIO.map((v) => <option key={v} value={v}>{t(`papel_${v.toLowerCase()}`, v)}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={t('porcentaje', 'Porcentaje')}><input required type="number" step="0.001" min="0" max="100" value={formSocio.porcentaje} onChange={(e) => setFormSocio((f) => ({ ...f, porcentaje: e.target.value }))} className={`${claseInput} font-mono`} /></Campo>
                <Campo etiqueta={t('col_desde', 'Desde')}><input required type="date" value={formSocio.fecha_desde} onChange={(e) => setFormSocio((f) => ({ ...f, fecha_desde: e.target.value }))} className={claseInput} /></Campo>
                <Campo etiqueta={t('col_hasta', 'Hasta')}><input type="date" value={formSocio.fecha_hasta} onChange={(e) => setFormSocio((f) => ({ ...f, fecha_hasta: e.target.value }))} className={claseInput} /></Campo>
                <Campo etiqueta={t('notas', 'Notas')}><input value={formSocio.notas} maxLength={255} onChange={(e) => setFormSocio((f) => ({ ...f, notas: e.target.value }))} className={claseInput} /></Campo>
                <p className="text-xs sm:col-span-3">{t('ayuda_socio', 'Si el socio es una persona, créala antes como entidad de tipo Persona.')}</p>
                <div className="flex justify-end gap-3 sm:col-span-3">
                  <Button type="button" variant="secondary" onClick={() => setFormSocio(null)}>{t('cancelar', 'Cancelar')}</Button>
                  <Button type="submit" loading={guardando}>{t('guardar', 'Guardar')}</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
