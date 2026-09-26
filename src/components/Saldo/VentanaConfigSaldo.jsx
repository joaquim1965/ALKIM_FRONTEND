import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/**
 * La configuración del panel de Saldo es un fichero (26/08/2026).
 *
 * Idea del usuario, y es mejor que una pantalla de formularios por una razón
 * concreta: **el orden es el orden del fichero**. Los grupos se ven en el orden
 * en que están escritos y las cuentas dentro de cada grupo también, así que
 * mover una cuenta de grupo es cortar una línea y pegarla. Con controles habría
 * que inventar flechas, arrastres y una columna `orden` en la base de datos.
 *
 * Los tres límites y el periodo tienen además su casilla arriba: son lo que se
 * toca a menudo y no hay por qué bucear en el JSON para cambiar un número. Lo
 * que se escribe arriba se refleja abajo, porque el fichero es la verdad.
 */
export default function VentanaConfigSaldo({ config, t, onCerrar, onGuardar, guardando }) {
  const [texto, setTexto] = useState('');
  const [dicho, setDicho] = useState(config);
  const [fallo, setFallo] = useState('');

  useEffect(() => {
    setDicho(config);
    setTexto(JSON.stringify(config, null, 2));
  }, [config]);

  /** Lo que se escribe en el fichero manda, si se entiende. */
  const alEscribir = (nuevo) => {
    setTexto(nuevo);
    try {
      const leido = JSON.parse(nuevo);
      setDicho(leido);
      setFallo('');
    } catch (error) {
      setFallo(error.message);
    }
  };

  /** Lo que se escribe arriba se refleja abajo, para que no se contradigan. */
  const cambiar = (campo, valor) => {
    const nuevo = campo === 'limites'
      ? { ...dicho, limites: { ...dicho.limites, ...valor } }
      : { ...dicho, [campo]: valor };
    setDicho(nuevo);
    setTexto(JSON.stringify(nuevo, null, 2));
    setFallo('');
  };

  const numero = (valor) => Math.max(0, Number(valor) || 0);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
      role="dialog" aria-modal="true" aria-label={t('configurar')}
    >
      <div className="flex h-[min(640px,100%)] w-[min(700px,100%)] flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface1 text-on-surface1 shadow-shadow">
        <header className="flex items-center gap-2 border-b-2 border-border px-4 py-3">
          <h2 className="flex-1 text-lg font-black">{t('configurar')}</h2>
          <button type="button" onClick={onCerrar} title={t('cerrar')} aria-label={t('cerrar')}
                  className="grid h-8 w-8 place-items-center rounded-lg border-2 border-border bg-surface2 hover:border-primary">
            <X size={16} />
          </button>
        </header>

        {/* Los tres límites, en una fila */}
        <div className="flex flex-wrap gap-3 border-b-2 border-border px-4 py-3">
          {[
            { id: 'rojo',  et: t('limite_rojo'),  color: 'bg-destructive-border' },
            { id: 'ambar', et: t('limite_ambar'), color: 'bg-warning-border' },
            { id: 'alto',  et: t('limite_alto'),  color: 'bg-info-border' },
          ].map((campo) => (
            <label key={campo.id} className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-black">
              <span className="flex items-center gap-2 truncate">
                <i className={`h-3 w-3 shrink-0 rounded ${campo.color}`} />{campo.et}
              </span>
              <input
                type="number" min="0" step="100"
                value={dicho?.limites?.[campo.id] ?? 0}
                onChange={(e) => cambiar('limites', { [campo.id]: numero(e.target.value) })}
                className="w-full rounded-lg border-2 border-border bg-surface2 px-2 py-1.5 text-right font-mono text-base font-black text-on-surface2 outline-none focus:border-primary"
              />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 border-b-2 border-border px-4 py-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-black">
            {t('periodo')}
            <select
              value={dicho?.periodo || 'mes'}
              onChange={(e) => cambiar('periodo', e.target.value)}
              className="w-full rounded-lg border-2 border-border bg-surface2 px-2 py-1.5 text-sm font-bold text-on-surface2 outline-none focus:border-primary"
            >
              <option value="mes">{t('periodo_mes')}</option>
              <option value="mes_anterior">{t('periodo_mes_anterior')}</option>
              <option value="30dias">{t('periodo_30dias')}</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-black">
            {t('dias_atraso')}
            <input
              type="number" min="0" step="1"
              value={dicho?.dias_atraso ?? 2}
              onChange={(e) => cambiar('dias_atraso', numero(e.target.value))}
              className="w-full rounded-lg border-2 border-border bg-surface2 px-2 py-1.5 text-right font-mono text-base font-black text-on-surface2 outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="border-b-2 border-border px-4 py-2 font-mono text-xs text-on-surface2">
          data/situacion.json — {t('fichero')}
        </div>
        <textarea
          value={texto} onChange={(e) => alEscribir(e.target.value)} spellCheck={false}
          aria-label="data/situacion.json"
          className="flex-1 resize-none bg-surface1 px-4 py-3 font-mono text-sm leading-relaxed text-on-surface1 outline-none focus:bg-surface2"
        />

        <footer className="flex items-center gap-3 border-t-2 border-border px-4 py-3">
          <span className={`flex-1 text-sm font-black ${fallo ? 'text-destructive-text' : 'text-on-surface2'}`}>
            {fallo ? `${t('sin_guardar')} — ${fallo}` : ''}
          </span>
          <button
            type="button" disabled={Boolean(fallo) || guardando}
            onClick={() => onGuardar(dicho)}
            className="rounded-lg border-2 border-primary-border bg-primary px-4 py-2 text-sm font-black text-on-primary disabled:opacity-40"
          >
            {t('guardar')}
          </button>
        </footer>
      </div>
    </div>
  );
}
