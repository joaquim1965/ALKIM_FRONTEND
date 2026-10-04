/**
 * CalendarioPage — Gestión ▸ Calendario (04/10/2026).
 *
 * Como Google Calendar: vistas Año / Mes / Semana / Lista, filtros por entidad
 * y tipo, y una ventana para crear o editar eventos con repetición y aviso.
 *
 *   API: /calendario/tipos · /calendario/eventos?desde&hasta · /calendario/eventos/:id
 *   Lógica de repeticiones y avisos: BACKEND/services/calendario.js
 *   Textos: s_dictionary, contextos «Calendario» y «TipoEvento».
 *
 * Los eventos automáticos (p. ej. «Caduca DNI Alex») los crea su documento;
 * aquí solo se cambian descripción, tipo y aviso.
 * Con ?evento=ID (enlace de la campana) se abre ese evento al entrar.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Repeat, Bell, Zap } from 'lucide-react';
import Button from '../../components/UI/Button';
import Tooltip from '../../components/UI/Tooltip';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import {
  CabeceraPagina, Panel, Campo, Leyenda, AvisoError, Casilla, VentanaModal, CLASE_INPUT, Ayuda,
} from '../../components/UI/TemaPagina';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.message || (b.errors && b.errors[0]?.message) || `Error ${r.status}`);
  return b;
}

// ── Fechas (siempre en hora local) ──────────────────────────────────────────
const dos = (n) => String(n).padStart(2, '0');
const clave = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
const hora = (d) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;
const leer = (v) => {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null;
};
const sumarDias = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const diaIso = (d) => ((d.getDay() + 6) % 7) + 1;           // 1 = lunes … 7 = domingo
const lunesDe = (d) => { const r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return sumarDias(r, -(diaIso(r) - 1)); };
const mismoDia = (a, b) => clave(a) === clave(b);
const idioma = () => (document.documentElement.lang || 'es').slice(0, 2);
const nombreMes = (m, forma = 'long') => new Date(2026, m, 1).toLocaleDateString(idioma(), { month: forma });
const nombreDia = (iso, forma = 'short') => new Date(2026, 0, 4 + iso).toLocaleDateString(idioma(), { weekday: forma }); // 5/1/2026 = lunes
const ORDINAL = ['primer', 'segundo', 'tercer', 'cuarto', 'último'];

const VISTAS = ['anyo', 'mes', 'semana', 'lista'];
const UNIDADES = ['MINUTOS', 'HORAS', 'DIAS', 'SEMANAS', 'MESES'];

/** Rango que se pide al servidor para la vista y la fecha de referencia. */
function rangoDe(vista, ref) {
  if (vista === 'anyo') return [new Date(ref.getFullYear(), 0, 1), new Date(ref.getFullYear(), 11, 31)];
  if (vista === 'semana') { const l = lunesDe(ref); return [l, sumarDias(l, 6)]; }
  if (vista === 'lista') return [new Date(ref.getFullYear(), ref.getMonth(), 1), new Date(ref.getFullYear(), ref.getMonth() + 3, 0)];
  const ini = lunesDe(new Date(ref.getFullYear(), ref.getMonth(), 1));
  return [ini, sumarDias(ini, 41)];
}

