/**
 * ComunicacionesPestana — pestaña «Comunicaciones» de la ficha de la propiedad (27/10/2026).
 *
 * Comunicaciones con los inquilinos: un texto (WhatsApp, email, llamada…) con
 * fotos y otros documentos adjuntos. Del piso entero o de una habitación.
 *
 *   - Grupos plegables: «Piso» y cada habitación; dentro, por Periodo (año), del
 *     más nuevo al más viejo; dentro del año, primero las ABIERTAS.
 *   - Al pulsar una fila se abre el visor (Texto / Fotos y documentos).
 *   - Borrar: aviso rojo debajo de la fila, una sola confirmación.
 *   - Adjuntos: POST /files (objeto im_communication, tipo COMUNICACION_ADJUNTO).
 *
 * API: /propiedades/:id/comunicaciones[/:com] · /files
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Pencil, Trash2, Eye, Paperclip, Check, X, FileText } from 'lucide-react';
import Button from '../../components/UI/Button';
import ZonaArchivos from '../../components/UI/ZonaArchivos';
import CampoFecha from '../../components/UI/CampoFecha';
import Toggle from '../../components/UI/Toggle';
import VisorComunicacion from '../../components/Comunicaciones/VisorComunicacion';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import {
  Campo, AvisoError, AvisoOk, CLASE_INPUT, Recuadro, claseFila, BotonFila, BotonAnadir, MICRO,
} from '../../components/UI/TemaPagina';

export async function pedir(url, opciones = {}) {
  const json = opciones.body && !(opciones.body instanceof FormData);
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), ...(json ? { 'Content-Type': 'application/json' } : {}) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

export const CANALES = [['WHATSAPP', 'WhatsApp'], ['EMAIL', 'Email'], ['LLAMADA', 'Llamada'], ['PRESENCIAL', 'En persona'], ['CARTA', 'Carta'], ['OTRO', 'Otro']];
export const SENTIDOS = [['RECIBIDA', 'Recibida'], ['ENVIADA', 'Enviada']];
export const fechaEs = (f) => (f ? String(f).slice(0, 10).split('-').reverse().join('/') : '');
const hoy = () => new Date().toLocaleDateString('sv-SE');
const CATEGORIA = 'COMUNICACION_ADJUNTO';
/** Enviada Sí → estado RESUELTA y sentido ENVIADA; No → ABIERTA y RECIBIDA (27/10/2026). */
const estadoYSentido = (estado) => ({ estado, sentido: estado === 'RESUELTA' ? 'ENVIADA' : 'RECIBIDA' });
const VACIO = { espacio_id: '', contrato_id: '', fecha: '', ejercicio: '', canal: 'WHATSAPP', sentido: 'RECIBIDA', asunto: '', texto: '', estado: 'ABIERTA' };

/**
 * Etiqueta del estado (27/10/2026, petición del usuario): Pendiente en blanco
 * (texto y borde del color de primer plano del tema) y Enviada en verde (éxito).
 * En la base: ABIERTA = Pendiente, RESUELTA = Enviada.
 */
