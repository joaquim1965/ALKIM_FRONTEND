import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Eye, FilterX, RefreshCw, X } from 'lucide-react';
import { Button, Card, Spinner } from '../../components/UI';
import bancosService from '../../services/bancosService';
import useEmpresaActiva, { esDeLaEmpresa } from '../../hooks/useEmpresaActiva';
import { useTmTr } from '../../contexts/TmTrContext';
import CampoFecha from '../../components/UI/CampoFecha';

// Millares con punto, siempre: `useGrouping: 'always'` (ver utils/format.js).
const money = (value, currency = 'EUR') => new Intl.NumberFormat('es-ES', {
  style: 'currency', currency, useGrouping: 'always',
}).format(Number(value || 0));

const csv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

// «BS/Alkim»: la abreviatura de la entidad y el alias de la cuenta.
//
// La abreviatura dice de qué banco es sin gastar media columna, y el alias
// distingue dos cuentas que se llaman igual en bancos distintos. Si un banco
// aún no tiene abreviatura se usa su nombre antes que dejar el hueco en blanco
// (26/08/2026).
const bancoBarraCuenta = (movimiento, t) => {
  const banco = movimiento.banco_abreviatura || movimiento.banco_nombre || t('bank_unknown');
  const cuenta = movimiento.cuenta_alias || '';
  return cuenta ? `${banco}/${cuenta}` : banco;
};

