import React, { useEffect, useState } from 'react';
import { X, FileText, Download as DownloadIcon } from 'lucide-react';
import { Button, Spinner } from '../../../components/UI';
import { apiFetch, authHeaders } from '../../../services/api';
import { formatFechaCorta, formatImporte } from '../../../utils/format';
import { useTmTr } from '../../../contexts/TmTrContext';

/**
 * Ver el documento que bajó el banco.
 *
 * Hasta ahora la pantalla de extractos contaba lo que había pasado con cada
 * descarga —movimientos leídos, saldo, si cuadraba— pero el fichero en sí no se
 * podía abrir desde ninguna parte. Y el fichero es lo que vale: es lo que emitió
 * el banco, lo que se le enseña a Hacienda, y lo único a lo que se puede acudir
 * cuando un número no cuadra.
 *
 * Dos modos, porque son dos documentos distintos:
 *   · `ultimo`  — el `.q43` de las últimas descargas, el que se acaba de
 *     importar. Se conservan los cinco últimos de cada cuenta.
 *   · `mensual` — los justificantes de meses cerrados, archivados para siempre.
 *
 * Se muestra el texto **tal cual**, sin interpretar: un Norma 43 es un fichero
 * de líneas de 80 caracteres, y quien lo abre aquí lo abre para ver el original
 * —el resumen ya está en la tabla y en el historial—. Por eso va en
 * monoespaciado y sin ajuste de línea: así las columnas caen donde deben.
 */
