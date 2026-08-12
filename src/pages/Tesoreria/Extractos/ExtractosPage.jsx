import React, { useState, useEffect } from 'react';
import { useTmTr } from '../../../contexts/TmTrContext';
import { Card, Button, Badge, Spinner, Table } from '../../../components/UI';
import { Play, History, Download, AlertCircle, CheckCircle, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, authHeaders } from '../../../services/api';

const ExtractosPage = () => {
    const { t, tm } = useTmTr('Extractos');
    const navigate = useNavigate();
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState({});
    const [connecting, setConnecting] = useState({});
    const [syncResult, setSyncResult] = useState(null);
    const [credentialModal, setCredentialModal] = useState(null);
    const [credentialForm, setCredentialForm] = useState({ username: '', password: '' });
    const [savingCredential, setSavingCredential] = useState(false);
    const [twoFactor, setTwoFactor] = useState(null);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [submittingTwoFactor, setSubmittingTwoFactor] = useState(false);

    const fetchConfigs = async () => {
        try {
            const response = await apiFetch('/crawler/config', { headers: authHeaders() });
            const res = await response.json();
            if (res.success) setConfigs(res.data);
        } catch (err) {
            console.error('Error fetching crawler configs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const pollSyncStatus = async (crid, logId) => {
        try {
            const response = await apiFetch(`/crawler/logs/${logId}`, {
                headers: authHeaders(),
            });
            const res = await response.json();
            if (res.success) {
                setSyncing(prev => ({ ...prev, [crid]: res.data }));
                if (res.data.challenge) setTwoFactor({ ...res.data.challenge, crid, logId });
                if (res.data.status === 'pending') {
                    window.setTimeout(() => pollSyncStatus(crid, logId), 2000);
                    return;
                }

                if (res.data.status !== 'pending') {
                    setSyncResult({ status: res.data.status, log: res.data, crid });
                }
                setSyncing(prev => ({ ...prev, [crid]: null }));
                fetchConfigs();
            }
        } catch (err) {
            setSyncing(prev => ({ ...prev, [crid]: null }));
            setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
        }
    };

    const handleSync = async (crid) => {
        setSyncing(prev => ({ ...prev, [crid]: { status: 'pending' } }));
        try {
            const response = await apiFetch(`/crawler/sync/${crid}`, {
                method: 'POST',
                headers: authHeaders(),
            });
            const res = await response.json();
            if (!res.success || !res.data?.logId) throw new Error(res.message || t('sync_error'));
            pollSyncStatus(crid, res.data.logId);
        } catch (err) {
            setSyncing(prev => ({ ...prev, [crid]: null }));
            alert(err.message || t('sync_error'));
        }
    };

    const handleConnect = async (crid) => {
        setConnecting(prev => ({ ...prev, [crid]: { status: 'pending' } }));
        try {
            const response = await apiFetch(`/crawler/connect/${crid}`, { method: 'POST', headers: authHeaders() });
            const res = await response.json();
            if (!res.success || !res.data?.logId) throw new Error(res.message);
            pollConnectionStatus(crid, res.data.logId);
        } catch (err) {
            setConnecting(prev => ({ ...prev, [crid]: null }));
            setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
        }
    };

    const pollConnectionStatus = async (crid, logId) => {
        try {
            const response = await apiFetch(`/crawler/logs/${logId}`, { headers: authHeaders() });
            const res = await response.json();
            if (!res.success) throw new Error(res.message);
            setConnecting(prev => ({ ...prev, [crid]: res.data }));
            if (res.data.challenge) setTwoFactor({ ...res.data.challenge, crid, logId });
            if (res.data.status === 'pending') {
                window.setTimeout(() => pollConnectionStatus(crid, logId), 2000);
                return;
            }
            setConnecting(prev => ({ ...prev, [crid]: null }));
            setTwoFactor(null);
            setTwoFactorCode('');
            if (res.data.status === 'success') {
                setSyncResult({ status: 'success', log: res.data, crid, connection: true });
                fetchConfigs();
            } else {
                setSyncResult({ status: 'error', log: res.data, crid });
            }
        } catch (err) {
            setConnecting(prev => ({ ...prev, [crid]: null }));
            setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
        }
    };

    const handleFinishConnection = async (crid) => {
        try {
            const response = await apiFetch(`/crawler/connect/${crid}/finalize`, { method: 'POST', headers: authHeaders() });
            const res = await response.json();
            if (!res.success) throw new Error(res.message);
            setConnecting(prev => ({ ...prev, [crid]: null }));
            setSyncResult({ status: 'success', log: { mensaje: 'Acceso bancario conectado.', leidos: 0, importados: 0, duplicados: 0, rechazados: 0, finalizado: new Date() }, crid, connection: true });
        } catch (err) { setSyncResult({ status: 'error', log: { mensaje: err.message }, crid }); }
    };

    const openCredentialModal = (config) => {
        setCredentialForm({ username: '', password: '' });
        setCredentialModal(config);
    };

    const saveCredential = async (event) => {
        event.preventDefault();
        setSavingCredential(true);
        const crid = credentialModal.crid;
        try {
            const response = await apiFetch(`/crawler/credentials/${crid}`, {
                method: 'PUT',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(credentialForm),
            });
            const res = await response.json();
            if (!res.success) throw new Error(res.message);
            setCredentialModal(null);
            setCredentialForm({ username: '', password: '' });
            await fetchConfigs();
            setSyncResult({ status: 'success', log: { mensaje: res.message, finalizado: new Date() }, crid, credential: true });
        } catch (err) {
            setSyncResult({ status: 'error', log: { mensaje: err.message }, crid });
        } finally {
            setSavingCredential(false);
        }
    };

    const revokeCredential = async (config) => {
        if (!window.confirm('¿Revocar la credencial y eliminar la sesión bancaria guardada?')) return;
        try {
            const response = await apiFetch(`/crawler/credentials/${config.crid}`, { method: 'DELETE', headers: authHeaders() });
            const res = await response.json();
            if (!res.success) throw new Error(res.message);
            await fetchConfigs();
        } catch (err) {
            setSyncResult({ status: 'error', log: { mensaje: err.message }, crid: config.crid });
        }
    };

    const submitTwoFactor = async (event) => {
        event.preventDefault();
        setSubmittingTwoFactor(true);
        try {
            const response = await apiFetch(`/crawler/challenges/${twoFactor.id}/verify`, {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(twoFactor.type === 'approval' ? {} : { code: twoFactorCode }),
            });
            const res = await response.json();
            if (!res.success) throw new Error(res.message);
            setTwoFactor(null);
            setTwoFactorCode('');
        } catch (err) {
            setSyncResult({ status: 'error', log: { mensaje: err.message }, crid: twoFactor.crid });
        } finally {
            setSubmittingTwoFactor(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Spinner size="lg" /></div>;

    return (
        <div className="p-6">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <p className="text-sm opacity-70">{t('subtitle')}</p>
                </div>
            </header>

            <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
                {configs.map(config => (
                    <Card key={config.crid} className="relative overflow-hidden">
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{config.banco_nombre}</h3>
                                    <p className="text-xs opacity-60 font-mono">{config.iban}</p>
                                </div>
                                <Badge variant={config.activo ? 'success' : 'neutral'}>
                                    {config.activo ? t('active') : t('inactive')}
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-xs">{t('last_sync')}:</span>
                                <span className="text-xs font-semibold">
                                    {config.ultima_sinc ? new Date(config.ultima_sinc).toLocaleString() : t('never')}
                                </span>
                            </div>

                            <div className="mb-4 flex items-center gap-2 text-xs">
                                <KeyRound size={15} aria-hidden="true" />
                                <span>Credencial:</span>
                                <strong>{config.credencial_estado === 'activo' ? `${config.usuario_enmascarado || 'configurada'} · protegida` : 'sin configurar'}</strong>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => openCredentialModal(config)} disabled={Boolean(syncing[config.crid]) || Boolean(connecting[config.crid]) || !config.activo}>
                                    <KeyRound size={16} /> Configurar credencial
                                </Button>
                                {config.credencial_estado && config.credencial_estado !== 'revocado' && <Button variant="ghost" title="Revocar credencial y sesión" onClick={() => revokeCredential(config)} disabled={Boolean(syncing[config.crid]) || Boolean(connecting[config.crid])}>
                                    <Trash2 size={16} />
                                </Button>}
                                <Button variant="secondary" onClick={() => handleConnect(config.crid)} disabled={Boolean(syncing[config.crid]) || Boolean(connecting[config.crid]) || !config.activo}>
                                    Conectar banco
                                </Button>
                                {connecting[config.crid] && !config.credencial_estado && <Button variant="warning" onClick={() => handleFinishConnection(config.crid)}>Finalizar conexión</Button>}
                                <Button 
                                    className="w-auto shrink-0 gap-2"
                                    onClick={() => handleSync(config.crid)}
                                    disabled={Boolean(syncing[config.crid]) || Boolean(connecting[config.crid]) || !config.activo}
                                    variant="primary"
                                >
                                    {syncing[config.crid] ? <Spinner size="sm" /> : <Play size={16} />}
                                    {t('sync_now')}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    title={t('view_history')}
                                    onClick={() => navigate(`/tesoreria/extractos/logs?crid=${config.crid}`)}
                                >
                                    <History size={16} />
                                </Button>
                            </div>
                        </div>
                        {(syncing[config.crid] || connecting[config.crid]) && (
                            <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                                <div className="text-center">
                                    <Spinner size="md" className="mb-2" />
                                    <p className="text-xs font-bold">
                                        {syncing[config.crid]?.mensaje || connecting[config.crid]?.mensaje || t('syncing_msg')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {configs.length === 0 && (
                <div className="text-center p-20 opacity-50 border-2 border-dashed rounded-xl">
                    <Download size={48} className="mx-auto mb-4" />
                    <p>{t('no_configs')}</p>
                </div>
            )}

            {credentialModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true" aria-labelledby="credential-title">
                    <Card className="w-full max-w-lg p-6 shadow-xl">
                        <div className="mb-5 flex items-start gap-3">
                            <KeyRound size={28} className="shrink-0" />
                            <div>
                                <h2 id="credential-title" className="text-xl font-bold">Credencial bancaria compartida</h2>
                                <p className="text-sm text-on-surface2">{credentialModal.banco_nombre}. La contraseña se guarda en el almacén seguro configurado y nunca en MySQL.</p>
                            </div>
                        </div>
                        <form onSubmit={saveCredential} className="space-y-4">
                            <label className="block text-sm font-medium">Usuario bancario
                                <input autoComplete="off" required maxLength={150} value={credentialForm.username} onChange={(event) => setCredentialForm(prev => ({ ...prev, username: event.target.value }))} className="mt-1 w-full rounded border border-border bg-input px-3 py-2 text-on-surface1" />
                            </label>
                            <label className="block text-sm font-medium">Contraseña bancaria
                                <input type="password" autoComplete="new-password" required maxLength={300} value={credentialForm.password} onChange={(event) => setCredentialForm(prev => ({ ...prev, password: event.target.value }))} className="mt-1 w-full rounded border border-border bg-input px-3 py-2 text-on-surface1" />
                            </label>
                            <p className="text-xs text-on-surface2">Guardar reemplaza el secreto anterior. ALKIM nunca podrá mostrarlo de nuevo.</p>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setCredentialModal(null)}>Cancelar</Button>
                                <Button type="submit" variant="primary" disabled={savingCredential}>{savingCredential ? <Spinner size="sm" /> : <ShieldCheck size={16} />} Guardar de forma segura</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {twoFactor && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-modal-backdrop/80 p-4" role="dialog" aria-modal="true" aria-labelledby="two-factor-title">
                    <Card className="w-full max-w-md p-6 shadow-xl">
                        <ShieldCheck size={32} className="mb-3" />
                        <h2 id="two-factor-title" className="text-xl font-bold">Verificación del banco</h2>
                        <p className="mt-2 text-sm text-on-surface2">{twoFactor.type === 'approval' ? 'Aprueba el acceso en la aplicación móvil del banco y confirma aquí cuando hayas terminado.' : 'Introduce el código recibido; se utilizará una sola vez y no se guardará.'} Caduca a las {new Date(twoFactor.expiresAt).toLocaleTimeString()}.</p>
                        <form onSubmit={submitTwoFactor} className="mt-5 space-y-4">
                            {twoFactor.type !== 'approval' && <label className="block text-sm font-medium">Código 2FA
                                <input inputMode="numeric" autoComplete="one-time-code" required minLength={4} maxLength={12} value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} className="mt-1 w-full rounded border border-border bg-input px-3 py-3 text-center text-xl tracking-[0.3em] text-on-surface1" autoFocus />
                            </label>}
                            <Button type="submit" className="w-full" variant="primary" disabled={submittingTwoFactor}>{submittingTwoFactor ? <Spinner size="sm" /> : twoFactor.type === 'approval' ? 'Ya lo he aprobado' : 'Verificar código'}</Button>
                        </form>
                    </Card>
                </div>
            )}

            {syncResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-backdrop/70 p-4" role="dialog" aria-modal="true" aria-label="Resultado de sincronización">
                    <Card className="w-full max-w-lg p-6 shadow-xl">
                        {syncResult.status === 'success' ? (
                            <>
                                <div className="mb-4 flex items-start gap-3 text-on-surface1">
                                    <CheckCircle size={28} className="shrink-0 text-success" />
                                    <div><h2 className="text-xl font-bold">{syncResult.credential ? 'Credencial protegida' : syncResult.connection ? 'Banco conectado' : 'Sincronización completada'}</h2><p className="text-sm">{syncResult.credential ? syncResult.log.mensaje : syncResult.connection ? 'La sesión se ha guardado para futuras sincronizaciones.' : 'El extracto se ha procesado correctamente.'}</p></div>
                                </div>
                                {!syncResult.connection && !syncResult.credential && <dl className="grid grid-cols-2 gap-4 rounded-lg bg-surface2 p-4 text-on-surface1">
                                    <div><dt className="text-xs uppercase">Fecha y hora</dt><dd className="font-bold">{new Date(syncResult.log.finalizado || syncResult.log.creado).toLocaleString()}</dd></div>
                                    <div><dt className="text-xs uppercase">Leídos</dt><dd className="font-bold">{syncResult.log.leidos || 0}</dd></div>
                                    <div><dt className="text-xs uppercase">Añadidos</dt><dd className="font-bold">{syncResult.log.importados || 0}</dd></div>
                                    <div><dt className="text-xs uppercase">Duplicados</dt><dd className="font-bold">{syncResult.log.duplicados || 0}</dd></div>
                                    <div><dt className="text-xs uppercase">Rechazados</dt><dd className="font-bold">{syncResult.log.rechazados || 0}</dd></div>
                                    <div><dt className="text-xs uppercase">Rango</dt><dd className="font-bold">{syncResult.log.fecha_desde || '—'} · {syncResult.log.fecha_hasta || '—'}</dd></div>
                                </dl>}
                            </>
                        ) : (
                            <div className="mb-4 flex items-start gap-3 text-on-surface1">
                                <AlertCircle size={28} className="shrink-0 text-destructive-text" />
                                <div><h2 className="text-xl font-bold">No se pudo sincronizar</h2><p className="text-sm">No se ha descargado ni añadido ningún movimiento. Consulta el historial para ver el motivo y volver a intentarlo.</p></div>
                            </div>
                        )}
                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                            <Button variant="ghost" onClick={() => setSyncResult(null)}>Cerrar</Button>
                            {syncResult.status === 'success' ? <Button variant="primary" onClick={() => navigate(syncResult.connection ? '/tesoreria/extractos' : '/tesoreria/movimientos')}>{syncResult.connection ? 'Ir a extractos' : 'Ver movimientos'}</Button> : <Button variant="primary" onClick={() => navigate(`/tesoreria/extractos/logs?crid=${syncResult.crid}`)}>Ver historial</Button>}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ExtractosPage;
