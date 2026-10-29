import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Badge, Spinner, Toggle } from '../../../components/UI';
import Modal from '../../../components/UI/Modal';
import {
  ArrowLeft, CalendarClock, CalendarOff, Clock, AlertCircle, CheckCircle, XCircle, Play, Download, Check, X, FileWarning,
} from 'lucide-react';
import { abrirPantallaRemota } from './PantallaRemota';
import { apiFetch, authHeaders } from '../../../services/api';
import { useTmTr } from '../../../contexts/TmTrContext';
import useEmpresaActiva, { esDeLaEmpresa } from '../../../hooks/useEmpresaActiva';
import {
  formatSaldoConFecha, formatProximaEjecucion,
} from '../../../utils/format';

/**
 * Tesorería → Descargas programadas.
 *
 * Muestra de un vistazo qué cuentas se descargan solas cada día y a qué hora,
 * y permite dar de alta o de baja cualquiera de ellas sin reiniciar el
 * backend: el planificador relee esta configuración cada minuto.
 */
const ProgramacionPage = () => {
  const { t } = useTmTr('Programacion');
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState('');
  const empresaActiva = useEmpresaActiva();
  // Hora común de las autodescargas (26/09/2026): un parámetro de la página,
  // no una hora por cuenta. Y la tanda de «Descargar ahora».
  const [config, setConfig] = useState(null);
  const [horaEditada, setHoraEditada] = useState(null);
  const [tanda, setTanda] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [lanzando, setLanzando] = useState(false);
  // Justificantes que pediría «Descargar ahora» (24/10/2026): si hay, se
  // avisa con una ventana antes de lanzar, porque piden atender el banco.
  const [prevision, setPrevision] = useState(null);
  const [avisoJustificantes, setAvisoJustificantes] = useState(false);

  const fetchPrevision = async () => {
    try {
      const response = await apiFetch('/crawler/schedule/run/prevision', { headers: authHeaders() });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setPrevision(res.data);
    } catch {
      setPrevision({ cuentas: 0, justificantes: [], error: true });
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await apiFetch('/crawler/schedule/config', { headers: authHeaders() });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setConfig(res.data);
      if (res.data.tanda?.enMarcha) { setTanda(res.data.tanda); seguirTanda(); }
    } catch (err) {
      setError(err.message);
    }
  };

  // «Ver proceso» (27/09/2026): las descargas abren un navegador donde se ve
  // lo que hacen. En el servidor es la pantalla remota, en una ventana aparte.
  const cambiarVerProceso = async () => {
    const nuevo = !(config?.verProceso ?? true);
    try {
      const response = await apiFetch('/crawler/schedule/config', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ verProceso: nuevo }),
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setConfig((c) => ({ ...c, verProceso: res.data.verProceso }));
      setAviso({ tipo: 'ok', texto: res.message });
    } catch (err) {
      setError(err.message);
    }
  };

  // «Descarga automática» SÍ/NO (24/10/2026). Con NO, al llegar la hora no se
  // descarga nada; «Descargar ahora» funciona igual en los dos casos.
  const cambiarAutomatica = async () => {
    const nuevo = !(config?.automatica ?? true);
    try {
      const response = await apiFetch('/crawler/schedule/config', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ automatica: nuevo }),
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setConfig((c) => ({ ...c, ...res.data }));
      setAviso({ tipo: 'ok', texto: res.message });
    } catch (err) {
      setError(err.message);
    }
  };

  const guardarHora = async (hora) => {
    try {
      const response = await apiFetch('/crawler/schedule/config', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ hora }),
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setConfig((c) => ({ ...c, ...res.data }));
      setHoraEditada(null);
      setAviso({ tipo: 'ok', texto: res.message });
      fetchSchedules();
    } catch (err) {
      setError(err.message);
    }
  };

  // Mientras dura la tanda se pregunta cada 3 s; al acabar se refresca la tabla.
  const seguirTanda = async () => {
    try {
      const response = await apiFetch('/crawler/schedule/run', { headers: authHeaders() });
      const res = await response.json();
      if (res.success) {
        setTanda(res.data);
        if (!res.data.enMarcha) {
          const fallidas = (res.data.cuentas || []).filter((c) => c.estado === 'error');
          setAviso(fallidas.length
            ? { tipo: 'error', texto: `${t('run_failed', 'No se han podido descargar')}: ${fallidas.map((c) => `${c.banco} · ${c.alias}`).join(' | ')}` }
            : { tipo: 'ok', texto: t('run_done', 'Descargas terminadas.') });
          fetchSchedules();
          fetchPrevision();
          return;
        }
      }
    } catch { /* se reintenta */ }
    window.setTimeout(seguirTanda, 3000);
  };

  // Clic en «Descargar ahora»: si va a pedir justificantes, primero el aviso.
  const pulsarDescargarAhora = () => {
    if (prevision?.justificantes?.length) { setAvisoJustificantes(true); return; }
    descargarAhora();
  };

  const descargarAhora = async () => {
    setAvisoJustificantes(false);
    // En el servidor, con «Ver proceso», se abre ya la ventana del navegador
    // (aprovechando el clic: si no, el navegador la bloquea).
    if (import.meta.env.PROD && (config?.verProceso ?? true)) abrirPantallaRemota();
    setLanzando(true);
    setAviso(null);
    try {
      const response = await apiFetch('/crawler/schedule/run', { method: 'POST', headers: authHeaders() });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setTanda(res.data);
      setAviso({ tipo: 'info', texto: res.message });
      window.setTimeout(seguirTanda, 3000);
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setLanzando(false);
    }
  };

  const fetchSchedules = async () => {
    setError('');
    try {
      const response = await apiFetch('/crawler/schedule', { headers: authHeaders() });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      setRows(res.data);
    } catch (err) {
      setError(err.message || t('error_load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchedules(); fetchConfig(); fetchPrevision(); }, []);

  const saveSchedule = async (crid, cambios) => {
    setSaving((prev) => ({ ...prev, [crid]: true }));
    setError('');
    try {
      const response = await apiFetch(`/crawler/schedule/${crid}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      });
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      await fetchSchedules();
      fetchPrevision();
    } catch (err) {
      setError(err.message || t('error_save'));
    } finally {
      setSaving((prev) => ({ ...prev, [crid]: false }));
    }
  };

  const estadoIcono = (estado) => {
    if (estado === 'success') return <CheckCircle size={15} className="text-success" />;
    if (estado === 'error') return <XCircle size={15} className="text-destructive-text" />;
    if (estado === 'pending') return <Clock size={15} className="text-info animate-pulse" />;
    return null;
  };

  if (loading) return <div className="flex justify-center p-10"><Spinner size="lg" /></div>;

  // Solo las cuentas de la empresa elegida arriba (las que no tienen empresa
  // asignada se ven siempre, para poder llegar a ellas y corregirlas).
  const visibles = rows.filter((row) => esDeLaEmpresa(row, empresaActiva));
  const programadas = visibles.filter((row) => row.programado);
  // Primero las que hoy no se han descargado bien (✗) y después las buenas
  // (✓). Dentro de cada grupo, el orden de siempre (24/10/2026).
  const ordenadas = [...visibles].sort((a, b) => Number(a.descargada_hoy) - Number(b.descargada_hoy));

  return (
    <div className="p-6">
      <header className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => {
          // Se vuelve con el banco desde el que se entró. Ver ExtractosPage.
          const banco = parametros.get('banco');
          navigate(banco ? `/tesoreria/extractos?banco=${encodeURIComponent(banco)}` : '/tesoreria/extractos');
        }}>
          <ArrowLeft size={20} />
        </Button>
        <div className="rounded-2xl border-2 border-border bg-surface2 p-2.5 text-on-background shadow-sm">
          <CalendarClock size={24} />
        </div>
        <div>
          <h1 className="mb-1 text-2xl font-black leading-none tracking-tight text-on-background">
            {t('title')}
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface2">
            {t('subtitle')}
          </p>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-surface2 px-5 py-4 text-sm shadow-sm">
        <CalendarOff size={18} className="shrink-0 text-on-surface2" aria-hidden="true" />
        <span>
          <strong>{t('weekend_notice_strong')}</strong> {t('weekend_notice_text')}
          {' '}{t('run_order_hint', 'Se descargan una detrás de otra, banco por banco: primero los movimientos y después, si falta alguno, el justificante fiscal.')}
        </span>
      </div>

      {error && (
        <div
          className="mb-4 rounded-2xl border border-destructive bg-destructive-bg px-5 py-4 text-sm font-bold text-destructive-text"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ── Configuración, en una sola línea (27/09/2026). De izquierda a
          derecha: Descargar ahora, Ver proceso y el resto. El texto del orden de
          descarga está arriba, con el aviso de fines de semana. ── */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-border bg-surface2 px-5 py-4 shadow-sm lg:flex-nowrap">
        {/* Interruptor general, el primero (24/10/2026). */}
        <Toggle
          className="shrink-0"
          checked={config?.automatica ?? true}
          onChange={cambiarAutomatica}
          disabled={!config}
          label={t('auto_download', 'Descarga automática')}
          title={t('auto_download_hint', 'SÍ: cada día laborable, a la hora indicada, se descargan solas las cuentas programadas. NO: no se descarga nada solo. «Descargar ahora» funciona igual en los dos casos.')}
        />
        <Button
          variant="primary"
          className="shrink-0"
          disabled={lanzando || Boolean(tanda?.enMarcha) || programadas.length === 0 || !prevision}
          onClick={pulsarDescargarAhora}
          leftIcon={lanzando || tanda?.enMarcha || !prevision ? <Spinner size="xs" /> : <Download size={16} />}
        >
          {t('download_now', 'Descargar ahora')}
        </Button>
        <Toggle
          className="shrink-0"
          checked={config?.verProceso ?? true}
          onChange={cambiarVerProceso}
          label={t('see_process', 'Ver proceso')}
          title={t('see_process_hint', 'Con él, las descargas abren un navegador donde se ve todo lo que hacen. Sin él, van sin navegador visible.')}
        />
        <label className="flex shrink-0 items-center gap-2 text-sm font-black text-on-background">
          {t('common_time', 'Hora de las descargas automáticas')}
          <input
            type="time"
            value={horaEditada ?? config?.hora ?? '09:30'}
            onChange={(e) => setHoraEditada(e.target.value)}
            onBlur={() => { if (horaEditada && horaEditada !== config?.hora) guardarHora(horaEditada); }}
            className="input-base w-[6.5rem] rounded-xl border-border bg-surface1 px-2 py-1.5 text-sm font-bold"
          />
        </label>
        <div className="flex shrink-0 items-center gap-2 text-sm">
          <span className="font-black text-on-background">{t('col_next_run', 'Próxima ejecución')}:</span>
          <span className="font-bold capitalize">
            {config && config.automatica === false
              ? t('auto_off', 'Desactivada')
              : config?.proxima_ejecucion ? formatProximaEjecucion(config.proxima_ejecucion) : '—'}
          </span>
        </div>
      </div>

      {aviso && (
        <div
          className={`mb-4 flex items-center justify-between rounded-2xl border p-4 text-sm font-bold ${aviso.tipo === 'ok' ? 'border-success bg-success text-on-success' : aviso.tipo === 'info' ? 'border-2 border-border bg-surface2 text-on-background' : 'border-destructive bg-destructive text-on-destructive'}`}
          role="status"
        >
          <span>{aviso.texto}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label={t('close', 'Cerrar')} className="rounded-full px-2">×</button>
        </div>
      )}

      {tanda?.enMarcha && (
        <ul className="mb-4 flex flex-wrap gap-2 text-xs font-bold">
          {tanda.cuentas.map((c) => (
            <li key={c.crid} className="flex items-center gap-1 rounded-xl border border-border px-2 py-1">
              {c.estado === 'descargando' ? <Spinner size="xs" /> : c.estado === 'ok' ? <CheckCircle size={13} className="text-success" /> : c.estado === 'error' ? <XCircle size={13} className="text-destructive-text" /> : <Clock size={13} />}
              {c.banco} · {c.alias}
            </li>
          ))}
        </ul>
      )}

      <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-on-surface2">
        <CalendarClock size={16} aria-hidden="true" />
        {programadas.length === 0
          ? t('none_scheduled')
          : t('summary_scheduled')
            .replace('{n}', programadas.length)
            .replace('{total}', visibles.length)}
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface2 shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-table-header text-on-table-header">
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_actions')}</th>
                <th className="px-3 py-4 text-center text-[11px] font-black uppercase tracking-widest">{t('col_today', 'Hoy')}</th>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_account')}</th>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_scheduled')}</th>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_overlap')}</th>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_balance')}</th>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_last_attempt')}</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((row, i) => {
                const saldo = formatSaldoConFecha(row.saldo_ultima_consulta, row.fecha_ultima_consulta);
                const sinCredencial = !row.credencial_estado || row.credencial_estado === 'revocado';
                return (
                  <tr key={row.crid} className={`text-sm transition-colors duration-100 hover:bg-table-row-hover hover:text-on-table-row-hover ${i % 2 === 1 ? 'bg-table-row-striped text-on-table-row-striped' : 'bg-table-row text-on-table-row'}`}>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="xs"
                          variant={row.programado ? 'ghost' : 'primary'}
                          disabled={Boolean(saving[row.crid]) || !row.activo || (sinCredencial && !row.programado)}
                          title={sinCredencial && !row.programado
                            ? t('credential_required')
                            : undefined}
                          onClick={() => saveSchedule(row.crid, {
                            programado: !row.programado,
                            ...(row.programado ? {} : { hora_programada: config?.hora || '09:30' }),
                          })}
                        >
                          {saving[row.crid]
                            ? <Spinner size="sm" />
                            : row.programado
                              ? <><CalendarOff size={14} /> {t('remove')}</>
                              : <><CalendarClock size={14} /> {t('add')}</>}
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          title={t('download_now')}
                          onClick={() => navigate(`/tesoreria/extractos?crid=${row.crid}`)}
                        >
                          <Play size={14} />
                        </Button>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center">
                      {row.descargada_hoy ? (
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-success text-white"
                          title={t('today_ok', 'Descargada bien hoy')}
                          aria-label={t('today_ok', 'Descargada bien hoy')}
                        >
                          <Check size={18} strokeWidth={3} />
                        </span>
                      ) : (
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-destructive text-white"
                          title={t('today_ko', 'Hoy no se ha descargado bien')}
                          aria-label={t('today_ko', 'Hoy no se ha descargado bien')}
                        >
                          <X size={18} strokeWidth={3} />
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black tracking-tight">{row.cuenta_alias}</span>
                        <span className="text-xs font-bold">{row.banco_nombre}</span>
                        <span className="font-mono text-[10px]">{row.iban}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {row.programado
                        ? <Badge variant="success">{t('yes')}</Badge>
                        : <Badge variant="neutral">{t('no')}</Badge>}
                      {!row.activo && <div className="mt-1"><Badge variant="warning">{t('spider_inactive')}</Badge></div>}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <span className="font-bold" title={t('overlap_title')}>
                        {t('overlap_days').replace('{n}', row.dias_solape)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm font-black">
                      {saldo || <span className="font-sans text-xs font-bold uppercase tracking-widest">{t('no_data')}</span>}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {estadoIcono(row.ultimo_estado)}
                        {row.ultimo_intento
                          ? <span className="font-bold">{new Date(row.ultimo_intento).toLocaleString('es-ES')}</span>
                          : <span className="text-xs font-bold uppercase tracking-widest">{t('never')}</span>}
                      </div>
                      {row.ultimo_error_consecutivo > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-xs font-bold text-warning">
                          <AlertCircle size={13} /> {t('consecutive_failures').replace('{n}', row.ultimo_error_consecutivo)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-16 text-center">
                    <CalendarClock size={40} className="mx-auto mb-3" />
                    <p className="text-xs font-bold uppercase tracking-widest">
                      {t('empty_accounts')}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={avisoJustificantes}
        onClose={() => setAvisoJustificantes(false)}
        title={t('just_title', 'Esta descarga pedirá justificantes')}
        size="md"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setAvisoJustificantes(false)}>{t('cancel', 'Cancelar')}</Button>
            <Button variant="primary" leftIcon={<Download size={16} />} onClick={descargarAhora}>{t('just_continue', 'Descargar igualmente')}</Button>
          </>
        )}
      >
        <div className="flex gap-3 text-sm">
          <FileWarning size={22} className="shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="mb-3 font-bold">
              {t('just_text', 'Además de los movimientos, se van a descargar justificantes de periodos ya cerrados. Normalmente necesitan que estés delante para atender el banco (verificación, pantallas…).')}
            </p>
            <ul className="space-y-1">
              {(prevision?.justificantes || []).map((j) => (
                <li key={j.crid}>
                  <span className="font-black">{j.banco} · {j.alias}</span>: {j.periodos.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProgramacionPage;
