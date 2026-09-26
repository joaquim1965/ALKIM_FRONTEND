import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button, Spinner } from '../../../components/UI';
import { apiFetch, authHeaders } from '../../../services/api';
import { useTmTr } from '../../../contexts/TmTrContext';

/**
 * Comparar pasos (26/09/2026).
 *
 * La última descarga buena de la cuenta (referencia) frente al último intento
 * que falló, paso a paso. Cada foto lleva un recuadro rojo sobre lo que el
 * robot iba a pulsar o rellenar. El primer paso donde se separan se abre solo
 * y sale marcado en rojo, con las diferencias dichas en palabras.
 *
 * Las fotos las hace `services/fotosGuion.js` en cada descarga.
 */
const VERDE = '#39ff14';
const ROJO = '#ff9b9b';

const Foto = ({ sfid, titulo, t }) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    let creada = null;
    setUrl(null); setError(false);
    if (!sfid) return undefined;
    apiFetch(`/crawler/fotos/imagen/${sfid}`, { headers: authHeaders() })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((b) => { creada = URL.createObjectURL(b); if (vivo) setUrl(creada); })
      .catch(() => { if (vivo) setError(true); });
    return () => { vivo = false; if (creada) URL.revokeObjectURL(creada); };
  }, [sfid]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="text-xs font-black uppercase tracking-widest">{titulo}</span>
      <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border-2 border-border bg-background">
        {!sfid && <span className="p-6 text-center text-sm font-bold">{t('no_photo', 'Este paso no tiene foto aquí.')}</span>}
        {sfid && !url && !error && <Spinner />}
        {error && <span className="p-6 text-sm font-bold" style={{ color: ROJO }}>{t('photo_gone', 'La foto ya no está.')}</span>}
        {url && (
          <a href={url} target="_blank" rel="noreferrer" title={t('open_full', 'Abrir a tamaño completo')}>
            <img src={url} alt={titulo} className="block h-auto w-full" />
          </a>
        )}
      </div>
    </div>
  );
};

const Ficha = ({ datos, t }) => {
  if (!datos) return null;
  return (
    <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-xs">
      <dt className="font-black">{t('clicked', 'Pulsó')}</dt><dd className="break-words">{datos.pulsado ? `«${datos.pulsado}» (${datos.etiqueta || '?'})` : '—'}</dd>
      <dt className="font-black">{t('found_by', 'Encontrado por')}</dt><dd className="break-words">{datos.localizador || '—'}</dd>
      <dt className="font-black">{t('page', 'Página')}</dt><dd className="break-all">{datos.url || '—'}</dd>
      {datos.error && (<><dt className="font-black">{t('note', 'Nota')}</dt><dd className="break-words">{datos.error}</dd></>)}
    </dl>
  );
};

const ComparadorPasos = ({ cuenta, onClose }) => {
  const { t } = useTmTr('ComparadorPasos');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [elegido, setElegido] = useState(null);

  useEffect(() => {
    apiFetch(`/crawler/fotos/${cuenta.crid}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) throw new Error(res.message);
        setDatos(res.data);
        setElegido(res.data.primeraDiferencia || res.data.pasos[0]?.clave || null);
      })
      .catch((e) => setError(e.message));
  }, [cuenta.crid]);

  const paso = datos?.pasos.find((p) => p.clave === elegido);
  const fecha = (f) => (f ? new Date(f).toLocaleString('es-ES') : '—');

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-modal-backdrop/80 p-3" role="dialog" aria-modal="true" aria-labelledby="comparar-titulo">
      <div className="flex w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface2 text-on-background shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b-2 border-border p-4">
          <div>
            <h2 id="comparar-titulo" className="text-xl font-black">{t('title', 'Comparar pasos')} · {cuenta.banco_nombre} · {cuenta.cuenta_alias}</h2>
            {datos && (
              <p className="mt-1 text-sm font-bold">
                <span style={{ color: VERDE }}>{t('reference', 'Última buena')}: {fecha(datos.referencia?.fecha)}</span>
                {'  ·  '}
                <span style={{ color: datos.fallo ? ROJO : undefined }}>{t('last_failure', 'Último fallo')}: {datos.fallo ? fecha(datos.fallo.fecha) : t('none', 'ninguno')}</span>
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('close', 'Cerrar')}><X size={20} /></Button>
        </header>

        {!datos && !error && <div className="flex flex-1 items-center justify-center"><Spinner /></div>}
        {error && <p className="p-6 font-bold" style={{ color: ROJO }}>{error}</p>}
        {datos && !datos.pasos.length && (
          <p className="p-6 font-bold">{t('empty', 'Todavía no hay fotos de esta cuenta. Se guardan en la próxima descarga.')}</p>
        )}

        {datos && datos.pasos.length > 0 && (
          <div className="flex min-h-0 flex-1">
            <nav className="w-[280px] shrink-0 overflow-y-auto border-r-2 border-border p-2" aria-label={t('steps', 'Pasos')}>
              {datos.pasos.map((p, i) => {
                const mal = p.diferencias.length > 0;
                const activo = p.clave === elegido;
                return (
                  <button
                    key={p.clave} type="button" onClick={() => setElegido(p.clave)}
                    className={`mb-1 flex w-full items-start gap-2 rounded-lg border-2 px-2 py-2 text-left text-sm font-bold ${activo ? 'bg-background' : ''}`}
                    style={{ borderColor: mal ? ROJO : activo ? 'var(--color-border)' : 'transparent', color: mal ? ROJO : undefined }}
                  >
                    <span className="w-6 shrink-0 font-mono">{i + 1}</span>
                    <span className="min-w-0 flex-1 break-words">{p.descripcion}</span>
                    {mal ? <AlertTriangle size={16} className="shrink-0" /> : (datos.fallo && <CheckCircle size={16} className="shrink-0" style={{ color: VERDE }} />)}
                  </button>
                );
              })}
            </nav>

            {paso && (
              <section className="min-w-0 flex-1 overflow-y-auto p-4">
                <h3 className="text-lg font-black" style={{ color: paso.diferencias.length ? ROJO : undefined }}>{paso.descripcion}</h3>
                {paso.diferencias.length > 0 && (
                  <ul className="mt-2 space-y-1 rounded-xl border-2 p-3 text-sm font-bold" style={{ borderColor: ROJO, color: ROJO }}>
                    {paso.diferencias.map((d) => <li key={d}>• {d}</li>)}
                  </ul>
                )}
                {!paso.diferencias.length && datos.fallo && (
                  <p className="mt-2 text-sm font-bold" style={{ color: VERDE }}>{t('same', 'Sin diferencias en este paso.')}</p>
                )}
                <div className="mt-4 flex flex-col gap-4 xl:flex-row">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Foto sfid={paso.referencia?.sfid} titulo={t('reference', 'Última buena')} t={t} />
                    <Ficha datos={paso.referencia} t={t} />
                  </div>
                  {datos.fallo && (
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Foto sfid={paso.fallo?.sfid} titulo={t('last_failure', 'Último fallo')} t={t} />
                      <Ficha datos={paso.fallo} t={t} />
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparadorPasos;