// ── Repetición: opciones rápidas como Google ────────────────────────────────
function opcionesRepeticion(base, t) {
  const n = Math.ceil(base.getDate() / 7);
  const ord = t(`ordinal_${n >= 5 ? 5 : n}`, ORDINAL[n >= 5 ? 4 : n - 1]);
  return [
    ['NO', t('rep_no', 'No se repite')],
    ['DIARIA', t('rep_diaria', 'Cada día')],
    ['SEMANAL_DIA', t('rep_semanal', 'Cada semana el {dia}').replace('{dia}', nombreDia(diaIso(base), 'long'))],
    ['MENSUAL_DIA', t('rep_mensual_dia', 'Cada mes el día {n}').replace('{n}', base.getDate())],
    ['MENSUAL_NSEM', t('rep_mensual_nsem', 'Cada mes el {ord} {dia}').replace('{ord}', ord).replace('{dia}', nombreDia(diaIso(base), 'long'))],
    ['ANUAL', t('rep_anual', 'Cada año el {fecha}').replace('{fecha}', base.toLocaleDateString(idioma(), { day: 'numeric', month: 'long' }))],
    ['LABORABLES', t('rep_laborables', 'Todos los días laborables (de lunes a viernes)')],
    ['PERSONALIZADO', t('rep_personalizado', 'Personalizado…')],
  ];
}
/** Evento guardado → opción rápida que le corresponde. */
function presetDe(f) {
  const base = leer(f.fecha_inicio) || new Date();
  const simple = Number(f.intervalo || 1) === 1 && (f.fin_repeticion || 'NUNCA') === 'NUNCA';
  if (f.repeticion === 'NO') return 'NO';
  if (!simple) return 'PERSONALIZADO';
  if (f.repeticion === 'DIARIA') return 'DIARIA';
  if (f.repeticion === 'SEMANAL') {
    if (f.dias_semana === '1,2,3,4,5') return 'LABORABLES';
    return !f.dias_semana || f.dias_semana === String(diaIso(base)) ? 'SEMANAL_DIA' : 'PERSONALIZADO';
  }
  if (f.repeticion === 'MENSUAL') return f.modo_mensual === 'DIA_SEMANA' ? 'MENSUAL_NSEM' : 'MENSUAL_DIA';
  if (f.repeticion === 'ANUAL') return 'ANUAL';
  return 'PERSONALIZADO';
}
/** Opción rápida → campos del evento. */
function aplicarPreset(f, preset) {
  const base = leer(f.fecha_inicio) || new Date();
  const comun = { intervalo: 1, fin_repeticion: 'NUNCA', fin_fecha: '', fin_veces: '', dias_semana: '', modo_mensual: '' };
  switch (preset) {
    case 'NO': return { ...f, ...comun, repeticion: 'NO' };
    case 'DIARIA': return { ...f, ...comun, repeticion: 'DIARIA' };
    case 'SEMANAL_DIA': return { ...f, ...comun, repeticion: 'SEMANAL', dias_semana: String(diaIso(base)) };
    case 'LABORABLES': return { ...f, ...comun, repeticion: 'SEMANAL', dias_semana: '1,2,3,4,5' };
    case 'MENSUAL_DIA': return { ...f, ...comun, repeticion: 'MENSUAL', modo_mensual: 'DIA_MES' };
    case 'MENSUAL_NSEM': return { ...f, ...comun, repeticion: 'MENSUAL', modo_mensual: 'DIA_SEMANA' };
    case 'ANUAL': return { ...f, ...comun, repeticion: 'ANUAL' };
    default: return { ...f, repeticion: f.repeticion === 'NO' ? 'SEMANAL' : f.repeticion, dias_semana: f.dias_semana || String(diaIso(base)), modo_mensual: f.modo_mensual || 'DIA_MES' };
  }
}
/** Momento del aviso (para «Se avisará el …»). */
function momentoAviso(inicio, n, unidad) {
  if (!inicio || n === '' || n === null || !unidad) return null;
  const d = new Date(inicio); const v = Number(n);
  if (unidad === 'MINUTOS') d.setMinutes(d.getMinutes() - v);
  if (unidad === 'HORAS') d.setHours(d.getHours() - v);
  if (unidad === 'DIAS') d.setDate(d.getDate() - v);
  if (unidad === 'SEMANAS') d.setDate(d.getDate() - 7 * v);
  if (unidad === 'MESES') d.setMonth(d.getMonth() - v);
  return d;
}

const NUEVO = (dia, tipoId) => ({
  titulo: '', entidad_id: '', tipo_id: tipoId || '', descripcion: '',
  fecha: clave(dia), hora: '09:00', todo_el_dia: false, fecha_fin: '', hora_fin: '',
  repeticion: 'NO', intervalo: 1, dias_semana: '', modo_mensual: '', fin_repeticion: 'NUNCA', fin_fecha: '', fin_veces: '',
  con_aviso: true, aviso_antelacion: 1, aviso_unidad: 'DIAS', aviso_web: true, aviso_email: false, aviso_semanal: false,
});

