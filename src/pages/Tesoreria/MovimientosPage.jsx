import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, RefreshCw, Search, X } from 'lucide-react';
import { Button, Card, Spinner } from '../../components/UI';
import bancosService from '../../services/bancosService';

const money = (value, currency = 'EUR') => new Intl.NumberFormat('es-ES', {
  style: 'currency', currency,
}).format(Number(value || 0));

const csv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function MovimientosPage() {
  const [accounts, setAccounts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [filters, setFilters] = useState({ cuenta: '', desde: '', hasta: '', estado: '', buscar: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

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
      setError(loadError.message || 'No se pudieron cargar los movimientos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const total = useMemo(() => movements.reduce((sum, item) => sum + Number(item.importe || 0), 0), [movements]);
  const update = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));

  const downloadCsv = () => {
    const headers = ['Fecha', 'Cuenta', 'Banco', 'Concepto', 'Referencia', 'Importe', 'Saldo posterior', 'Estado', 'Importación'];
    const rows = movements.map((item) => [
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
          <h1 className="text-3xl font-bold text-on-background">Movimientos bancarios</h1>
          <p className="mt-1 text-on-surface1">Consulta, filtra y descarga los movimientos importados de tus extractos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} leftIcon={<RefreshCw size={16} />}>Actualizar</Button>
          <Button variant="primary" onClick={downloadCsv} disabled={!movements.length} leftIcon={<Download size={16} />}>Descargar CSV</Button>
        </div>
      </header>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <select className="input-base" name="cuenta" value={filters.cuenta} onChange={update} aria-label="Cuenta bancaria">
            <option value="">Todas las cuentas</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.alias}</option>)}
          </select>
          <input className="input-base" name="desde" type="date" value={filters.desde} onChange={update} aria-label="Desde" />
          <input className="input-base" name="hasta" type="date" value={filters.hasta} onChange={update} aria-label="Hasta" />
          <select className="input-base" name="estado" value={filters.estado} onChange={update} aria-label="Estado">
            <option value="">Todos los estados</option><option value="pendiente">Pendientes</option><option value="conciliado">Conciliados</option>
          </select>
          <div className="flex gap-2">
            <input className="input-base min-w-0 flex-1" name="buscar" value={filters.buscar} onChange={update} placeholder="Concepto o referencia" aria-label="Buscar movimiento" />
            <Button variant="primary" title="Aplicar filtros" onClick={load}><Search size={16} /></Button>
          </div>
        </div>
      </Card>

      {error && <div role="alert" className="rounded-lg border border-destructive-border bg-destructive/10 p-4 text-destructive-text">{error}</div>}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface2 px-4 py-3 text-sm text-on-surface1">
          <span className="font-bold">{movements.length} movimientos</span>
          <span className="font-mono font-bold">Total: {money(total)}</span>
        </div>
        {loading ? <div className="flex justify-center p-12"><Spinner size="lg" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left">
              <thead className="bg-surface1 text-on-surface1"><tr className="border-b border-border text-xs uppercase tracking-wider"><th className="p-3">Fecha</th><th className="p-3">Cuenta / banco</th><th className="p-3">Concepto</th><th className="p-3">Referencia</th><th className="p-3 text-right">Importe</th><th className="p-3">Estado</th><th className="p-3 text-right">Detalle</th></tr></thead>
              <tbody>{movements.map((item) => <tr key={item.id} className="border-b border-border/50 text-on-surface1 hover:bg-surface-hover">
                <td className="p-3 font-mono text-sm">{new Date(item.fecha).toLocaleDateString('es-ES')}</td>
                <td className="p-3"><div className="font-semibold">{item.cuenta_alias}</div><div className="text-xs text-on-surface1">{item.banco_nombre || 'Banco no informado'}</div></td>
                <td className="max-w-[300px] truncate p-3 font-semibold" title={item.concepto_bancario}>{item.concepto_bancario}</td>
                <td className="p-3 font-mono text-sm">{item.referencia || '—'}</td>
                <td className={`p-3 text-right font-mono font-bold ${Number(item.importe) < 0 ? 'text-destructive-text' : 'text-on-surface1'}`}>{money(item.importe, item.moneda)}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${Number(item.estatus) === 0 ? 'bg-warning/20 text-on-surface1' : 'bg-success/20 text-on-surface1'}`}>{Number(item.estatus) === 0 ? 'Pendiente' : 'Conciliado'}</span></td>
                <td className="p-3 text-right"><Button variant="ghost" size="xs" title="Ver detalle" onClick={() => setSelected(item)}><Eye size={16} /></Button></td>
              </tr>)}</tbody>
            </table>
            {!movements.length && <p className="p-10 text-center text-on-surface1">No hay movimientos con estos filtros.</p>}
          </div>
        )}
      </Card>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true" aria-label="Detalle del movimiento">
        <Card className="w-full max-w-xl p-6 shadow-xl"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-xl font-bold text-on-surface1">Detalle del movimiento</h2><p className="text-sm text-on-surface1">{selected.cuenta_alias} · {selected.banco_nombre}</p></div><Button variant="ghost" title="Cerrar detalle" onClick={() => setSelected(null)}><X size={20} /></Button></div>
          <dl className="grid grid-cols-2 gap-4 text-on-surface1"><div><dt className="text-xs uppercase">Fecha</dt><dd className="font-bold">{new Date(selected.fecha).toLocaleDateString('es-ES')}</dd></div><div><dt className="text-xs uppercase">Importe</dt><dd className={`font-mono font-bold ${Number(selected.importe) < 0 ? 'text-destructive-text' : 'text-on-surface1'}`}>{money(selected.importe, selected.moneda)}</dd></div><div className="col-span-2"><dt className="text-xs uppercase">Concepto</dt><dd className="font-semibold">{selected.concepto_bancario}</dd></div><div><dt className="text-xs uppercase">Referencia</dt><dd>{selected.referencia || 'No informada'}</dd></div><div><dt className="text-xs uppercase">Saldo posterior</dt><dd className="font-mono">{selected.saldo_posterior == null ? 'No informado' : money(selected.saldo_posterior, selected.moneda)}</dd></div><div><dt className="text-xs uppercase">Estado</dt><dd>{Number(selected.estatus) === 0 ? 'Pendiente de conciliación' : 'Conciliado'}</dd></div><div><dt className="text-xs uppercase">Importación</dt><dd>{selected.importacion_id ? `#${selected.importacion_id}` : 'No asociada'}</dd></div></dl>
        </Card>
      </div>}
    </div>
  );
}
