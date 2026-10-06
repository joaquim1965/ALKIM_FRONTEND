/**
 * LecturaNotaSimple.jsx — al subir una NOTA SIMPLE en Documentos de la propiedad
 * se lee sola (sin botón) y se enseña, campo a campo, el valor actual y el leído
 * (components/Documentos/ComparadorCampos.jsx). «Leer con IA» vuelve a leer y
 * sustituye lo leído. No se añaden campos: solo los que ya tiene la ficha.
 *
 * API: POST /propiedades/:id/leer-documento · PATCH /propiedades/:id/campos
 */
import React, { useEffect, useState } from 'react';
import { ScanText, Sparkles, Check } from 'lucide-react';
import Button from '../../components/UI/Button';
import { VentanaModal, AvisoError, AvisoAtencion, Ayuda } from '../../components/UI/TemaPagina';
import ComparadorCampos, { eleccionInicial, cambiosElegidos } from '../../components/Documentos/ComparadorCampos';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { TIPOS_VIA } from '../../utils/direccion';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

export const CAMPOS_FICHA = [
  { c: 'finca_registral', nombre: 'Finca registral' }, { c: 'registro_propiedad', nombre: 'Registro de la Propiedad' },
  { c: 'ref_catastral', nombre: 'Referencia catastral' }, { c: 'tipo_via', nombre: 'Tipo de vía', tipo: 'lista', opciones: TIPOS_VIA },
  { c: 'via', nombre: 'Calle' }, { c: 'numero', nombre: 'Número' }, { c: 'escalera', nombre: 'Escalera' }, { c: 'planta', nombre: 'Planta' },
  { c: 'puerta', nombre: 'Puerta' }, { c: 'codigo_postal', nombre: 'Código postal' }, { c: 'municipio', nombre: 'Municipio' },
  { c: 'provincia', nombre: 'Provincia' }, { c: 'superficie_util', nombre: 'Superficie útil (m²)', tipo: 'numero' },
  { c: 'superficie_construida', nombre: 'Superficie construida (m²)', tipo: 'numero' }, { c: 'anyo_construccion', nombre: 'Año de construcción', tipo: 'numero' },
];

export default function LecturaNotaSimple({ propiedadId, archivo, posicion, onCerrar, onAplicado }) {
  const { t } = useTmTr('Propiedades');
  const [lectura, setLectura] = useState(null);     // { leidos, actuales, leido_por, avisos }
  const [eleccion, setEleccion] = useState({});
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');

  const leer = async (modo) => {
    setOcupado(modo); setError('');
    try {
      const { data } = await pedir(`/propiedades/${propiedadId}/leer-documento`, { method: 'POST', body: JSON.stringify({ archivo_id: archivo.id, modo }) });
      setLectura(data);
      setEleccion(eleccionInicial(CAMPOS_FICHA, data.leidos, data.actuales));
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };
  useEffect(() => { leer('propio'); }, [archivo.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambios = lectura ? cambiosElegidos(CAMPOS_FICHA, lectura.leidos, lectura.actuales, eleccion) : {};
  const n = Object.keys(cambios).length;

  const aplicar = async () => {
    if (!n) return onCerrar();
    setOcupado('aplicar'); setError('');
    try {
      await pedir(`/propiedades/${propiedadId}/campos`, { method: 'PATCH', body: JSON.stringify(cambios) });
      await onAplicado?.(cambios);
      onCerrar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(''); }
  };

  return (
    <VentanaModal titulo={`${t('nota_titulo', 'Datos de la nota simple')}${posicion ? ` · ${posicion}` : ''}`} icono={<ScanText size={20} />} onCerrar={() => !ocupado && onCerrar()} ancho="max-w-5xl">
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
        <Ayuda>{t('nota_destino', 'Los datos van a la ficha de la propiedad (pestaña Datos).')}</Ayuda>
        <AvisoError>{error}</AvisoError>
        {lectura?.avisos?.map((a) => <AvisoAtencion key={a}>{a}</AvisoAtencion>)}
        {ocupado === 'propio' && !lectura && <Ayuda>{t('leyendo', 'Leyendo el documento…')}</Ayuda>}
        {lectura && <ComparadorCampos campos={CAMPOS_FICHA} leidos={lectura.leidos} actuales={lectura.actuales} eleccion={eleccion} t={t}
          onElegir={(c, cambio) => setEleccion((e) => ({ ...e, [c]: { ...e[c], ...cambio } }))} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={Boolean(ocupado)} onClick={onCerrar}>{t('no_cambiar', 'No cambiar nada')}</Button>
          <Button type="button" loading={ocupado === 'aplicar'} disabled={Boolean(ocupado) || !lectura} leftIcon={<Check size={16} />} onClick={aplicar}>
            {n ? `${t('aplicar', 'Aplicar')} (${n})` : t('aplicar', 'Aplicar')}
          </Button>
        </div>
      </div>
    </VentanaModal>
  );
}