export default function MovimientosPage() {
  const { t } = useTmTr('Movimientos');
  const [accounts, setAccounts] = useState([]);
  const [movements, setMovements] = useState([]);
  // El panel de Saldo entra aquí con la cuenta y el periodo puestos: al pulsar
  // una cuenta se abre esta pantalla ya filtrada, en vez de repetir la lista de
  // movimientos dentro del panel (26/08/2026).
  const [parametros] = useSearchParams();
  const [filters, setFilters] = useState({
    cuenta: parametros.get('cuenta') || '',
    desde: parametros.get('desde') || '',
    hasta: parametros.get('hasta') || '',
    estado: '',
    buscar: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const empresaActiva = useEmpresaActiva();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, result] = await Promise.all([
        bancosService.getDashboard(), bancosService.getMovements(filters),
      ]);
      setAccounts(dashboard.accounts || []);
      setMovements(result.movements || []);
    } catch (loadError) {
      setError(loadError.message || t('error_load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // La empresa elegida arriba manda también aquí: antes esta pantalla la
  // ignoraba y enseñaba los movimientos de todas (23/08/2026). Los de cuentas
  // sin empresa asignada se siguen viendo, para que no desaparezcan sin más.
  const cuentasVisibles = useMemo(
    () => accounts.filter((cuenta) => esDeLaEmpresa(cuenta, empresaActiva)),
    [accounts, empresaActiva]
  );
  // Las cuentas, agrupadas por banco.
  //
  // Hay cuentas que se llaman igual en bancos distintos —«Alkim» y «Alkim»,
  // «FC» y «FC»— y en una lista plana no hay forma de saber cuál es cuál: se
  // elegía la equivocada sin enterarse (26/08/2026). Con el banco de cabecera y
  // sus cuentas debajo, el nombre repetido deja de ser ambiguo.
  //
  // La cabecera es un `optgroup`: se ve, ordena la lista y **no se puede
  // elegir**, que es justo lo que hace falta — un banco no es una cuenta.
  const porBanco = useMemo(() => {
    const grupos = new Map();
    for (const cuenta of cuentasVisibles) {
      const banco = cuenta.banco_nombre || t('bank_unknown');
      if (!grupos.has(banco)) grupos.set(banco, []);
      grupos.get(banco).push(cuenta);
    }
    // Los bancos por orden alfabético, y dentro cada cuenta por su alias: así
    // la lista no baila de una carga a otra.
    return [...grupos.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'es'))
      .map(([banco, cuentas]) => [
        banco,
        cuentas.sort((x, y) => String(x.alias || '').localeCompare(String(y.alias || ''), 'es')),
      ]);
  }, [cuentasVisibles, t]);

  // Los filtros filtran de verdad.
  //
  // Hasta el 26/08/2026 esta lista solo se filtraba por empresa: `filters` se
  // usaba al pedir los movimientos al servidor y `load()` solo corría al abrir
  // la pantalla, así que elegir un banco o una cuenta no cambiaba nada de lo
  // que se veía. Se aplican aquí, sobre lo que ya está cargado, y el resultado
  // es inmediato en vez de esperar al servidor.
  const visibles = useMemo(() => {
    const buscar = filters.buscar.trim().toLowerCase();
    return movements.filter((movimiento) => {
      if (!esDeLaEmpresa(movimiento, empresaActiva)) return false;
      if (filters.cuenta && String(movimiento.cuenta_id) !== String(filters.cuenta)) return false;
      // El desplegable manda «pendiente» / «conciliado» —los mismos valores que
      // entiende el servidor—, y el movimiento trae un número: 0 es pendiente y
      // cualquier otra cosa, conciliado.
      const conciliado = Number(movimiento.estatus) !== 0;
      if (filters.estado === 'pendiente' && conciliado) return false;
      if (filters.estado === 'conciliado' && !conciliado) return false;
      const fecha = String(movimiento.fecha || '').slice(0, 10);
      if (filters.desde && fecha < filters.desde) return false;
      if (filters.hasta && fecha > filters.hasta) return false;
      if (buscar) {
        const donde = [
          movimiento.concepto_bancario, movimiento.referencia,
          movimiento.cuenta_alias, movimiento.banco_nombre,
        ].map((x) => String(x || '').toLowerCase()).join(' ');
        if (!donde.includes(buscar)) return false;
      }
      return true;
    });
  }, [movements, empresaActiva, filters]);

  const hayFiltros = Object.values(filters).some((valor) => String(valor) !== '');

  const total = useMemo(() => visibles.reduce((sum, item) => sum + Number(item.importe || 0), 0), [visibles]);
  const update = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));

  const downloadCsv = () => {
    const headers = ['Fecha', 'Cuenta', 'Banco', 'Concepto', 'Referencia', 'Importe', 'Saldo posterior', 'Estado', 'Importación'];
    const rows = visibles.map((item) => [
      item.fecha?.slice(0, 10), item.cuenta_alias, item.banco_nombre, item.concepto_bancario,
      item.referencia, item.importe, item.saldo_posterior,
      Number(item.estatus) === 0 ? 'Pendiente' : 'Conciliado', item.importacion_id || '',
    ]);
    const blob = new Blob([[headers, ...rows].map((row) => row.map(csv).join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'movimientos-bancarios.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-on-background">{t('title')}</h1>
          <p className="mt-1 text-on-surface1">{t('subtitle')}</p>
        </div>
      </header>

      <Card className="p-4">
        {/* Botones que estaban en el título de la página (04/10/2026). */}
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant="primary" onClick={load} leftIcon={<RefreshCw size={16} />}>{t('reload', 'Recargar')}</Button>
          <Button variant="primary" onClick={downloadCsv} disabled={!visibles.length} leftIcon={<Download size={16} />}>{t('download_csv')}</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <select className="input-base" name="cuenta" value={filters.cuenta} onChange={update} aria-label={t('filter_account')}>
            <option value="">{t('all_accounts')}</option>
            {porBanco.map(([banco, cuentas]) => (
              <optgroup key={banco} label={banco}>
                {cuentas.map((account) => (
                  <option key={account.id} value={account.id}>{account.alias}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <CampoFecha className="input-base" name="desde" value={filters.desde} onChange={update} aria-label={t('filter_from')} />
          <CampoFecha className="input-base" name="hasta" value={filters.hasta} onChange={update} aria-label={t('filter_to')} />
          <select className="input-base" name="estado" value={filters.estado} onChange={update} aria-label={t('filter_status')}>
            <option value="">{t('all_statuses')}</option><option value="pendiente">{t('status_pending_plural')}</option><option value="conciliado">{t('status_reconciled_plural')}</option>
          </select>
          <div className="flex gap-2">
            <input className="input-base min-w-0 flex-1" name="buscar" value={filters.buscar} onChange={update} placeholder={t('search_placeholder')} aria-label={t('search_aria_label')} />
            {/* No hay botón de «aplicar»: el filtro se aplica al elegir.
                
                Lo que hace falta al final no es aplicar —eso ya ha pasado— sino
                poder volver a verlo todo de un golpe. El botón se apaga cuando
                no hay nada que quitar, para que no parezca que hace algo
                (26/08/2026). */}
            <Button
              variant="secondary"
              title={t('clear_filters')}
              aria-label={t('clear_filters')}
              disabled={!hayFiltros}
              onClick={() => setFilters({ cuenta: '', desde: '', hasta: '', estado: '', buscar: '' })}
            >
              <FilterX size={16} />
            </Button>
          </div>
        </div>
      </Card>

      {error && <div role="alert" className="rounded-lg border border-destructive-border bg-destructive/10 p-4 text-destructive-text">{error}</div>}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface2 px-4 py-3 text-sm text-on-surface1">
          <span className="font-bold">{t('count_movements').replace('{n}', visibles.length)}</span>
          <span className="font-mono font-bold">{t('total')} {money(total)}</span>
        </div>
        {loading ? <div className="flex justify-center p-12"><Spinner size="lg" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left">
              <thead><tr className="bg-table-header text-on-table-header text-xs uppercase tracking-wider"><th className="p-3">{t('col_detail')}</th><th className="p-3">{t('col_bank')}</th><th className="p-3">{t('col_date')}</th><th className="p-3">{t('col_concept')}</th><th className="p-3 text-right">{t('col_amount')}</th><th className="p-3 text-right">{t('col_balance')}</th><th className="p-3">{t('col_reference')}</th><th className="p-3 text-center">{t('col_status')}</th></tr></thead>
              <tbody>{visibles.map((item, i) => <tr key={item.id} className={`text-sm transition-colors duration-100 hover:bg-table-row-hover hover:text-on-table-row-hover ${i % 2 === 1 ? 'bg-table-row-striped text-on-table-row-striped' : 'bg-table-row text-on-table-row'}`}>
                <td className="p-3"><Button variant="ghost" size="xs" title={t('view_detail')} onClick={() => setSelected(item)}><Eye size={16} /></Button></td>
                {/* «Bco/Cta»: abreviatura de la entidad y alias de la cuenta,
                    ej. BS/Alkim. La abreviatura dice de qué banco es y el alias
                    distingue dos cuentas del mismo banco (26/08/2026). */}
                <td className="p-3">{bancoBarraCuenta(item, t)}</td>
                <td className="p-3">{new Date(item.fecha).toLocaleDateString('es-ES')}</td>
                <td className="max-w-[320px] truncate p-3" title={item.concepto_bancario}>{item.concepto_bancario}</td>
                <td className="p-3 text-right">{money(item.importe, item.moneda)}</td>
                <td className="p-3 text-right">{item.saldo_posterior == null ? '—' : money(item.saldo_posterior, item.moneda)}</td>
                <td className="p-3">{item.referencia || '—'}</td>
                {/* Una letra, no una etiqueta de color: en blanco está
                    pendiente y con «C» conciliado. Ocupa una columna estrecha y
                    se lee de un vistazo en una lista larga. */}
                <td className="p-3 text-center" title={Number(item.estatus) === 0 ? t('status_pending') : t('status_reconciled')}>
                  {Number(item.estatus) === 0 ? '' : t('status_reconciled_short')}
                </td>
              </tr>)}</tbody>
            </table>
            {!visibles.length && <p className="p-10 text-center text-on-surface1">{t('empty_movements')}</p>}
          </div>
        )}
      </Card>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true" aria-label={t('detail_title')}>
        <Card className="w-full max-w-xl p-6 shadow-xl"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-xl font-bold text-on-surface1">{t('detail_title')}</h2><p className="text-sm text-on-surface1">{selected.cuenta_alias} · {selected.banco_nombre}</p></div><Button variant="ghost" title={t('close_detail')} onClick={() => setSelected(null)}><X size={20} /></Button></div>
          <dl className="grid grid-cols-2 gap-4 text-on-surface1"><div><dt className="text-xs uppercase">{t('col_date')}</dt><dd className="font-bold">{new Date(selected.fecha).toLocaleDateString('es-ES')}</dd></div><div><dt className="text-xs uppercase">{t('col_amount')}</dt><dd className={`font-mono font-bold ${Number(selected.importe) < 0 ? 'text-destructive-text' : 'text-on-surface1'}`}>{money(selected.importe, selected.moneda)}</dd></div><div className="col-span-2"><dt className="text-xs uppercase">{t('col_concept')}</dt><dd className="font-semibold">{selected.concepto_bancario}</dd></div><div><dt className="text-xs uppercase">{t('col_reference')}</dt><dd>{selected.referencia || t('reference_missing')}</dd></div><div><dt className="text-xs uppercase">{t('detail_balance_after')}</dt><dd className="font-mono">{selected.saldo_posterior == null ? t('value_missing') : money(selected.saldo_posterior, selected.moneda)}</dd></div><div><dt className="text-xs uppercase">{t('col_status')}</dt><dd>{Number(selected.estatus) === 0 ? t('status_pending_long') : t('status_reconciled')}</dd></div><div><dt className="text-xs uppercase">{t('detail_import')}</dt><dd>{selected.importacion_id ? `#${selected.importacion_id}` : t('import_missing')}</dd></div></dl>
        </Card>
      </div>}
    </div>
  );
}
