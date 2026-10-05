import React, { useMemo } from 'react';
import { RefreshCw, Settings } from 'lucide-react';
import {
  eur, eurExacto, dias, fechaCorta, sinActualizar, zonaDe, anchoDe, valorDe, ZONAS,
} from './utilesSaldo';

/**
 * Un panel de Saldo (26/08/2026).
 *
 * El mismo componente sirve para los tres —Saldo, Gastos e Ingresos—: lo único
 * que cambia es qué número enseña y cómo se mide la barra. En Saldo la barra
 * corre sobre las cuatro zonas y la raya negra marca el mínimo; en Gastos e
 * Ingresos no hay mínimos que valgan, así que se compara cada cuenta con la
 * mayor del periodo.
 *
 * Los colores salen del tema. Los de estado —rojo, ámbar, verde, azul— son los
 * únicos que se escriben, y se escriben con los tokens del tema, porque ahí el
 * color ES el dato (ver docs/CRITERIOS_UI_LISTADOS.md).
 */

const COLOR = {
  rojo:   { fondo: 'bg-destructive', barra: 'bg-destructive-border', zona: 'bg-destructive/25' },
  ambar:  { fondo: 'bg-warning',     barra: 'bg-warning-border',     zona: 'bg-warning/25' },
  verde:  { fondo: 'bg-success',     barra: 'bg-success-border',     zona: 'bg-success/20' },
  marino: { fondo: 'bg-info',        barra: 'bg-info-border',        zona: 'bg-info/25' },
  gris:   { fondo: 'bg-surface2',    barra: 'bg-surface-hover',      zona: 'bg-surface2' },
};

