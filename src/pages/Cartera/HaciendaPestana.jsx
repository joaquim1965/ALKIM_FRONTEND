/**
 * HaciendaPestana — «Resumen para la Renta» de la propiedad, por año (28/10/2026, petición del usuario).
 *
 * De momento SOLO GASTOS (sin ingresos ni prorrateo): sale de las facturas de la pestaña
 * Facturas, con sus datos para Hacienda y su tipo:
 *   - Gastos corrientes del año, por tipo de factura (se aplican enteros).
 *   - Ampliaciones y mejoras: amortización al 3 % (el primer año, por días).
 *   - Muebles y electrodomésticos: amortización al 10 % (el primer año, por días).
 *   - No admitidos (multas…): solo informativo.
 *   - Gastos de la compra (Valor de adquisición): van a la base del inmueble (pestaña Compra).
 * Avisos: facturas sin datos para Hacienda, sin tipo o sin fecha. Al pulsar una factura se abre
 * el visor de factura (datos editables a la izquierda, la factura en grande).
 *
 * API: GET /propiedades/:id/hacienda?anyo=AAAA
 */
import React, { useCallback, useEffect, useState } from 'react';
import VisorFactura from '../../components/Documentos/VisorFactura';
import { TIPOS_HACIENDA } from '../../components/Documentos/DocumentosObjeto';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { formatImporte } from '../../utils/format';
import { CLASE_INPUT, TablaTema, TD, claseFila, FilaVacia, AvisoError, AvisoAtencion, MICRO, Ayuda } from '../../components/UI/TemaPagina';

const euros = (v) => (v == null ? '' : formatImporte(v, '€'));
const fechaEs = (f) => (f ? String(f).slice(0, 10).split('-').reverse().join('/') : '');

async function pedir(url) {
  const r = await apiFetch(url, { headers: authHeaders() });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.message || `Error ${r.status}`);
  return b;
}

