import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Download, Landmark, ChevronDown } from 'lucide-react';
import { useTmTr } from '../../contexts/TmTrContext';
import { Button, Spinner, Tooltip } from '../../components/UI';
import { apiFetch, authHeaders } from '../../services/api';
import useEmpresaActiva, { esDeLaEmpresa } from '../../hooks/useEmpresaActiva';
import JustificantesTab from './JustificantesTab';

/**
 * Fiscalidad → Extractos bancarios (25/09/2026).
 *
 * Para un año, todas las cuentas de todos los bancos con sus doce meses, y
 * cada mes como un calendario de días:
 *
 *   · azul          el día está en un PDF del banco guardado en R2
 *   · marco blanco  no está en ningún PDF
 *   · discontinuo   todavía no ha pasado
 *   · rojo claro    anterior al primer movimiento de la cuenta
 *
 * Un mes entero cubierto lleva marco verde. **Pulsar un mes abre su fichero**
 * (el PDF mensual del banco, el trimestral impreso o la constancia de que no
 * hubo movimientos). «Descargar» lanza la descarga de las cuentas que tienen
 * meses cerrados sin justificante; los justificantes se guardan al final de
 * cada descarga, como siempre.
 *
 * La verdad son los ficheros de R2, no el historial: ver
 * BACKEND/services/extractosFiscalesService.js.
 */

const AZUL = '#2f7bff';
// Verde fluorescente para los meses completos: el del tema se veía poco sobre
// el fondo oscuro (26/09/2026).
const VERDE = '#39ff14';
// Rojo muy claro para lo que falta: el rojo del tema casi no se veía sobre
// el fondo oscuro (26/09/2026).
const ROJO = '#ff9b9b';
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const pad = (n) => String(n).padStart(2, '0');

// Último día que ya puede tener «Resumen de extracto» de CaixaBank: se emite el
// 7 y se publica a los dos días hábiles (igual que en el backend).
const ultimoDiaResumible = (hoy = new Date(), corte = 7) => {
  const f = new Date(hoy.getFullYear(), hoy.getMonth(), corte - 1);
  if (hoy.getDate() < corte + 3) f.setMonth(f.getMonth() - 1);
  return `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`;
};

const estiloDia = (tipo) => {
  switch (tipo) {
    case 'pdf': return { background: AZUL, border: `1px solid ${AZUL}` };
    // Mismo azul que el PDF: un mes sin movimientos también está justificado
    // (26/09/2026, antes salía más oscuro por la transparencia).
    case 'constancia': return { background: AZUL, border: `1px solid ${AZUL}` };
    case 'futuro': return { border: '1px dashed var(--color-border)', opacity: 0.45 };
    // Antes de abrir la cuenta: amarillo relleno, no marco rojo (26/09/2026,
    // petición del usuario). No hay nada que justificar.
    case 'previo': return { background: AMARILLO, border: `1px solid ${AMARILLO}` };
    case 'hueco': return { visibility: 'hidden' };
    default: return { border: '1px solid var(--color-on-background)' };
  }
};

const Leyenda = ({ estilo, texto }) => (
  <span className="flex items-center gap-2 text-xs font-bold">
    <span className="inline-block h-3.5 w-3.5 rounded-[3px]" style={estilo} />
    {texto}
  </span>
);

// Colores de los días de CaixaBank (26/09/2026, petición del usuario): sin
// marcos. Los resúmenes (del 7 al 6) se distinguen alternando azul y verde:
// el primero del año azul, el segundo verde, el tercero azul… Rojo claro:
// días ya emitidos sin resumen guardado. Blanco: días aún sin resumen.
const ROJO_CLARO = '#ff6b6b'; // más intenso (26/09/2026): #ffc2c2 se veía muy pálido
const AMARILLO = '#ffe14d';
const BLANCO = '#ffffff';

