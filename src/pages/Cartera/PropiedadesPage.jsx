/**
 * PropiedadesPage — Cartera → Propiedades (01/10/2026, Plan core inmobiliaria fase 1).
 *
 * Lista de propiedades de las entidades del usuario (la entidad activa filtra)
 * y ficha con pestañas: Datos · Espacios (árbol editable) · Titulares · Préstamos · Documentos (fase 2).
 * Los espacios comunes se ven en el árbol pero no son alquilables.
 *
 *   /propiedades · /propiedades/tipos · /propiedades/:id
 *   /propiedades/:id/espacios[/:espacio]
 * Textos: s_dictionary, contextos «Propiedades», «TipoPropiedad», «TipoEspacio».
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Building, Plus, ChevronRight, CornerDownRight, Pencil, Trash2, Lock, FileText } from 'lucide-react';
import Button from '../../components/UI/Button';
import DataTable from '../../components/UI/DataTable';
import FichaConPestanas from '../../components/UI/FichaConPestanas';
import DocumentosObjeto from '../../components/Documentos/DocumentosObjeto';
import TitularesPestana from './TitularesPestana';
import PrestamosPestana from './PrestamosPestana';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { useStore } from '../../hooks/useStore';

const ESTADOS = ['EN_COMPRA', 'EN_REFORMA', 'DISPONIBLE', 'EN_EXPLOTACION', 'EN_VENTA', 'VENDIDA', 'BAJA'];
const VACIA = {
  entidad_gestora_id: '', codigo: '', nombre: '', tipo_id: '', ref_catastral: '', finca_registral: '', registro_propiedad: '',
  via: '', numero: '', escalera: '', planta: '', puerta: '', codigo_postal: '', municipio: '', provincia: '', pais: 'ES',
  superficie_construida: '', superficie_util: '', anyo_construccion: '', valor_catastral: '', valor_catastral_construccion: '',
  catastral_revisado: true, es_de_tercero: false, estado: 'DISPONIBLE', notas: '',
};
const ESPACIO_VACIO = { padre_id: '', tipo_id: '', codigo: '', nombre: '', planta: '', puerta: '', ref_catastral: '', superficie_util: '', es_comun: false, coeficiente_reparto: '', orden: 0 };

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}
const claseInput = 'mt-1 w-full rounded-lg border border-border bg-surface1 px-3 py-2 text-on-background';
const Campo = ({ etiqueta, children, ancho = '' }) => <label className={`block text-sm font-bold text-on-background ${ancho}`}>{etiqueta}{children}</label>;
const Casilla = ({ etiqueta, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm font-bold text-on-background">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />{etiqueta}
  </label>
);
const Leyenda = ({ children }) => <legend className="mb-2 text-xs font-black uppercase tracking-widest">{children}</legend>;
const aplanar = (nodos, nivel = 0) => nodos.flatMap((n) => [{ ...n, nivel }, ...aplanar(n.hijos || [], nivel + 1)]);

export default function PropiedadesPage() {
  const { t } = useTmTr('Propiedades');
  const { t: tp } = useTmTr('TipoPropiedad');
  const { t: te } = useTmTr('TipoEspacio');
  const { can, user } = useStore();
  // Los roles 3 y 4 lo pueden todo en el backend aunque no tengan fila en xs_user_table.
  const puede = (tabla, nivel) => Number(user?.rol) >= 3 || can(tabla, nivel);
  const puedeEscribir = can('im_property', 'Write');
  const puedeTitulares = puede('x_property_owner', 'Write');
  const puedePrestamos = puede('ban_loan', 'Write');
  const veTitulares = puede('x_property_owner', 'Read');
  const vePrestamos = puede('ban_loan', 'Read');
  const puedeEspacios = can('im_space', 'Write');

  const [propiedades, setPropiedades] = useState([]);
  const [tipos, setTipos] = useState({ propiedad: [], espacio: [] });
  const [entidades, setEntidades] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [bajas, setBajas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const [ficha, setFicha] = useState(null);          // { id|null, datos, espacios }
  const [form, setForm] = useState(VACIA);
  const [guardando, setGuardando] = useState(false);
  const [espacio, setEspacio] = useState(null);      // formulario de espacio { id|null, ...campos }
  const [docsEspacio, setDocsEspacio] = useState(null);

  const nombreTipoP = (c, n) => tp(c, n);
  const nombreTipoE = (c, n) => te(c, n);

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const qs = new URLSearchParams({ ...(filtroEstado ? { estado: filtroEstado } : {}), ...(bajas ? { bajas: '1' } : {}) });
      setPropiedades((await pedir(`/propiedades?${qs}`)).data || []);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, [filtroEstado, bajas]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    (async () => {
      try {
        setTipos((await pedir('/propiedades/tipos')).data);
        setEntidades(((await pedir('/companies/mine')).data || []).filter((e) => ['PROPIETARIO', 'ADMINISTRADOR'].includes(e.rol)));
      } catch (e) { setError(e.message); }
    })();
  }, []);

  const recargarFicha = async (id) => {
    const d = (await pedir(`/propiedades/${id}`)).data;
    setFicha({ id, datos: d, espacios: d.espacios || [] });
    return d;
  };

  const abrir = async (p = null) => {
    setError(''); setAviso(''); setEspacio(null); setDocsEspacio(null);
    if (!p) {
      setForm({ ...VACIA, entidad_gestora_id: entidades.length === 1 ? entidades[0].id : '', tipo_id: tipos.propiedad[0]?.id || '' });
      setFicha({ id: null, datos: null, espacios: [] });
      return;
    }
    try {
      const d = await recargarFicha(p.id);
      setForm(Object.fromEntries(Object.keys(VACIA).map((k) => [k, typeof VACIA[k] === 'boolean' ? Boolean(Number(d[k])) : (d[k] ?? '')])));
    } catch (e) { setError(e.message); }
  };

  const guardar = async (ev) => {
    ev.preventDefault();
    setGuardando(true); setError('');
    try {
      if (ficha.id) {
        await pedir(`/propiedades/${ficha.id}`, { method: 'PUT', body: JSON.stringify(form) });
        await recargarFicha(ficha.id);
        setAviso(t('guardada', 'Propiedad guardada.'));
      } else {
        const { data } = await pedir('/propiedades', { method: 'POST', body: JSON.stringify(form) });
        await recargarFicha(data.id);
        setAviso(t('creada', 'Propiedad creada. Ya puedes añadir sus espacios y documentos.'));
      }
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };

  const baja = async (p) => {
    if (!window.confirm(t('confirmar_baja', '¿Dar de baja «{nombre}»? Se conserva su historia.').replace('{nombre}', p.nombre))) return;
    try { await pedir(`/propiedades/${p.id}`, { method: 'DELETE' }); await cargar(); } catch (e) { setError(e.message); }
  };

  // ── Espacios ──
  const nuevoEspacio = (padre = null) => {
    setError(''); setDocsEspacio(null);
    const tipo = tipos.espacio.find((x) => x.codigo === (padre ? 'HABITACION' : 'VIVIENDA')) || tipos.espacio[0];
    setEspacio({ id: null, ...ESPACIO_VACIO, padre_id: padre?.id || '', tipo_id: tipo?.id || '', es_comun: Boolean(Number(tipo?.es_comun_defecto)) });
  };
  const editarEspacio = (n) => {
    setError(''); setDocsEspacio(null);
    setEspacio({ id: n.id, ...Object.fromEntries(Object.keys(ESPACIO_VACIO).map((k) => [k, typeof ESPACIO_VACIO[k] === 'boolean' ? Boolean(Number(n[k])) : (n[k] ?? '')])) });
  };
  const guardarEspacio = async (ev) => {
    ev.preventDefault();
    setGuardando(true); setError('');
    try {
      const { id, ...datos } = espacio;
      await pedir(`/propiedades/${ficha.id}/espacios${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) });
      setEspacio(null);
      await recargarFicha(ficha.id);
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };
  const borrarEspacio = async (n) => {
    if (!window.confirm(t('confirmar_borrar_espacio', '¿Borrar el espacio «{nombre}»?').replace('{nombre}', n.nombre))) return;
    setError('');
    try { await pedir(`/propiedades/${ficha.id}/espacios/${n.id}`, { method: 'DELETE' }); await recargarFicha(ficha.id); await cargar(); }
    catch (e) { setError(e.message); }
  };

  const f = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const fe = (k) => ({ value: espacio?.[k] ?? '', onChange: (e) => setEspacio((s) => ({ ...s, [k]: e.target.value })) });
  const plano = aplanar(ficha?.espacios || []);
  const admiteEspacios = Number(tipos.propiedad.find((x) => String(x.id) === String(form.tipo_id))?.admite_espacios ?? 1) === 1;

  const columnas = [
    { id: 'codigo', label: t('col_codigo', 'Código'), sortField: 'codigo', render: (x) => <span className="font-mono font-bold text-on-background">{x.codigo}</span> },
    { id: 'nombre', label: t('col_nombre', 'Nombre'), sortField: 'nombre', render: (x) => <span className="font-bold text-on-background">{x.nombre}{x.es_de_tercero ? ` · ${t('de_tercero', 'de un cliente')}` : ''}</span> },
    { id: 'tipo', label: t('col_tipo', 'Tipo'), sortField: 'tipo_nombre', render: (x) => nombreTipoP(x.tipo_codigo, x.tipo_nombre) },
    { id: 'direccion', label: t('col_direccion', 'Dirección'), render: (x) => [x.via && `${x.via} ${x.numero || ''}`.trim(), x.planta && `${x.planta}º ${x.puerta || ''}`.trim(), x.municipio].filter(Boolean).join(', ') || '—' },
    { id: 'entidad', label: t('col_entidad', 'Entidad'), sortField: 'entidad_nombre', render: (x) => x.entidad_nombre },
    { id: 'estado', label: t('col_estado', 'Estado'), sortField: 'estado', render: (x) => t(`estado_${x.estado.toLowerCase()}`, x.estado) },
    { id: 'titulares', label: t('col_titulares', 'Titulares'), render: (x) => x.titulares || '—' },
    { id: 'espacios', label: t('col_espacios', 'Espacios'), sortField: 'espacios', render: (x) => <span className="font-mono">{x.espacios}</span> },
  ];

  const pestanaDatos = (
    <form onSubmit={guardar} className="space-y-6">
      {error && <div role="alert" className="text-sm text-destructive-text">{error}</div>}
      {aviso && <div role="status" className="text-sm">{aviso}</div>}
      <fieldset className="grid gap-4 sm:grid-cols-4">
        <Leyenda>{t('bloque_identidad', 'Identificación')}</Leyenda>
        <Campo etiqueta={t('codigo', 'Código corto')}><input required maxLength={20} value={form.codigo} onChange={(e) => setForm((s) => ({ ...s, codigo: e.target.value.toUpperCase() }))} className={`${claseInput} font-mono`} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('nombre', 'Nombre')} ancho="sm:col-span-2"><input required maxLength={150} {...f('nombre')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('tipo', 'Tipo')}>
          <select required {...f('tipo_id')} className={claseInput} disabled={!puedeEscribir}>
            {tipos.propiedad.map((x) => <option key={x.id} value={x.id}>{nombreTipoP(x.codigo, x.nombre)}</option>)}
          </select>
        </Campo>
        <Campo etiqueta={t('entidad_gestora', 'Entidad que la gestiona')} ancho="sm:col-span-2">
          <select required {...f('entidad_gestora_id')} className={claseInput} disabled={!puedeEscribir}>
            <option value="">—</option>
            {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            {ficha?.datos && !entidades.some((e) => e.id === ficha.datos.entidad_gestora_id) && <option value={ficha.datos.entidad_gestora_id}>{ficha.datos.entidad_nombre}</option>}
          </select>
        </Campo>
        <Campo etiqueta={t('estado', 'Estado')}>
          <select {...f('estado')} className={claseInput} disabled={!puedeEscribir}>
            {ESTADOS.map((v) => <option key={v} value={v}>{t(`estado_${v.toLowerCase()}`, v)}</option>)}
          </select>
        </Campo>
        <div className="flex items-end pb-2"><Casilla etiqueta={t('es_de_tercero', 'Es de un cliente (encargo)')} checked={form.es_de_tercero} onChange={(v) => setForm((s) => ({ ...s, es_de_tercero: v }))} /></div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-6">
        <Leyenda>{t('bloque_direccion', 'Dirección')}</Leyenda>
        <Campo etiqueta={t('via', 'Calle')} ancho="sm:col-span-3"><input maxLength={150} {...f('via')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('numero', 'Número')}><input maxLength={10} {...f('numero')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('escalera', 'Escalera')}><input maxLength={10} {...f('escalera')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('planta', 'Planta')}><input maxLength={10} {...f('planta')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('puerta', 'Puerta')}><input maxLength={10} {...f('puerta')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('codigo_postal', 'Código postal')}><input maxLength={10} {...f('codigo_postal')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('municipio', 'Municipio')} ancho="sm:col-span-2"><input maxLength={100} {...f('municipio')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('provincia', 'Provincia')} ancho="sm:col-span-2"><input maxLength={100} {...f('provincia')} className={claseInput} disabled={!puedeEscribir} /></Campo>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-4">
        <Leyenda>{t('bloque_catastro', 'Catastro y registro')}</Leyenda>
        <Campo etiqueta={t('ref_catastral', 'Referencia catastral')} ancho="sm:col-span-2"><input maxLength={25} value={form.ref_catastral} onChange={(e) => setForm((s) => ({ ...s, ref_catastral: e.target.value.toUpperCase() }))} className={`${claseInput} font-mono`} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('finca_registral', 'Finca registral')}><input maxLength={30} {...f('finca_registral')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('registro_propiedad', 'Registro de la propiedad')}><input maxLength={100} {...f('registro_propiedad')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('superficie_construida', 'Superficie construida (m²)')}><input type="number" step="0.01" min="0" {...f('superficie_construida')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('superficie_util', 'Superficie útil (m²)')}><input type="number" step="0.01" min="0" {...f('superficie_util')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('anyo_construccion', 'Año de construcción')}><input type="number" min="1500" max="2100" {...f('anyo_construccion')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <div />
        <Campo etiqueta={t('valor_catastral', 'Valor catastral (€)')}><input type="number" step="0.01" min="0" {...f('valor_catastral')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('valor_catastral_construccion', 'De construcción (€)')}><input type="number" step="0.01" min="0" {...f('valor_catastral_construccion')} className={claseInput} disabled={!puedeEscribir} /></Campo>
        <div className="flex items-end pb-2 sm:col-span-2"><Casilla etiqueta={t('catastral_revisado', 'Valor catastral revisado (imputación 1,1 %)')} checked={form.catastral_revisado} onChange={(v) => setForm((s) => ({ ...s, catastral_revisado: v }))} /></div>
      </fieldset>

      <Campo etiqueta={t('notas', 'Notas')}><textarea rows={2} {...f('notas')} className={claseInput} disabled={!puedeEscribir} /></Campo>
      {puedeEscribir && (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setFicha(null)}>{t('cerrar', 'Cerrar')}</Button>
          <Button type="submit" loading={guardando}>{t('guardar', 'Guardar')}</Button>
        </div>
      )}
    </form>
  );

  const pestanaEspacios = ficha?.id && (
    <div className="space-y-4">
      {error && <div role="alert" className="text-sm text-destructive-text">{error}</div>}
      {!admiteEspacios && <p className="text-sm">{t('no_admite_espacios', 'Este tipo de propiedad no se divide en espacios.')}</p>}
      {admiteEspacios && puedeEspacios && !espacio && (
        <Button leftIcon={<Plus size={16} />} onClick={() => nuevoEspacio()}>{t('nuevo_espacio', 'Añadir espacio')}</Button>
      )}

      {espacio && (
        <form onSubmit={guardarEspacio} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4">
          <h3 className="font-black text-on-background sm:col-span-4">{espacio.id ? t('editar_espacio', 'Editar espacio') : t('nuevo_espacio', 'Añadir espacio')}</h3>
          <Campo etiqueta={t('dentro_de', 'Dentro de')} ancho="sm:col-span-2">
            <select {...fe('padre_id')} className={claseInput}>
              <option value="">{t('la_propiedad', '(la propiedad)')}</option>
              {plano.filter((n) => n.id !== espacio.id).map((n) => <option key={n.id} value={n.id}>{'— '.repeat(n.nivel)}{n.codigo} · {n.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('tipo_espacio', 'Tipo')}>
            <select required value={espacio.tipo_id} onChange={(e) => {
              const tipo = tipos.espacio.find((x) => String(x.id) === e.target.value);
              setEspacio((s) => ({ ...s, tipo_id: e.target.value, es_comun: s.id ? s.es_comun : Boolean(Number(tipo?.es_comun_defecto)) }));
            }} className={claseInput}>
              {tipos.espacio.map((x) => <option key={x.id} value={x.id}>{nombreTipoE(x.codigo, x.nombre)}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('codigo', 'Código corto')}><input required maxLength={20} value={espacio.codigo} onChange={(e) => setEspacio((s) => ({ ...s, codigo: e.target.value.toUpperCase() }))} className={`${claseInput} font-mono`} /></Campo>
          <Campo etiqueta={t('nombre', 'Nombre')} ancho="sm:col-span-2"><input required maxLength={100} {...fe('nombre')} className={claseInput} /></Campo>
          <Campo etiqueta={t('superficie_util', 'Superficie útil (m²)')}><input type="number" step="0.01" min="0" {...fe('superficie_util')} className={claseInput} /></Campo>
          <Campo etiqueta={t('coeficiente_reparto', 'Coeficiente de reparto (%)')}><input type="number" step="0.0001" min="0" max="100" {...fe('coeficiente_reparto')} className={claseInput} /></Campo>
          <Campo etiqueta={t('planta', 'Planta')}><input maxLength={10} {...fe('planta')} className={claseInput} /></Campo>
          <Campo etiqueta={t('puerta', 'Puerta')}><input maxLength={10} {...fe('puerta')} className={claseInput} /></Campo>
          <Campo etiqueta={t('ref_catastral', 'Referencia catastral')} ancho="sm:col-span-2"><input maxLength={25} value={espacio.ref_catastral} onChange={(e) => setEspacio((s) => ({ ...s, ref_catastral: e.target.value.toUpperCase() }))} className={`${claseInput} font-mono`} /></Campo>
          <div className="sm:col-span-4"><Casilla etiqueta={t('es_comun', 'Zona común (no se alquila; reparte gastos)')} checked={Boolean(espacio.es_comun)} onChange={(v) => setEspacio((s) => ({ ...s, es_comun: v }))} /></div>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => setEspacio(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={guardando}>{t('guardar', 'Guardar')}</Button>
          </div>
        </form>
      )}

      {plano.length === 0
        ? <p className="text-sm">{t('sin_espacios', 'Todavía no tiene espacios. Si se alquila entera, no hace falta ninguno.')}</p>
        : (
          <ul className="rounded-xl border border-border" aria-label={t('arbol', 'Árbol de espacios')}>
            {plano.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 last:border-b-0" style={{ paddingLeft: `${0.75 + n.nivel * 1.5}rem` }}>
                {n.nivel > 0 ? <CornerDownRight size={14} /> : <ChevronRight size={14} />}
                <span className="font-mono font-bold text-on-background">{n.codigo}</span>
                <span className="text-on-background">{n.nombre}</span>
                <span className="text-xs">· {nombreTipoE(n.tipo_codigo, n.tipo_nombre)}{n.superficie_util ? ` · ${Number(n.superficie_util)} m²` : ''}</span>
                {Number(n.es_comun) === 1 && <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 text-xs"><Lock size={11} />{t('comun', 'común · no alquilable')}</span>}
                <span className="flex-1" />
                <Button size="xs" variant="ghost" aria-label={t('documentos_espacio', 'Documentos del espacio')} onClick={() => setDocsEspacio(docsEspacio?.id === n.id ? null : n)}><FileText size={15} /></Button>
                {puedeEspacios && <>
                  <Button size="xs" variant="ghost" aria-label={t('anadir_dentro', 'Añadir dentro')} onClick={() => nuevoEspacio(n)}><Plus size={15} /></Button>
                  <Button size="xs" variant="ghost" aria-label={t('editar_espacio', 'Editar espacio')} onClick={() => editarEspacio(n)}><Pencil size={15} /></Button>
                  <Button size="xs" variant="ghost" aria-label={t('borrar_espacio', 'Borrar espacio')} onClick={() => borrarEspacio(n)}><Trash2 size={15} /></Button>
                </>}
              </li>
            ))}
          </ul>
        )}

      {docsEspacio && (
        <section className="rounded-xl border border-border p-4">
          <h3 className="mb-3 font-black text-on-background">{t('documentos_de', 'Documentos de {nombre}').replace('{nombre}', `${docsEspacio.codigo} · ${docsEspacio.nombre}`)}</h3>
          <DocumentosObjeto tabla="im_space" id={docsEspacio.id} soloLectura={!puedeEspacios} />
        </section>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest">{t('seccion', 'Cartera')}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-on-background">{t('titulo', 'Propiedades')}</h1>
          <p className="mt-2 text-sm">{t('subtitulo', 'Los inmuebles y sus espacios. Lo que se alquila (unidades) se define después sobre ellos.')}</p>
        </div>
        {puedeEscribir && <Button variant="primary" size="lg" leftIcon={<Plus size={18} />} onClick={() => abrir()}>{t('nueva', 'Nueva propiedad')}</Button>}
      </header>

      {error && !ficha && <div role="alert" className="rounded-xl border border-destructive bg-surface1 px-4 py-3 text-sm text-destructive-text">{error}</div>}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface2 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-surface2 text-on-background"><Building size={20} /></div>
          <div className="flex-1">
            <h2 className="font-black text-on-background">{t('titulo', 'Propiedades')}</h2>
            <p className="text-xs">{propiedades.length} {propiedades.length === 1 ? t('propiedad', 'propiedad') : t('propiedades', 'propiedades')}</p>
          </div>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="rounded-lg border border-border bg-surface1 px-3 py-2 text-sm text-on-background" aria-label={t('col_estado', 'Estado')}>
            <option value="">{t('todos_estados', 'Todos los estados')}</option>
            {ESTADOS.map((v) => <option key={v} value={v}>{t(`estado_${v.toLowerCase()}`, v)}</option>)}
          </select>
          <Casilla etiqueta={t('ver_bajas', 'Ver bajas')} checked={bajas} onChange={setBajas} />
        </div>
        {cargando
          ? <div className="px-5 py-12 text-center text-sm">{t('cargando', 'Cargando…')}</div>
          : (
            <div className="p-3">
              <DataTable
                columns={columnas} data={propiedades} keyField="id" rowsPerPage={15}
                searchFn={(x, q) => `${x.codigo} ${x.nombre} ${x.via || ''} ${x.municipio || ''} ${x.ref_catastral || ''}`.toLowerCase().includes(q)}
                onEdit={(x) => abrir(x)}
                onDelete={(x) => (puedeEscribir && Number(x.activo) ? baja(x) : null)}
                emptyMessage={t('vacio', 'Todavía no hay propiedades.')}
              />
            </div>
          )}
      </section>

      {ficha && (
        <FichaConPestanas
          titulo={ficha.datos ? `${ficha.datos.codigo} · ${ficha.datos.nombre}` : t('nueva', 'Nueva propiedad')}
          subtitulo={ficha.datos ? `${ficha.datos.entidad_nombre} · ${t(`estado_${String(ficha.datos.estado).toLowerCase()}`, ficha.datos.estado)}` : null}
          guardado={Boolean(ficha.id)}
          etiquetaCerrar={t('cerrar', 'Cerrar')}
          onCerrar={() => { setFicha(null); setEspacio(null); setDocsEspacio(null); }}
          pestanas={[
            { id: 'datos', etiqueta: t('pestana_datos', 'Datos'), contenido: pestanaDatos },
            { id: 'espacios', etiqueta: t('pestana_espacios', 'Espacios'), contador: plano.length || null, requiereGuardado: true, ayudaDesactivada: t('guarda_primero', 'Guarda primero la propiedad'), contenido: pestanaEspacios },
            ...(veTitulares ? [{ id: 'titulares', etiqueta: t('pestana_titulares', 'Titulares'), requiereGuardado: true, ayudaDesactivada: t('guarda_primero', 'Guarda primero la propiedad'), contenido: ficha.id && <TitularesPestana propiedadId={ficha.id} puedeEscribir={puedeTitulares && !Number(ficha.datos?.es_de_tercero)} onCambio={cargar} /> }] : []),
            ...(vePrestamos ? [{ id: 'prestamos', etiqueta: t('pestana_prestamos', 'Préstamos'), requiereGuardado: true, ayudaDesactivada: t('guarda_primero', 'Guarda primero la propiedad'), contenido: ficha.id && <PrestamosPestana propiedadId={ficha.id} puedeEscribir={puedePrestamos} /> }] : []),
            { id: 'documentos', etiqueta: t('pestana_documentos', 'Documentos'), requiereGuardado: true, ayudaDesactivada: t('guarda_primero', 'Guarda primero la propiedad'), contenido: ficha.id && <DocumentosObjeto tabla="im_property" id={ficha.id} soloLectura={!puedeEscribir} /> },
          ]}
        />
      )}
    </div>
  );
}