export function EtiquetaEstado({ estado, t }) {
  const pendiente = estado === 'ABIERTA';
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 ${MICRO} ${pendiente ? 'border-on-background text-on-background' : 'border-success bg-success text-on-success'}`}>
      {pendiente ? t('estado_abierta', 'Pendiente') : t('estado_resuelta', 'Enviada')}
    </span>
  );
}

export default function ComunicacionesPestana({ propiedadId, propiedadNombre = '', espacios = [], contratos = [], puedeEscribir = false }) {
  const { t } = useTmTr('Comunicaciones');
  // Comunicaciones del piso entero: se rotulan con el código y nombre de la propiedad (27/10/2026), p. ej. «MR · MIQUEL ROMEU».
  const nombrePiso = propiedadNombre || t('piso_entero_corto', 'Piso entero');
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [form, setForm] = useState(null);          // { id|null, ...campos, adjuntos (ya subidos) }
  const [nuevos, setNuevos] = useState([]);        // archivos elegidos para subir
  const [ocupado, setOcupado] = useState('');
  const [catAdjunto, setCatAdjunto] = useState(null);
  const [visor, setVisor] = useState(null);        // id de la comunicación abierta
  const [borrando, setBorrando] = useState(null);  // { tipo: 'com'|'adjunto', id, mensaje }
  const [plegados, setPlegados] = useState(() => new Set());
  const [filtroEspacio, setFiltroEspacio] = useState('');   // '' todas · 'piso' · id
  const [filtroEstado, setFiltroEstado] = useState('');

  const cargar = useCallback(async () => {
    try { setLista((await pedir(`/propiedades/${propiedadId}/comunicaciones`)).data || []); }
    catch (e) { setError(e.message); setLista([]); }
  }, [propiedadId]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    pedir('/files/categorias?objeto=im_communication')
      .then((b) => setCatAdjunto((b.data || []).find((c) => c.codigo === CATEGORIA)?.id || null)).catch(() => {});
  }, []);

  const nombreCanal = (c) => t(`canal_${c}`, (CANALES.find(([v]) => v === c) || [null, c])[1]);
  const nombreSentido = (s) => t(`sentido_${s}`, (SENTIDOS.find(([v]) => v === s) || [null, s])[1]);
  const habitaciones = espacios.filter((e) => !Number(e.es_comun));

  // Grupos: «Piso» y cada habitación (en el orden de Espacios); dentro, por año.
  const grupos = useMemo(() => {
    if (!lista) return { pendientes: [], porGrupo: [] };
    const filtrada = lista.filter((c) => (!filtroEstado || c.estado === filtroEstado)
      && (!filtroEspacio || (filtroEspacio === 'piso' ? !c.espacio_id : String(c.espacio_id) === filtroEspacio)));
    // Pendientes: todas juntas al principio (27/10/2026). Enviadas: por Piso / habitación y Periodo, del más nuevo al más viejo.
    const pendientes = filtrada.filter((c) => c.estado === 'ABIERTA');
    const enviadas = filtrada.filter((c) => c.estado !== 'ABIERTA');
    const base = [{ clave: 'piso', titulo: nombrePiso, filas: enviadas.filter((c) => !c.espacio_id) }];
    const conEspacio = espacios.map((e) => ({ clave: String(e.id), titulo: `${e.codigo} · ${e.nombre}`, filas: enviadas.filter((c) => String(c.espacio_id) === String(e.id)) }));
    const porGrupo = [...base, ...conEspacio].filter((g) => g.filas.length).map((g) => {
      const anyos = new Map();
      for (const c of g.filas) {
        const y = String(c.ejercicio || String(c.fecha || '').slice(0, 4) || 'sin');
        if (!anyos.has(y)) anyos.set(y, []);
        anyos.get(y).push(c);
      }
      const orden = [...anyos.keys()].sort((a, b) => (a === 'sin') - (b === 'sin') || Number(b) - Number(a));
      return { ...g, anyos: orden.map((y) => ({ y, filas: anyos.get(y) })) };
    });
    return { pendientes, porGrupo };
  }, [lista, espacios, filtroEspacio, filtroEstado, nombrePiso, t]);

  const plegar = (k) => setPlegados((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  // ── Formulario ──
  const nueva = () => {
    setError(''); setAviso(''); setNuevos([]); setBorrando(null);
    setForm({ ...VACIO, fecha: hoy(), ejercicio: hoy().slice(0, 4), espacio_id: /^\d+$/.test(filtroEspacio) ? filtroEspacio : '', adjuntos: [] });
  };
  const editar = (c) => {
    setError(''); setAviso(''); setNuevos([]); setBorrando(null); setVisor(null);
    setForm({ id: c.id, ...Object.fromEntries(Object.keys(VACIO).map((k) => [k, c[k] == null ? '' : String(c[k])])), adjuntos: c.adjuntos || [] });
  };
  const fc = (k) => ({ value: form?.[k] ?? '', onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });
  // Al cambiar la fecha se propone su año como Periodo (si el Periodo seguía el de la fecha anterior).
  const cambiarFecha = (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, fecha: v, ejercicio: (!f.ejercicio || f.ejercicio === String(f.fecha || '').slice(0, 4)) && v ? v.slice(0, 4) : f.ejercicio }));
  };
  // Contratos de la habitación elegida (o todos, si es el piso entero).
  const contratosDe = (espacioId) => contratos.filter((c) => !espacioId || (c.espacios || []).some((e) => String(e.espacio_id) === String(espacioId)));

  const subirAdjuntos = async (comId, fecha, ejercicio) => {
    if (!nuevos.length) return;
    if (!catAdjunto) throw new Error(t('falta_tipo', 'Falta el tipo «Adjunto de comunicación»: reinicia el backend.'));
    for (let i = 0; i < nuevos.length; i += 1) {
      setOcupado(t('subiendo', 'Subiendo {i} de {n}…').replace('{i}', i + 1).replace('{n}', nuevos.length));
      const fd = new FormData();
      fd.append('archivo', nuevos[i]);
      fd.append('objeto_tabla', 'im_communication');
      fd.append('objeto_id', comId);
      fd.append('categoria_id', catAdjunto);
      fd.append('confidencial', '0');
      if (fecha) fd.append('fecha_documento', fecha);
      if (ejercicio) fd.append('ejercicio', ejercicio);
      await pedir('/files', { method: 'POST', body: fd });
    }
  };

  const guardar = async (ev) => {
    ev.preventDefault();
    setOcupado(t('guardando', 'Guardando…')); setError('');
    try {
      const { id, adjuntos, ...resto } = form;
      const cuerpo = { ...resto, espacio_id: resto.espacio_id || null, contrato_id: resto.contrato_id || null, ejercicio: resto.ejercicio || null };
      const r = await pedir(`/propiedades/${propiedadId}/comunicaciones${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(cuerpo) });
      const comId = id || r.data.id;
      try { await subirAdjuntos(comId, cuerpo.fecha, cuerpo.ejercicio); }
      catch (e) { setForm((f) => ({ ...f, id: comId })); throw e; }
      setForm(null); setNuevos([]);
      setAviso(t('guardada', 'Comunicación guardada.'));
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };

  // ── Borrar (una sola confirmación, en rojo debajo) ──
  const confirmarBorrado = async () => {
    const b = borrando;
    setBorrando(null); setError('');
    try {
      if (b.tipo === 'com') {
        await pedir(`/propiedades/${propiedadId}/comunicaciones/${b.id}`, { method: 'DELETE' });
        setAviso(t('borrada', 'Comunicación borrada. Sus adjuntos están en la papelera (30 días).'));
      } else {
        await pedir(`/files/${b.id}`, { method: 'DELETE' });
        setForm((f) => (f ? { ...f, adjuntos: f.adjuntos.filter((a) => a.id !== b.id) } : f));
      }
      await cargar();
    } catch (e) { setError(e.message); }
  };

  const cambiarEstado = async (c, estado) => {
    setError('');
    try {
      const cuerpo = { ...Object.fromEntries(Object.keys(VACIO).map((k) => [k, c[k] ?? null])), ...estadoYSentido(estado) };
      await pedir(`/propiedades/${propiedadId}/comunicaciones/${c.id}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
      await cargar();
    } catch (e) { setError(e.message); }
  };

  const AvisoBorrar = ({ id, tipo }) => (borrando?.id === id && borrando?.tipo === tipo ? (
    <AvisoError>
      <span>{borrando.mensaje}</span>
      <span className="mt-2 flex gap-2">
        <button type="button" onClick={confirmarBorrado} className={`rounded-lg border border-current px-3 py-1 ${MICRO}`}>{t('borrar', 'Borrar')}</button>
        <button type="button" onClick={() => setBorrando(null)} className={`rounded-lg border border-current px-3 py-1 ${MICRO}`}>{t('cancelar', 'Cancelar')}</button>
      </span>
    </AvisoError>
  ) : null);

  const cabecera = (clave, titulo, n) => (
    <h3 className="flex items-center gap-3 bg-table-header px-4 py-2.5 text-on-table-header" style={{ backgroundColor: 'color-mix(in srgb, var(--color-table-header) 60%, black)' }}>
      <button type="button" onClick={() => plegar(clave)} aria-expanded={!plegados.has(clave)}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-surface-hover hover:text-on-surface-hover">
        <ChevronRight size={18} className={`transition-transform ${plegados.has(clave) ? '' : 'rotate-90'}`} />
      </button>
      <span className={MICRO}>{titulo} ({n})</span>
    </h3>
  );
  // Una fila; `conLugar`: en Pendientes se dice de qué habitación es (o «Piso entero»).
  const fila = (c, i, conLugar) => (
    <li key={c.id} className={claseFila(i, { clic: true })}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-2" onClick={() => setVisor(c.id)} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') setVisor(c.id); }}>
        <span className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()} role="presentation">
          <BotonFila icono={<Eye size={15} />} titulo={t('ver', 'Ver')} onClick={() => setVisor(c.id)} />
          {puedeEscribir && <BotonFila icono={<Pencil size={15} />} titulo={t('editar_corto', 'Editar')} onClick={() => editar(c)} />}
          {puedeEscribir && <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar', 'Borrar')}
            onClick={() => setBorrando({ tipo: 'com', id: c.id, mensaje: t('confirmar_borrar', '¿Borrar «{a}»? Sus fotos y documentos irán a la papelera (se pueden restaurar durante 30 días).').replace('{a}', c.asunto) })} />}
        </span>
        <span className="w-24 shrink-0 font-mono text-sm font-bold">{fechaEs(c.fecha)}</span>
        <EtiquetaEstado estado={c.estado} t={t} />
        {conLugar && <span className={`shrink-0 ${MICRO}`}>{c.espacio_id ? c.espacio_codigo : nombrePiso}</span>}
        <span className={`shrink-0 ${MICRO}`}>{nombreCanal(c.canal)}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-black">{c.asunto}</span>
        {c.adjuntos.length > 0 && <span className="flex shrink-0 items-center gap-1 text-sm font-bold" title={t('adjuntos', 'Fotos y documentos')}><Paperclip size={15} />{c.adjuntos.length}</span>}
      </div>
      <div className="px-4"><AvisoBorrar id={c.id} tipo="com" /></div>
    </li>
  );

  if (!lista) return <p className={MICRO}>{t('cargando', 'Cargando…')}</p>;
  const abierta = visor && lista.find((c) => c.id === visor);

  return (
    <div className="space-y-4">
      <AvisoError>{error}</AvisoError>
      <AvisoOk>{aviso}</AvisoOk>

      <div className="flex flex-wrap items-center gap-3">
        {puedeEscribir && !form && <BotonAnadir texto={t('nueva', 'Añadir comunicación')} onClick={nueva} pequeno />}
        {/* Estado, el primer filtro (27/10/2026). */}
        <label className="flex items-center gap-2 text-sm font-bold">
          {t('estado', 'Estado')}
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={`${CLASE_INPUT} w-auto`}>
            <option value="">{t('todas', 'Todas')}</option>
            <option value="ABIERTA">{t('abiertas', 'Pendiente')}</option>
            <option value="RESUELTA">{t('resueltas', 'Enviada')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          {t('mostrar', 'Mostrar')}
          <select value={filtroEspacio} onChange={(e) => setFiltroEspacio(e.target.value)} className={`${CLASE_INPUT} w-auto`}>
            <option value="">{t('todo', 'Piso y habitaciones')}</option>
            <option value="piso">{nombrePiso}</option>
            {espacios.map((e) => <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}</option>)}
          </select>
        </label>
      </div>

      {form && (
        <Recuadro as="form" onSubmit={guardar} className="grid gap-4 rejilla-campos">
          <h3 className="font-black tracking-tight text-on-surface2 sm:col-span-full">{form.id ? t('editar', 'Editar comunicación') : t('nueva', 'Añadir comunicación')}</h3>
          <Campo etiqueta={t('habitacion', 'Habitación')} ancho="sm:col-span-2">
            <select {...fc('espacio_id')} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, espacio_id: v, contrato_id: contratosDe(v).some((c) => String(c.id) === f.contrato_id) ? f.contrato_id : '' })); }} className={CLASE_INPUT}>
              <option value="">{nombrePiso}</option>
              {habitaciones.map((e) => <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('contrato', 'Contrato (opcional)')} ancho="sm:col-span-2">
            <select {...fc('contrato_id')} className={CLASE_INPUT}>
              <option value="">{t('sin_contrato', '— Ninguno —')}</option>
              {contratosDe(form.espacio_id).map((c) => (
                <option key={c.id} value={c.id}>{c.codigo}{c.partes?.[0]?.nombre ? ` · ${c.partes[0].nombre}` : ''} ({c.estado})</option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta={t('fecha', 'Fecha')}><CampoFecha required value={form.fecha} onChange={cambiarFecha} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('periodo', 'Periodo (año)')}><input type="number" min="1990" max="2100" {...fc('ejercicio')} className={`${CLASE_INPUT} font-mono`} /></Campo>
          <Campo etiqueta={t('canal', 'Canal')}>
            <select {...fc('canal')} className={CLASE_INPUT}>{CANALES.map(([v]) => <option key={v} value={v}>{nombreCanal(v)}</option>)}</select>
          </Campo>
          {/* Enviada: interruptor No / Sí, por defecto No (27/10/2026, petición del usuario): sustituye a «Recibida / enviada».
              Marca el estado (Pendiente / Enviada) y, a la vez, el sentido que se guarda. */}
          <Campo etiqueta={t('resuelta', 'Enviada')}>
            <div className="flex h-full items-center">
              <Toggle checked={form.estado === 'RESUELTA'} onChange={(v) => setForm((f) => ({ ...f, ...estadoYSentido(v ? 'RESUELTA' : 'ABIERTA') }))} />
            </div>
          </Campo>
          <Campo etiqueta={t('asunto', 'Asunto')} ancho="sm:col-span-full"><input required maxLength={200} {...fc('asunto')} className={CLASE_INPUT} /></Campo>
          <Campo etiqueta={t('texto', 'Texto (se puede pegar un chat de WhatsApp o un email)')} ancho="sm:col-span-full">
            <textarea rows={10} {...fc('texto')} className={`${CLASE_INPUT} text-base leading-relaxed`} />
          </Campo>

          {/* Adjuntos ya subidos (al editar) */}
          {form.adjuntos.length > 0 && (
            <div className="space-y-2 sm:col-span-full">
              <p className={MICRO}>{t('adjuntos_subidos', 'Fotos y documentos ya subidos')} ({form.adjuntos.length})</p>
              <ul className="overflow-hidden rounded-2xl border border-border">
                {form.adjuntos.map((a, i) => (
                  <li key={a.id} className={claseFila(i)}>
                    <div className="flex items-center gap-2 px-4 py-2 text-sm font-bold">
                      <FileText size={16} className="shrink-0" /><span className="min-w-0 flex-1 truncate">{a.nombre_original}</span>
                      {puedeEscribir && (
                        <BotonFila icono={<Trash2 size={15} />} titulo={t('quitar_adjunto', 'Mover a la papelera')}
                          onClick={() => setBorrando({ tipo: 'adjunto', id: a.id, mensaje: t('confirmar_borrar_adjunto', '¿Mover «{n}» a la papelera? Se puede restaurar durante 30 días.').replace('{n}', a.nombre_original) })} />
                      )}
                    </div>
                    <div className="px-4 pb-2"><AvisoBorrar id={a.id} tipo="adjunto" /></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="sm:col-span-full">
            <Campo etiqueta={t('anadir_adjuntos', 'Añadir fotos y documentos (máx. 1 GB cada uno)')}>
              <ZonaArchivos ficheros={nuevos} onCambio={setNuevos}
                textoPrincipal={t('arrastra', 'Arrastra aquí las fotos y documentos')}
                textoSecundario={t('o_elige', 'o pulsa para elegirlos del ordenador')}
                textoQuitar={t('quitar', 'Quitar')}
                textoCuenta={(n) => (n === 1 ? t('a_cargar_1', '1 archivo a cargar') : t('a_cargar', '{n} archivos a cargar').replace('{n}', n))} />
            </Campo>
          </div>

          <div className="flex items-center justify-end gap-2 sm:col-span-full">
            {ocupado && <span className="text-sm font-bold" aria-live="polite">{ocupado}</span>}
            <Button type="button" variant="secondary" leftIcon={<X size={16} />} disabled={Boolean(ocupado)} onClick={() => { setForm(null); setNuevos([]); setBorrando(null); }}>{t('cancelar', 'Cancelar')}</Button>
            <Button type="submit" loading={Boolean(ocupado)} disabled={Boolean(ocupado)} leftIcon={<Check size={16} />}>{t('guardar', 'Guardar')}</Button>
          </div>
        </Recuadro>
      )}

      {grupos.pendientes.length === 0 && grupos.porGrupo.length === 0 && (
        <p className="py-6 text-center text-sm font-bold">{lista.length ? t('nada_filtro', 'No hay comunicaciones con este filtro.') : t('vacio', 'Todavía no hay comunicaciones.')}</p>
      )}

      {/* Pendientes: todas juntas, arriba (con su habitación en la fila). */}
      {grupos.pendientes.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border">
          {cabecera('pendientes', t('pendientes', 'Pendientes'), grupos.pendientes.length)}
          {!plegados.has('pendientes') && <ul>{grupos.pendientes.map((c, i) => fila(c, i, true))}</ul>}
        </section>
      )}

      {/* Enviadas: por Piso / habitación y Periodo (año), del más nuevo al más viejo. */}
      {grupos.porGrupo.map((g) => (
        <section key={g.clave} className="overflow-hidden rounded-2xl border border-border">
          {cabecera(g.clave, g.titulo, g.filas.length)}
          {!plegados.has(g.clave) && (
            <ul>
              {g.anyos.map(({ y, filas }) => {
                const k = `${g.clave}|${y}`;
                return (
                  <React.Fragment key={k}>
                    <li>
                      <button type="button" onClick={() => plegar(k)} aria-expanded={!plegados.has(k)}
                        className={`flex w-full items-center gap-2 border-b border-border bg-surface2 px-4 py-1.5 text-left text-on-surface1 transition-colors hover:bg-surface-hover hover:text-on-surface-hover ${MICRO}`}>
                        <ChevronRight size={16} className={`transition-transform ${plegados.has(k) ? '' : 'rotate-90'}`} />
                        {y === 'sin' ? t('sin_anyo', 'Sin año') : y} ({filas.length})
                      </button>
                    </li>
                    {!plegados.has(k) && filas.map((c, i) => fila(c, i, false))}
                  </React.Fragment>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      {abierta && (
        <VisorComunicacion comunicacion={abierta} t={t} nombreCanal={nombreCanal} nombreSentido={nombreSentido}
          puedeEscribir={puedeEscribir} nombrePiso={nombrePiso} onCerrar={() => setVisor(null)} onEditar={() => editar(abierta)}
          onCambiarEstado={(estado) => cambiarEstado(abierta, estado)} />
      )}
    </div>
  );
}
