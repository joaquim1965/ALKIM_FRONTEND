/**
 * LecturaPrestamo.jsx — al subir una ESCRITURA DE HIPOTECA / PRÉSTAMO (o la oferta,
 * FEIN o simulación del banco) en Documentos de la propiedad, se lee sola y se pasa
 * al préstamo con la forma estándar (components/Documentos/ComparadorCampos.jsx,
 * docs/NORMAS_DESARROLLO.md §12).
 *
 * Arriba, a dónde va: Préstamos ▸ préstamo (nuevo o uno que ya existe) y, si es
 * nuevo, la cuenta de cargo (se propone la del banco leído). Debajo, qué datos se
 * pasan: tipo, fecha, importe, interés, cuotas, periodicidad, fijo/variable, índice,
 * diferencial, gastos de formalización e intervinientes (por NIF en Entidades).
 *
 * API: POST /propiedades/:id/prestamos/leer · GET/POST/PUT /propiedades/:id/prestamos[/:prestamo[/cuadro]]
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Landmark, Sparkles, Check } from 'lucide-react';
import Button from '../../components/UI/Button';
import { VentanaModal, AvisoError, AvisoAtencion, Ayuda, Campo, CLASE_INPUT } from '../../components/UI/TemaPagina';
import ComparadorCampos, { eleccionInicial, valoresElegidos, cambiosElegidos } from '../../components/Documentos/ComparadorCampos';
import { ROLES } from './PrestamosPestana';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { formatImporte } from '../../utils/format';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

const SINO = [['1', 'Variable'], ['0', 'Fijo']];
const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Préstamo existente → valores con los nombres de los campos del comparador. */
function actualesDe(l) {
  if (!l) return {};
  const partes = (rol) => (l.partes || []).filter((x) => x.rol === rol).map((x) => x.entidad_id);
  return {
    tipo: l.tipo, fecha_inicio: l.fecha_inicio, importe_concedido: l.importe_concedido, tipo_interes: l.tipo_interes,
    num_cuotas: (l.cuadro || []).length || null, periodicidad: l.periodicidad,
    tipo_interes_variable: l.tipo_interes_variable == null ? null : String(Number(l.tipo_interes_variable)),
    indice: l.indice, diferencial: l.diferencial, gastos_formalizacion: l.gastos_formalizacion,
    partes_HIPOTECANTE: partes('HIPOTECANTE'), partes_HIPOTECANTE_NO_DEUDOR: partes('HIPOTECANTE_NO_DEUDOR'), partes_AVALISTA: partes('AVALISTA'),
  };
}
/** Lo leído, con fijo/variable como '1'/'0' para la lista. */
const leidosDe = (d) => ({ ...d, ...(typeof d.tipo_interes_variable === 'boolean' ? { tipo_interes_variable: d.tipo_interes_variable ? '1' : '0' } : {}) });

