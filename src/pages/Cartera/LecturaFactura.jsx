/**
 * LecturaFactura.jsx — al subir una FACTURA en Documentos de la propiedad
 * (tipo «Facturas de la compra» o «Facturas de mejoras») se lee sola y se
 * pasa a su formulario con la forma estándar (components/Documentos/ComparadorCampos.jsx).
 *
 * Arriba se dice SIEMPRE a dónde va: grupo (Gastos de compra / Mejoras), concepto
 * (p. ej. Tasación, detectado al leer) y línea (nueva o una que ya existe). Debajo,
 * qué datos se pasan. Si no hace falta pasar nada: «No pasar a ningún formulario»
 * (el documento queda guardado igual).
 *
 * API: POST /propiedades/:id/gastos-compra/leer · GET/POST/PUT /propiedades/:id/{gastos-compra|mejoras}
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Receipt, Sparkles, Check } from 'lucide-react';
import Button from '../../components/UI/Button';
import { VentanaModal, AvisoError, AvisoAtencion, Ayuda, Campo, CLASE_INPUT } from '../../components/UI/TemaPagina';
import ComparadorCampos, { eleccionInicial, valoresElegidos, cambiosElegidos } from '../../components/Documentos/ComparadorCampos';
import { CONCEPTOS, CONCEPTOS_MEJORA } from './CompraPestana';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { formatImporte } from '../../utils/format';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

export const DESTINOS = {
  compra: { nombre: 'Gastos de compra', ruta: 'gastos-compra', conceptos: CONCEPTOS, inicial: 'OTROS' },
  mejoras: { nombre: 'Mejoras', ruta: 'mejoras', conceptos: CONCEPTOS_MEJORA, inicial: 'OBRA' },
};
/** Tipo de documento → grupo al que va la factura. */
export const DESTINO_DE_CATEGORIA = { FACTURA_COMPRA: 'compra', FACTURA_MEJORA: 'mejoras' };

const CAMPOS = [
  { c: 'emisor_nombre', nombre: 'Emisor' }, { c: 'emisor_nif', nombre: 'NIF del emisor' }, { c: 'numero_factura', nombre: 'Nº de factura' },
  { c: 'fecha', nombre: 'Fecha', tipo: 'fecha' }, { c: 'base', nombre: 'Base', tipo: 'importe' }, { c: 'iva', nombre: 'IVA', tipo: 'importe' },
  { c: 'total', nombre: 'Total', tipo: 'importe' }, { c: 'descripcion', nombre: 'Descripción' },
];
const ESQUEMA = ['concepto', 'descripcion', 'tercero_id', 'emisor_nombre', 'emisor_nif', 'numero_factura', 'fecha', 'base', 'iva', 'total', 'sin_justificante', 'archivo_id', 'leido_por', 'notas'];
const limpiaNif = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Línea que ya corresponde a esta factura: la que la tiene enlazada, la del mismo nº y NIF, o la del concepto sin factura. */
function lineaPropuesta(lineas, archivoId, leidos, concepto) {
  return lineas.find((l) => Number(l.archivo_id) === Number(archivoId))
    || (leidos.numero_factura && lineas.find((l) => l.numero_factura && l.numero_factura === leidos.numero_factura
      && (!leidos.emisor_nif || limpiaNif(l.emisor_nif) === limpiaNif(leidos.emisor_nif))))
    || lineas.find((l) => l.concepto === concepto && !l.archivo_id)
    || null;
}

