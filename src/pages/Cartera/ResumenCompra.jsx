/**
 * ResumenCompra — resumen de la compra, encima de la pestaña «Compra» (05/10/2026).
 *
 * De un vistazo, como el primer bloque de la hoja de la renta: precio, gastos de
 * adquisición, mejoras, valores catastrales y base de amortización; por titular
 * (según su %) y en total. Todo sale de Titulares, Compra, Mejoras y Datos; no
 * se escribe nada aquí. El año decide qué mejoras son «anteriores» y «del año».
 *
 * API: GET /propiedades/:id/resumen-compra?anyo=AAAA
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { formatImporte } from '../../utils/format';
import { CLASE_INPUT, TablaTema, TD, SinDato } from '../../components/UI/TemaPagina';

const euros = (v) => (v == null ? null : formatImporte(v, ''));
const fechaEs = (f) => (f ? f.split('-').reverse().join('/') : null);
const CONCEPTOS = [
  ['INMOBILIARIA', 'Inmobiliaria / intermediación'], ['TASACION', 'Tasación'], ['IMPUESTO', 'Impuestos (ITP, IVA + AJD)'],
  ['NOTARIA', 'Notaría'], ['REGISTRO', 'Registro de la Propiedad'], ['GESTORIA', 'Gestoría'], ['OTROS', 'Otros'],
];

export default function ResumenCompra({ propiedadId, version = 0, puedeEscribir = false }) {
  const { t } = useTmTr('ResumenCompra');
  const actual = new Date().getFullYear();
  const [anyo, setAnyo] = useState(actual - 1);   // la renta que se presenta es la del año anterior
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [precio, setPrecio] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [verTitulares, setVerTitulares] = useState(false);   // columnas por titular ocultas hasta pulsar la flecha del Total

  const cargar = useCallback(async () => {
    setError('');
    try {
      const r = await apiFetch(`/propiedades/${propiedadId}/resumen-compra?anyo=${anyo}`, { headers: authHeaders() });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.message || `Error ${r.status}`);
      setD(b.data);
      setPrecio(b.data.precio_compra == null ? '' : String(b.data.precio_compra));
    } catch (e) { setError(e.message); }
  }, [propiedadId, anyo]);
  useEffect(() => { cargar(); }, [cargar, version]);

  // Precio pagado al vendedor: total; el servidor lo reparte a los titulares por su %.
  const guardarPrecio = async () => {
    setGuardando(true); setAviso(''); setError('');
    try {
      const r = await apiFetch(`/propiedades/${propiedadId}/precio-compra`, {
        method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio_compra: precio === '' ? null : precio }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.errors?.[0]?.message || b.message || `Error ${r.status}`);
      setAviso(t('precio_guardado', 'Precio guardado y repartido entre {n} titular(es).').replace('{n}', b.data?.titulares ?? 0));
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };

  if (error && !d) return <p className="text-sm font-bold">{error}</p>;
  if (!d) return <p className="text-xs font-bold uppercase tracking-widest">{t('cargando', 'Cargando…')}</p>;

  // Total primero; los titulares, detrás y solo si se despliegan con la flecha «>».
  const cols = [{ nombre: t('total', 'Total'), total: true }, ...(verTitulares ? d.titulares : [])];
  const valor = (o, k) => (k.startsWith('gastos.') ? o.gastos[k.slice(7)] : o[k]);
  const T = d.totales;

  // [casilla, texto, clave, tipo] — tipo: 'euros' (defecto), 'pct', 'titulo', 'fuerte'
  const filas = [
    ['', t('adquisicion', 'Adquisición'), null, 'titulo'],
    ['', t('precio', 'Precio pagado al vendedor'), 'precio'],
    ['', t('gastos_adq', 'Gastos de adquisición'), null, 'titulo'],
    ...CONCEPTOS.map(([k, n]) => ['', t(`concepto_${k}`, n), `gastos.${k}`]),
    ['', t('total_gastos', 'Total gastos de adquisición'), 'total_gastos', 'fuerte'],
    ['', t('importe_adq', 'Importe de adquisición (precio + gastos)'), 'importe_adquisicion', 'fuerte'],
    ['', t('mejoras', 'Mejoras'), null, 'titulo'],
    ['0128', t('mejoras_anteriores', 'Mejoras de años anteriores'), 'mejoras_anteriores'],
    ['0129', t('mejoras_anyo', 'Mejoras del año {anyo}').replace('{anyo}', anyo), 'mejoras_anyo'],
    ['', t('coste_total', 'Coste total de adquisición'), 'coste_total', 'fuerte'],
    ['', `${t('catastro', 'Valores catastrales')}${d.anyo_valor_catastral ? ` (IBI ${d.anyo_valor_catastral})` : ''}${d.catastral_revisado ? ` · ${t('revisado', 'revisado')}` : ''}`, null, 'titulo'],
    ['', t('suelo', 'Valor del suelo'), 'valor_catastral_suelo'],
    ['0124', t('construccion', 'Valor catastral de la construcción'), 'valor_catastral_construccion'],
    ['0123', t('vc_total', 'Valor catastral total'), 'valor_catastral'],
    ['0125', t('pct', '% construcción / total'), 'pct_construccion', 'pct'],
    ['', t('amortizacion', 'Amortización del inmueble'), null, 'titulo'],
    ['', t('valor_construccion', 'Valor de la construcción (importe × % construcción)'), 'valor_construccion'],
    ['', t('base', 'Base de amortización (+ mejoras)'), 'base_amortizacion', 'fuerte'],
    ['0131', t('amortizacion_anual', 'Amortización anual (3 %)'), 'amortizacion_anual', 'fuerte'],
  ];

  return (
    <section className="space-y-3 rounded-2xl border border-border p-4" aria-label={t('titulo', 'Resumen de la compra')}>
      <div className="flex flex-wrap items-end gap-4">
        <h3 className="text-lg font-black tracking-tight">{t('titulo', 'Resumen de la compra')}</h3>
        <span className="text-sm font-bold">{t('fecha_adq', 'Fecha de adquisición')}: <span className="font-mono">{fechaEs(d.fecha_adquisicion) || '—'}</span></span>
        <label className="ml-auto flex items-center gap-2 text-sm font-bold">
          {t('anyo_renta', 'Año de la renta')}
          <select value={anyo} onChange={(e) => setAnyo(Number(e.target.value))} className={`${CLASE_INPUT} w-auto`}>
            {Array.from({ length: 8 }, (_, i) => actual - i).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-black uppercase tracking-widest">
          {t('precio_total', 'Precio pagado al vendedor (total, €)')}
          <input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} disabled={!puedeEscribir} className={`${CLASE_INPUT} w-48 font-mono`} />
        </label>
        {puedeEscribir && <Button size="sm" loading={guardando} disabled={String(d.precio_compra ?? '') === precio} onClick={guardarPrecio}>{t('guardar', 'Guardar')}</Button>}
        {aviso && <span className="text-sm font-bold">{aviso}</span>}
        {error && <span className="text-sm font-bold">{error}</span>}
      </div>
      {d.avisos.map((a) => <p key={a} className="flex items-start gap-2 text-sm font-bold"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{a}</p>)}
      <TablaTema columnas={[
        { texto: t('casilla', 'Casilla') }, { texto: t('concepto', 'Concepto') },
        ...cols.map((c) => ({
          derecha: true,
          texto: c.total ? (
            <button
              type="button" onClick={() => setVerTitulares((v) => !v)} aria-expanded={verTitulares}
              title={verTitulares ? t('ocultar_titulares', 'Ocultar titulares') : t('ver_titulares', 'Ver titulares')}
              className="ml-auto inline-flex items-center gap-1 uppercase tracking-widest"
            >
              {c.nombre}
              <ChevronRight size={14} className={`transition-transform ${verTitulares ? 'rotate-90' : ''}`} />
            </button>
          ) : `${c.nombre} · ${c.porcentaje}%`,
        })),
      ]}>
        {filas.map(([casilla, texto, clave, tipo], i) => (tipo === 'titulo'
          ? (
            <tr key={i} className="border-b border-border bg-table-header text-on-table-header">
              <td className={`${TD} text-[11px] font-black uppercase tracking-widest`} colSpan={2 + cols.length}>{texto}</td>
            </tr>
          ) : (
            <tr key={i} className={`border-b border-border ${i % 2 ? 'bg-table-row-striped text-on-table-row-striped' : 'bg-table-row text-on-table-row'}`}>
              <td className={`${TD} font-mono text-xs`}>{casilla}</td>
              <td className={`${TD} ${tipo === 'fuerte' ? 'font-black' : ''}`}>{texto}</td>
              {cols.map((c, j) => {
                const v = valor(c.total ? T : c, clave);
                return (
                  <td key={j} className={`${TD} text-right font-mono ${tipo === 'fuerte' || c.total ? 'font-black' : ''}`}>
                    {v == null ? <SinDato /> : (tipo === 'pct' ? `${String(v).replace('.', ',')} %` : euros(v))}
                  </td>
                );
              })}
            </tr>
          )))}
      </TablaTema>
    </section>
  );
}
