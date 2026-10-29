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
import { VentanaModal, AvisoError, AvisoAtencion, Ayuda, Campo, CLASE_INPUT } from '../../components/UI/TemaPagina';
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
  const [actual, setActual] = useState(null);     // fila de im_invoice, si ya había
  const [tipoHacienda, setTipoHacienda] = useState(archivo.tipo_hacienda || '');
  const [eleccion, setEleccion] = useState({});
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');
  const [descuadre, setDescuadre] = useState(null);   // { suma, total, dif } al guardar si no cuadra

  const leidos = useMemo(() => deLectura(lectura?.datos), [lectura]);
  const actuales = useMemo(() => (actual ? Object.fromEntries(CAMPOS.map((f) => [f.c, actual[f.c] ?? null])) : {}), [actual, CAMPOS]);

  const leer = async (modo) => {
    setOcupado(modo); setError('');
    try {
      const { data } = await pedir(`/propiedades/${propiedadId}/facturas/leer`, { method: 'POST', body: JSON.stringify({ archivo_id: archivo.id, modo }) });
      setLectura(data.lectura);
      setActual(data.actual);
      setTipoHacienda((v) => v || data.tipo_hacienda || '');
      const act = data.actual ? Object.fromEntries(CAMPOS.map((f) => [f.c, data.actual[f.c] ?? null])) : {};
      setEleccion(eleccionInicial(CAMPOS, deLectura(data.lectura?.datos), act));
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };
  useEffect(() => { leer('propio'); }, [archivo.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async (igualmente = false) => {
    const v = valoresElegidos(CAMPOS, leidos, actuales, eleccion);
    // Comprobación (28/10/2026): base imponible + IVA = importe total.
    const num = (x) => (x == null || x === '' ? null : Number(String(x).replace(',', '.')));
    const dif = descuadreDe(num(v.base), num(v.iva), num(v.total));
    if (dif != null && Math.abs(dif) > 0.02 && !igualmente) { setDescuadre({ suma: num(v.base) + num(v.iva), total: num(v.total), dif }); return; }
    setDescuadre(null);
    if (v.total == null || v.total === '') { setError(t('fh_falta_total', 'Falta el importe total: elige «Leído» u «Otro» en Importe total.')); return; }
    if (!tipoHacienda) { setError(t('fh_falta_tipo', 'Elige el tipo para Hacienda.')); return; }
    setOcupado('guardar'); setError('');
    try {
      const cuerpo = { ...v, tipo_hacienda: tipoHacienda, leido_por: lectura?.leido_por || null };
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
            <span>{t('fh_descuadre', 'Base imponible + IVA ({s}) no coincide con el importe total ({t}). Diferencia: {d}.')
              .replace('{s}', descuadre.suma.toFixed(2).replace('.', ',')).replace('{t}', descuadre.total.toFixed(2).replace('.', ',')).replace('{d}', descuadre.dif.toFixed(2).replace('.', ','))}</span>
            <span className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => guardar(true)} className="rounded-lg border border-current px-3 py-1 text-xs font-black uppercase tracking-widest">{t('fh_guardar_igual', 'Guardar igualmente')}</button>
              <button type="button" onClick={() => setDescuadre(null)} className="rounded-lg border border-current px-3 py-1 text-xs font-black uppercase tracking-widest">{t('fh_revisar', 'Revisar')}</button>
            </span>
          </AvisoError>
        )}
        {lectura?.avisos?.map((a) => <AvisoAtencion key={a}>{a}</AvisoAtencion>)}
        {ocupado && !lectura && <Ayuda>{t('fh_leyendo', 'Leyendo la factura…')}</Ayuda>}
        {lectura && <ComparadorCampos campos={CAMPOS} leidos={leidos} actuales={actuales} eleccion={eleccion} t={t}
          onElegir={(c, cambio) => setEleccion((e) => ({ ...e, [c]: { ...e[c], ...cambio } }))} />}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={Boolean(ocupado)} onClick={onCerrar}>{t('fh_ahora_no', 'Ahora no')}</Button>
          <Button type="button" loading={ocupado === 'guardar'} disabled={Boolean(ocupado) || !lectura} leftIcon={<Check size={16} />} onClick={() => guardar()}>
            {t('fh_guardar', 'Guardar')}
          </Button>
        </div>
      </div>
    </VentanaModal>
  );
}