export default function PanelSaldo({
  vista = 'saldo', onVista, datos, t, cargando, error,
  onCuenta, onActualizar, onConfigurar, actualizando, editor,
}) {
  const { grupos = [], config, hoy } = datos || {};
  const limites = config?.limites || { rojo: 0, ambar: 0, alto: 0 };
  const diasAtraso = config?.dias_atraso ?? 2;
  const meses = (t('meses') || '').split(',');

  const todas = useMemo(() => grupos.flatMap((g) => g.cuentas), [grupos]);
  const activas = todas.filter((c) => c.activa);
  const conSaldo = activas.filter((c) => c.saldo != null);

  // El techo de la escala en Gastos e Ingresos: la cuenta que más movió.
  const techo = useMemo(() => {
    if (vista === 'saldo') return Math.max(...conSaldo.map((c) => c.saldo), 1);
    const valores = activas.map((c) => valorDe(c, vista)).filter((v) => v != null);
    return Math.max(...valores, 1);
  }, [activas, conSaldo, vista]);

  const atrasadas = activas.filter((c) => sinActualizar(c, hoy, diasAtraso));
  const masVieja = [...activas].filter((c) => c.visto)
    .sort((a, b) => a.visto.localeCompare(b.visto))[0];

  const avisos = [
    { clase: 'gris',   figura: '⟳', que: t('sin_actualizar'), lista: atrasadas },
    { clase: 'rojo',   figura: '■', que: t('bajo_minimo'),
      lista: conSaldo.filter((c) => c.saldo < limites.rojo) },
    { clase: 'ambar',  figura: '▲', que: t('justas'),
      lista: conSaldo.filter((c) => c.saldo >= limites.rojo && c.saldo < limites.ambar) },
    { clase: 'verde',  figura: '●', que: t('normales'),
      lista: conSaldo.filter((c) => c.saldo >= limites.ambar && c.saldo < limites.alto) },
    { clase: 'marino', figura: '◆', que: t('sobresaldo'),
      lista: conSaldo.filter((c) => c.saldo >= limites.alto) },
  ].filter((a) => a.lista.length > 0);   // un aviso que dice «0» no avisa de nada

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface1 text-on-surface1 shadow-shadow">
      <header className="flex items-center gap-2 px-3 pb-1 pt-2">
        {onVista ? (
          <select
            value={vista} onChange={(e) => onVista(e.target.value)}
            aria-label={t('saldo')}
            className="flex-1 cursor-pointer rounded-lg border-2 border-border bg-surface2 px-2 py-1 text-base font-black tracking-tight text-on-surface2 outline-none focus:border-primary"
          >
            <option value="saldo">{t('saldo')}</option>
            <option value="gastos">{t('gastos')}</option>
            <option value="ingresos">{t('ingresos')}</option>
            <option value="grupos">{t('grupos')}</option>
          </select>
        ) : (
          <h2 className="flex-1 text-base font-black tracking-tight">{t(vista)}</h2>
        )}
        {onActualizar && (
          <button
            type="button" onClick={onActualizar} title={t('actualizar')} aria-label={t('actualizar')}
            disabled={actualizando}
            className={`grid h-8 w-8 place-items-center rounded-lg border-2 transition-colors ${
              atrasadas.length
                ? 'border-destructive-border bg-destructive text-on-destructive'
                : 'border-border bg-surface2 text-on-surface2 hover:border-primary'}`}
          >
            <RefreshCw size={15} className={actualizando ? 'animate-spin' : ''} />
          </button>
        )}
        {onConfigurar && (
          <button
            type="button" onClick={onConfigurar} title={t('configurar')} aria-label={t('configurar')}
            className="grid h-8 w-8 place-items-center rounded-lg border-2 border-warning-border bg-warning text-on-warning transition-colors hover:border-primary"
          >
            <Settings size={15} />
          </button>
        )}
      </header>

      {/* Las dos fechas: la de la cuenta más desactualizada y la de hoy. */}
      <div className="flex gap-3 border-b-2 border-border px-3 pb-2 font-mono text-xs font-bold">
        <span className="text-on-surface2">
          {t('fecha')}:<b className={atrasadas.length ? 'text-warning-border' : 'text-on-surface1'}>
            {fechaCorta(masVieja?.visto, meses)}</b>
        </span>
        <span className="text-on-surface2">
          {t('actual')}:<b className="text-on-surface1">{fechaCorta(hoy, meses)}</b>
        </span>
      </div>

      {avisos.length > 0 && (
        <div className="grid gap-1 border-b-2 border-border px-3 py-2"
             style={{ gridTemplateColumns: `repeat(${avisos.length}, minmax(0, 1fr))` }}>
          {avisos.map((a) => (
            <div key={a.clase}
                 title={`${a.lista.length} ${a.lista.length === 1 ? t('cuenta') : t('cuentas')} ${a.que}: ${a.lista.map((c) => c.clave).join(', ')}`}
                 className={`flex flex-col items-center justify-center rounded-lg px-1 py-1 text-on-primary ${COLOR[a.clase].fondo}`}>
              <span aria-hidden="true" className="text-[10px] leading-none opacity-90">{a.figura}</span>
              <span className="font-mono text-base font-black leading-tight">{a.lista.length}</span>
            </div>
          ))}
        </div>
      )}

      {vista === 'grupos' && editor}

      {vista !== 'grupos' && (
      <div className="px-2 pb-2">
        {error && <p className="p-6 text-center text-sm font-bold text-destructive-text">{error}</p>}
        {!error && cargando && <p className="p-6 text-center text-sm text-on-surface2">…</p>}
        {!error && !cargando && !todas.length && (
          <p className="p-6 text-center text-sm text-on-surface2">{t('sin_cuentas')}</p>
        )}

        {grupos.map((grupo) => {
          const suyas = grupo.cuentas.filter((c) => c.activa || config?.mostrar_desactivadas);
          if (!suyas.length) return null;
          const total = grupo.cuentas
            .filter((c) => c.activa && valorDe(c, vista) != null)
            .reduce((suma, c) => suma + valorDe(c, vista), 0);

          // El orden es el del grupo, el que pone el usuario con las flechas del editor de Grupos
          // (26/09/2026). Antes las atrasadas subían solas arriba y el orden
          // cambiaba cada día; ahora se distinguen por el ⟳ y el color.
          const ordenadas = suyas;

          return (
            <div key={grupo.nombre}>
              <div className="sticky top-0 z-10 mt-1 flex items-center gap-2 border-y-2 border-border bg-surface2 px-1 py-1">
                <span className="text-xs font-black uppercase tracking-widest text-success-border">
                  {grupo.nombre}
                </span>
                <span className="text-[10px] font-bold text-on-surface2">{suyas.length}</span>
                <span className="ml-auto font-mono text-sm font-black">{eur(total)}</span>
              </div>

              {ordenadas.map((cuenta) => (
                <FilaCuenta
                  key={cuenta.clave} cuenta={cuenta} vista={vista} t={t}
                  limites={limites} techo={techo} hoy={hoy} diasAtraso={diasAtraso}
                  onCuenta={onCuenta}
                />
              ))}
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}

function FilaCuenta({ cuenta, vista, t, limites, techo, hoy, diasAtraso, onCuenta }) {
  // Desactivada: solo el nombre, en gris, con su círculo rojo. Ni barra ni
  // importe: no hay nada que vigilar en una cuenta apagada.
  if (!cuenta.activa) {
    return (
      <div className="flex items-center gap-2 px-1 py-1 text-xs font-bold text-on-surface2">
        <span aria-hidden="true" className="h-[1.15em] w-[1.15em] shrink-0 rounded-full bg-destructive-border" />
        <span className="truncate">{cuenta.clave}</span>
        <span className="ml-auto rounded-md bg-surface2 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-on-surface2">
          {t('desactivada')}
        </span>
      </div>
    );
  }

  const vieja = sinActualizar(cuenta, hoy, diasAtraso);
  const valor = valorDe(cuenta, vista);
  const zona = zonaDe(cuenta, limites);
  const clase = vista === 'saldo' ? zona.clase : (vista === 'ingresos' ? 'verde' : 'rojo');
  const ancho = valor == null ? 0
    : (vista === 'saldo' ? anchoDe(valor, limites, techo)
      : Math.max(valor ? 3 : 0, (valor / techo) * 100));
  const cuantos = dias(cuenta.visto, hoy);

  return (
    <button
      type="button" onClick={() => onCuenta && onCuenta(cuenta)}
      title={`${cuenta.clave} · ${valor == null ? t('sin_datos') : eurExacto(valor, cuenta.moneda)}${
        cuantos != null ? ` · ${cuantos} d` : ''}`}
      className={`grid w-full grid-cols-[minmax(84px,104px)_1fr_74px] items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-surface2 hover:text-on-surface2 ${
        // La fila entera con el color de su contador (■ rojo, ▲ ámbar, ● verde,
        // ◆ azul), para ver de un vistazo qué cuenta cumple cada condición
        // (26/09/2026). Solo en Saldo: en Gastos e Ingresos no hay zonas.
        vista === 'saldo' && valor != null ? COLOR[zona.clase].zona : ''}`}
    >
      <span className={`truncate text-xs font-black ${vieja ? 'text-warning-border' : ''}`}>
        {cuenta.clave}{vieja ? ' ⟳' : ''}
      </span>

      <span className="relative flex h-4 overflow-hidden rounded border border-border">
        {vista === 'saldo' ? (
          <>
            <span className={`h-full ${COLOR.rojo.zona}`}   style={{ width: `${ZONAS.rojo}%` }} />
            <span className={`h-full ${COLOR.ambar.zona}`}  style={{ width: `${ZONAS.ambar - ZONAS.rojo}%` }} />
            <span className={`h-full ${COLOR.verde.zona}`}  style={{ width: `${ZONAS.alto - ZONAS.ambar}%` }} />
            <span className={`h-full ${COLOR.marino.zona}`} style={{ width: `${100 - ZONAS.alto}%` }} />
          </>
        ) : (
          <span className="h-full w-full bg-surface2" />
        )}
        {valor != null && (
          <span className={`absolute inset-y-0.5 left-0 rounded-r ${COLOR[clase].barra}`}
                style={{ width: `${ancho.toFixed(1)}%`, minWidth: '3px' }} />
        )}
        {vista === 'saldo' && (
          <>
            {/* La raya del mínimo, a la misma altura en todas las cuentas. */}
            <span className="absolute -inset-y-px z-10 w-[3px] rounded-sm bg-on-surface1"
                  style={{ left: `${ZONAS.rojo}%` }} />
            <span className="absolute -inset-y-px z-10 w-[2px] rounded-sm bg-on-surface1 opacity-50"
                  style={{ left: `${ZONAS.alto}%` }} />
          </>
        )}
      </span>

      <span className="text-right font-mono text-xs font-black">
        {valor == null ? '—' : eur(valor)}
      </span>
    </button>
  );
}
