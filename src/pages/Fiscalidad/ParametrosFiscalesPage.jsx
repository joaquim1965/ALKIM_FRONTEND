/**
 * ParametrosFiscalesPage — Fiscalidad → Parámetros fiscales (28/10/2026, petición del usuario).
 *
 * Los % de amortización y los plazos de garantía que usan los cálculos, para poder verlos y
 * cambiarlos sin tocar el código. Cada valor lleva «Desde el año»: si algún día cambia (p. ej.
 * el 3 % pasa al 4 % desde 2029) se añade una línea y los años anteriores NO se recalculan.
 * Los ve quien ve propiedades; los cambian solo los administradores.
 *
 * API: GET/PUT /fiscal/parametros
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Percent, Plus, Trash2, Check } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { useStore } from '../../hooks/useStore';
import {
  CabeceraPagina, Panel, CabeceraPanel, AvisoError, AvisoOk, CLASE_INPUT, TablaTema, claseFila, TD, BotonFila, MICRO, Ayuda,
} from '../../components/UI/TemaPagina';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.message || `Error ${r.status}`);
  return b;
}

const DESDE_SIEMPRE = 1900;
const PARAMS = [
  ['amort_inmueble', 'Amortización del inmueble, ampliaciones y mejoras', 'Porcentaje anual. Lo usan las pestañas Compra (resumen de la compra) y Hacienda.'],
  ['amort_mobiliario', 'Amortización de mobiliario y electrodomésticos', 'Porcentaje anual. Lo usa la pestaña Hacienda.'],
  ['garantia_compra_meses', 'Garantía de una compra', 'Meses. Plazo que se propone para cada bien en la pestaña Garantías.'],
  ['garantia_reparacion_meses', 'Garantía de una reparación', 'Meses. Plazo que se propone para cada reparación en la pestaña Garantías.'],
];
const ahora = new Date().getFullYear();
const vigente = (lista) => { let v = lista[0]?.valor; for (const x of lista) if (Number(x.desde) <= ahora) v = x.valor; return v; };

export default function ParametrosFiscalesPage() {
  const { t } = useTmTr('ParametrosFiscales');
  const { user } = useStore();
  const puedeEditar = [2, 3, 4].includes(Number(user?.rol));
  const [valores, setValores] = useState(null);
  const [def, setDef] = useState({});
  const [cambiado, setCambiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    try {
      const { data } = await pedir('/fiscal/parametros');
      setValores(Object.fromEntries(Object.entries(data.valores).map(([k, l]) => [k, l.map((x) => ({ desde: String(x.desde), valor: String(x.valor).replace('.', ',') }))])));
      setDef(data.definicion || {}); setCambiado(false);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (p, i, k, v) => { setValores((x) => ({ ...x, [p]: x[p].map((f, j) => (j === i ? { ...f, [k]: v } : f)) })); setCambiado(true); setAviso(''); };
  const anadir = (p) => {
    setValores((x) => {
      const ultimo = x[p][x[p].length - 1];
      const desde = Math.max(ahora + 1, Number(ultimo?.desde || 0) + 1);
      return { ...x, [p]: [...x[p], { desde: String(desde), valor: ultimo?.valor || '' }] };
    });
    setCambiado(true); setAviso('');
  };
  const quitar = (p, i) => { setValores((x) => ({ ...x, [p]: x[p].filter((_, j) => j !== i) })); setCambiado(true); setAviso(''); };

  const guardar = async () => {
    setGuardando(true); setError(''); setAviso('');
    try {
      const cuerpo = Object.fromEntries(Object.entries(valores).map(([k, l]) => [k, l.map((x) => ({ desde: Number(x.desde) || DESDE_SIEMPRE, valor: Number(String(x.valor).replace(',', '.')) }))]));
      await pedir('/fiscal/parametros', { method: 'PUT', body: JSON.stringify(cuerpo) });
      setAviso(t('guardados', 'Parámetros guardados. Los cálculos los usan desde ahora.'));
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <CabeceraPagina icono={<Percent size={24} />} titulo={t('titulo', 'Parámetros fiscales')}
        subtitulo={t('subtitulo', 'Amortizaciones y plazos de garantía')}>
        {puedeEditar && (
          <Button type="button" leftIcon={<Check size={16} />} loading={guardando} disabled={!cambiado || guardando} onClick={guardar}>{t('guardar', 'Guardar')}</Button>
        )}
      </CabeceraPagina>
      <Ayuda>{t('ayuda', 'Cada valor vale «desde el año» indicado. Si un valor cambia, añade una línea con el año desde el que se aplica: los años anteriores se siguen calculando con el valor de entonces.')}</Ayuda>
      {!puedeEditar && <Ayuda>{t('solo_admin', 'Solo los administradores pueden cambiarlos.')}</Ayuda>}
      <AvisoError>{error}</AvisoError>
      <AvisoOk>{aviso}</AvisoOk>

      {!valores && !error && <p className={MICRO}>{t('cargando', 'Cargando…')}</p>}
      {valores && (
        <div className="grid gap-5 lg:grid-cols-2">
          {PARAMS.map(([p, nombre, ayuda]) => {
            const unidad = def[p]?.unidad === '%' ? '%' : t('meses', 'meses');
            const lista = valores[p] || [];
            return (
              <Panel key={p} className="overflow-hidden">
                <CabeceraPanel titulo={t(`p_${p}`, nombre)}>
                  <span className="rounded-xl border border-border bg-surface1 px-3 py-1 font-mono text-xl font-black text-on-surface1">
                    {String(vigente(lista) ?? '').replace('.', ',')} {unidad}
                  </span>
                </CabeceraPanel>
                <div className="space-y-3 p-5">
                  <Ayuda>{t(`a_${p}`, ayuda)}</Ayuda>
                  <TablaTema columnas={[{ texto: t('desde', 'Desde el año') }, { texto: `${t('valor', 'Valor')} (${unidad})`, derecha: true }, { texto: '' }]}>
                    {lista.map((x, i) => (
                      <tr key={i} className={claseFila(i)}>
                        <td className={TD}>
                          {i === 0
                            ? <span className="font-bold">{t('siempre', 'Desde siempre')}</span>
                            : <input type="number" min="1901" max="2200" value={x.desde} disabled={!puedeEditar} onChange={(e) => cambiar(p, i, 'desde', e.target.value)} className={`${CLASE_INPUT} w-28 font-mono`} />}
                        </td>
                        <td className={`${TD} text-right`}>
                          <input inputMode="decimal" value={x.valor} disabled={!puedeEditar} onChange={(e) => cambiar(p, i, 'valor', e.target.value)} className={`${CLASE_INPUT} w-28 text-right font-mono`} />
                        </td>
                        <td className={TD}>{puedeEditar && i > 0 && <BotonFila icono={<Trash2 size={15} />} titulo={t('quitar', 'Quitar')} onClick={() => quitar(p, i)} />}</td>
                      </tr>
                    ))}
                  </TablaTema>
                  {puedeEditar && (
                    <Button type="button" variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={() => anadir(p)}>{t('anadir', 'Añadir un cambio (desde un año)')}</Button>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
