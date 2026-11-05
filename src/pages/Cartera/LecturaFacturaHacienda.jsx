/**
 * LecturaFacturaHacienda.jsx — datos de una factura para Hacienda (27/10/2026, petición del usuario).
 *
 * Al subir una factura en la pestaña Facturas de la propiedad (o con «Leer datos» en su fila)
 * se lee sola el texto del PDF (gratis) y se enseña con la forma estándar
 * (components/Documentos/ComparadorCampos.jsx): Campo · Actual · Leído · Qué se guarda.
 * Si faltan datos o es una foto / escaneo: botón «Leer con IA».
 *
 * Se guarda en im_invoice: fecha, emisor (nombre y NIF), nº, dirección, concepto, base
 * imponible, % de IVA, IVA, total y año. El «Tipo para Hacienda» va en el documento.
 *
 * API: POST /propiedades/:id/facturas/leer · PUT /propiedades/:id/facturas/:archivo
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Receipt, Sparkles, Check } from 'lucide-react';
import Button from '../../components/UI/Button';
import { VentanaModal, AvisoError, AvisoAtencion, Ayuda, Campo, CLASE_INPUT, Recuadro, Rotulo, TablaTema, claseFila, TD } from '../../components/UI/TemaPagina';
import { formatImporte } from '../../utils/format';
import ComparadorCampos, { eleccionInicial, valoresElegidos } from '../../components/Documentos/ComparadorCampos';
import { TIPOS_HACIENDA } from '../../components/Documentos/DocumentosObjeto';
import { descuadreDe } from '../../components/Documentos/VisorFactura';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

/** Lectura (services/lectorFacturas.js) → campos de im_invoice. */
const deLectura = (d = {}) => {
  const r = {
    fecha: d.fecha, emisor_nombre: d.emisor_nombre, emisor_nif: d.emisor_nif, numero_factura: d.numero_factura,
    direccion: d.direccion, concepto: d.descripcion, base: d.base, tipo_iva: d.tipo_iva, iva: d.iva, total: d.total,
  };
  if (d.fecha) r.ejercicio = Number(String(d.fecha).slice(0, 4));
  return Object.fromEntries(Object.entries(r).filter(([, v]) => v != null && v !== ''));
};