/**
 * Fila de una cuenta: un calendario por mes y cada día coloreado según el
 * periodo de justificante al que pertenece (26/09/2026, petición del usuario:
 * el modelo de CaixaBank para todos los bancos, sin marcos).
 *
 *   · mensual (Bankinter): un periodo por mes natural;
 *   · trimestral: un periodo por trimestre;
 *   · resúmenes (CaixaBank): del día `corte` al `corte - 1` del mes siguiente.
 *
 * Días justificados: azul en los periodos 1.º, 3.º, 5.º… del año y verde en
 * los 2.º, 4.º, 6.º… Rojo claro: periodo cerrado sin PDF. Blanco: periodo aún
 * abierto (pendiente de extracto).
 */
function FilaPeriodos({ c, anio, onAbrir, ultimoDia, tituloMesFn }) {
  const hoy = new Date();
  const hoyIso = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
  const corte = c.corte || 7;
  // Apertura de la cuenta: la da el backend (primer movimiento o primer día
  // del primer justificante, lo que sea antes). 03/10/2026.
  const apertura = c.apertura || c.primera;
  const limite = c.intervalo === 'resumenes' ? ultimoDia(hoy, corte) : null;
  const COMPLETOS = ['pdf', 'sin_movimientos', 'vacio'];
  const pinta = (color) => ({ background: color, border: `1px solid ${color}` });

  const periodoDe = (mes, d) => {
    if (c.intervalo === 'resumenes') return d >= corte ? mes : mes - 1;
    if (c.intervalo === 'mensual') return mes - 1;
    return Math.floor((mes - 1) / 3);            // trimestral (o sin guion)
  };

  const estilo = (m, d) => {
    const fecha = `${anio}-${pad(m.mes)}-${pad(d)}`;
    const k = periodoDe(m.mes, d);
    const color = k % 2 === 0 ? AZUL : VERDE;
    if (m.estado === 'previo') return estiloDia('previo');
    if (c.intervalo === 'resumenes') {
      if ((m.cubiertos || []).includes(d)) return pinta(color);
      if (apertura && fecha < apertura) return estiloDia('previo');
      if (fecha > limite) return pinta(BLANCO);
      return pinta(ROJO_CLARO);
    }
    // Un PDF que cubre el mes manda (el trimestral cubre también los días
    // antes del primer movimiento: ROSA ALEJANDRIA, 1 de enero).
    if (COMPLETOS.includes(m.estado)) return pinta(color);
    if (apertura && fecha < apertura) return estiloDia('previo');
    if (m.estado === 'falta') return pinta(ROJO_CLARO);
    if (m.estado === 'curso' || m.estado === 'futuro' || fecha > hoyIso) return pinta(BLANCO);
    return pinta(ROJO_CLARO);
  };

  return c.meses.map((m) => {
    const hueco = (new Date(anio, m.mes - 1, 1).getDay() + 6) % 7;
    const total = new Date(anio, m.mes, 0).getDate();
    return (
      <button
        key={m.mes} type="button" onClick={() => onAbrir(m)}
        aria-label={tituloMesFn(c, m)} title={tituloMesFn(c, m)}
        className={`grid w-fit justify-self-center grid-cols-[repeat(7,7px)] gap-[2px] rounded-md p-1 transition-transform ${m.fichero ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
      >
        {Array.from({ length: hueco }, (_, i) => <span key={`h${i}`} className="h-[7px] w-[7px]" />)}
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-[7px] w-[7px] rounded-[1.5px]" style={estilo(m, i + 1)} />
        ))}
      </button>
    );
  });
}

const SituacionTab = () => {
  const { t } = useTmTr('Fiscalidad');
  const empresaActiva = useEmpresaActiva();
  const anioActual = new Date().getFullYear();
  // Los años empiezan en 2026, el primero con extractos en ALKIM, y llegan
  // hasta el año en curso: cada enero aparece uno más (25/09/2026).
  const PRIMER_ANIO = 2026;
  const anios = Array.from({ length: Math.max(1, anioActual - PRIMER_ANIO + 1) }, (_, i) => anioActual - i);
  const [anio, setAnio] = useState(anioActual);
  const [banco, setBanco] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [lanzando, setLanzando] = useState(false);
  // La descarga en curso, en una ventana propia: qué cuentas, cómo va cada una
  // y, si el banco lo pide, el código del móvil (26/09/2026). Antes la descarga
  // se lanzaba en segundo plano y un 2FA no tenía dónde teclearse.
  const [proceso, setProceso] = useState(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const respuesta = await apiFetch(`/fiscal/extractos?anio=${anio}`, { headers: authHeaders() });
      // Una respuesta vacía no es JSON: pasa cuando la petición no llega al
      // backend (proxy sin la ruta, servidor sin reiniciar). Se dice así, y no
      // con el «Unexpected end of JSON input» del navegador (25/09/2026).
      const res = await respuesta.json().catch(() => {
        throw new Error(`${t('no_server', 'El servidor no ha contestado')} (${respuesta.status}).`);
      });
      if (!res.success) throw new Error(res.message || res.error?.message || `${t('no_server', 'El servidor no ha contestado')} (${respuesta.status}).`);
      setCuentas(res.data.cuentas || []);
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [anio]);

  const visibles = useMemo(
    () => cuentas.filter((c) => esDeLaEmpresa(c, empresaActiva) && (!banco || c.banco === banco)),
    [cuentas, empresaActiva, banco]
  );
  const bancos = useMemo(() => [...new Set(cuentas.filter((c) => esDeLaEmpresa(c, empresaActiva)).map((c) => c.banco))], [cuentas, empresaActiva]);

  // Un mes cuenta si está cerrado y la cuenta ya existía.
  const cuenta = (c) => {
    const inicio = c.apertura || c.primera;
    const primeraMes = inicio ? inicio.slice(0, 7) : null;
    const validos = c.meses.filter((m) => ['pdf', 'sin_movimientos', 'vacio', 'falta'].includes(m.estado)
      && (!primeraMes || `${anio}-${pad(m.mes)}` >= primeraMes));
    const hechos = validos.filter((m) => m.estado !== 'falta').length;
    return { hechos, cerrados: validos.length, faltan: validos.length - hechos };
  };
  // Las cuentas agrupadas por banco, con lo que falta y qué se puede descargar.
  const gruposBanco = useMemo(() => {
    const mapa = new Map();
    visibles.forEach((c) => {
      if (!mapa.has(c.banco)) mapa.set(c.banco, { banco: c.banco, cuentas: [], faltan: 0, descargables: [], intervalo: c.intervalo });
      const g = mapa.get(c.banco);
      const r = cuenta(c);
      g.cuentas.push(c);
      g.faltan += r.faltan;
      if (r.faltan && c.tiene_secuencia && c.activo) g.descargables.push(c.crid);
      if (!g.intervalo && c.intervalo) g.intervalo = c.intervalo;
    });
    return [...mapa.values()];
  }, [visibles, anio]);

  const totales = visibles.reduce((acc, c) => {
    const r = cuenta(c);
    acc.hechos += r.hechos; acc.faltan += r.faltan; if (r.cerrados && !r.faltan) acc.completas += 1;
    return acc;
  }, { hechos: 0, faltan: 0, completas: 0 });

  const abrir = async (m) => {
    if (!m.fichero) return;
    const ventana = window.open('', '_blank');
    try {
      const respuesta = await apiFetch(`/fiscal/extractos/fichero?clave=${encodeURIComponent(m.fichero.clave)}`, { headers: authHeaders() });
      if (!respuesta.ok) {
        const res = await respuesta.json().catch(() => ({}));
        throw new Error(res.message || t('file_error', 'No se pudo abrir el justificante.'));
      }
      const url = URL.createObjectURL(await respuesta.blob());
      if (ventana) ventana.location.href = url; else window.open(url, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      if (ventana) ventana.close();
      setAviso({ tipo: 'error', texto: error.message });
    }
  };

  /**
   * Sigue la tanda preguntando al backend si ha terminado (26/09/2026). Ya no
   * hay ventana emergente: el contador, el código 2FA y los errores se ven en
   * el panel de la ventana del banco. Aquí solo se avisa al acabar y se
   * repinta la cobertura.
   */
  const seguir = async () => {
    try {
      const respuesta = await apiFetch('/fiscal/extractos/descarga', { headers: authHeaders() });
      const res = await respuesta.json();
      if (res.success && !res.data.enMarcha) {
        const fallidas = (res.data.cuentas || []).filter((c) => c.estado === 'error');
        setProceso(null);
        setAviso(fallidas.length
          ? { tipo: 'error', texto: `${t('process_failed', 'No se ha podido descargar')}: ${fallidas.map((c) => `${c.banco} · ${c.alias}${c.error ? ` (${c.error})` : ''}`).join(' | ')}` }
          : { tipo: 'ok', texto: t('process_done', 'Descarga terminada') });
        cargar();
        return;
      }
    } catch { /* se reintenta */ }
    window.setTimeout(seguir, 3000);
  };

  // Si al entrar ya hay una tanda en marcha (se lanzó antes de recargar), se sigue.
  useEffect(() => {
    apiFetch('/fiscal/extractos/descarga', { headers: authHeaders() })
      .then((r) => r.json())
      .then((res) => { if (res.success && res.data.enMarcha) { setProceso(true); seguir(); } })
      .catch(() => {});
  }, []);

  const descargar = async (crids) => {
    if (!crids?.length) return;
    setLanzando(true);
    try {
      const respuesta = await apiFetch('/fiscal/extractos/descargar', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ anio, crids }),
      });
      const res = await respuesta.json();
      if (!res.success) throw new Error(res.message);
      setAviso({ tipo: 'info', texto: `${res.message} ${t('follow_in_browser', 'Sigue el proceso en la ventana del banco.')}` });
      if (res.data?.cuentas?.length) { setProceso(true); window.setTimeout(seguir, 3000); }
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    } finally {
      setLanzando(false);
    }
  };

  // Todas las cuentas a las que les falta algo y se pueden descargar.
  const todasDescargables = () => gruposBanco.flatMap((g) => g.descargables);

  // Lo que se enseña y se lee al pasar por un mes: solo «Mes de Año.
  // Completo» o «Incompleto», nada más (25/09/2026, petición del usuario).
  const tituloMes = (c, m) => {
    const idioma = document.documentElement.lang || 'es';
    const nombre = new Date(anio, m.mes - 1, 1).toLocaleDateString(idioma, { month: 'long' });
    const mes = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    // El periodo en curso no se puede descargar todavía: si lo anterior está,
    // la cuenta está al día y cuenta como completo (26/09/2026).
    const completo = ['pdf', 'sin_movimientos', 'vacio', 'curso'].includes(m.estado);
    const fecha = t('month_year', '{mes} de {anio}').replace('{mes}', mes).replace('{anio}', anio);
    if (m.estado === 'previo') return `${fecha}. ${t('before_opening', 'Antes de abrir la cuenta')}`;
    return `${fecha}. ${completo ? t('complete', 'Completo') : t('incomplete', 'Incompleto')}`;
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border-2 border-border bg-surface2 p-2.5 text-on-background shadow-sm">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="mb-1 text-2xl font-black leading-none tracking-tight text-on-background">{t('title', 'Extractos bancarios')}</h1>
            <p className="text-[11px] font-bold uppercase tracking-widest">{t('subtitle', 'Justificantes en PDF del banco, por cuenta y por día')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* El año en curso por defecto; en el desplegable, los anteriores
              hasta 2026 (25/09/2026). */}
          <div className="relative">
            <select
              aria-label={t('year', 'Año')}
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="input-base h-[45px] appearance-none rounded-xl border-border bg-background pl-4 pr-10 font-mono text-sm font-bold"
            >
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface2/50" />
          </div>
          <Tooltip texto={t('download_all_hint', 'Descarga, banco por banco, las cuentas con meses cerrados sin PDF')}>
            <Button variant="primary" size="lg" onClick={() => descargar(todasDescargables())} disabled={lanzando || Boolean(proceso) || !totales.faltan} leftIcon={lanzando ? <Spinner size="xs" /> : <Download size={18} />}>
              {t('download_missing', 'Descargar lo que falta')} ({totales.faltan})
            </Button>
          </Tooltip>
        </div>
      </header>

      {aviso && (
        <div className={`flex items-center justify-between rounded-2xl border p-4 font-bold ${aviso.tipo === 'ok' ? 'border-success bg-success text-on-success' : aviso.tipo === 'info' ? 'border-2 border-border bg-surface2 text-on-background' : 'border-destructive bg-destructive text-on-destructive'}`}>
          <span className="flex items-center gap-2">{aviso.tipo === 'info' && proceso && <Spinner size="xs" />}{aviso.texto}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label={t('close', 'Cerrar')} className="rounded-full px-2 hover:bg-surface-hover">×</button>
        </div>
      )}

      {/* Resumen y leyenda */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_1.6fr]">
        {[
          [t('accounts', 'Cuentas'), visibles.length],
          [t('months_pdf', 'Meses en PDF'), totales.hechos],
          [t('months_missing', 'Meses que faltan'), totales.faltan],
          [t('accounts_complete', 'Cuentas completas'), totales.completas],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-2xl border-2 border-border bg-surface2 p-4">
            <div className="text-[11px] font-black uppercase tracking-widest">{rotulo}</div>
            <div className="mt-1 font-mono text-3xl font-bold text-on-background">{valor}</div>
          </div>
        ))}
        <div className="col-span-2 flex flex-col gap-2 rounded-2xl border-2 border-border bg-surface2 p-4 lg:col-span-1">
          <div className="text-[11px] font-black uppercase tracking-widest">{t('legend', 'Cada cuadro es un día')}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Leyenda estilo={{ background: AZUL, border: `1px solid ${AZUL}` }} texto={t('legend_period_odd', 'Justificado (periodos 1.º, 3.º, 5.º…)')} />
            <Leyenda estilo={{ background: VERDE, border: `1px solid ${VERDE}` }} texto={t('legend_period_even', 'Justificado (periodos 2.º, 4.º, 6.º…)')} />
            <Leyenda estilo={{ background: ROJO_CLARO, border: `1px solid ${ROJO_CLARO}` }} texto={t('legend_missing', 'Sin PDF')} />
            <Leyenda estilo={{ background: BLANCO, border: `1px solid ${BLANCO}` }} texto={t('legend_pending', 'Pendiente de extracto')} />
            <Leyenda estilo={estiloDia('previo')} texto={t('legend_before', 'Antes del primer movimiento')} />
          </div>
        </div>
      </div>

      {/* Filtro por banco: todos, o uno del desplegable (26/09/2026). */}
      <div className="flex items-center gap-3">
        <label htmlFor="filtro-banco" className="text-[11px] font-black uppercase tracking-widest">{t('bank', 'Banco')}</label>
        <div className="relative">
          <select
            id="filtro-banco"
            value={banco || ''}
            onChange={(e) => setBanco(e.target.value || null)}
            className="input-base h-[45px] min-w-[240px] appearance-none rounded-xl border-border bg-background pl-4 pr-10 text-sm font-bold"
          >
            <option value="">{t('all', 'Todos')}</option>
            {bancos.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface2/50" />
        </div>
      </div>

      {/* Bancos → cuentas × meses */}
      <div className="overflow-x-auto rounded-3xl border-2 border-border bg-surface2">
        <div className="min-w-[1180px]">
          <div className="grid grid-cols-[200px_repeat(12,minmax(0,1fr))_110px] items-end gap-x-2 border-b-2 border-border px-4 py-3 text-[11px] font-black uppercase tracking-widest">
            <span>{t('account', 'Cuenta')}</span>
            {MESES_CORTOS.map((m) => <span key={m} className="text-center">{m}</span>)}
            <span className="text-right">{t('months', 'Meses')}</span>
          </div>

          {cargando && <div className="flex justify-center p-10"><Spinner size="lg" /></div>}
          {!cargando && !visibles.length && (
            <p className="p-10 text-center text-sm font-bold">{t('no_accounts', 'No hay cuentas para esta empresa.')}</p>
          )}

          {!cargando && gruposBanco.map((g) => (
            <div key={g.banco} className="border-b-2 border-border">
              {/* Cabecera del banco: nombre, si está completo y su descarga. */}
              <div className="flex items-center justify-between gap-4 bg-surface1 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Landmark size={18} />
                  <span className="text-base font-black text-on-background">{g.banco}</span>
                  <span
                    className="rounded-md border-2 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider"
                    style={{ borderColor: g.faltan ? ROJO : VERDE, color: g.faltan ? ROJO : VERDE }}
                  >
                    {g.faltan ? t('incomplete', 'Incompleto') : t('complete', 'Completo')}
                  </span>
                  <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    {g.intervalo === 'mensual' && t('interval_monthly', 'Mensual · 12/año')}
                    {g.intervalo === 'trimestral' && t('interval_quarterly', 'Trimestral · 4/año')}
                    {g.intervalo === 'resumenes' && t('interval_7to6', 'Mensual del 7 al 6 · 13/año')}
                    {!g.intervalo && t('interval_manual', 'Sin guion · a mano')}
                  </span>
                </div>
                {g.faltan > 0 && (
                  <Tooltip texto={g.descargables.length ? t('download_bank_hint', 'Descargar los justificantes que faltan de este banco') : t('no_sequence', 'Este banco no tiene guion de descarga')}>
                    <Button size="sm" variant="primary" disabled={lanzando || Boolean(proceso) || !g.descargables.length} onClick={() => descargar(g.descargables)} leftIcon={<Download size={15} />}>
                      {t('download_bank', 'Descargar justificantes')} ({g.faltan})
                    </Button>
                  </Tooltip>
                )}
              </div>

              {g.cuentas.map((c) => {
                const r = cuenta(c);
                return (
                  <div key={c.crid} className="grid grid-cols-[200px_repeat(12,minmax(0,1fr))_110px] items-center gap-x-2 border-t border-border/40 px-4 py-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-bold text-on-background">{c.alias}</span>
                      {c.resumenes && (
                        <span className="text-[11px] font-bold" title={t('summaries_hint', 'Resúmenes del 7 al 6 que tocan este año (13 en un año entero)')}>
                          {t('summaries', 'Resúmenes')}: {c.resumenes.tenemos} / {c.resumenes.necesarios}
                        </span>
                      )}
                      <span className="font-mono text-[11px]">···· {c.ultimos4}</span>
                    </div>
                    <FilaPeriodos
                      c={c} anio={anio} onAbrir={abrir}
                      ultimoDia={ultimoDiaResumible} tituloMesFn={tituloMes}
                    />
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-base font-bold text-on-background">{r.hechos} / {r.cerrados}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs font-bold">
        <Landmark size={14} />
        {t('footer', 'Los justificantes se guardan al terminar cada descarga. Un mes en curso no tiene extracto hasta que termina.')}
      </p>
    </div>
  );
};

/**
 * Dos pestañas (03/10/2026, petición del usuario):
 *   · «Situación»     el calendario de cobertura de siempre;
 *   · «Justificantes» la lista de ficheros guardados, para verlos y eliminarlos.
 * La pestaña elegida se recuerda en este navegador.
 */
const PESTANAS = ['situacion', 'justificantes'];
const ExtractosBancariosPage = () => {
  const { t } = useTmTr('Fiscalidad');
  const anioActual = new Date().getFullYear();
  const anios = Array.from({ length: Math.max(1, anioActual - 2026 + 1) }, (_, i) => anioActual - i);
  const [pestana, setPestana] = useState(() => {
    try { const p = localStorage.getItem('fiscal.extractos.pestana'); return PESTANAS.includes(p) ? p : 'situacion'; } catch { return 'situacion'; }
  });
  const elegir = (p) => {
    setPestana(p);
    try { localStorage.setItem('fiscal.extractos.pestana', p); } catch { /* sin almacenamiento */ }
  };
  const rotulos = { situacion: t('tab_status', 'Situación'), justificantes: t('tab_receipts', 'Justificantes') };
  return (
    <div className="space-y-5 p-6">
      {/* Pestañas del tema: clases tab-bar / tab-base / tab-active /
          tab-content de styles/utilities.css (03/10/2026). */}
      <div>
      <div role="tablist" className="tab-bar">
        {PESTANAS.map((p) => (
          <button
            key={p} type="button" role="tab" aria-selected={pestana === p} onClick={() => elegir(p)}
            className={`tab-base ${pestana === p ? 'tab-active' : ''}`}
          >
            {rotulos[p]}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="tab-content p-5">
        {pestana === 'situacion' ? <SituacionTab /> : <JustificantesTab anios={anios} />}
      </div>
      </div>
    </div>
  );
};

export default ExtractosBancariosPage;
