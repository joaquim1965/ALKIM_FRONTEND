/**
 * ParametrosSistemaPage — Auxiliares → Parámetros del sistema (01/11/2026, petición del usuario).
 *
 * Parámetros generales que antes irían en el .env: se guardan en la BBDD (s_setting, clave
 * «parametros_sistema») y se aplican al momento, sin reiniciar. Los ve cualquiera con sesión;
 * los cambian solo los administradores (roles 2, 3 y 4).
 *
 * API: GET/PUT /parametros-sistema (BACKEND/services/parametrosSistema.js)
 */
import React, { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { useStore } from '../../hooks/useStore';
import {
  CabeceraPagina, Panel, CabeceraPanel, AvisoError, AvisoOk, CLASE_INPUT, TablaTema, claseFila, TD, Ayuda,
} from '../../components/UI/TemaPagina';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.message || `Error ${r.status}`);
  return b;
}

const PARAMS = [
  ['r2_espera_conexion_seg', 'Espera para conectar con el almacenamiento (R2)', 'Segundos. Si R2 no responde en este tiempo, la subida se guarda en el ordenador y se sube después (subida diferida).'],
  ['r2_intentos', 'Intentos de conexión con R2', 'Veces que se intenta conectar antes de dar la conexión por cortada.'],
  ['subida_reintento_min', 'Reintento de las subidas pendientes', 'Minutos entre un intento y el siguiente de subir los archivos pendientes.'],
];

export default function ParametrosSistemaPage() {
  const { t } = useTmTr('ParametrosSistema');
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
      const { data } = await pedir('/parametros-sistema');
      setValores(Object.fromEntries(Object.entries(data.valores).map(([k, v]) => [k, String(v)])));
      setDef(data.definicion || {}); setCambiado(false);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    setGuardando(true); setError(''); setAviso('');
    try {
      await pedir('/parametros-sistema', { method: 'PUT', body: JSON.stringify(valores) });
      await cargar();
      setAviso(t('guardado', 'Guardado. Ya se está aplicando.'));
    } catch (e) { setError(e.message); } finally { setGuardando(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <CabeceraPagina icono={<SlidersHorizontal size={24} />} titulo={t('titulo', 'Parámetros del sistema')}
        subtitulo={t('subtitulo', 'Ajustes generales de la aplicación, guardados en la base de datos.')} />
      <AvisoError>{error}</AvisoError>
      <AvisoOk>{aviso}</AvisoOk>
      <Panel className="overflow-hidden">
        <CabeceraPanel icono={<SlidersHorizontal size={20} />} titulo={t('almacenamiento', 'Almacenamiento de archivos')} />
        <div className="space-y-4 p-4">
          {!puedeEditar && <Ayuda>{t('solo_admin', 'Solo los administradores pueden cambiarlos.')}</Ayuda>}
          <TablaTema columnas={[{ texto: t('parametro', 'Parámetro') }, { texto: t('valor', 'Valor') }, { texto: t('por_defecto', 'Por defecto') }]}>
            {valores && PARAMS.map(([k, nombre, ayuda], i) => (
              <tr key={k} className={claseFila(i)}>
                <td className={TD}>
                  <p className="font-black">{t(k, nombre)}</p>
                  <p className="text-xs font-bold">{t(`${k}_ayuda`, ayuda)}</p>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <input type="number" min={def[k]?.min} max={def[k]?.max} step="1" disabled={!puedeEditar} value={valores[k] ?? ''}
                    aria-label={t(k, nombre)}
                    onChange={(e) => { setValores((v) => ({ ...v, [k]: e.target.value })); setCambiado(true); setAviso(''); }}
                    className={`${CLASE_INPUT} w-24 text-right font-mono`} />
                  <span className="ml-2 text-xs font-black">{def[k]?.unidad}</span>
                </td>
                <td className={`${TD} font-mono`}>{def[k]?.valor}{def[k]?.unidad ? ` ${def[k].unidad}` : ''}</td>
              </tr>
            ))}
          </TablaTema>
          {puedeEditar && (
            <div className="flex justify-end">
              <Button type="button" onClick={guardar} loading={guardando} disabled={!cambiado}>{t('guardar', 'Guardar')}</Button>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