export default function LecturaFacturaHacienda({ propiedadId, archivo, posicion = '', onCerrar, onGuardado }) {
  const { t } = useTmTr('FacturaHacienda');
  const { t: td } = useTmTr('Documentos');
  const CAMPOS = useMemo(() => [
    { c: 'fecha', nombre: t('fh_fecha', 'Fecha'), tipo: 'fecha' },
    { c: 'ejercicio', nombre: t('fh_ejercicio', 'Año (ejercicio)'), tipo: 'numero' },
    { c: 'emisor_nombre', nombre: t('fh_emisor', 'Emisor (nombre)') },
    { c: 'emisor_nif', nombre: t('fh_nif', 'NIF del emisor') },
    { c: 'numero_factura', nombre: t('fh_numero', 'Nº de factura') },
    { c: 'direccion', nombre: t('fh_direccion', 'Dirección') },
    { c: 'concepto', nombre: t('fh_concepto', 'Concepto') },
    { c: 'base', nombre: t('fh_base', 'Base imponible'), tipo: 'importe' },
    { c: 'tipo_iva', nombre: t('fh_tipo_iva', 'IVA aplicado (%)'), tipo: 'numero' },
    { c: 'iva', nombre: t('fh_iva', 'IVA (€)'), tipo: 'importe' },
    { c: 'total', nombre: t('fh_total', 'Importe total'), tipo: 'importe' },
  ], [t]);
  const [lectura, setLectura] = useState(null);   // { datos, leido_por, avisos }
  const [repetida, setRepetida] = useState('');   // la misma factura ya registrada (código único, 30/10/2026)
  const [actual, setActual] = useState(null);     // fila de im_invoice, si ya había
  const [tipoHacienda, setTipoHacienda] = useState(archivo.tipo_hacienda || '');
  const [eleccion, setEleccion] = useState({});
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');
  const [descuadre, setDescuadre] = useState(null);   // { suma, total, dif } al guardar si no cuadra

  const leidos = useMemo(() => deLectura(lectura?.datos), [lectura]);
  const actuales = useMemo(() => (actual ? Object.fromEntries(CAMPOS.map((f) => [f.c, actual[f.c] ?? null])) : {}), [actual, CAMPOS]);

  const vacioImp = (x) => x == null || x === '';
  const sinImportesDe = (v) => vacioImp(v.base) && vacioImp(v.iva) && vacioImp(v.total);
  const sinImportes = Boolean(lectura) && sinImportesDe(valoresElegidos(CAMPOS, leidos, actuales, eleccion));

  const leer = async (modo) => {
    setOcupado(modo); setError('');
    try {
      const { data } = await pedir(`/propiedades/${propiedadId}/facturas/leer`, { method: 'POST', body: JSON.stringify({ archivo_id: archivo.id, modo }) });
      setLectura(data.lectura);
      setRepetida(data.repetida || '');
      setActual(data.actual);
      setTipoHacienda((v) => v || data.tipo_hacienda || '');
      const act = data.actual ? Object.fromEntries(CAMPOS.map((f) => [f.c, data.actual[f.c] ?? null])) : {};
      setEleccion(eleccionInicial(CAMPOS, deLectura(data.lectura?.datos), act));
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };
  useEffect(() => { leer('propio'); }, [archivo.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // «No computables» (04/11/2026, petición del usuario): solo admite «No se admite»; si tenía otro, se
  // corrige aquí y se avisa (el servidor también lo corrige al guardar).
  const enNoComputables = archivo.categoria_codigo === 'NO_DEDUCIBLES';
  const [corregidoNoComp, setCorregidoNoComp] = useState(false);
  useEffect(() => {
    if (enNoComputables && tipoHacienda && tipoHacienda !== 'NO_ADMITIDO') { setTipoHacienda('NO_ADMITIDO'); setCorregidoNoComp(true); }
  }, [enNoComputables, tipoHacienda]);

  const guardar = async (igualmente = false) => {
    const v = valoresElegidos(CAMPOS, leidos, actuales, eleccion);
    // Comprobación (28/10/2026): base imponible + IVA = importe total.
    const num = (x) => (x == null || x === '' ? null : Number(String(x).replace(',', '.')));
    // Comprobación (04/11/2026, petición del usuario): con total distinto de 0, total = base × (1 + IVA% / 100)
    // hasta el céntimo. Si no coincide, se avisa con el total de la factura y el resultado del cálculo.
    // Periodo y fecha (04/11/2026, petición del usuario): el ejercicio debe ser el año de la fecha.
    if (!igualmente && v.ejercicio != null && v.fecha && String(v.ejercicio) !== String(v.fecha).slice(0, 4)) {
      setDescuadre({ periodo: true, ejercicio: v.ejercicio, anyo: String(v.fecha).slice(0, 4) }); return;
    }
    const tot = num(v.total); const bas = num(v.base); const pct = num(v.tipo_iva);
    if (!igualmente && tot != null && tot !== 0 && bas != null && pct != null) {
      const calculo = Math.round(bas * (1 + pct / 100) * 100) / 100;
      if (Math.round(tot * 100) !== Math.round(calculo * 100)) { setDescuadre({ porcentaje: true, total: tot, calculo, base: bas, pct }); return; }
    }
    const dif = descuadreDe(num(v.base), num(v.iva), num(v.total));
    if (dif != null && Math.abs(dif) > 0.02 && !igualmente) { setDescuadre({ suma: num(v.base) + num(v.iva), total: num(v.total), dif }); return; }
    setDescuadre(null);
    // Sin base, IVA ni total (04/11/2026, petición del usuario): se guarda como «No se admite»
    // (no deducible) con importe 0 (im_invoice.total no admite vacío).
    const sinImp = sinImportesDe(v);
    if (sinImp) { v.total = 0; }
    else if (v.total == null || v.total === '') { setError(t('fh_falta_total', 'Falta el importe total: elige «Leído» u «Otro» en Importe total.')); return; }
    const tipo = sinImp ? 'NO_ADMITIDO' : tipoHacienda;
    if (!tipo) { setError(t('fh_falta_tipo', 'Elige el tipo para Hacienda.')); return; }
    setOcupado('guardar'); setError('');
    try {
      const cuerpo = { ...v, tipo_hacienda: tipo, leido_por: lectura?.leido_por || null };
      for (const k of Object.keys(cuerpo)) if (cuerpo[k] === undefined) delete cuerpo[k];
      await pedir(`/propiedades/${propiedadId}/facturas/${archivo.id}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
      await onGuardado?.();
      onCerrar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };

  return (
    <VentanaModal titulo={`${t('fh_titulo', 'Datos de la factura para Hacienda')}${posicion ? ` · ${posicion}` : ''}`} icono={<Receipt size={20} />} onCerrar={() => !ocupado && onCerrar()} ancho="max-w-5xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Ayuda>
            {archivo.nombre_original || archivo.nombre}
            {lectura?.leido_por ? ` · ${t('fh_leido_por', 'Leído con')} ${lectura.leido_por}` : ''}
          </Ayuda>
          <Button type="button" variant={lectura && !lectura.completo ? 'primary' : 'secondary'} size="sm" loading={ocupado === 'ia'} disabled={Boolean(ocupado)} leftIcon={<Sparkles size={16} />} onClick={() => leer('ia')}>
            {t('fh_leer_ia', 'Leer con IA')}
          </Button>
        </div>
        <Ayuda>{t('fh_ayuda', 'Revisa los datos: se guardan para la declaración de Hacienda. Si faltan datos o es una foto o un escaneo, pulsa «Leer con IA».')}</Ayuda>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta={`${td('tipo_hacienda', 'Tipo para Hacienda')} *`}>
            <select value={tipoHacienda} onChange={(e) => setTipoHacienda(e.target.value)} className={CLASE_INPUT} disabled={Boolean(ocupado)}>
              <option value="">{td('hacienda_elige', '— Elige —')}</option>
              {TIPOS_HACIENDA.map(([k, nom]) => <option key={k} value={k}>{td(`hacienda_${k}`, nom)}</option>)}
            </select>
            {tipoHacienda && <span className="mt-1 block text-xs font-bold">{td(`hacienda_ayuda_${tipoHacienda}`, (TIPOS_HACIENDA.find(([k]) => k === tipoHacienda) || [])[2] || '')}</span>}
          </Campo>
        </div>

        <AvisoError>{error}</AvisoError>
        {descuadre && (
          <AvisoError>
            <span>{descuadre.periodo
              ? t('fh_periodo', 'El año (ejercicio) {e} no coincide con el año de la fecha de la factura ({a}).').replace('{e}', descuadre.ejercicio).replace('{a}', descuadre.anyo)
              : descuadre.porcentaje
              ? t('fh_descuadre_pct', 'El importe total de la factura ({t}) no coincide con base × (1 + IVA / 100) = {b} × (1 + {p} / 100) = {c}.')
                .replace('{t}', descuadre.total.toFixed(2).replace('.', ',')).replace('{b}', descuadre.base.toFixed(2).replace('.', ','))
                .replace('{p}', String(descuadre.pct).replace('.', ',')).replace('{c}', descuadre.calculo.toFixed(2).replace('.', ','))
              : t('fh_descuadre', 'Base imponible + IVA ({s}) no coincide con el importe total ({t}). Diferencia: {d}.')
                .replace('{s}', descuadre.suma.toFixed(2).replace('.', ',')).replace('{t}', descuadre.total.toFixed(2).replace('.', ',')).replace('{d}', descuadre.dif.toFixed(2).replace('.', ','))}</span>
            <span className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => guardar(true)} className="rounded-lg border border-current px-3 py-1 text-xs font-black uppercase tracking-widest">{t('fh_guardar_igual', 'Guardar igualmente')}</button>
              <button type="button" onClick={() => setDescuadre(null)} className="rounded-lg border border-current px-3 py-1 text-xs font-black uppercase tracking-widest">{t('fh_revisar', 'Revisar')}</button>
            </span>
          </AvisoError>
        )}
        {repetida && <AvisoError>{repetida}</AvisoError>}
        {corregidoNoComp && <AvisoAtencion>{t('fh_no_computables', 'Está en «No computables»: el tipo para Hacienda solo puede ser «No se admite». Se ha corregido.')}</AvisoAtencion>}
        {sinImportes && (
          <AvisoAtencion>{t('fh_sin_importes', 'Esta factura no tiene base imponible, IVA ni importe total: se guardará automáticamente como «No se admite» (no deducible), con importe 0. Si conoces el importe, escríbelo con «Otro».')}</AvisoAtencion>
        )}
        {lectura?.avisos?.map((a) => <AvisoAtencion key={a}>{a}</AvisoAtencion>)}
        {ocupado && !lectura && <Ayuda>{t('fh_leyendo', 'Leyendo la factura…')}</Ayuda>}
        {/* Botones encima de la tabla de datos (04/11/2026, petición del usuario): se ven sin bajar. */}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={Boolean(ocupado)} onClick={onCerrar}>{t('fh_ahora_no', 'Ahora no')}</Button>
          <Button type="button" loading={ocupado === 'guardar'} disabled={Boolean(ocupado) || !lectura} leftIcon={<Check size={16} />} onClick={() => guardar()}>
            {t('fh_guardar', 'Guardar')}
          </Button>
        </div>
        {lectura && <ComparadorCampos conFaltan campos={CAMPOS} leidos={leidos} actuales={actuales} eleccion={eleccion} t={t}
          onElegir={(c, cambio) => setEleccion((e) => ({ ...e, [c]: { ...e[c], ...cambio } }))} />}
        {/* Conceptos de la factura, línea a línea (04/11/2026, petición del usuario). */}
        {lectura?.datos?.lineas?.length > 0 && (
          <Recuadro as="section" className="space-y-2">
            <Rotulo>{t('fh_conceptos', 'Conceptos de la factura')} ({lectura.datos.lineas.length})</Rotulo>
            <TablaTema columnas={[{ texto: t('fh_concepto_linea', 'Concepto') }, { texto: t('fh_cantidad', 'Cantidad'), derecha: true }, { texto: t('fh_precio', 'Precio'), derecha: true }, { texto: t('fh_importe', 'Importe'), derecha: true }]}>
              {lectura.datos.lineas.map((x, i) => (
                <tr key={`${x.concepto}-${i}`} className={claseFila(i)}>
                  <td className={`${TD} select-text`}>{x.concepto}</td>
                  <td className={`${TD} text-right font-mono`}>{x.cantidad != null ? String(x.cantidad).replace('.', ',') : ''}</td>
                  <td className={`${TD} text-right font-mono`}>{x.precio != null ? formatImporte(x.precio, '€') : ''}</td>
                  <td className={`${TD} text-right font-mono font-black`}>{x.importe != null ? formatImporte(x.importe, '€') : ''}</td>
                </tr>
              ))}
            </TablaTema>
            <Ayuda>{t('fh_conceptos_ayuda', 'Si la factura no trae un concepto general, se guardan resumidos en «Concepto».')}</Ayuda>
          </Recuadro>
        )}
        {/* Recibo de tributo (IBI, tributo metropolitano…) (04/11/2026): todos sus conceptos e importes. */}
        {lectura?.datos?.detalle?.length > 0 && (
          <Recuadro as="section" className="space-y-2">
            <Rotulo>{t('fh_detalle_recibo', 'Detalle del recibo')}</Rotulo>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {lectura.datos.detalle.map((d) => (
                <div key={d.campo} className="flex justify-between gap-3 border-b border-border py-1">
                  <dt className="font-bold">{t(`fh_det_${d.campo}`, d.campo)}</dt>
                  <dd className="select-text text-right font-mono font-black">{d.valor}</dd>
                </div>
              ))}
            </dl>
            <Ayuda>{t('fh_detalle_ayuda', 'Se guarda resumido en «Concepto».')}</Ayuda>
          </Recuadro>
        )}
      </div>
    </VentanaModal>
  );
}
