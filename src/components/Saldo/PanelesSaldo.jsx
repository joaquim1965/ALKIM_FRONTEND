import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTmTr } from '../../contexts/TmTrContext';
import situacionService from '../../services/situacionService';
import useEmpresaActiva, { esDeLaEmpresa } from '../../hooks/useEmpresaActiva';
import PanelSaldo from './PanelSaldo';
import EditorGrupos from './EditorGrupos';
import VentanaConfigSaldo from './VentanaConfigSaldo';

/**
 * El panel de Saldo (26/08/2026).
 *
 * Uno solo, con un desplegable para elegir qué enseña: saldos, gastos o
 * ingresos. Antes eran tres paneles a la vez y ocupaban una pantalla entera
 * para decir lo mismo tres veces; con el desplegable cabe en una esquina y deja
 * sitio a los demás paneles que vengan.
 */
export default function PanelesSaldo() {
  const { t } = useTmTr('Saldo');
  const navegar = useNavigate();
  const [datos, setDatos] = useState(null);
  const [vista, setVista] = useState('saldo');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [recado, setRecado] = useState('');
  const empresaActiva = useEmpresaActiva();

  // Las cuentas, sueltas de sus grupos: es lo que necesita el editor de grupos
  // para repartirlas. Sin filtrar por empresa a propósito — el editor de
  // Grupos gestiona todas las cuentas, elija lo que elija el desplegable de
  // arriba.
  const todasLasCuentas = (datos?.grupos || []).flatMap((g) => g.cuentas);

  // Este panel era el único de la aplicación que no miraba la empresa activa
  // de la barra superior — Bancos, Extractos y Movimientos sí la respetan.
  // Con «Todas las empresas» no cambia nada; al elegir una empresa concreta,
  // los paneles de Saldo/Gastos/Ingresos se quedan solo con sus cuentas
  // (11/09/2026).
  const datosVista = useMemo(() => {
    if (!datos) return datos;
    const grupos = datos.grupos.map((g) => ({
      ...g,
      cuentas: g.cuentas.filter((c) => esDeLaEmpresa(c, empresaActiva)),
    }));
    const clavesVisibles = new Set(grupos.flatMap((g) => g.cuentas).map((c) => c.clave));
    const sueltas = (datos.sueltas || []).filter((clave) => clavesVisibles.has(clave));
    return { ...datos, grupos, sueltas };
  }, [datos, empresaActiva]);

  // Cuentas sin grupo asignado en el fichero de configuración. El backend ya
  // no las esconde (van igualmente al primer grupo, para no perderlas de
  // vista), pero hasta hoy tampoco se avisaba de que estaban ahí sin colocar:
  // parecían una cuenta más del grupo donde caían. Se avisa aparte y se enlaza
  // directo al editor de Grupos para colocarlas (11/09/2026).
  const sueltas = datosVista?.sueltas || [];

  /**
   * Sin dependencias, y es importante.
   *
   * Tenía `[t]`, y `t` se rehace en cada pintado: el efecto de abajo veía una
   * función nueva cada vez, volvía a pedir los datos, eso repintaba… y así sin
   * parar. El panel se quedaba en «…» para siempre y el servidor recibía una
   * petición cada dos segundos (26/08/2026).
   *
   * Regla: una función que se pasa a `useEffect` no puede depender de nada que
   * se rehaga en cada pintado.
   */
  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setDatos(await situacionService.getSituacion());
    } catch (fallo) {
      setError(fallo.message || 'No se ha podido leer la situación.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (nueva) => {
    setGuardando(true);
    try {
      await situacionService.guardarConfig(nueva);
      setConfig(false);
      await cargar();
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Al pulsar una cuenta se abre la pantalla de Movimientos ya filtrada por esa
   * cuenta y ese periodo. Enseñarlos también aquí serían dos sitios haciendo lo
   * mismo, y el día que cambie uno el otro se queda viejo.
   */
  const abrirCuenta = (cuenta) => {
    const periodo = datos?.periodo || {};
    const parametros = new URLSearchParams({
      cuenta: String(cuenta.id),
      desde: periodo.desde || '',
      hasta: periodo.hasta || '',
    });
    navegar(`/tesoreria/movimientos?${parametros.toString()}`);
  };

  const actualizar = async () => {
    setActualizando(true);
    setRecado('');
    try {
      const respuesta = await situacionService.actualizarAtrasadas();
      const partes = [];
      if (respuesta.lanzadas?.length) {
        partes.push(`${t('lanzadas')}: ${respuesta.lanzadas.join(', ')}`);
      }
      if (respuesta.pendientes?.length) {
        partes.push(`${respuesta.pendientes.map((p) => p.clave).join(', ')} ${t('piden_codigo')}`);
      }
      setRecado(partes.join(' · ') || t('nada_que_actualizar'));
    } catch (fallo) {
      setRecado(fallo.message);
    } finally {
      setActualizando(false);
    }
  };

  return (
    <div className="space-y-3">
      {recado && (
        <p role="status" className="w-[340px] max-w-full break-words rounded-xl border-2 border-border bg-surface2 px-4 py-2 text-sm font-bold text-on-surface2">
          {recado}
        </p>
      )}

      {sueltas.length > 0 && vista !== 'grupos' && (
        <p role="alert" className="flex w-[340px] max-w-full flex-wrap items-center gap-x-2 gap-y-1 break-words rounded-xl border-2 border-warning bg-warning px-4 py-2 text-sm font-bold text-on-warning">
          <span>
            {sueltas.length === 1 ? '1 cuenta sin grupo asignado' : `${sueltas.length} cuentas sin grupo asignado`}: {sueltas.join(', ')}
          </span>
          <button type="button" onClick={() => setVista('grupos')} className="underline underline-offset-2">
            Ir a Grupos
          </button>
        </p>
      )}

      <div className="w-[340px] max-w-full">
        <PanelSaldo
          datos={datosVista} t={t} cargando={cargando} error={error}
          vista={vista} onVista={setVista}
          onCuenta={abrirCuenta}
          onActualizar={actualizar} actualizando={actualizando}
          onConfigurar={() => setConfig(true)}
          editor={datos?.config ? (
            <EditorGrupos
              config={datos.config} cuentas={todasLasCuentas} t={t}
              guardando={guardando} onGuardar={guardar}
            />
          ) : null}
        />
      </div>

      {config && datos?.config && (
        <VentanaConfigSaldo
          config={datos.config} t={t} guardando={guardando}
          onCerrar={() => setConfig(false)} onGuardar={guardar}
        />
      )}
    </div>
  );
}
