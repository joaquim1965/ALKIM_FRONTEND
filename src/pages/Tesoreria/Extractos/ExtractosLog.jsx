import React, { useState, useEffect } from 'react';
import { useTmTr } from '../../../contexts/TmTrContext';
import { Button, Badge, Spinner } from '../../../components/UI';
import { ArrowLeft, CheckCircle, XCircle, Clock, Trash2, History, Scale, Anchor } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, authHeaders } from '../../../services/api';
import { formatSaldoConFecha } from '../../../utils/format';

const ExtractosLog = () => {
    const { t, tm } = useTmTr('ExtractosLog');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchLogs = async () => {
        setError('');
        try {
            const crid = searchParams.get('crid');
            const endpoint = crid ? `/crawler/logs?crid=${encodeURIComponent(crid)}` : '/crawler/logs';
            const response = await apiFetch(endpoint, { headers: authHeaders() });
            const res = await response.json();
            if (res.success) {
                setLogs(res.data);
            } else {
                setError(res.message || t('error_load'));
            }
        } catch (err) {
            console.error('Error fetching crawler logs:', err);
            setError(t('error_connection'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success': return <CheckCircle className="text-success-border" size={16} />;
            case 'error': return <XCircle className="text-destructive-border" size={16} />;
            case 'pending': return <Clock className="text-info animate-pulse" size={16} />;
            default: return null;
        }
    };

    const handleDeleteImport = async (log) => {
        if (!window.confirm(t('confirm_delete_import').replace('{n}', log.importados || 0))) return;
        try {
            const response = await apiFetch(`/bancos/imports/${log.clid}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            const res = await response.json();
            if (!res.success) throw new Error(res.message || t('error_delete_import'));
            fetchLogs();
        } catch (error) {
            alert(error.message || t('error_delete_import'));
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Spinner size="lg" /></div>;

    return (
        <div className="p-6">
            <header className="mb-6 flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => {
                    // Se vuelve con el banco desde el que se entró: si no, la
                    // pantalla de extractos aparece sin filtrar y hay que buscar
                    // otra vez la cuenta de la que se salió (26/08/2026).
                    const banco = searchParams.get('banco');
                    navigate(banco ? `/tesoreria/extractos?banco=${encodeURIComponent(banco)}` : '/tesoreria/extractos');
                }}>
                    <ArrowLeft size={20} />
                </Button>
                <div className="rounded-2xl border-2 border-border bg-surface2 p-2.5 text-on-background shadow-sm">
                    <History size={24} />
                </div>
                <div>
                    <h1 className="mb-1 text-2xl font-black leading-none tracking-tight text-on-background">{t('logs_title')}</h1>
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface2">{t('logs_subtitle')}</p>
                </div>
            </header>

            <div className="overflow-hidden rounded-3xl border border-border bg-surface2 shadow-2xl">
                {error && (
                    <div className="border-b border-border bg-destructive-bg px-5 py-4 text-sm font-bold text-destructive-text" role="alert">
                        {error}
                    </div>
                )}
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-table-header text-on-table-header">
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_actions')}</th>
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_date')}</th>
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_account')}</th>
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_status')}</th>
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_transactions')}</th>
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_balance')}</th>
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_checks')}</th>
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">{t('col_message')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, i) => (
                                <tr key={log.clid} className={`text-sm transition-colors duration-100 hover:bg-table-row-hover hover:text-on-table-row-hover ${i % 2 === 1 ? 'bg-table-row-striped text-on-table-row-striped' : 'bg-table-row text-on-table-row'}`}>
                                    <td className="px-5 py-4">
                                        <div className="flex gap-2">
                                            {log.status === 'success' && !log.eliminado_en && Number(log.importados) > 0 && (
                                                <Button 
                                                    size="xs" 
                                                    variant="ghost" 
                                                    title={t('delete_import')}
                                                    onClick={() => handleDeleteImport(log)}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-sm font-bold">
                                        {new Date(log.creado).toLocaleString('es-ES')}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black tracking-tight">{log.cuenta}{(log.banco_alias || log.araña_codigo) ? ` - ${log.banco_alias || log.araña_codigo}` : ''}</span>
                                            <span className="font-mono text-[10px]">{log.araña_codigo}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(log.status)}
                                            <span className="text-sm font-bold capitalize">{t(`status_${log.status}`, log.status)}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className="text-base font-black">{log.importados || 0}</span>
                                        <span className="text-xs font-bold"> / {log.leidos || 0}</span>
                                        {Number(log.duplicados) > 0 && (
                                            <div className="text-[10px] font-bold uppercase tracking-widest">
                                                {t('duplicates_short').replace('{n}', log.duplicados)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 font-mono text-sm font-black">
                                        {formatSaldoConFecha(log.saldo_final, log.saldo_fecha)
                                            || <span className="font-sans text-xs font-bold uppercase tracking-widest">{t('no_data')}</span>}
                                    </td>

                                    <td className="px-5 py-4">
                                        <div className="flex flex-col gap-1">
                                            {/* Cuadre: el fichero contra sus propios totales. */}
                                            {log.cuadre_ok === null || log.cuadre_ok === undefined ? null : (
                                                <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest
                                                    ${log.cuadre_ok ? 'text-success' : 'text-destructive-text'}`}>
                                                    <Scale size={12} /> {log.cuadre_ok ? t('balances_match') : t('balances_mismatch')}
                                                </span>
                                            )}
                                            {/* Anclaje: el extracto contra lo que ya teníamos. */}
                                            {log.anclaje_ok === null || log.anclaje_ok === undefined ? null : (
                                                <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest
                                                    ${log.anclaje_ok ? 'text-success' : 'text-warning'}`}
                                                    title={log.anclaje_ok
                                                        ? t('anchor_ok_title')
                                                        : t('anchor_diff_title').replace('{n}', log.anclaje_diferencia)}>
                                                    <Anchor size={12} /> {log.anclaje_ok ? t('anchored') : `${log.anclaje_diferencia} €`}
                                                </span>
                                            )}
                                            {log.dias_ventana ? (
                                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                                    {t('window_days').replace('{n}', log.dias_ventana)}
                                                </span>
                                            ) : null}
                                            {log.cuadre_ok == null && log.anclaje_ok == null && !log.dias_ventana && (
                                                <span className="text-[10px] font-bold uppercase tracking-widest">—</span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 max-w-xs truncate text-xs font-bold">
                                        {log.mensaje}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="px-5 py-16 text-center">
                                        <History size={40} className="mx-auto mb-3" />
                                        <p className="text-xs font-bold uppercase tracking-widest">{t('no_logs')}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExtractosLog;