// ════════════════════════════════════════════════════════════════════════════
export default function CalendarioPage() {
  const { t } = useTmTr('Calendario');
  const { t: tt } = useTmTr('TipoEvento');
  const [params, setParams] = useSearchParams();
  const [vista, setVista] = useState(() => { try { return localStorage.getItem('calendarioVista') || 'mes'; } catch { return 'mes'; } });
  const [ref, setRef] = useState(() => new Date());
  const [eventos, setEventos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [filtro, setFiltro] = useState({ entidad_id: '', tipo_id: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [ficha, setFicha] = useState(null);       // { id?, automatico?, form }
  const [guardando, setGuardando] = useState(false);
  const [errorFicha, setErrorFicha] = useState('');

  const nombreTipo = (x) => tt(x.tipo_codigo || x.codigo, x.tipo_nombre || x.nombre);
  const [desde, hasta] = useMemo(() => rangoDe(vista, ref), [vista, ref]);

  useEffect(() => { try { localStorage.setItem('calendarioVista', vista); } catch { /* sin almacenamiento */ } }, [vista]);
  useEffect(() => {
    (async () => {
      try {
        const [ti, en] = await Promise.all([pedir('/calendario/tipos'), pedir('/companies/mine')]);
        setTipos(ti.data || []); setEntidades(en.data || []);
      } catch (e) { setError(e.message); }
    })();
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const q = new URLSearchParams({ desde: clave(desde), hasta: clave(hasta) });
      if (filtro.entidad_id) q.set('entidad_id', filtro.entidad_id);
      if (filtro.tipo_id) q.set('tipo_id', filtro.tipo_id);
      setEventos((await pedir(`/calendario/eventos?${q}`)).data || []);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, [desde, hasta, filtro]);
  useEffect(() => { cargar(); }, [cargar]);

  // Por día: { 'AAAA-MM-DD': [ocurrencias] }
  const porDia = useMemo(() => {
    const m = new Map();
    for (const e of eventos) {
      const k = e.ocurrencia_inicio.slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(e);
    }
    return m;
  }, [eventos]);

  // ── Navegación ────────────────────────────────────────────────────────
  const mover = (paso) => setRef((r) => {
    if (vista === 'anyo') return new Date(r.getFullYear() + paso, r.getMonth(), 1);
    if (vista === 'semana') return sumarDias(r, 7 * paso);
    if (vista === 'lista') return new Date(r.getFullYear(), r.getMonth() + 3 * paso, 1);
    return new Date(r.getFullYear(), r.getMonth() + paso, 1);
  });
  const tituloPeriodo = () => {
    if (vista === 'anyo') return String(ref.getFullYear());
    if (vista === 'semana') {
      const l = lunesDe(ref); const d = sumarDias(l, 6);
      return `${l.getDate()} ${nombreMes(l.getMonth(), 'short')} – ${d.getDate()} ${nombreMes(d.getMonth(), 'short')} ${d.getFullYear()}`;
    }
    if (vista === 'lista') return `${nombreMes(desde.getMonth())} – ${nombreMes(hasta.getMonth())} ${hasta.getFullYear()}`;
    return `${nombreMes(ref.getMonth())} ${ref.getFullYear()}`;
  };

  // ── Ficha (crear / editar) ────────────────────────────────────────────
  const tipoGeneral = tipos.find((x) => x.codigo === 'GENERAL')?.id;
  const nuevo = (dia = new Date()) => { setErrorFicha(''); setFicha({ form: NUEVO(dia, tipoGeneral) }); };
  const abrir = useCallback(async (id) => {
    setErrorFicha('');
    try {
      const ev = (await pedir(`/calendario/eventos/${id}`)).data;
      const ini = leer(ev.fecha_inicio); const fin = leer(ev.fecha_fin);
      setFicha({
        id: ev.id, automatico: ev.automatico,
        form: {
          titulo: ev.titulo, entidad_id: ev.entidad_id || '', tipo_id: ev.tipo_id, descripcion: ev.descripcion || '',
          fecha: clave(ini), hora: hora(ini), todo_el_dia: Boolean(Number(ev.todo_el_dia)),
          fecha_fin: fin ? clave(fin) : '', hora_fin: fin ? hora(fin) : '',
          repeticion: ev.repeticion, intervalo: ev.intervalo || 1, dias_semana: ev.dias_semana || '', modo_mensual: ev.modo_mensual || '',
          fin_repeticion: ev.fin_repeticion || 'NUNCA', fin_fecha: ev.fin_fecha || '', fin_veces: ev.fin_veces || '',
          con_aviso: ev.aviso_antelacion !== null, aviso_antelacion: ev.aviso_antelacion ?? 1, aviso_unidad: ev.aviso_unidad || 'DIAS',
          aviso_web: Boolean(Number(ev.aviso_web)), aviso_email: Boolean(Number(ev.aviso_email)), aviso_semanal: Boolean(Number(ev.aviso_semanal)),
        },
      });
      return ini;
    } catch (e) { setError(e.message); return null; }
  }, []);

  // Enlace de la campana: /gestion/calendario?evento=ID
  useEffect(() => {
    const id = params.get('evento');
    if (!id) return;
    abrir(id).then((ini) => { if (ini) setRef(ini); });
    params.delete('evento'); setParams(params, { replace: true });
  }, [params, setParams, abrir]);

  const f = ficha?.form;
  const setF = (cambios) => setFicha((x) => ({ ...x, form: { ...x.form, ...cambios } }));
  const inicioFicha = f ? leer(`${f.fecha}T${f.todo_el_dia ? '00:00' : (f.hora || '00:00')}`) : null;
  const preset = f ? presetDe({ ...f, fecha_inicio: `${f.fecha}T${f.hora}` }) : 'NO';
  const [personalizado, setPersonalizado] = useState(false);
  useEffect(() => { setPersonalizado(false); }, [ficha?.id]);
  const verPersonalizado = personalizado || preset === 'PERSONALIZADO';

  const guardar = async (ev) => {
    ev.preventDefault();
    if (!f.titulo.trim()) return setErrorFicha(t('falta_titulo', 'Indica el título.'));
    setGuardando(true); setErrorFicha('');
    try {
      const datos = {
        titulo: f.titulo.trim(), entidad_id: f.entidad_id || null, tipo_id: Number(f.tipo_id), descripcion: f.descripcion,
        fecha_inicio: `${f.fecha}T${f.todo_el_dia ? '00:00' : f.hora}`,
        fecha_fin: f.fecha_fin ? `${f.fecha_fin}T${f.todo_el_dia ? '23:59' : (f.hora_fin || f.hora)}` : null,
        todo_el_dia: f.todo_el_dia,
        repeticion: f.repeticion, intervalo: Number(f.intervalo) || 1,
        dias_semana: f.repeticion === 'SEMANAL' ? (f.dias_semana || String(diaIso(inicioFicha))) : null,
        modo_mensual: f.repeticion === 'MENSUAL' ? (f.modo_mensual || 'DIA_MES') : null,
        fin_repeticion: f.fin_repeticion, fin_fecha: f.fin_repeticion === 'FECHA' ? f.fin_fecha : null,
        fin_veces: f.fin_repeticion === 'VECES' ? Number(f.fin_veces) || 1 : null,
        aviso_antelacion: f.con_aviso ? Number(f.aviso_antelacion) || 0 : null, aviso_unidad: f.con_aviso ? f.aviso_unidad : null,
        aviso_web: f.aviso_web, aviso_email: f.aviso_email, aviso_semanal: f.aviso_semanal,
      };
      await pedir(ficha.id ? `/calendario/eventos/${ficha.id}` : '/calendario/eventos', { method: ficha.id ? 'PUT' : 'POST', body: JSON.stringify(datos) });
      setFicha(null);
      await cargar();
    } catch (e) { setErrorFicha(e.message); }
    finally { setGuardando(false); }
  };
  const borrar = async () => {
    if (!window.confirm(t('confirmar_borrar', '¿Borrar este evento? Si se repite, se borran todas sus repeticiones.'))) return;
    try { await pedir(`/calendario/eventos/${ficha.id}`, { method: 'DELETE' }); setFicha(null); await cargar(); }
    catch (e) { setErrorFicha(e.message); }
  };

  // ── Piezas de pintura ─────────────────────────────────────────────────
  const Chip = ({ e, conHora = true }) => {
    const ini = leer(e.ocurrencia_inicio);
    return (
      <button
        type="button" onClick={(ev) => { ev.stopPropagation(); abrir(e.id); }}
        title={`${e.titulo}${e.entidad_nombre ? ` · ${e.entidad_nombre}` : ''}`}
        className="flex w-full items-center gap-1.5 truncate rounded-md border-l-4 bg-surface2 px-1.5 py-0.5 text-left text-xs font-bold text-on-surface1 hover:bg-surface-hover"
        style={{ borderLeftColor: e.tipo_color || '#ffffff' }}
      >
        {conHora && !Number(e.todo_el_dia) && <span className="shrink-0 font-mono">{hora(ini)}</span>}
        <span className="truncate">{e.titulo}</span>
        {e.repeticion !== 'NO' && <Repeat size={11} className="shrink-0" aria-hidden />}
      </button>
    );
  };
  const cabeceraDias = (
    <div className="grid grid-cols-7 border-b border-border">
      {[1, 2, 3, 4, 5, 6, 7].map((d) => <div key={d} className="py-2 text-center text-[11px] font-black uppercase tracking-widest text-on-surface1">{nombreDia(d)}</div>)}
    </div>
  );
  const hoy = new Date();

  const VistaMes = () => (
    <div>
      {cabeceraDias}
      <div className="grid grid-cols-7">
        {Array.from({ length: 42 }, (_, i) => sumarDias(desde, i)).map((d) => {
          const lista = porDia.get(clave(d)) || [];
          const fuera = d.getMonth() !== ref.getMonth();
          return (
            <div key={clave(d)} role="button" tabIndex={0} onClick={() => nuevo(d)} onKeyDown={(e) => e.key === 'Enter' && nuevo(d)}
              className={`min-h-[110px] cursor-pointer space-y-1 border-b border-r border-border p-1.5 hover:bg-surface-hover ${fuera ? 'opacity-50' : ''}`}>
              <div className={`mb-1 inline-grid h-7 w-7 place-items-center rounded-full text-sm font-black ${mismoDia(d, hoy) ? 'bg-primary text-on-primary' : 'text-on-surface1'}`}>{d.getDate()}</div>
              {lista.slice(0, 3).map((e) => <Chip key={`${e.id}-${e.ocurrencia_inicio}`} e={e} />)}
              {lista.length > 3 && (
                <button type="button" onClick={(ev) => { ev.stopPropagation(); setRef(d); setVista('semana'); }} className="text-xs font-black text-on-surface1 underline">
                  {t('mas', '+{n} más').replace('{n}', lista.length - 3)}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const VistaSemana = () => (
    <div>
      <div className="grid grid-cols-7 border-b border-border">
        {Array.from({ length: 7 }, (_, i) => sumarDias(desde, i)).map((d) => (
          <div key={clave(d)} className="py-2 text-center">
            <div className="text-[11px] font-black uppercase tracking-widest text-on-surface1">{nombreDia(diaIso(d))}</div>
            <div className={`mx-auto mt-1 grid h-9 w-9 place-items-center rounded-full text-lg font-black ${mismoDia(d, hoy) ? 'bg-primary text-on-primary' : 'text-on-surface1'}`}>{d.getDate()}</div>
          </div>
        ))}
      </div>
      <div className="grid min-h-[420px] grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => sumarDias(desde, i)).map((d) => (
          <div key={clave(d)} role="button" tabIndex={0} onClick={() => nuevo(d)} onKeyDown={(e) => e.key === 'Enter' && nuevo(d)}
            className="cursor-pointer space-y-1.5 border-r border-border p-1.5 hover:bg-surface-hover">
            {(porDia.get(clave(d)) || []).map((e) => <Chip key={`${e.id}-${e.ocurrencia_inicio}`} e={e} />)}
          </div>
        ))}
      </div>
    </div>
  );

  const VistaAnyo = () => (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => {
        const ini = lunesDe(new Date(ref.getFullYear(), m, 1));
        return (
          <div key={m} className="rounded-2xl border border-border p-3">
            <button type="button" onClick={() => { setRef(new Date(ref.getFullYear(), m, 1)); setVista('mes'); }}
              className="mb-2 text-sm font-black capitalize tracking-tight text-on-surface1 hover:underline">{nombreMes(m)}</button>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => <div key={d} className="text-[10px] font-black uppercase text-on-surface1">{nombreDia(d, 'narrow')}</div>)}
              {Array.from({ length: 42 }, (_, i) => sumarDias(ini, i)).map((d) => {
                if (d.getMonth() !== m) return <div key={clave(d)} />;
                const n = (porDia.get(clave(d)) || []).length;
                const color = n ? (porDia.get(clave(d))[0].tipo_color || '#ffffff') : null;
                return (
                  <button key={clave(d)} type="button" title={n ? (porDia.get(clave(d)) || []).map((e) => e.titulo).join(' · ') : undefined}
                    onClick={() => { setRef(d); setVista('semana'); }}
                    className={`relative grid h-7 place-items-center rounded-full text-xs font-bold text-on-surface1 hover:bg-surface-hover ${mismoDia(d, hoy) ? 'bg-primary text-on-primary' : ''}`}
                    style={n ? { boxShadow: `inset 0 0 0 2px ${color}` } : undefined}>
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const VistaLista = () => {
    const dias = [...porDia.keys()].sort();
    if (!dias.length) return <p className="px-5 py-12 text-center text-sm font-bold text-on-surface1">{t('sin_eventos', 'No hay eventos en este periodo.')}</p>;
    return (
      <ul className="divide-y divide-border">
        {dias.map((k) => {
          const d = leer(k);
          return (
            <li key={k} className="grid gap-3 px-5 py-3 sm:grid-cols-[180px_1fr]">
              <div className={`text-sm font-black capitalize ${mismoDia(d, hoy) ? 'underline' : ''} text-on-surface1`}>
                {d.toLocaleDateString(idioma(), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <ul className="space-y-2">
                {porDia.get(k).map((e) => (
                  <li key={`${e.id}-${e.ocurrencia_inicio}`}>
                    <button type="button" onClick={() => abrir(e.id)} className="flex w-full flex-wrap items-center gap-3 rounded-xl border-l-4 bg-surface2 px-3 py-2 text-left hover:bg-surface-hover" style={{ borderLeftColor: e.tipo_color || '#ffffff' }}>
                      <span className="w-14 shrink-0 font-mono text-sm font-bold text-on-surface1">{Number(e.todo_el_dia) ? t('todo_el_dia', 'Todo el día') : hora(leer(e.ocurrencia_inicio))}</span>
                      <span className="min-w-0 flex-1 text-sm font-black text-on-surface1">{e.titulo}</span>
                      <span className="text-xs font-bold text-on-surface1">{[nombreTipo(e), e.entidad_nombre].filter(Boolean).join(' · ')}</span>
                      {e.repeticion !== 'NO' && <Repeat size={14} aria-label={t('repeticion', 'Se repite')} />}
                      {e.aviso_en && <Bell size={14} aria-label={t('aviso', 'Aviso')} />}
                      {e.automatico && <Zap size={14} aria-label={t('automatico', 'Evento automático')} />}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    );
  };

  // ── Pantalla ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <CabeceraPagina icono={<CalendarDays size={24} />} titulo={t('titulo', 'Calendario')} subtitulo={t('subtitulo', 'Vencimientos, caducidades y citas de todas las entidades.')} />
      <AvisoError>{error}</AvisoError>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <Tooltip texto={t('nuevo', 'Nuevo evento')}>
            <button type="button" onClick={() => nuevo(vista === 'semana' || vista === 'mes' ? ref : new Date())} aria-label={t('nuevo', 'Nuevo evento')}
              className="grid h-[45px] w-[45px] shrink-0 place-items-center rounded-full border-2 border-primary-border bg-primary text-on-primary transition-colors hover:border-on-background">
              <Plus size={20} />
            </button>
          </Tooltip>
          <Button variant="secondary" size="sm" onClick={() => setRef(new Date())}>{t('hoy', 'Hoy')}</Button>
          <button type="button" onClick={() => mover(-1)} aria-label={t('anterior', 'Anterior')} className="rounded-full p-2 text-on-surface1 hover:bg-surface-hover"><ChevronLeft size={22} /></button>
          <button type="button" onClick={() => mover(1)} aria-label={t('siguiente', 'Siguiente')} className="rounded-full p-2 text-on-surface1 hover:bg-surface-hover"><ChevronRight size={22} /></button>
          <h2 className="min-w-[200px] text-xl font-black capitalize tracking-tight text-on-surface1">{tituloPeriodo()}</h2>
          {cargando && <span className="text-xs font-bold uppercase tracking-widest text-on-surface1">{t('cargando', 'Cargando…')}</span>}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select aria-label={t('entidad', 'Entidad')} value={filtro.entidad_id} onChange={(e) => setFiltro((x) => ({ ...x, entidad_id: e.target.value }))} className={`${CLASE_INPUT} w-auto`}>
              <option value="">{t('todas_entidades', 'Todas las entidades')}</option>
              {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <select aria-label={t('tipo', 'Tipo')} value={filtro.tipo_id} onChange={(e) => setFiltro((x) => ({ ...x, tipo_id: e.target.value }))} className={`${CLASE_INPUT} w-auto`}>
              <option value="">{t('todos_tipos', 'Todos los tipos')}</option>
              {tipos.map((x) => <option key={x.id} value={x.id}>{nombreTipo(x)}</option>)}
            </select>
            <div role="tablist" className="flex overflow-hidden rounded-xl border border-border">
              {VISTAS.map((v) => (
                <button key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
                  className={`px-3 py-2 text-sm font-black ${vista === v ? 'bg-primary text-on-primary' : 'text-on-surface1 hover:bg-surface-hover'}`}>
                  {t(`vista_${v}`, { anyo: 'Año', mes: 'Mes', semana: 'Semana', lista: 'Lista' }[v])}
                </button>
              ))}
            </div>
          </div>
        </div>

        {vista === 'mes' && <VistaMes />}
        {vista === 'semana' && <VistaSemana />}
        {vista === 'anyo' && <VistaAnyo />}
        {vista === 'lista' && <VistaLista />}
      </Panel>

      {f && (
        <VentanaModal icono={<CalendarDays size={20} />} titulo={ficha.id ? t('editar', 'Editar evento') : t('nuevo', 'Nuevo evento')} onCerrar={() => !guardando && setFicha(null)}>
          <AvisoError>{errorFicha}</AvisoError>
          {ficha.automatico && <Ayuda className="mb-4 flex items-center gap-2"><Zap size={16} />{t('automatico', 'Evento automático: se actualiza desde su documento.')}</Ayuda>}
          <form onSubmit={guardar} className="mt-4 space-y-5">
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Campo etiqueta={t('titulo_evento', 'Título')}><input autoFocus={!ficha.id} disabled={ficha.automatico} value={f.titulo} maxLength={200} onChange={(e) => setF({ titulo: e.target.value })} className={CLASE_INPUT} /></Campo>
              </div>
              <Campo etiqueta={t('entidad', 'Entidad')}>
                <select disabled={ficha.automatico} value={f.entidad_id} onChange={(e) => setF({ entidad_id: e.target.value })} className={CLASE_INPUT}>
                  <option value="">{t('general', '— General —')}</option>
                  {entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </Campo>
              <Campo etiqueta={t('tipo', 'Tipo')}>
                <select value={f.tipo_id} onChange={(e) => setF({ tipo_id: e.target.value })} className={CLASE_INPUT}>
                  {tipos.map((x) => <option key={x.id} value={x.id}>{nombreTipo(x)}</option>)}
                </select>
              </Campo>
            </fieldset>

            <fieldset className="grid gap-4 sm:grid-cols-4" disabled={ficha.automatico}>
              <Leyenda>{t('fecha_hora', 'Fecha y hora')}</Leyenda>
              <Campo etiqueta={t('fecha', 'Fecha')}><input type="date" required value={f.fecha} onChange={(e) => setF({ fecha: e.target.value })} className={CLASE_INPUT} /></Campo>
              {!f.todo_el_dia && <Campo etiqueta={t('hora', 'Hora')}><input type="time" required value={f.hora} onChange={(e) => setF({ hora: e.target.value })} className={CLASE_INPUT} /></Campo>}
              <Campo etiqueta={t('fecha_fin', 'Fin')}><input type="date" min={f.fecha} value={f.fecha_fin} onChange={(e) => setF({ fecha_fin: e.target.value })} className={CLASE_INPUT} /></Campo>
              {!f.todo_el_dia && f.fecha_fin && <Campo etiqueta={t('hora_fin', 'Hora fin')}><input type="time" value={f.hora_fin} onChange={(e) => setF({ hora_fin: e.target.value })} className={CLASE_INPUT} /></Campo>}
              <div className="sm:col-span-4"><Casilla etiqueta={t('todo_el_dia', 'Todo el día')} checked={f.todo_el_dia} onChange={(v) => setF({ todo_el_dia: v })} /></div>
            </fieldset>

            <fieldset className="space-y-3" disabled={ficha.automatico}>
              <Leyenda>{t('repeticion', 'Se repite')}</Leyenda>
              <select value={verPersonalizado ? 'PERSONALIZADO' : preset} onChange={(e) => {
                const p = e.target.value; setPersonalizado(p === 'PERSONALIZADO'); setFicha((x) => ({ ...x, form: aplicarPreset({ ...x.form, fecha_inicio: `${x.form.fecha}T${x.form.hora}` }, p) }));
              }} className={CLASE_INPUT}>
                {opcionesRepeticion(inicioFicha || new Date(), t).map(([v, txt]) => <option key={v} value={v}>{txt}</option>)}
              </select>
              {verPersonalizado && f.repeticion !== 'NO' && (
                <div className="space-y-3 rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-on-surface1">
                    <span>{t('cada', 'Cada')}</span>
                    <input type="number" min="1" max="999" value={f.intervalo} onChange={(e) => setF({ intervalo: e.target.value })} className={`${CLASE_INPUT} w-24`} aria-label={t('cada', 'Cada')} />
                    <select value={f.repeticion} onChange={(e) => setF({ repeticion: e.target.value })} className={`${CLASE_INPUT} w-auto`} aria-label={t('unidad', 'Unidad')}>
                      <option value="DIARIA">{t('u_dias', 'días')}</option>
                      <option value="SEMANAL">{t('u_semanas', 'semanas')}</option>
                      <option value="MENSUAL">{t('u_meses', 'meses')}</option>
                      <option value="ANUAL">{t('u_anyos', 'años')}</option>
                    </select>
                  </div>
                  {f.repeticion === 'SEMANAL' && (
                    <div className="flex flex-wrap gap-2" role="group" aria-label={t('dias_semana', 'Días de la semana')}>
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                        const sel = String(f.dias_semana || '').split(',').includes(String(d));
                        return (
                          <button key={d} type="button" aria-pressed={sel}
                            onClick={() => {
                              const s = new Set(String(f.dias_semana || '').split(',').filter(Boolean));
                              if (sel) s.delete(String(d)); else s.add(String(d));
                              setF({ dias_semana: [...s].sort().join(',') });
                            }}
                            className={`grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-black ${sel ? 'border-primary bg-primary text-on-primary' : 'border-border text-on-surface1'}`}>
                            {nombreDia(d, 'narrow')}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {f.repeticion === 'MENSUAL' && inicioFicha && (
                    <select value={f.modo_mensual || 'DIA_MES'} onChange={(e) => setF({ modo_mensual: e.target.value })} className={CLASE_INPUT}>
                      <option value="DIA_MES">{t('rep_mensual_dia', 'Cada mes el día {n}').replace('{n}', inicioFicha.getDate())}</option>
                      <option value="DIA_SEMANA">{opcionesRepeticion(inicioFicha, t)[4][1]}</option>
                    </select>
                  )}
                  <div className="space-y-2 text-sm font-bold text-on-surface1">
                    <div>{t('termina', 'Termina')}</div>
                    {[['NUNCA', t('nunca', 'Nunca')], ['FECHA', t('el_dia', 'El')], ['VECES', t('tras', 'Tras')]].map(([v, txt]) => (
                      <label key={v} className="flex flex-wrap items-center gap-3">
                        <input type="radio" name="fin" checked={f.fin_repeticion === v} onChange={() => setF({ fin_repeticion: v })} />
                        <span className="w-12">{txt}</span>
                        {v === 'FECHA' && <input type="date" min={f.fecha} disabled={f.fin_repeticion !== 'FECHA'} value={f.fin_fecha} onChange={(e) => setF({ fin_fecha: e.target.value })} className={`${CLASE_INPUT} w-auto`} />}
                        {v === 'VECES' && <><input type="number" min="1" max="999" disabled={f.fin_repeticion !== 'VECES'} value={f.fin_veces} onChange={(e) => setF({ fin_veces: e.target.value })} className={`${CLASE_INPUT} w-24`} /><span>{t('veces', 'veces')}</span></>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-3">
              <Leyenda>{t('aviso', 'Aviso')}</Leyenda>
              <Casilla etiqueta={t('con_aviso', 'Avisar antes del evento')} checked={f.con_aviso} onChange={(v) => setF({ con_aviso: v })} />
              {f.con_aviso && (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <input type="number" min="0" max="999" value={f.aviso_antelacion} onChange={(e) => setF({ aviso_antelacion: e.target.value })} className={`${CLASE_INPUT} w-24`} aria-label={t('aviso_antes', 'Avisar antes')} />
                    <select value={f.aviso_unidad} onChange={(e) => setF({ aviso_unidad: e.target.value })} className={`${CLASE_INPUT} w-auto`} aria-label={t('unidad', 'Unidad')}>
                      {UNIDADES.map((u) => <option key={u} value={u}>{t(`ua_${u.toLowerCase()}`, { MINUTOS: 'minutos', HORAS: 'horas', DIAS: 'días', SEMANAS: 'semanas', MESES: 'meses' }[u])}</option>)}
                    </select>
                    <span className="text-sm font-bold text-on-surface1">{t('antes', 'antes')}</span>
                  </div>
                  {inicioFicha && (
                    <p className="text-sm font-black text-on-surface1">
                      {t('se_avisara', 'Se avisará el {fecha}').replace('{fecha}', momentoAviso(inicioFicha, f.aviso_antelacion, f.aviso_unidad)?.toLocaleString(idioma(), { dateStyle: 'full', timeStyle: 'short' }) || '—')}
                      {f.repeticion !== 'NO' ? ` ${t('y_cada_vez', '(y antes de cada repetición)')}` : ''}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-5">
                    <Casilla etiqueta={t('aviso_web', 'Campana')} checked={f.aviso_web} onChange={(v) => setF({ aviso_web: v })} />
                    <Casilla etiqueta={t('aviso_email', 'Email')} checked={f.aviso_email} onChange={(v) => setF({ aviso_email: v })} />
                    <Casilla etiqueta={t('aviso_semanal', 'Informe semanal')} checked={f.aviso_semanal} onChange={(v) => setF({ aviso_semanal: v })} />
                  </div>
                </>
              )}
            </fieldset>

            <Campo etiqueta={t('descripcion', 'Descripción')}><textarea rows={3} value={f.descripcion} onChange={(e) => setF({ descripcion: e.target.value })} className={CLASE_INPUT} /></Campo>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>{ficha.id && <Button type="button" variant="destructive" leftIcon={<Trash2 size={16} />} onClick={borrar}>{t('borrar', 'Borrar')}</Button>}</div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setFicha(null)}>{t('cancelar', 'Cancelar')}</Button>
                <Button type="submit" loading={guardando}>{t('guardar', 'Guardar')}</Button>
              </div>
            </div>
          </form>
        </VentanaModal>
      )}
    </div>
  );
}
