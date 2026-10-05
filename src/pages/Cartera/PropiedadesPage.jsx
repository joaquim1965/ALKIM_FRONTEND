/**
 * PropiedadesPage — Cartera → Propiedades (01/10/2026, Plan core inmobiliaria fase 1).
 *
 * Lista de propiedades de las entidades del usuario (la entidad activa filtra)
 * y ficha con pestañas: Datos · Espacios · Contratos · Compra · Titulares · Préstamos · Documentos.
 * Sin UF (05/10/2026): los contratos van a la propiedad entera o a sus espacios.
 * Los espacios comunes se ven en el árbol pero no son alquilables.
 *
 *   /propiedades · /propiedades/tipos · /propiedades/:id
 *   /propiedades/:id/espacios[/:espacio]
 * Textos: s_dictionary, contextos «Propiedades», «TipoPropiedad», «TipoEspacio».
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building, Copy, FileSignature, ChevronRight, CornerDownRight, Pencil, Trash2, Lock, FileText } from 'lucide-react';
import Button from '../../components/UI/Button';
import DataTable from '../../components/UI/DataTable';
import FichaConPestanas from '../../components/UI/FichaConPestanas';
import {
  CabeceraPagina, Panel, CabeceraPanel, Campo, Leyenda, Casilla, AvisoError, AvisoOk, SinDato,
  CLASE_INPUT, Recuadro, claseFila, BotonFila, BotonAnadir,
} from '../../components/UI/TemaPagina';
import DocumentosObjeto from '../../components/Documentos/DocumentosObjeto';
import TitularesPestana from './TitularesPestana';
import PrestamosPestana from './PrestamosPestana';
import ContratosPestana from './ContratosPestana';
import CompraPestana from './CompraPestana';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { useStore } from '../../hooks/useStore';
import { TIPOS_VIA, separarDireccion, pareceDireccionCompleta, abreviarDireccion, direccionCompleta, direccionCorta } from '../../utils/direccion';

const ESTADOS = ['EN_COMPRA', 'EN_REFORMA', 'DISPONIBLE', 'EN_EXPLOTACION', 'EN_VENTA', 'VENDIDA', 'BAJA'];
const VACIA = {
  entidad_gestora_id: '', codigo: '', nombre: '', tipo_id: '', ref_catastral: '', finca_registral: '', registro_propiedad: '',
  tipo_via: '', via: '', numero: '', escalera: '', planta: '', puerta: '', codigo_postal: '', municipio: '', provincia: '', pais: 'ES', direccion_corta: '',
  superficie_construida: '', superficie_util: '', anyo_construccion: '', valor_catastral: '', valor_catastral_construccion: '',
  catastral_revisado: true, es_de_tercero: false, estado: 'DISPONIBLE', notas: '',
};
const ESPACIO_VACIO = { tipo_id: '', codigo: '', nombre: '', planta: '', puerta: '', ref_catastral: '', superficie_util: '', es_comun: false, coeficiente_reparto: '', renta_objetivo: '', orden: 0 };

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}
const M2 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, useGrouping: 'always' });
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
  const veContratos = puede('im_contract', 'Read');
  const puedeContratos = puede('im_contract', 'Write');
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
  const [copiada, setCopiada] = useState(false);
  const [espacio, setEspacio] = useState(null);      // formulario de espacio { id|null, ...campos }
  const [docsEspacio, setDocsEspacio] = useState(null);
  const [pestanaEspacio, setPestanaEspacio] = useState('datos');
  // Sin UF (05/10/2026): contratos de la ficha abierta, para ver en Espacios
  // qué está alquilado y a quién; «Alquilar» abre Contratos con el espacio marcado.
  const [contratosFicha, setContratosFicha] = useState([]);
  const [pestanaFicha, setPestanaFicha] = useState(null);
  const [alquilar, setAlquilar] = useState(null);

  // Abrir una propiedad desde otra pantalla: ?id=N[&pestana=contratos]
  // (Cartera ▸ Contratos, 05/10/2026).
  const [params, setParams] = useSearchParams();
  const pestanaInicial = useRef(params.get('pestana') || null);
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
    // Tipos y entidades se cargan por separado: si falla uno, el otro
    // desplegable no se queda vacío (04/10/2026).
    pedir('/propiedades/tipos')
      .then((r) => setTipos(r.data || { propiedad: [], espacio: [] }))
      .catch((e) => setError(`${t('error_tipos', 'Tipos de propiedad')}: ${e.message}`));
    pedir('/companies/mine')
      .then((r) => setEntidades((r.data || []).filter((e) => ['PROPIETARIO', 'ADMINISTRADOR'].includes(e.rol))))
      .catch((e) => setError(`${t('error_entidades', 'Entidades')}: ${e.message}`));
  }, []);

  const cargarContratos = async (id) => {
    if (!veContratos) return;
    try { setContratosFicha((await pedir(`/propiedades/${id}/contratos`)).data || []); } catch { setContratosFicha([]); }
  };
  /** Contrato vigente hoy que alquila ese espacio (o la propiedad entera). */
  const contratoDeEspacio = (espacioId) => {
    const hoyTxt = new Date().toISOString().slice(0, 10);
    return contratosFicha.find((c) => ['VIGENTE', 'PRORROGADO'].includes(c.estado) && c.fecha_inicio <= hoyTxt
      && !((c.fecha_rescision || c.fecha_fin) && (c.fecha_rescision || c.fecha_fin) < hoyTxt)
      && (!c.espacios.length || c.espacios.some((e) => Number(e.espacio_id) === Number(espacioId))));
  };

  const recargarFicha = async (id) => {
    const d = (await pedir(`/propiedades/${id}`)).data;
    setFicha({ id, datos: d, espacios: d.espacios || [] });
    cargarContratos(id);
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

  useEffect(() => {
    const id = Number(params.get('id'));
    if (!id) return;
    setParams({}, { replace: true });
    abrir({ id });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Con espacios no se puede borrar: primero hay que borrar los espacios (05/10/2026).
    if (Number(p.espacios)) {
      window.alert(t('baja_con_espacios', '«{nombre}» tiene {n} espacio(s). Bórralos primero en la pestaña Espacios de la propiedad.').replace('{nombre}', p.nombre).replace('{n}', p.espacios));
      return;
    }
    if (!window.confirm(t('confirmar_baja', '¿Dar de baja «{nombre}»? Se conserva su historia.').replace('{nombre}', p.nombre))) return;
    try { await pedir(`/propiedades/${p.id}`, { method: 'DELETE' }); await cargar(); } catch (e) { setError(e.message); }
  };

  // ── Espacios ──
  const nuevoEspacio = (padre = null) => {
    setError(''); setDocsEspacio(null); setPestanaEspacio('datos');
    // Tipo por defecto: Habitación (05/10/2026, petición del usuario).
    const tipo = tipos.espacio.find((x) => x.codigo === 'HABITACION') || tipos.espacio[0];
    setEspacio({ id: null, ...ESPACIO_VACIO, tipo_id: tipo?.id || '', es_comun: Boolean(Number(tipo?.es_comun_defecto)) });
  };
  const editarEspacio = (n) => {
    setError(''); setDocsEspacio(null); setPestanaEspacio('datos');
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

  // Dirección escrita de una vez en «Calle» → se reparte en sus campos al
  // salir del campo, sin pisar lo que ya esté escrito (05/10/2026).
  const repartirDireccion = () => {
    if (!pareceDireccionCompleta(form.via)) return;
    const r = separarDireccion(form.via);
    if (!r?.numero) return;
    setForm((s) => {
      const n = { ...s, via: r.via };
      ['tipo_via', 'numero', 'escalera', 'planta', 'puerta'].forEach((k) => { if (r[k] && !s[k]) n[k] = r[k]; });
      return n;
    });
    setAviso(t('direccion_repartida', 'He repartido la dirección en sus campos. Revísala antes de guardar.'));
  };
  const f = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const fe = (k) => ({ value: espacio?.[k] ?? '', onChange: (e) => setEspacio((s) => ({ ...s, [k]: e.target.value })) });
  const plano = aplanar(ficha?.espacios || []);
  const admiteEspacios = Number(tipos.propiedad.find((x) => String(x.id) === String(form.tipo_id))?.admite_espacios ?? 1) === 1;

  const columnas = [
    { id: 'codigo', label: t('col_codigo', 'Código'), sortField: 'codigo', render: (x) => <span className="font-mono text-xs font-black">{x.codigo}</span> },
    { id: 'nombre', label: t('col_nombre', 'Nombre'), sortField: 'nombre', render: (x) => <span className="text-sm font-black tracking-tight">{x.nombre}{x.es_de_tercero ? ` · ${t('de_tercero', 'de un cliente')}` : ''}</span> },
    { id: 'tipo', label: t('col_tipo', 'Tipo'), sortField: 'tipo_nombre', render: (x) => nombreTipoP(x.tipo_codigo, x.tipo_nombre) },
    { id: 'direccion', label: t('col_direccion', 'Dirección'), render: (x) => [direccionCorta(x), x.municipio].filter(Boolean).join(' · ') || <SinDato /> },
    { id: 'entidad', label: t('col_entidad', 'Entidad'), sortField: 'entidad_nombre', render: (x) => x.entidad_nombre },
    { id: 'estado', label: t('col_estado', 'Estado'), sortField: 'estado', render: (x) => t(`estado_${x.estado.toLowerCase()}`, x.estado) },
    { id: 'titulares', label: t('col_titulares', 'Titulares'), render: (x) => x.titulares || <SinDato /> },
    { id: 'espacios', label: t('col_espacios', 'Espacios'), sortField: 'espacios', render: (x) => <span className="font-mono">{x.espacios}</span> },
  ];

  const pestanaDatos = (
    <form onSubmit={guardar} className="space-y-6">
      <AvisoError>{error}</AvisoError>
      <AvisoOk>{aviso}</AvisoOk>
      <fieldset className="grid gap-4 sm:grid-cols-4">
        <Leyenda>{t('bloque_identidad', 'Identificación')}</Leyenda>
        <Campo etiqueta={t('codigo', 'Código corto')}><input required maxLength={20} value={form.codigo} onChange={(e) => setForm((s) => ({ ...s, codigo: e.target.value.toUpperCase() }))} className={`${CLASE_INPUT} font-mono`} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('nombre', 'Nombre')} ancho="sm:col-span-2"><input required maxLength={150} {...f('nombre')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('tipo', 'Tipo')}>
          <select required {...f('tipo_id')} className={CLASE_INPUT} disabled={!puedeEscribir}>
            {tipos.propiedad.map((x) => <option key={x.id} value={x.id}>{nombreTipoP(x.codigo, x.nombre)}</option>)}
          </select>
        </Campo>
        <Campo etiqueta={t('entidad_gestora', 'Entidad que la gestiona')}>
          <select required {...f('entidad_gestora_id')} className={CLASE_INPUT} disabled={!puedeEscribir}>
            <option value="">—</option>
            {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            {ficha?.datos && !entidades.some((e) => e.id === ficha.datos.entidad_gestora_id) && <option value={ficha.datos.entidad_gestora_id}>{ficha.datos.entidad_nombre}</option>}
          </select>
        </Campo>
        <Campo etiqueta={t('estado', 'Estado')}>
          <select {...f('estado')} className={CLASE_INPUT} disabled={!puedeEscribir}>
            {ESTADOS.map((v) => <option key={v} value={v}>{t(`estado_${v.toLowerCase()}`, v)}</option>)}
          </select>
        </Campo>
        <div className="flex items-end pb-2"><Casilla etiqueta={t('es_de_tercero', 'Es de un cliente (encargo)')} checked={form.es_de_tercero} onChange={(v) => setForm((s) => ({ ...s, es_de_tercero: v }))} /></div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-6">
        <Leyenda>{t('bloque_direccion', 'Dirección')}</Leyenda>
        <Campo etiqueta={t('tipo_via', 'Tipo de vía')}>
          <select {...f('tipo_via')} className={CLASE_INPUT} disabled={!puedeEscribir}>
            <option value="">—</option>
            {TIPOS_VIA.map(([c, n]) => <option key={c} value={c}>{t(`via_${c}`, n)}</option>)}
          </select>
        </Campo>
        <Campo etiqueta={t('via', 'Calle')} ancho="sm:col-span-3"><input maxLength={150} {...f('via')} onBlur={repartirDireccion} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('numero', 'Número')}><input maxLength={10} {...f('numero')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('escalera', 'Escalera')}><input maxLength={10} {...f('escalera')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('planta', 'Planta')}><input maxLength={10} {...f('planta')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('puerta', 'Puerta')}><input maxLength={10} {...f('puerta')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('codigo_postal', 'Código postal')}><input maxLength={10} {...f('codigo_postal')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('municipio', 'Municipio')} ancho="sm:col-span-2"><input maxLength={100} {...f('municipio')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('provincia', 'Provincia')} ancho="sm:col-span-2"><input maxLength={100} {...f('provincia')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        {/* Dirección abreviada (05/10/2026): vacía = la automática, que se ve
            como sugerencia. La completa se monta sola y se puede copiar. */}
        <Campo etiqueta={t('direccion_corta', 'Dirección abreviada')} ancho="sm:col-span-3">
          <input maxLength={150} {...f('direccion_corta')} placeholder={abreviarDireccion(form)} className={CLASE_INPUT} disabled={!puedeEscribir}
            title={t('direccion_corta_ayuda', 'Para contratos y documentos. Si la dejas vacía se usa la automática.')} />
        </Campo>
        <Campo etiqueta={t('direccion_completa', 'Dirección completa')} ancho="sm:col-span-3">
          <div className="flex gap-2">
            <input readOnly value={direccionCompleta(form)} className={`${CLASE_INPUT} flex-1`} aria-readonly="true" />
            <BotonFila icono={<Copy size={15} />} titulo={copiada ? t('copiada', 'Copiada') : t('copiar', 'Copiar')}
              onClick={() => { navigator.clipboard?.writeText(`${direccionCorta(form)}\n${direccionCompleta(form)}`).then(() => { setCopiada(true); setTimeout(() => setCopiada(false), 1500); }); }} />
          </div>
        </Campo>
        <p className="text-xs font-bold sm:col-span-6">{t('direccion_corta_ayuda', 'Para contratos y documentos. Si la dejas vacía se usa la automática.')}</p>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-4">
        <Leyenda>{t('bloque_catastro', 'Catastro y registro')}</Leyenda>
        <Campo etiqueta={t('ref_catastral', 'Referencia catastral')} ancho="sm:col-span-2"><input maxLength={25} value={form.ref_catastral} onChange={(e) => setForm((s) => ({ ...s, ref_catastral: e.target.value.toUpperCase() }))} className={`${CLASE_INPUT} font-mono`} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('finca_registral', 'Finca registral')}><input maxLength={30} {...f('finca_registral')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('registro_propiedad', 'Registro de la propiedad')}><input maxLength={100} {...f('registro_propiedad')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('superficie_construida', 'Superficie construida (m²)')}><input type="number" step="0.01" min="0" {...f('superficie_construida')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('superficie_util', 'Superficie útil (m²)')}><input type="number" step="0.01" min="0" {...f('superficie_util')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('anyo_construccion', 'Año de construcción')}><input type="number" min="1500" max="2100" {...f('anyo_construccion')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <div />
        <Campo etiqueta={t('valor_catastral', 'Valor catastral (€)')}><input type="number" step="0.01" min="0" {...f('valor_catastral')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <Campo etiqueta={t('valor_catastral_construccion', 'De construcción (€)')}><input type="number" step="0.01" min="0" {...f('valor_catastral_construccion')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
        <div className="flex items-end pb-2 sm:col-span-2"><Casilla etiqueta={t('catastral_revisado', 'Valor catastral revisado (imputación 1,1 %)')} checked={form.catastral_revisado} onChange={(v) => setForm((s) => ({ ...s, catastral_revisado: v }))} /></div>
      </fieldset>

      <Campo etiqueta={t('notas', 'Notas')}><textarea rows={2} {...f('notas')} className={CLASE_INPUT} disabled={!puedeEscribir} /></Campo>
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
      <AvisoError>{error}</AvisoError>
      {!admiteEspacios && <p className="text-sm font-bold">{t('no_admite_espacios', 'Este tipo de propiedad no se divide en espacios.')}</p>}
      {admiteEspacios && puedeEspacios && !espacio && (
        <BotonAnadir texto={t('nuevo_espacio', 'Añadir espacio')} onClick={() => nuevoEspacio()} pequeno />
      )}

      {espacio && (
        <Recuadro as="form" onSubmit={guardarEspacio} className="grid gap-3 sm:grid-cols-4">
          <h3 className="font-black tracking-tight text-on-surface2 sm:col-span-4">{espacio.id ? t('editar_espacio', 'Editar espacio') : t('nuevo_espacio', 'Añadir espacio')}</h3>
          {/* Pestañas del formulario de espacio (05/10/2026): lo básico y «Otros datos». */}
          <div role="tablist" className="tab-bar flex gap-1 sm:col-span-4" aria-label={t('editar_espacio', 'Editar espacio')}>
            {[['datos', t('pestana_datos', 'Datos')], ['otros', t('otros_datos', 'Otros datos')]].map(([id, txt]) => (
              <button key={id} type="button" role="tab" aria-selected={pestanaEspacio === id} onClick={() => setPestanaEspacio(id)}
                className={`tab-base ${pestanaEspacio === id ? 'tab-active' : ''}`}>{txt}</button>
            ))}
          </div>
          {pestanaEspacio === 'datos' && (<>
          <Campo etiqueta={t('tipo_espacio', 'Tipo')}>
            <select required value={espacio.tipo_id} onChange={(e) => {
              const tipo = tipos.espacio.find((x) => String(x.id) === e.target.value);
              setEspacio((s) => ({ ...s, tipo_id: e.target.value, es_comun: s.id ? s.es_comun : Boolean(Number(tipo?.es_comun_defecto)) }));
            }} className={CLASE_INPUT}>
              {tipos.espacio.map((x) => <option key={x.id} value={x.id}>{nombreTipoE(x.codigo, x.nombre)}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('codigo', 'Código corto')}><input required maxLength={20} value={espacio.codigo} onChange={(e) => setEspacio((s) => ({ ...s, codigo: e.target.value.toUpperCase() }))} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('nombre', 'Nombre')} ancho="sm:col-span-2"><input required maxLength={100} {...fe('nombre')} className={CLASE_INPUT} /></Campo>
          <div className="sm:col-span-4"><Casilla etiqueta={t('es_comun', 'Zona común (no se alquila; reparte gastos)')} checked={Boolean(espacio.es_comun)} onChange={(v) => setEspacio((s) => ({ ...s, es_comun: v }))} /></div>
          </>)}
          {pestanaEspacio === 'otros' && (<>
          <Campo etiqueta={t('superficie_util', 'Superficie útil (m²)')}><input type="number" step="0.01" min="0" {...fe('superficie_util')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('coeficiente_reparto', 'Coeficiente de reparto (%)')}><input type="number" step="0.0001" min="0" max="100" {...fe('coeficiente_reparto')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('renta_objetivo', 'Renta objetivo (€/mes)')}><input type="number" step="0.01" min="0" {...fe('renta_objetivo')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('planta', 'Planta')}><input maxLength={10} {...fe('planta')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('puerta', 'Puerta')}><input maxLength={10} {...fe('puerta')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('ref_catastral', 'Referencia catastral')} ancho="sm:col-span-2"><input maxLength={25} value={espacio.ref_catastral} onChange={(e) => setEspacio((s) => ({ ...s, ref_catastral: e.target.value.toUpperCase() }))} className={`${CLASE_INPUT} font-mono`} /></Campo>
          </>)}
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={() => setEspacio(null)}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={guardando}>{t('guardar', 'Guardar')}</Button>
          </div>
        </Recuadro>
      )}

      {plano.length === 0
        ? <p className="text-sm font-bold">{t('sin_espacios', 'Todavía no tiene espacios. Si se alquila entera, no hace falta ninguno.')}</p>
        : (
          <ul className="overflow-hidden rounded-2xl border border-border" aria-label={t('arbol', 'Árbol de espacios')}>
            {plano.map((n, i) => (
              <li key={n.id} className={`flex flex-wrap items-center gap-2 px-3 py-2 ${claseFila(i)}`}>
                {/* Acciones a la izquierda, como en todas las listas */}
                <span className="flex shrink-0 items-center gap-0.5">
                  <BotonFila icono={<FileText size={15} />} titulo={t('documentos_espacio', 'Documentos del espacio')} onClick={() => setDocsEspacio(docsEspacio?.id === n.id ? null : n)} />
                  {puedeEspacios && <>
                    <BotonFila icono={<Pencil size={15} />} titulo={t('editar_espacio', 'Editar espacio')} onClick={() => editarEspacio(n)} />
                    <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar_espacio', 'Borrar espacio')} onClick={() => borrarEspacio(n)} />
                  </>}
                </span>
                <span className="flex flex-wrap items-center gap-2" style={{ paddingLeft: `${n.nivel * 1.5}rem` }}>
                  {n.nivel > 0 ? <CornerDownRight size={14} /> : <ChevronRight size={14} />}
                  <span className="font-mono text-xs font-black">{n.codigo}</span>
                  <span className="text-sm font-black tracking-tight">{n.nombre}</span>
                  <span className="text-xs font-bold">· {nombreTipoE(n.tipo_codigo, n.tipo_nombre)}{n.superficie_util ? ` · ${M2.format(Number(n.superficie_util))} m²` : ''}</span>
                  {Number(n.es_comun) === 1 && <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 text-[11px] font-black uppercase tracking-widest"><Lock size={11} />{t('comun', 'común · no alquilable')}</span>}
                </span>
                {Number(n.es_comun) !== 1 && veContratos && (() => {
                  const c = contratoDeEspacio(n.id);
                  return c
                    ? <span className="ml-auto text-xs font-black">{t('alquilado_a', 'Alquilado a')} {c.partes.find((x) => x.rol === 'TITULAR')?.nombre || '—'} · {M2.format(Number(c.renta_mensual))} €/{t('mes', 'mes')}</span>
                    : (
                      <span className="ml-auto flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-widest">{t('libre', 'Libre')}</span>
                        {puedeContratos && <BotonFila icono={<FileSignature size={15} />} texto={t('alquilar', 'Alquilar')} onClick={() => { setAlquilar([n.id]); setPestanaFicha('contratos'); }} />}
                      </span>
                    );
                })()}
              </li>
            ))}
          </ul>
        )}

      {docsEspacio && (
        <Recuadro as="section">
          <h3 className="mb-3 font-black tracking-tight text-on-surface2">{t('documentos_de', 'Documentos de {nombre}').replace('{nombre}', `${docsEspacio.codigo} · ${docsEspacio.nombre}`)}</h3>
          <DocumentosObjeto tabla="im_space" id={docsEspacio.id} soloLectura={!puedeEspacios} />
        </Recuadro>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CabeceraPagina icono={<Building size={24} />} titulo={t('titulo', 'Propiedades')} subtitulo={t('subtitulo', 'Los inmuebles y sus espacios. Los contratos se hacen sobre la propiedad entera o sobre sus espacios.')}>
      </CabeceraPagina>

      {!ficha && <AvisoError>{error}</AvisoError>}

      <Panel className="overflow-hidden">
        <CabeceraPanel anadir={puedeEscribir ? { texto: t('nueva', 'Nueva propiedad'), onClick: () => abrir() } : null} icono={<Building size={20} />} titulo={t('titulo', 'Propiedades')}
          contador={`${propiedades.length} ${propiedades.length === 1 ? t('propiedad', 'propiedad') : t('propiedades', 'propiedades')}`}>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="input-base px-3 py-2 text-sm" aria-label={t('col_estado', 'Estado')}>
            <option value="">{t('todos_estados', 'Todos los estados')}</option>
            {ESTADOS.map((v) => <option key={v} value={v}>{t(`estado_${v.toLowerCase()}`, v)}</option>)}
          </select>
          <Casilla etiqueta={t('ver_bajas', 'Ver bajas')} checked={bajas} onChange={setBajas} />
        </CabeceraPanel>
        {cargando
          ? <div className="px-5 py-12 text-center text-xs font-bold uppercase tracking-widest text-on-surface2">{t('cargando', 'Cargando…')}</div>
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
      </Panel>

      {ficha && (
        <FichaConPestanas
          titulo={ficha.datos ? `${ficha.datos.codigo} · ${ficha.datos.nombre}` : t('nueva', 'Nueva propiedad')}
          subtitulo={ficha.datos ? `${ficha.datos.entidad_nombre} · ${t(`estado_${String(ficha.datos.estado).toLowerCase()}`, ficha.datos.estado)}` : null}
          guardado={Boolean(ficha.id)}
          inicial={pestanaInicial.current || undefined}
          activa={pestanaFicha || undefined}
          onActiva={setPestanaFicha}
          etiquetaCerrar={t('cerrar', 'Cerrar')}
          onCerrar={() => { pestanaInicial.current = null; setPestanaFicha(null); setAlquilar(null); setContratosFicha([]); setFicha(null); setEspacio(null); setDocsEspacio(null); }}
          pestanas={[
            { id: 'datos', etiqueta: t('pestana_datos', 'Datos'), contenido: pestanaDatos },
            { id: 'espacios', etiqueta: t('pestana_espacios', 'Espacios'), contador: plano.length || null, requiereGuardado: true, ayudaDesactivada: t('guarda_primero', 'Guarda primero la propiedad'), contenido: pestanaEspacios },
            ...(veContratos ? [{ id: 'contratos', etiqueta: t('pestana_contratos', 'Contratos'), contador: contratosFicha.filter((c) => ['VIGENTE', 'PRORROGADO'].includes(c.estado)).length || null, requiereGuardado: true, ayudaDesactivada: t('guarda_primero', 'Guarda primero la propiedad'), contenido: ficha.id && <ContratosPestana propiedadId={ficha.id} espacios={plano} puedeEscribir={puedeContratos} preseleccion={alquilar} onPreseleccionUsada={() => setAlquilar(null)} onCambio={() => { cargarContratos(ficha.id); cargar(); }} /> }] : []),
            { id: 'compra', etiqueta: t('pestana_compra', 'Compra'), requiereGuardado: true, ayudaDesactivada: t('guarda_primero', 'Guarda primero la propiedad'), contenido: ficha.id && <CompraPestana propiedadId={ficha.id} puedeEscribir={puedeEscribir} /> },
            ...(veTitulares ? [{ id: 'titulares', etiqueta: t('pestana_titulares', 'Titulares'), requiereGuardado: true, ayudaDesactivada: t('guarda_primero', 'Guarda primero la propiedad'), contenido: ficha.id && <TitularesPestana propiedadId={ficha.id} puedeEscribir={puedeTitulares && !Number(ficha.datos?.es_de_tercero)} onCambio={cargar} /> }] : []),
            ...(vePrestamos ? [{ id: 'prestamos', etiqueta: t('pestana_prestamos', 'Préstamos'), requiereGuardado: true, ayudaDesactivada: t('guarda_primero', 'Guarda primero la propiedad'), contenido: ficha.id && <PrestamosPestana propiedadId={ficha.id} puedeEscribir={puedePrestamos} /> }] : []),
            { id: 'documentos', etiqueta: t('pestana_documentos', 'Documentos'), requiereGuardado: true, ayudaDesactivada: t('guarda_primero', 'Guarda primero la propiedad'), contenido: ficha.id && <DocumentosObjeto tabla="im_property" id={ficha.id} soloLectura={!puedeEscribir} /> },
          ]}
        />
      )}
    </div>
  );
}