export default function LecturaPrestamo({ propiedadId, archivo, posicion, onCerrar, onAplicado }) {
  const { t } = useTmTr('Prestamos');
  const [lectura, setLectura] = useState(null);       // { leidos, banco, leido_por, avisos }
  const [prestamos, setPrestamos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [prestamoId, setPrestamoId] = useState('');   // '' = préstamo nuevo
  const [cuentaId, setCuentaId] = useState('');
  const [eleccion, setEleccion] = useState({});
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');

  const prestamo = prestamos.find((l) => String(l.id) === String(prestamoId)) || null;
  const nuevo = !prestamo;
  const personas = useMemo(() => entidades.map((e) => [e.id, e.nombre]), [entidades]);
  const CAMPOS = useMemo(() => [
    ...(nuevo ? [{ c: 'tipo', nombre: 'Tipo', tipo: 'lista', opciones: [['HIPOTECA', 'Hipoteca'], ['PRESTAMO', 'Préstamo']] }] : []),
    { c: 'fecha_inicio', nombre: 'Fecha de inicio (firma)', tipo: 'fecha' },
    { c: 'importe_concedido', nombre: 'Importe concedido', tipo: 'importe' },
    { c: 'tipo_interes', nombre: 'Tipo de interés (%)', tipo: 'numero' },
    { c: 'num_cuotas', nombre: 'Número de cuotas', tipo: 'numero' },
    ...(nuevo ? [{ c: 'periodicidad', nombre: 'Periodicidad', tipo: 'lista', opciones: [['MENSUAL', 'Mensual'], ['TRIMESTRAL', 'Trimestral'], ['ANUAL', 'Anual']] }] : []),
    { c: 'tipo_interes_variable', nombre: 'Interés', tipo: 'lista', opciones: SINO },
    { c: 'indice', nombre: 'Índice', tipo: 'lista', opciones: [['EURIBOR_12M', 'Euríbor 12 meses'], ['EURIBOR_6M', 'Euríbor 6 meses'], ['IRPH', 'IRPH'], ['OTRO', 'Otro']] },
    { c: 'diferencial', nombre: 'Diferencial (%)', tipo: 'numero' },
    { c: 'gastos_formalizacion', nombre: 'Gastos de formalización', tipo: 'importe' },
    ...ROLES.map(([rol, nom]) => ({ c: `partes_${rol}`, nombre: nom, tipo: 'personas', opciones: personas })),
  ], [nuevo, personas]);
  const actuales = useMemo(() => actualesDe(prestamo), [prestamo]);
  const leidos = useMemo(() => leidosDe(lectura?.leidos || {}), [lectura]);

  /** Cuenta del banco leído (por nombre del banco), si hay una sola clara. */
  const cuentaDelBanco = (banco, lista) => {
    if (!banco) return '';
    const b = sinAcentos(banco).replace(/^banco\s+/, '');
    const c = lista.filter((x) => sinAcentos(`${x.entidad_nombre || ''} ${x.alias || ''}`).includes(b));
    return c.length ? String(c[0].id) : '';
  };

  const leer = async (modo) => {
    setOcupado(modo); setError('');
    try {
      const [{ data }, pres, cts, ents] = await Promise.all([
        pedir(`/propiedades/${propiedadId}/prestamos/leer`, { method: 'POST', body: JSON.stringify({ archivo_id: archivo.id, modo }) }),
        pedir(`/propiedades/${propiedadId}/prestamos`), pedir('/gestion-bancos/cuentas').catch(() => ({ data: [] })), pedir('/companies/mine').catch(() => ({ data: [] })),
      ]);
      const lista = pres.data || [];
      const listaCuentas = cts.data || cts || [];
      setPrestamos(lista); setCuentas(listaCuentas);
      setEntidades((ents.data || []).slice().sort((x, y) => x.nombre.localeCompare(y.nombre)));
      setLectura(data);
      // Préstamo propuesto: el único que hay, o el del mismo importe; si no, uno nuevo.
      const mismo = lista.find((l) => data.leidos.importe_concedido && Number(l.importe_concedido) === Number(data.leidos.importe_concedido)) || (lista.length === 1 ? lista[0] : null);
      setPrestamoId(mismo ? String(mismo.id) : '');
      setCuentaId((c) => c || cuentaDelBanco(data.banco, listaCuentas));
      setEleccion(eleccionInicial(CAMPOS, leidosDe(data.leidos), actualesDe(mismo)));
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };
  useEffect(() => { leer('propio'); }, [archivo.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarPrestamo = (id) => {
    setPrestamoId(id);
    setEleccion(eleccionInicial(CAMPOS, leidos, actualesDe(prestamos.find((l) => String(l.id) === String(id)))));
  };

  const cambios = lectura ? cambiosElegidos(CAMPOS, leidos, actuales, eleccion) : {};
  const n = Object.keys(cambios).length;

  const aplicar = async () => {
    if (!n) return onCerrar();
    const v = valoresElegidos(CAMPOS, leidos, actuales, eleccion);
    const partes = ROLES.flatMap(([rol]) => (v[`partes_${rol}`] || []).map((id) => ({ entidad_id: Number(id), rol })));
    const variable = v.tipo_interes_variable == null ? undefined : v.tipo_interes_variable === '1';
    setOcupado('aplicar'); setError('');
    try {
      if (nuevo) {
        const faltan = [['cuenta', !cuentaId], ['fecha de inicio', !v.fecha_inicio], ['importe', v.importe_concedido == null], ['tipo de interés', v.tipo_interes == null], ['número de cuotas', !v.num_cuotas]]
          .filter(([, f]) => f).map(([k]) => k);
        if (faltan.length) throw new Error(`${t('faltan_datos', 'Para crear el préstamo falta')}: ${faltan.join(', ')}.`);
        await pedir(`/propiedades/${propiedadId}/prestamos`, { method: 'POST', body: JSON.stringify({
          cuenta_id: Number(cuentaId), tipo: v.tipo || 'HIPOTECA', fecha_inicio: v.fecha_inicio, importe_concedido: v.importe_concedido,
          tipo_interes: v.tipo_interes, num_cuotas: v.num_cuotas, periodicidad: v.periodicidad || 'MENSUAL',
          tipo_interes_variable: variable, indice: v.indice, diferencial: v.diferencial, gastos_formalizacion: v.gastos_formalizacion,
          ...(partes.length ? { partes } : {}),
        }) });
      } else {
        const base = `/propiedades/${propiedadId}/prestamos/${prestamo.id}`;
        const ed = {};
        if ('tipo_interes_variable' in cambios) ed.tipo_interes_variable = variable;
        for (const k of ['indice', 'diferencial', 'gastos_formalizacion']) if (k in cambios) ed[k] = v[k];
        if (ROLES.some(([rol]) => `partes_${rol}` in cambios)) ed.partes = partes;
        if (Object.keys(ed).length) await pedir(base, { method: 'PUT', body: JSON.stringify(ed) });
        // Importe, interés, cuotas o fecha: se recalcula el cuadro (y el préstamo).
        if (['importe_concedido', 'tipo_interes', 'num_cuotas', 'fecha_inicio'].some((k) => k in cambios)) {
          await pedir(`${base}/cuadro`, { method: 'POST', body: JSON.stringify({
            importe: v.importe_concedido, tipo_interes: v.tipo_interes, num_cuotas: v.num_cuotas || actuales.num_cuotas, fecha_inicio: v.fecha_inicio,
          }) });
        }
      }
      await onAplicado?.();
      onCerrar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };

  const recalcula = !nuevo && ['importe_concedido', 'tipo_interes', 'num_cuotas', 'fecha_inicio'].some((k) => k in cambios);
  const textoResumen = nuevo
    ? t('resumen_nuevo', 'Se crea un préstamo nuevo con su cuadro de amortización calculado.')
    : `${t('resumen_editar', 'Se actualiza el préstamo «{p}».').replace('{p}', prestamo.alias)}${recalcula ? ` ${t('resumen_cuadro', 'Cambian importe, interés, cuotas o fecha: se recalcula el cuadro de amortización.')}` : ''}`;

  return (
    <VentanaModal titulo={`${t('prestamo_titulo', 'Datos de la hipoteca / préstamo')}${posicion ? ` · ${posicion}` : ''}`} icono={<Landmark size={20} />} onCerrar={() => !ocupado && onCerrar()} ancho="max-w-5xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Ayuda>
            {archivo.nombre_original || archivo.nombre}
            {lectura?.leido_por ? ` · ${t('leido_por', 'Leído con')} ${lectura.leido_por}` : ''}
            {lectura?.banco ? ` · ${t('banco', 'Banco')}: ${lectura.banco}` : ''}
          </Ayuda>
          <Button type="button" variant="secondary" size="sm" loading={ocupado === 'ia'} disabled={Boolean(ocupado)} leftIcon={<Sparkles size={16} />} onClick={() => leer('ia')}>
            {t('leer_ia', 'Leer con IA')}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta={t('va_a_prestamo', 'Va a Préstamos ▸')}>
            <select value={prestamoId} onChange={(e) => cambiarPrestamo(e.target.value)} className={CLASE_INPUT} disabled={Boolean(ocupado)}>
              <option value="">{t('prestamo_nuevo', 'Préstamo nuevo')}</option>
              {prestamos.map((l) => <option key={l.id} value={l.id}>{l.alias} · {formatImporte(l.importe_concedido, '€')}</option>)}
            </select>
          </Campo>
          {nuevo && (
            <Campo etiqueta={t('cuenta_cargo', 'Cuenta de cargo *')}>
              <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className={CLASE_INPUT} disabled={Boolean(ocupado)}>
                <option value="">{t('elige_cuenta', 'Elige la cuenta')}</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.alias}{c.entidad_nombre ? ` · ${c.entidad_nombre}` : ''}{c.empresa_nombre ? ` · ${c.empresa_nombre}` : ''}</option>)}
              </select>
            </Campo>
          )}
        </div>
        {lectura && <Ayuda>{textoResumen}</Ayuda>}

        <AvisoError>{error}</AvisoError>
        {lectura?.avisos?.map((a) => <AvisoAtencion key={a}>{a}</AvisoAtencion>)}
        {ocupado === 'propio' && !lectura && <Ayuda>{t('leyendo', 'Leyendo el documento…')}</Ayuda>}
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