export default function HaciendaPestana({ propiedadId, propiedadNombre = '', puedeEscribir = false, version = 0 }) {
  const { t } = useTmTr('Hacienda');
  const { t: td } = useTmTr('Documentos');
  const [anyo, setAnyo] = useState('');
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [visor, setVisor] = useState(null);

  const cargar = useCallback(async () => {
    try { setError(''); setD((await pedir(`/propiedades/${propiedadId}/hacienda${anyo ? `?anyo=${anyo}` : ''}`)).data); }
    catch (e) { setError(e.message); }
  }, [propiedadId, anyo]);
  useEffect(() => { cargar(); }, [cargar, version]);

  const nombreHacienda = (v) => td(`hacienda_${v}`, (TIPOS_HACIENDA.find(([k]) => k === v) || [null, v])[1]);
  const abrir = (f) => setVisor({ id: f.archivo_id, nombre_original: f.nombre_original, extension: f.extension, tipo_mime: f.tipo_mime, tipo_hacienda: f.tipo_hacienda });
  const descargar = async (a) => {
    try {
      const { data } = await pedir(`/files/${a.id}/descarga`);
      const enlace = document.createElement('a'); enlace.href = data.url; enlace.rel = 'noopener';
      document.body.appendChild(enlace); enlace.click(); enlace.remove();
    } catch (e) { setError(e.message); }
  };

  if (!d && !error) return <p className={MICRO}>{t('cargando', 'Cargando…')}</p>;
  if (!d) return <AvisoError>{error}</AvisoError>;
  const tot = d.totales;
  // % de Fiscalidad → Parámetros fiscales, los vigentes ese año (28/10/2026).
  const pM = String(d.porcentajes?.mejoras ?? 3).replace('.', ',');
  const pE = String(d.porcentajes?.mobiliario ?? 10).replace('.', ',');
  const anyos = d.anyos.length ? d.anyos : [d.anyo];

  const Tarjeta = ({ titulo, valor, ayuda, fuerte = false }) => (
    <div className={`rounded-2xl border border-border p-4 ${fuerte ? 'bg-table-header text-on-table-header' : 'bg-surface2 text-on-surface2'}`}>
      <p className={MICRO}>{titulo}</p>
      <p className={`mt-1 font-mono ${fuerte ? 'text-2xl font-black' : 'text-xl font-black'}`}>{euros(valor)}</p>
      {ayuda && <p className="mt-1 text-xs font-bold">{ayuda}</p>}
    </div>
  );
  const filaFactura = (f, i, celdas) => (
    <tr key={f.archivo_id} className={claseFila(i, { clic: true })} onClick={() => abrir(f)} title={t('ver_factura', 'Ver la factura')}>
      {celdas.map((c, j) => <td key={j} className={`${TD} ${c.derecha ? 'text-right font-mono' : ''} ${c.fuerte ? 'font-black' : ''}`}>{c.v}</td>)}
    </tr>
  );
  const quien = (f) => [f.emisor_nombre, f.concepto].filter(Boolean).join(' · ') || f.nombre_original;
  const listaAviso = (l) => l.map((f, i) => (
    <button key={f.archivo_id} type="button" onClick={() => abrir(f)} className="underline-offset-2 hover:underline">{i ? ', ' : ''}{f.nombre_original}</button>
  ));
  const tablaAmortizacion = (lista, vacio) => (
    <TablaTema columnas={[
      { texto: t('fecha', 'Fecha') }, { texto: t('factura', 'Factura') }, { texto: t('importe', 'Importe'), derecha: true },
      { texto: t('amortizado_antes', 'Amortizado antes'), derecha: true }, { texto: t('amortizacion_anyo', 'Amortización {a}').replace('{a}', d.anyo), derecha: true },
      { texto: t('pendiente', 'Pendiente'), derecha: true },
    ]}>
      {lista.length === 0 && <FilaVacia columnas={6}>{vacio}</FilaVacia>}
      {lista.map((f, i) => filaFactura(f, i, [
        { v: fechaEs(f.fecha) }, { v: quien(f) }, { v: euros(f.importe), derecha: true },
        { v: euros(f.amortizado_antes), derecha: true }, { v: euros(f.amortizacion_anyo), derecha: true, fuerte: true }, { v: euros(f.pendiente), derecha: true },
      ]))}
    </TablaTema>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-black tracking-tight">{t('titulo', 'Resumen para la Renta {a}').replace('{a}', d.anyo)}{propiedadNombre ? ` · ${propiedadNombre}` : ''}</h3>
        <label className="ml-auto flex items-center gap-2 text-sm font-bold">
          {t('anyo', 'Año')}
          <select value={anyo || d.anyo} onChange={(e) => setAnyo(e.target.value)} className={`${CLASE_INPUT} w-auto`}>
            {anyos.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </div>
      <Ayuda>{t('solo_gastos', 'De momento solo gastos: sale de las facturas de la pestaña Facturas con sus datos para Hacienda. Importes: el total de cada factura. Pulsa una factura para verla o corregir sus datos.')}</Ayuda>
      <AvisoError>{error}</AvisoError>

      {d.avisos.sin_datos.length > 0 && <AvisoAtencion>{t('aviso_sin_datos', 'Facturas sin datos para Hacienda (no cuentan hasta que se guarden):')} {listaAviso(d.avisos.sin_datos)}</AvisoAtencion>}
      {d.avisos.sin_tipo.length > 0 && <AvisoAtencion>{t('aviso_sin_tipo', 'Facturas sin tipo para Hacienda:')} {listaAviso(d.avisos.sin_tipo)}</AvisoAtencion>}
      {(d.avisos.descuadradas || []).length > 0 && <AvisoError>{t('aviso_descuadre', 'Facturas en las que base imponible + IVA no coincide con el total:')} {listaAviso(d.avisos.descuadradas)}</AvisoError>}
      {d.avisos.sin_fecha.length > 0 && <AvisoAtencion>{t('aviso_sin_fecha', 'Facturas a amortizar sin fecha (no se puede calcular):')} {listaAviso(d.avisos.sin_fecha)}</AvisoAtencion>}

      {/* Totales */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo={t('gastos_corrientes', 'Gastos corrientes')} valor={tot.gastos_corrientes} ayuda={t('ayuda_corrientes', 'Enteros en el año')} />
        <Tarjeta titulo={t('amort_mejoras_p', 'Amortización mejoras ({p} %)').replace('{p}', pM)} valor={tot.amortizacion_mejoras} />
        <Tarjeta titulo={t('amort_electro_p', 'Amortización muebles y electrodomésticos ({p} %)').replace('{p}', pE)} valor={tot.amortizacion_electrodomesticos} />
        <Tarjeta titulo={t('total_deducible', 'Total gastos deducibles')} valor={tot.total_deducible} fuerte />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Tarjeta titulo={t('no_admitidos', 'No admitidos (informativo)')} valor={tot.no_admitidos} ayuda={t('ayuda_no_admitidos', 'Multas y otros que Hacienda no acepta')} />
        <Tarjeta titulo={t('adquisicion', 'Gastos de la compra del año')} valor={tot.adquisicion} ayuda={t('ayuda_adquisicion', 'Van a la base del inmueble (pestaña Compra), no aquí')} />
      </div>

      {/* 1. Gastos corrientes por tipo */}
      <section className="space-y-2">
        <h4 className={MICRO}>{t('corrientes_por_tipo', '1. Gastos corrientes por tipo')}</h4>
        <TablaTema columnas={[{ texto: t('tipo', 'Tipo') }, { texto: t('importe', 'Importe'), derecha: true }]}>
          {d.corrientes_por_tipo.length === 0 && <FilaVacia columnas={2}>{t('sin_corrientes', 'No hay gastos corrientes este año.')}</FilaVacia>}
          {d.corrientes_por_tipo.map((x, i) => (
            <tr key={x.tipo} className={claseFila(i)}><td className={TD}>{x.tipo}</td><td className={`${TD} text-right font-mono`}>{euros(x.importe)}</td></tr>
          ))}
          {d.corrientes_por_tipo.length > 0 && (
            <tr className="bg-table-header text-on-table-header"><td className={`${TD} font-black uppercase`}>{t('total', 'Total')}</td><td className={`${TD} text-right font-mono font-black`}>{euros(tot.gastos_corrientes)}</td></tr>
          )}
        </TablaTema>
      </section>

      {/* 2. Detalle de gastos corrientes */}
      <section className="space-y-2">
        <h4 className={MICRO}>{t('detalle_corrientes', '2. Detalle de los gastos corrientes')}</h4>
        <TablaTema columnas={[
          { texto: t('fecha', 'Fecha') }, { texto: t('factura', 'Factura') }, { texto: t('tipo', 'Tipo') },
          { texto: t('base', 'Base'), derecha: true }, { texto: t('iva', 'IVA'), derecha: true }, { texto: t('total', 'Total'), derecha: true },
        ]}>
          {d.detalle.corrientes.length === 0 && <FilaVacia columnas={6}>{t('sin_corrientes', 'No hay gastos corrientes este año.')}</FilaVacia>}
          {d.detalle.corrientes.map((f, i) => filaFactura(f, i, [
            { v: fechaEs(f.fecha || f.fecha_documento) }, { v: quien(f) }, { v: f.categoria_nombre },
            { v: euros(f.base), derecha: true }, { v: euros(f.iva), derecha: true }, { v: euros(f.importe), derecha: true, fuerte: true },
          ]))}
        </TablaTema>
      </section>

      {/* 3 y 4. Amortizaciones */}
      <section className="space-y-2">
        <h4 className={MICRO}>{t('mejoras_p', '3. Ampliaciones y mejoras · amortización al {p} %').replace('{p}', pM)}</h4>
        {tablaAmortizacion(d.detalle.mejoras, t('sin_mejoras', 'No hay mejoras que amortizar este año.'))}
      </section>
      <section className="space-y-2">
        <h4 className={MICRO}>{t('electro_p', '4. Muebles y electrodomésticos · amortización al {p} %').replace('{p}', pE)}</h4>
        {tablaAmortizacion(d.detalle.electrodomesticos, t('sin_electro', 'No hay muebles ni electrodomésticos que amortizar este año.'))}
      </section>

      {/* 5. No admitidos */}
      {d.detalle.no_admitidos.length > 0 && (
        <section className="space-y-2">
          <h4 className={MICRO}>{t('no_admitidos_det', '5. No admitidos (no cuentan)')}</h4>
          <TablaTema columnas={[{ texto: t('fecha', 'Fecha') }, { texto: t('factura', 'Factura') }, { texto: t('total', 'Total'), derecha: true }]}>
            {d.detalle.no_admitidos.map((f, i) => filaFactura(f, i, [{ v: fechaEs(f.fecha || f.fecha_documento) }, { v: quien(f) }, { v: euros(f.importe), derecha: true }]))}
          </TablaTema>
        </section>
      )}

      {visor && (
        <VisorFactura archivo={visor} propiedadId={propiedadId} tiposHacienda={TIPOS_HACIENDA} nombreHacienda={nombreHacienda}
          soloLectura={!puedeEscribir} onCerrar={() => { setVisor(null); cargar(); }} onGuardado={() => {}} onDescargar={descargar} onDatos={null} />
      )}
    </div>
  );
}
