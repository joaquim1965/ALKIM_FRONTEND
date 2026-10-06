/**
 * LecturaCompraventa.jsx — al subir una ESCRITURA DE COMPRAVENTA en Documentos de
 * la propiedad se lee sola y se pasa a la propiedad con la forma estándar
 * (components/Documentos/ComparadorCampos.jsx, docs/NORMAS_DESARROLLO.md §12).
 *
 *   - Ficha (pestaña Datos): finca, registro, ref. catastral, superficies,
 *     dirección y año, como la nota simple.
 *   - Compra: precio pagado al vendedor (se reparte a los titulares por su %).
 *   - Titulares: cada comprador que esté en Entidades (por NIF) se puede dar de
 *     alta con su %, la fecha de la escritura y título «Compraventa».
 *   - «Leer con IA» (opcional) vuelve a leer y sustituye lo leído.
 *
 * API: POST /propiedades/:id/compraventa/leer · PATCH /propiedades/:id/campos ·
 *      POST /propiedades/:id/titulares · PUT /propiedades/:id/precio-compra
 */
import React, { useEffect, useState } from 'react';
import { FileSignature, Sparkles, Check } from 'lucide-react';
import Button from '../../components/UI/Button';
import { VentanaModal, AvisoError, AvisoAtencion, Ayuda, Campo, CLASE_INPUT, TablaTema, TD, claseFila } from '../../components/UI/TemaPagina';
import ComparadorCampos, { eleccionInicial, cambiosElegidos } from '../../components/Documentos/ComparadorCampos';
import { CAMPOS_FICHA } from './LecturaNotaSimple';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import CampoFecha from '../../components/UI/CampoFecha';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

const CAMPOS = [{ c: 'precio_compra', nombre: 'Precio pagado al vendedor', tipo: 'importe' }, ...CAMPOS_FICHA];
const fechaEs = (f) => (f ? String(f).slice(0, 10).split('-').reverse().join('/') : '—');

