import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Eye, Trash2, FileText } from 'lucide-react';
import { useTmTr } from '../../contexts/TmTrContext';
import { Button, Spinner } from '../../components/UI';
import {
  MICRO, AvisoError, AvisoOk, VentanaModal, TablaTema, claseFila, BotonFila, TD, FilaVacia,
} from '../../components/UI/TemaPagina';
import { apiFetch, authHeaders } from '../../services/api';
import useEmpresaActiva, { esDeLaEmpresa } from '../../hooks/useEmpresaActiva';

/**
 * Fiscalidad → Extractos bancarios → pestaña «Justificantes» (03/10/2026).
 *
 * Una fila por justificante guardado en R2 con el rango de fechas que cubre.
 * Filtros: año, banco y cuenta. Pulsar la fila (o «Ver») lo abre en pantalla,
 * dentro de la aplicación. «Eliminar» lo aparta a la PAPELERA de R2 (no se
 * borra): el periodo vuelve a salir pendiente en «Situación» y la descarga lo
 * repite.
 */
const pad = (n) => String(n).padStart(2, '0');
const fecha = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const guardado = (d) => {
  if (!d) return '—';
  const f = new Date(d);
  return `${pad(f.getDate())}/${pad(f.getMonth() + 1)}/${f.getFullYear()} ${pad(f.getHours())}:${pad(f.getMinutes())}`;
};
const tamano = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((b || 0) / 1024))} kB`);

const Selector = ({ id, rotulo, valor, onChange, children, ancho = 'min-w-[200px]' }) => (
  <div className="flex items-center gap-3">
    <label htmlFor={id} className={`${MICRO} text-on-surface2`}>{rotulo}</label>
    <div className="relative">
      <select
        id={id} value={valor} onChange={(e) => onChange(e.target.value)}
        className={`input-base h-[45px] ${ancho} appearance-none rounded-xl border-border bg-background pl-4 pr-10 text-sm font-bold`}
      >
        {children}
      </select>
    </div>
  </div>
);

const JustificantesTab = ({ anios }) => {
  const { t } = useTmTr('Fiscalidad');
  const empresaActiva = useEmpresaActiva();
  const [anio, setAnio] = useState(anios[0]);
  const [banco, setBanco] = useState('');
  const [crid, setCrid] = useState('');
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  // El justificante abierto en pantalla: { fila, url, texto, cargando }.
  const [visor, setVisor] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const TIPOS = {
    trimestral: t('type_quarterly', 'Trimestral'),
    mensual: t('type_monthly', 'Mensual'),
    resumen: t('type_summary', 'Resumen del banco'),
    sin_movimientos: t('type_no_movements', 'Sin movimientos'),
    otro: t('type_other', 'Otro'),
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const respuesta = await apiFetch(`/fiscal/extractos/justificantes?anio=${anio}`, { headers: authHeaders() });
      const res = await respuesta.json().catch(() => {
        throw new Error(`${t('no_server', 'El servidor no ha contestado')} (${respuesta.status}).`);
      });
      if (!res.success) throw new Error(res.message || res.error?.message || `${t('no_server', 'El servidor no ha contestado')} (${respuesta.status}).`);
      setFilas(res.data.justificantes || []);
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); }, [anio]);

  const deLaEmpresa = useMemo(() => filas.filter((f) => esDeLaEmpresa(f, empresaActiva)), [filas, empresaActiva]);
  const bancos = useMemo(() => [...new Set(deLaEmpresa.map((f) => f.banco))], [deLaEmpresa]);
  const cuentas = useMemo(() => {
    const mapa = new Map();
    deLaEmpresa.filter((f) => !banco || f.banco === banco).forEach((f) => mapa.set(f.crid, f));
    return [...mapa.values()];
  }, [deLaEmpresa, banco]);
  const visibles = deLaEmpresa.filter((f) => (!banco || f.banco === banco) && (!crid || String(f.crid) === String(crid)));

  const cerrarVisor = () => {
    if (visor?.url) URL.revokeObjectURL(visor.url);
    setVisor(null);
  };

  const abrir = async (fila) => {
    setVisor({ fila, cargando: true });
    try {
      const respuesta = await apiFetch(`/fiscal/extractos/fichero?clave=${encodeURIComponent(fila.clave)}`, { headers: authHeaders() });
      if (!respuesta.ok) {
        const res = await respuesta.json().catch(() => ({}));
        throw new Error(res.message || res.error?.message || t('file_error', 'No se pudo abrir el justificante.'));
      }
      const blob = await respuesta.blob();
      if (/\.pdf$/i.test(fila.clave)) setVisor({ fila, url: URL.createObjectURL(blob) });
      else setVisor({ fila, texto: await blob.text() });
    } catch (error) {
      setVisor(null);
      setAviso({ tipo: 'error', texto: error.message });
    }
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      const respuesta = await apiFetch(`/fiscal/extractos/fichero?clave=${encodeURIComponent(aEliminar.clave)}`, { method: 'DELETE', headers: authHeaders() });
      const res = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok || !res.success) throw new Error(res.message || res.error?.message || t('delete_error', 'No se pudo eliminar el justificante.'));
      setFilas((actuales) => actuales.filter((f) => f.clave !== aEliminar.clave));
      setAviso({ tipo: 'ok', texto: `${aEliminar.nombre}: ${t('deleted', 'eliminado (queda en la papelera)')}` });
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message });
    } finally {
      setEliminando(false);
      setAEliminar(null);
    }
  };

  const periodo = (f) => (f.desde ? `${fecha(f.desde)} – ${fecha(f.hasta)}` : '—');

  const COLUMNAS = [
    { texto: t('col_actions', 'Acciones') },
    { texto: t('bank', 'Banco') },
    { texto: t('account', 'Cuenta') },
    { texto: t('period', 'Fechas que cubre') },
    { texto: t('type', 'Tipo') },
    { texto: t('saved', 'Guardado') },
    { texto: t('size', 'Tamaño'), derecha: true },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-5">
        <Selector id="just-anio" rotulo={t('year', 'Año')} valor={anio} onChange={(v) => setAnio(Number(v))} ancho="min-w-[120px]">
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </Selector>
        <Selector id="just-banco" rotulo={t('bank', 'Banco')} valor={banco} onChange={(v) => { setBanco(v); setCrid(''); }} ancho="min-w-[240px]">
          <option value="">{t('all', 'Todos')}</option>
          {bancos.map((b) => <option key={b} value={b}>{b}</option>)}
        </Selector>
        <Selector id="just-cuenta" rotulo={t('account', 'Cuenta')} valor={crid} onChange={setCrid} ancho="min-w-[240px]">
          <option value="">{t('all_f', 'Todas')}</option>
          {cuentas.map((c) => <option key={c.crid} value={c.crid}>{c.alias} ···· {c.ultimos4}</option>)}
        </Selector>
        <span className={`${MICRO} text-on-background`}>{visibles.length} {t('receipts', 'justificantes')}</span>
      </div>

      {aviso?.tipo === 'ok' ? <AvisoOk>{aviso.texto}</AvisoOk> : <AvisoError>{aviso?.texto}</AvisoError>}

      {/* Tabla con los colores de tabla del tema (TemaPagina, 03/10/2026). */}
      <TablaTema columnas={COLUMNAS} className="bg-surface2">
        {cargando && (
          <tr className="bg-table-row text-on-table-row"><td colSpan={COLUMNAS.length} className="px-4 py-12"><div className="flex justify-center"><Spinner size="lg" /></div></td></tr>
        )}
        {!cargando && !visibles.length && (
          <FilaVacia columnas={COLUMNAS.length}>{t('no_receipts', 'No hay justificantes guardados con estos filtros.')}</FilaVacia>
        )}
        {!cargando && visibles.map((f, i) => (
          <tr key={f.clave} onClick={() => abrir(f)} title={f.nombre} className={claseFila(i, { clic: true })}>
            <td className={TD} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <BotonFila icono={<Eye size={14} />} texto={t('view', 'Ver')} onClick={() => abrir(f)} />
                <BotonFila icono={<Trash2 size={14} />} texto={t('delete', 'Eliminar')} onClick={() => setAEliminar(f)} />
              </div>
            </td>
            <td className={`${TD} font-bold`}>{f.banco}</td>
            <td className={TD}><span className="font-bold">{f.alias}</span> <span className="font-mono text-xs">···· {f.ultimos4}</span></td>
            <td className={`${TD} font-mono font-bold`}>{periodo(f)}</td>
            <td className={TD}>{TIPOS[f.tipo] || f.tipo}</td>
            <td className={`${TD} font-mono`}>{guardado(f.guardado)}</td>
            <td className={`${TD} text-right font-mono`}>{tamano(f.bytes)}</td>
          </tr>
        ))}
      </TablaTema>

      {/* El justificante, en pantalla: la ventana del tema (VentanaModal). */}
      {visor && (
        <VentanaModal
          titulo={`${visor.fila.banco} · ${visor.fila.alias} · ${periodo(visor.fila)}`}
          icono={<FileText size={20} />} onCerrar={cerrarVisor} ancho="max-w-6xl"
        >
          {visor.cargando && <div className="flex justify-center p-16"><Spinner size="lg" /></div>}
          {visor.url && <iframe title={visor.fila.nombre} src={visor.url} className="h-[72vh] w-full rounded-2xl border border-border bg-white" />}
          {visor.texto !== undefined && (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface2 p-5 text-on-background">
              <FileText size={20} className="shrink-0" />
              <pre className="whitespace-pre-wrap text-sm font-bold">{visor.texto}</pre>
            </div>
          )}
        </VentanaModal>
      )}

      {/* Confirmación antes de eliminar, en la misma ventana del tema. */}
      {aEliminar && (
        <VentanaModal
          titulo={t('delete_title', 'Eliminar justificante')} icono={<Trash2 size={20} />}
          onCerrar={() => !eliminando && setAEliminar(null)} ancho="max-w-lg"
        >
          <div className="space-y-3 text-sm text-on-background">
            <p className="font-bold">{aEliminar.banco} · {aEliminar.alias} · {periodo(aEliminar)}</p>
            <p className="font-mono text-xs">{aEliminar.nombre}</p>
            <p>{t('delete_hint', 'Se aparta a la papelera del almacén (se puede recuperar). El periodo volverá a salir pendiente y la próxima descarga lo repetirá.')}</p>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAEliminar(null)} disabled={eliminando}>{t('cancel', 'Cancelar')}</Button>
            <Button variant="danger" onClick={eliminar} disabled={eliminando} leftIcon={eliminando ? <Spinner size="xs" /> : <Trash2 size={15} />}>{t('delete', 'Eliminar')}</Button>
          </div>
        </VentanaModal>
      )}
    </div>
  );
};

export default JustificantesTab;
