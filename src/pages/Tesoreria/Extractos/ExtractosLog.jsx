import React, { useState, useEffect } from 'react';
import { useTmTr } from '../../../contexts/TmTrContext';
import { Card, Button, Badge, Spinner, Table } from '../../../components/UI';
import { ArrowLeft, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, authHeaders } from '../../../services/api';

const ExtractosLog = () => {
    const { t, tm } = useTmTr('Extractos');
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
                setError(res.message || 'No se pudo cargar el historial de extractos.');
            }
        } catch (err) {
            console.error('Error fetching crawler logs:', err);
            setError('No se pudo conectar con el historial de extractos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success': return <CheckCircle className="text-green-500" size={16} />;
            case 'error': return <XCircle className="text-red-500" size={16} />;
            case 'pending': return <Clock className="text-blue-500 animate-pulse" size={16} />;
            default: return null;
        }
    };

    const handleDeleteImport = async (log) => {
        if (!window.confirm(`¿Eliminar los ${log.importados || 0} movimientos de esta importación? Solo es posible si no están conciliados.`)) return;
        try {
            const response = await apiFetch(`/bancos/imports/${log.clid}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            const res = await response.json();
            if (!res.success) throw new Error(res.message || 'No se pudo eliminar la importación.');
            fetchLogs();
        } catch (error) {
            alert(error.message || 'No se pudo eliminar la importación.');
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Spinner size="lg" /></div>;

    return (
        <div className="p-6">
            <header className="mb-6 flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/tesoreria/extractos')}
                >
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h1 className="text-xl font-bold">{t('logs_title')}</h1>
                    <p className="text-sm opacity-60">{t('logs_subtitle')}</p>
                </div>
            </header>

            <Card className="overflow-hidden">
                {error && (
                    <div className="px-4 py-3 text-sm text-destructive-text bg-destructive-bg border-b border-border" role="alert">
                        {error}
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface2 border-b border-border">
                                <th className="p-4 text-xs font-bold uppercase tracking-wider">{t('col_date')}</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider">{t('col_account')}</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider">{t('col_status')}</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider">{t('col_transactions')}</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider">{t('col_message')}</th>
                                <th className="p-4 text-xs font-bold uppercase tracking-wider">{t('col_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.clid} className="border-b border-border hover:bg-surface1 transition-colors">
                                    <td className="p-4 text-sm font-medium">
                                        {new Date(log.creado).toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">{log.cuenta}</span>
                                            <span className="text-[10px] opacity-60 font-mono">{log.araña_codigo}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(log.status)}
                                            <span className="text-sm capitalize">{log.status}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm font-bold text-center">
                                        {log.transactions_count || 0}
                                    </td>
                                    <td className="p-4 text-xs opacity-80 max-w-xs truncate">
                                        {log.mensaje}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            {log.status === 'success' && !log.eliminado_en && Number(log.importados) > 0 && (
                                                <Button 
                                                    size="xs" 
                                                    variant="ghost" 
                                                    title="Eliminar importación no conciliada"
                                                    onClick={() => handleDeleteImport(log)}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center opacity-50 italic">
                                        {t('no_logs')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ExtractosLog;