const VisorExtractos = ({ modo, onClose }) => {
  const { t } = useTmTr('VisorExtractos');
  const trimestral = modo === 'trimestral';
  const [lista, setLista] = useState(null);
  const [error, setError] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [documento, setDocumento] = useState(null);
  const [cargando, setCargando] = useState(false);

  const abrir = async (item) => {
    setSeleccionado(item.id);
    setDocumento(null);
    setError(null);
    setCargando(true);
    try {
      const respuesta = await apiFetch(`/crawler/extractos/ver?id=${encodeURIComponent(item.id)}`, { headers: authHeaders() });
      const res = await respuesta.json();
      if (!res.success) throw new Error(res.message || t('open_error'));
      setDocumento(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const respuesta = await apiFetch(`/crawler/extractos?tipo=${trimestral ? 'trimestral' : 'ultimo'}`, { headers: authHeaders() });
        const res = await respuesta.json();
        if (!vigente) return;
        if (!res.success) throw new Error(res.message || t('list_error'));
        setLista(res.data);
        // Con un solo documento, enseñarlo directamente: obligar a un clic para
        // ver lo único que hay es una pantalla intermedia sin contenido.
        if (res.data.length === 1) abrir(res.data[0]);
      } catch (err) {
        if (vigente) setError(err.message);
      }
    })();
    return () => { vigente = false; };
  }, [modo]);

  /**
   * Guardar una copia.
   *
   * El fichero ya está en memoria, así que el enlace se crea aquí en vez de
   * pedirlo otra vez: una descarga lanzada por el navegador no lleva la cabecera
   * del token y el servidor la rechazaría.
   */
  const guardar = () => {
    if (!documento) return;
    // El original tal cual: PDF, Excel (binario, en base64) o el texto del .q43.
    const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob = documento.pdf
      ? new Blob([bytes(documento.pdf)], { type: 'application/pdf' })
      : documento.archivo
        ? new Blob([bytes(documento.archivo)], { type: documento.tipo })
        : new Blob([documento.texto], { type: 'text/plain;charset=iso-8859-1' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = documento.nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-modal-backdrop/80 p-4"
      role="dialog" aria-modal="true" aria-labelledby="visor-title"
    >
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-3xl border border-border bg-surface2 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border bg-surface1 p-2 text-on-surface1">
              <FileText size={22} />
            </div>
            <div>
              <h2 id="visor-title" className="text-xl font-black tracking-tight text-on-background">
                {trimestral ? t('title_quarterly') : t('title_last')}
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface2">
                {trimestral ? t('subtitle_quarterly') : t('subtitle_last')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {documento && (
              <Button size="sm" variant="secondary" onClick={guardar}>
                <DownloadIcon size={15} /> {t('save_copy')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose} aria-label={t('close')}>
              <X size={16} />
            </Button>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-xl border border-destructive bg-surface1 px-4 py-2 text-sm text-destructive-text">{error}</p>
        )}

        {lista === null && !error && <div className="flex justify-center p-10"><Spinner size="lg" /></div>}

        {lista !== null && lista.length === 0 && (
          <div className="px-5 py-16 text-center">
            <FileText size={40} className="mx-auto mb-3 text-on-surface2" />
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface2">
              {trimestral ? t('empty_quarterly') : t('empty_last')}
            </p>
          </div>
        )}

        {lista !== null && lista.length > 0 && (
          <div className="flex min-h-0 flex-1 gap-4">
            {/* El listado sigue los criterios de la aplicación (ver
                docs/CRITERIOS_UI_LISTADOS.md): panel `surface2` con borde, la
                cabecera un tono por debajo, y **los colores de fila los pone el
                tema** —`table-row`, `-hover`, `-selected` con sus `on-`—. Dentro
                de la celda no se pinta ningún color: si se pintara, ganaría
                sobre el de la fila y el texto no cambiaría al pasar por encima
                ni al seleccionar. */}
            <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-3xl border border-border bg-surface2">
              <div className="overflow-y-auto custom-scrollbar">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-table-header text-on-table-header">
                      <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">
                        {trimestral ? t('col_account_quarter') : t('col_account')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((item) => (
                      <tr
                        key={item.id}
                        tabIndex={0}
                        onClick={() => abrir(item)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(item); } }}
                        className={`cursor-pointer border-b border-border transition-all duration-200 last:border-0 ${
                          seleccionado === item.id
                            ? 'bg-table-row-selected text-on-table-row-selected'
                            : 'bg-table-row text-on-table-row hover:bg-table-row-hover hover:text-on-table-row-hover'
                        }`}
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-black tracking-tight">
                            {item.cuenta}
                            {/* El banco detrás de la cuenta: dos cuentas se pueden
                                llamar igual en bancos distintos (26/09/2026). */}
                            {(item.abreviatura || item.banco) && <span> - {item.abreviatura || item.banco}</span>}
                          </p>
                          <p className="text-xs font-bold">
                            {item.etiqueta}{item.fecha ? ` · ${formatFechaCorta(item.fecha)}` : ''}
                          </p>
                          <p className="truncate font-mono text-[10px]">{item.nombre}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="min-w-0 flex-1 overflow-auto rounded-3xl border border-border bg-surface1 custom-scrollbar">
              {cargando && <div className="flex justify-center p-10"><Spinner size="lg" /></div>}
              {!cargando && !documento && (
                <div className="px-5 py-16 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface2">
                    {t('choose_statement')}
                  </p>
                </div>
              )}
              {!cargando && documento?.pdf && (
                <iframe
                  title={documento.nombre}
                  src={`data:application/pdf;base64,${documento.pdf}`}
                  className="h-full min-h-[60vh] w-full"
                />
              )}
              {/* Un Excel se enseña como tabla, leído con el mismo lector que la
                  importación (26/09/2026). Antes salía el binario como texto. */}
              {!cargando && documento?.tabla && (
                documento.tabla.error ? (
                  <p className="p-6 text-sm font-bold">{t('table_error', 'No se ha podido leer el Excel')}: {documento.tabla.error}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-surface2 text-[11px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-3 py-2 text-left">{t('col_date', 'Fecha')}</th>
                        <th className="px-3 py-2 text-left">{t('col_value_date', 'F. valor')}</th>
                        <th className="px-3 py-2 text-left">{t('col_concept', 'Concepto')}</th>
                        <th className="px-3 py-2 text-right">{t('col_amount', 'Importe')}</th>
                        <th className="px-3 py-2 text-right">{t('col_balance', 'Saldo')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documento.tabla.movimientos.map((m, i) => (
                        <tr key={i} className="border-t border-border/40">
                          <td className="px-3 py-1.5 font-mono">{formatFechaCorta(m.fecha)}</td>
                          <td className="px-3 py-1.5 font-mono">{formatFechaCorta(m.fechaValor)}</td>
                          <td className="px-3 py-1.5">{m.concepto}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{formatImporte(m.importe)}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{formatImporte(m.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
              {!cargando && documento && !documento.pdf && !documento.tabla && (
                <pre className="whitespace-pre p-4 font-mono text-[11px] leading-relaxed text-on-surface1">{documento.texto}</pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisorExtractos;
