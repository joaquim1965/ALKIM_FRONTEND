import React, { useState, useEffect } from 'react';
import { ListChecks, X, Trash2, RotateCcw, CalendarRange } from 'lucide-react';
import { Button, Spinner, Tooltip } from '../../../components/UI';
import { apiFetch, authHeaders } from '../../../services/api';
import { useTmTr } from '../../../contexts/TmTrContext';

/**
 * Editor de una secuencia grabada.
 *
 * Existe porque una grabación torcida costaba una vuelta entera al banco, con
 * su posible 2FA. La primera de Caixa d'Enginyers estaba a tres borrados de ser
 * válida: sobraban los rangos de fecha de la exploración, un "Consultar" de más
 * y la exportación a Excel.
 *
 * Dos cosas se arreglan aquí, que son las dos que fallaron:
 *
 *   1. Quitar pasos sobrantes.
 *   2. Decir qué paso lleva {{fecha_desde}} y cuál {{fecha_hasta}}. Al grabar se
 *      adjudican a los dos primeros campos con pinta de fecha, y con
 *      exploración de por medio eso acierta poco: la primera vez
 *      {{fecha_hasta}} cayó en un paso con el año escrito mal.
 *
 * Los pasos no se borran al marcarlos: se tachan. Nada se escribe en disco
 * hasta pulsar "Guardar cambios", así que un clic de más se deshace mirando.
 */
const ICONO_TIPO = { clic: '•', rellenar: '✎', descargar: '↓', seleccionar: '▾' };