export default function LecturaCompraventa({ propiedadId, archivo, posicion, onCerrar, onAplicado }) {
  const { t } = useTmTr('Propiedades');
  const [lectura, setLectura] = useState(null);   // { leidos, actuales, compra, compradores, titulares, leido_por, avisos }
  const [eleccion, setEleccion] = useState({});
  const [altas, setAltas] = useState({});         // nif → { marcado, porcentaje }
  const [fecha, setFecha] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');

  const leer = async (modo) => {
    setOcupado(modo); setError('');
    try {
      const { data } = await pedir(`/propiedades/${propiedadId}/compraventa/leer`, { method: 'POST', body: JSON.stringify({ archivo_id: archivo.id, modo }) });
      setLectura(data);
      setEleccion(eleccionInicial(CAMPOS, data.leidos, data.actuales));
      setFecha(data.compra?.fecha || '');
      const ya = new Set((data.titulares || []).map((x) => Number(x.titular_id)));
      setAltas(Object.fromEntries((data.compradores || []).map((c) => [c.nif, {
        marcado: Boolean(c.entidad_id) && !ya.has(Number(c.entidad_id)),
        porcentaje: c.porcentaje == null ? '' : String(c.porcentaje).replace('.', ','),
      }])));
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };
  useEffect(() => { leer('propio'); }, [archivo.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambios = lectura ? cambiosElegidos(CAMPOS, lectura.leidos, lectura.actuales, eleccion) : {};
  const nuevos = (lectura?.compradores || []).filter((c) => c.entidad_id && altas[c.nif]?.marcado);
  const n = Object.keys(cambios).length + nuevos.length;
  const yaTitular = (c) => (lectura?.titulares || []).some((x) => Number(x.titular_id) === Number(c.entidad_id));

  const aplicar = async () => {
    if (!n) return onCerrar();
    setOcupado('aplicar'); setError('');
    try {
      if (nuevos.length && !fecha) throw new Error(t('falta_fecha_adq', 'Indica la fecha de adquisición para dar de alta a los titulares.'));
      const { precio_compra: precio, ...ficha } = cambios;
      if (Object.keys(ficha).length) await pedir(`/propiedades/${propiedadId}/campos`, { method: 'PATCH', body: JSON.stringify(ficha) });
      // Titulares antes que el precio: el precio se reparte entre los titulares vigentes por su %.
      for (const c of nuevos) {
        await pedir(`/propiedades/${propiedadId}/titulares`, { method: 'POST', body: JSON.stringify({
          titular_id: c.entidad_id, porcentaje: Number(String(altas[c.nif].porcentaje).replace(',', '.')),
          tipo_derecho: 'PLENO_DOMINIO', titulo_adquisicion: 'COMPRAVENTA', fecha_adquisicion: fecha,
          notas: lectura.compra?.protocolo ? `Escritura nº ${lectura.compra.protocolo}${lectura.compra.notario ? ` · ${lectura.compra.notario}` : ''}`.slice(0, 255) : undefined,
        }) });
      }
      if ('precio_compra' in cambios) await pedir(`/propiedades/${propiedadId}/precio-compra`, { method: 'PUT', body: JSON.stringify({ precio_compra: precio }) });
      await onAplicado?.(ficha);
      onCerrar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };

  const compra = lectura?.compra || {};
  return (
    <VentanaModal titulo={`${t('cv_titulo', 'Datos de la escritura de compraventa')}${posicion ? ` · ${posicion}` : ''}`} icono={<FileSignature size={20} />} onCerrar={() => !ocupado && onCerrar()} ancho="max-w-5xl">
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
        {lectura && (
          <Ayuda>
            {t('cv_destino', 'Van a la ficha de la propiedad (Datos), al precio de compra (Compra) y a Titulares.')}
            {compra.fecha || compra.protocolo || compra.notario
              ? ` ${t('cv_escritura', 'Escritura')}: ${[compra.fecha && fechaEs(compra.fecha), compra.protocolo && `nº ${compra.protocolo}`, compra.notario].filter(Boolean).join(' · ')}.`
              : ''}
          </Ayuda>
        )}
        <AvisoError>{error}</AvisoError>
        {lectura?.avisos?.map((a) => <AvisoAtencion key={a}>{a}</AvisoAtencion>)}
        {ocupado === 'propio' && !lectura && <Ayuda>{t('leyendo', 'Leyendo el documento…')}</Ayuda>}

        {lectura?.compradores?.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-[11px] font-black uppercase tracking-widest">{t('cv_compradores', 'Compradores → Titulares')}</h3>
            <TablaTema columnas={[{ texto: t('dar_alta', 'Dar de alta') }, { texto: t('comprador', 'Comprador') }, { texto: t('entidad', 'En Entidades') }, { texto: '%', derecha: true }]}>
              {lectura.compradores.map((c, i) => (
                <tr key={c.nif} className={claseFila(i)}>
                  <td className={TD}>
                    <input type="checkbox" className="h-5 w-5" disabled={!c.entidad_id || yaTitular(c) || Boolean(ocupado)} checked={Boolean(altas[c.nif]?.marcado)}
                      aria-label={`${t('dar_alta', 'Dar de alta')} ${c.nombre}`}
                      onChange={(e) => setAltas((a) => ({ ...a, [c.nif]: { ...a[c.nif], marcado: e.target.checked } }))} />
                  </td>
                  <td className={`${TD} font-bold`}>{c.nombre} <span className="font-mono">· {c.nif}</span></td>
                  <td className={TD}>{c.entidad_id ? (yaTitular(c) ? `${c.entidad_nombre} · ${t('ya_titular', 'ya es titular')}` : c.entidad_nombre) : t('no_en_entidades', 'No está: dalo de alta en Entidades')}</td>
                  <td className={`${TD} text-right`}>
                    <input inputMode="decimal" value={altas[c.nif]?.porcentaje ?? ''} disabled={!altas[c.nif]?.marcado || Boolean(ocupado)}
                      onChange={(e) => setAltas((a) => ({ ...a, [c.nif]: { ...a[c.nif], porcentaje: e.target.value } }))} className={`${CLASE_INPUT} w-24 text-right font-mono`} />
                  </td>
                </tr>
              ))}
            </TablaTema>
            <div className="max-w-xs">
              <Campo etiqueta={t('fecha_adq', 'Fecha de adquisición')}>
                <CampoFecha value={fecha} onChange={(e) => setFecha(e.target.value)} className={CLASE_INPUT} disabled={Boolean(ocupado)} />
              </Campo>
            </div>
          </section>
        )}

        {lectura && <ComparadorCampos campos={CAMPOS} leidos={lectura.leidos} actuales={lectura.actuales} eleccion={eleccion} t={t}
          onElegir={(c, cambio) => setEleccion((e) => ({ ...e, [c]: { ...e[c], ...cambio } }))} />}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={Boolean(ocupado)} onClick={onCerrar}>{t('no_cambiar', 'No cambiar nada')}</Button>
          <Button type="button" loading={ocupado === 'aplicar'} disabled={Boolean(ocupado) || !lectura} leftIcon={<Check size={16} />} onClick={aplicar}>
            {n ? `${t('aplicar', 'Aplicar')} (${n})` : t('aplicar', 'Aplicar')}
          </Button>
        </div>
      </div>
    </VentanaModal>
  );
}