export default function LecturaFactura({ propiedadId, archivo, posicion, onCerrar, onAplicado }) {
  const { t } = useTmTr('Compra');
  const [lectura, setLectura] = useState(null);       // { datos, leido_por, avisos }
  const [lineas, setLineas] = useState({ compra: [], mejoras: [] });
  const [destino, setDestino] = useState(DESTINO_DE_CATEGORIA[archivo.categoria_codigo] || 'compra');
  const [concepto, setConcepto] = useState('');
  const [lineaId, setLineaId] = useState('');          // '' = línea nueva
  const [eleccion, setEleccion] = useState({});
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');

  const cfg = DESTINOS[destino];
  const linea = (lineas[destino] || []).find((l) => String(l.id) === String(lineaId)) || null;
  const actuales = useMemo(() => (linea ? Object.fromEntries(CAMPOS.map((f) => [f.c, linea[f.c] ?? null])) : {}), [linea]);
  const leidos = lectura?.datos || {};

  /** Concepto y línea propuestos para un grupo, con lo leído. */
  const proponer = (dest, datos, todas) => {
    const lista = DESTINOS[dest].conceptos.map(([k]) => k);
    const con = lista.includes(datos.concepto) ? datos.concepto : DESTINOS[dest].inicial;
    const l = lineaPropuesta(todas[dest] || [], archivo.id, datos, con);
    setConcepto(l?.concepto || con);
    setLineaId(l ? String(l.id) : '');
    const act = l ? Object.fromEntries(CAMPOS.map((f) => [f.c, l[f.c] ?? null])) : {};
    setEleccion(eleccionInicial(CAMPOS, datos, act));
  };

  const leer = async (modo) => {
    setOcupado(modo); setError('');
    try {
      const [{ data }, compra, mejoras] = await Promise.all([
        pedir(`/propiedades/${propiedadId}/gastos-compra/leer`, { method: 'POST', body: JSON.stringify({ archivo_id: archivo.id, modo }) }),
        pedir(`/propiedades/${propiedadId}/gastos-compra`), pedir(`/propiedades/${propiedadId}/mejoras`),
      ]);
      const todas = { compra: compra.data?.lineas || [], mejoras: mejoras.data?.lineas || [] };
      setLineas(todas);
      setLectura(data);
      proponer(destino, data.datos || {}, todas);
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };
  useEffect(() => { leer('propio'); }, [archivo.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarDestino = (d) => { setDestino(d); if (lectura) proponer(d, leidos, lineas); };
  const cambiarLinea = (id) => {
    setLineaId(id);
    const l = (lineas[destino] || []).find((x) => String(x.id) === String(id));
    if (l) setConcepto(l.concepto);
    setEleccion(eleccionInicial(CAMPOS, leidos, l ? Object.fromEntries(CAMPOS.map((f) => [f.c, l[f.c] ?? null])) : {}));
  };

  const cambios = lectura ? cambiosElegidos(CAMPOS, leidos, actuales, eleccion) : {};
  const cambiaConcepto = linea ? linea.concepto !== concepto : false;
  const enlaza = !linea || Number(linea.archivo_id) !== Number(archivo.id);
  const n = Object.keys(cambios).length + (cambiaConcepto ? 1 : 0);
  const nombreConcepto = (k) => cfg.conceptos.find(([c]) => c === k)?.[1] || k;

  const aplicar = async () => {
    const v = valoresElegidos(CAMPOS, leidos, actuales, eleccion);
    if (v.total == null) { setError(t('falta_total', 'Falta el total de la factura: elige «Leído» u «Otro» en Total.')); return; }
    setOcupado('aplicar'); setError('');
    try {
      const base = linea ? Object.fromEntries(ESQUEMA.map((k) => [k, linea[k] ?? null])) : {};
      const cuerpo = { ...base, ...v, concepto, archivo_id: archivo.id, leido_por: lectura?.leido_por || base.leido_por || null, sin_justificante: false };
      // El tercero: el que dio la lectura si el NIF es el leído; si el NIF cambia, lo busca el servidor.
      if (!linea || limpiaNif(v.emisor_nif) !== limpiaNif(linea.emisor_nif)) cuerpo.tercero_id = limpiaNif(v.emisor_nif) === limpiaNif(leidos.emisor_nif) ? (leidos.tercero_id || null) : null;
      for (const k of Object.keys(cuerpo)) if (cuerpo[k] === undefined) delete cuerpo[k];
      const url = `/propiedades/${propiedadId}/${cfg.ruta}${linea ? `/${linea.id}` : ''}`;
      await pedir(url, { method: linea ? 'PUT' : 'POST', body: JSON.stringify(cuerpo) });
      await onAplicado?.({ destino, concepto, nueva: !linea });
      onCerrar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };

  const resumen = linea
    ? t('resumen_editar', 'Se actualiza la línea «{linea}» de {grupo} ▸ {concepto}.')
      .replace('{linea}', `${nombreConcepto(linea.concepto)} · ${linea.emisor_nombre || linea.numero_factura || formatImporte(linea.total, '€')}`)
    : t('resumen_nueva', 'Se crea una línea nueva en {grupo} ▸ {concepto}.');
  const textoResumen = `${resumen.replace('{grupo}', cfg.nombre).replace('{concepto}', nombreConcepto(concepto))}${enlaza ? ` ${t('resumen_enlaza', 'La factura queda enlazada a la línea.')}` : ''}`;

  return (
    <VentanaModal titulo={`${t('factura_titulo', 'Datos de la factura')}${posicion ? ` · ${posicion}` : ''}`} icono={<Receipt size={20} />} onCerrar={() => !ocupado && onCerrar()} ancho="max-w-5xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Ayuda>
            {archivo.nombre_original || archivo.nombre}
            {lectura?.leido_por ? ` · ${t('leido_por', 'Leído con')} ${lectura.leido_por}` : ''}
          </Ayuda>
          <Button type="button" variant="secondary" size="sm" loading={ocupado === 'ia'} disabled={Boolean(ocupado)} leftIcon={<Sparkles size={16} />} onClick={() => leer('ia')}>
            {t('leer_ia', 'Leer con IA')}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Campo etiqueta={t('va_a_grupo', 'Va a')}>
            <select value={destino} onChange={(e) => cambiarDestino(e.target.value)} className={CLASE_INPUT} disabled={Boolean(ocupado)}>
              {Object.entries(DESTINOS).map(([k, d]) => <option key={k} value={k}>{t(`destino_${k}`, d.nombre)}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('concepto', 'Concepto')}>
            <select value={concepto} onChange={(e) => setConcepto(e.target.value)} className={CLASE_INPUT} disabled={Boolean(ocupado)}>
              {cfg.conceptos.map(([k, nom]) => <option key={k} value={k}>{nom}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={t('linea', 'Línea')}>
            <select value={lineaId} onChange={(e) => cambiarLinea(e.target.value)} className={CLASE_INPUT} disabled={Boolean(ocupado)}>
              <option value="">{t('linea_nueva', 'Nueva línea')}</option>
              {(lineas[destino] || []).map((l) => (
                <option key={l.id} value={l.id}>{nombreConcepto(l.concepto)} · {l.emisor_nombre || l.numero_factura || '—'} · {formatImporte(l.total, '€')}</option>
              ))}
            </select>
          </Campo>
        </div>
        {lectura && <Ayuda>{textoResumen}</Ayuda>}

        <AvisoError>{error}</AvisoError>
        {lectura?.avisos?.map((a) => <AvisoAtencion key={a}>{a}</AvisoAtencion>)}
        {ocupado === 'propio' && !lectura && <Ayuda>{t('leyendo', 'Leyendo la factura…')}</Ayuda>}
        {lectura && <ComparadorCampos campos={CAMPOS} leidos={leidos} actuales={actuales} eleccion={eleccion} t={t}
          onElegir={(c, cambio) => setEleccion((e) => ({ ...e, [c]: { ...e[c], ...cambio } }))} />}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={Boolean(ocupado)} onClick={onCerrar}>{t('no_pasar', 'No pasar a ningún formulario')}</Button>
          <Button type="button" loading={ocupado === 'aplicar'} disabled={Boolean(ocupado) || !lectura} leftIcon={<Check size={16} />} onClick={aplicar}>
            {n ? `${t('aplicar', 'Aplicar')} (${n})` : t('aplicar', 'Aplicar')}
          </Button>
        </div>
      </div>
    </VentanaModal>
  );
}