const EditorSecuencia = ({ crid, banco, onCerrar, onGuardado }) => {
  const { t } = useTmTr('EditorSecuencia');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [marcados, setMarcados] = useState({ acceso: [], descarga: [] });
  const [fechas, setFechas] = useState({ desde: null, hasta: null });

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const respuesta = await apiFetch(`/crawler/secuencia/${crid}`, { headers: authHeaders() });
        const res = await respuesta.json();
        if (!vivo) return;
        if (!res.success) throw new Error(res.message);
        setDatos(res.data);
        const conVariable = (v) => res.data.descarga.find((p) => p.variable === v);
        setFechas({
          desde: conVariable('fecha_desde')?.indice ?? null,
          hasta: conVariable('fecha_hasta')?.indice ?? null,
        });
      } catch (err) {
        if (vivo) setError(err.message);
      }
    })();
    return () => { vivo = false; };
  }, [crid]);

  const alternar = (bloque, indice) => setMarcados((previo) => ({
    ...previo,
    [bloque]: previo[bloque].includes(indice)
      ? previo[bloque].filter((i) => i !== indice)
      : [...previo[bloque], indice],
  }));

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      // Los índices de fecha que ve el usuario son los de la lista completa; el
      // backend borra primero y reasigna después, así que hay que recalcularlos
      // sobre la lista ya recortada.
      const sobreviven = datos.descarga
        .map((paso) => paso.indice)
        .filter((i) => !marcados.descarga.includes(i));
      const reubicar = (indice) => (indice === null ? null : sobreviven.indexOf(indice));

      const respuesta = await apiFetch(`/crawler/secuencia/${crid}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eliminarAcceso: marcados.acceso,
          eliminarDescarga: marcados.descarga,
          fechas: { desde: reubicar(fechas.desde), hasta: reubicar(fechas.hasta) },
        }),
      });
      const res = await respuesta.json();
      if (!res.success) throw new Error(res.message);
      onGuardado?.(res.data);
      onCerrar();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  const listar = (bloque, pasos) => (
    <ol className="divide-y divide-border">
      {pasos.map((paso) => {
        const fuera = marcados[bloque].includes(paso.indice);
        const esDesde = bloque === 'descarga' && fechas.desde === paso.indice;
        const esHasta = bloque === 'descarga' && fechas.hasta === paso.indice;
        return (
          <li
            key={paso.indice}
            className={`flex items-center gap-3 px-4 py-2.5 transition-all duration-200
              ${fuera ? 'bg-surface1' : 'hover:bg-surface1'}`}
          >
            <span className="w-6 shrink-0 text-right font-mono text-xs font-bold text-on-surface2">
              {paso.indice + 1}
            </span>
            <span className="w-4 shrink-0 text-center text-on-surface2">
              {ICONO_TIPO[paso.tipo] || '·'}
            </span>
            <span className={`min-w-0 flex-1 truncate text-sm font-bold
              ${fuera ? 'text-on-surface2 line-through' : 'text-on-background'}`}
            >
              {paso.descripcion || paso.tipo}
              {paso.secreto && (
                <em className="ml-2 not-italic text-[11px] font-black uppercase tracking-widest text-on-surface2">
                  {t('password_tag')}
                </em>
              )}
              {(esDesde || esHasta) && (
                <em className="ml-2 not-italic text-[11px] font-black uppercase tracking-widest text-primary">
                  {esDesde ? t('date_from_tag') : t('date_to_tag')}
                </em>
              )}
            </span>

            {paso.esFecha && bloque === 'descarga' && !fuera && (
              <span className="flex shrink-0 gap-1">
                <Button
                  size="sm" variant={esDesde ? 'primary' : 'outline'}
                  aria-label={t('mark_date_from')}
                  onClick={() => setFechas((f) => ({ ...f, desde: esDesde ? null : paso.indice }))}
                >
                  {t('from')}
                </Button>
                <Button
                  size="sm" variant={esHasta ? 'primary' : 'outline'}
                  aria-label={t('mark_date_to')}
                  onClick={() => setFechas((f) => ({ ...f, hasta: esHasta ? null : paso.indice }))}
                >
                  {t('to')}
                </Button>
              </span>
            )}

            <Tooltip texto={fuera ? t('restore_step') : t('remove_step')}>
              <Button
                size="sm" variant={fuera ? 'outline' : 'ghost'}
                aria-label={fuera ? t('restore_step') : t('remove_step')}
                onClick={() => alternar(bloque, paso.indice)}
              >
                {fuera ? <RotateCcw size={15} /> : <Trash2 size={15} />}
              </Button>
            </Tooltip>
          </li>
        );
      })}
    </ol>
  );

  const cabecera = (titulo, cuantos) => (
    <h3 className="flex items-center gap-2 border-b border-border bg-surface1 px-4 py-3
      text-[11px] font-black uppercase tracking-widest text-on-surface2"
    >
      {titulo}
      <span className="font-mono normal-case tracking-normal">({cuantos})</span>
    </h3>
  );

  const totalQuitados = marcados.acceso.length + marcados.descarga.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden
        rounded-3xl border border-border bg-surface2 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border-2 border-border bg-surface2 p-2.5 text-on-background shadow-sm">
              <ListChecks size={24} />
            </div>
            <div>
              <h2 className="mb-1 text-xl font-black leading-none tracking-tight text-on-background">
                {t('title')}
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface2">
                {banco}
              </p>
            </div>
          </div>
          <Tooltip texto={t('close_without_saving')}>
            <Button size="sm" variant="ghost" aria-label={t('close_without_saving')} onClick={onCerrar}>
              <X size={18} />
            </Button>
          </Tooltip>
        </header>

        {!datos && !error && (
          <div className="flex items-center justify-center gap-3 px-6 py-16">
            <Spinner size="md" />
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface2">
              {t('loading_script')}
            </span>
          </div>
        )}

        {error && (
          <p className="px-6 py-6 text-sm font-bold text-destructive-text">{error}</p>
        )}

        {datos && (
          <>
            <div className="flex items-start gap-3 border-b border-border px-6 py-4">
              <CalendarRange size={18} className="mt-0.5 shrink-0 text-on-surface2" />
              <p className="text-sm font-bold text-on-surface1">
                {t('dates_hint').split(/(\{desde\}|\{hasta\})/).map((trozo, i) => {
                  if (trozo === '{desde}') return <strong key={i} className="font-black">{t('from')}</strong>;
                  if (trozo === '{hasta}') return <strong key={i} className="font-black">{t('to')}</strong>;
                  return <React.Fragment key={i}>{trozo}</React.Fragment>;
                })}
                {datos.formatoFecha && (
                  <span className="ml-1 text-on-surface2">
                    {' '}{t('detected_format')} <code className="font-mono">{datos.formatoFecha}</code>.
                  </span>
                )}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              {datos.acceso.length > 0 && (
                <section>
                  {cabecera(t('section_login'), datos.acceso.length)}
                  {listar('acceso', datos.acceso)}
                </section>
              )}
              <section>
                {cabecera(t('section_download'), datos.descarga.length)}
                {listar('descarga', datos.descarga)}
              </section>
            </div>

            <footer className="flex items-center justify-between gap-4 border-t border-border px-6 py-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-on-surface2">
                {totalQuitados === 0
                  ? t('no_changes')
                  : t(totalQuitados === 1 ? 'steps_removed_one' : 'steps_removed_many')
                    .replace('{n}', totalQuitados)}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onCerrar} disabled={guardando}>{t('cancel')}</Button>
                <Button variant="primary" onClick={guardar} loading={guardando} loadingText={t('saving')}>
                  {t('save_changes')}
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default EditorSecuencia;
