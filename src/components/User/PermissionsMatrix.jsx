import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Save, User as UserIcon, ChevronDown } from 'lucide-react';
import Button from '../UI/Button';
import { useTmTr } from '../../contexts/TmTrContext';
import { useStore } from '../../hooks/useStore';
import userService from '../../services/userService';
import permissionsService from '../../services/permissionsService';

/**
 * PermissionsMatrix (Fase 1 — Subfase 1.9)
 *
 * Matriz de administración de permisos usuario × tabla.
 * - Filas: tablas de s_table agrupadas por módulo.
 * - Por fila: selector de nivel None / Read / Write / Full.
 * - Acciones rápidas por módulo y guardado batch (PUT /permissions/user/:uid).
 *
 * Solo visible para administradores (la pestaña se oculta por rol),
 * pero el backend valida igualmente rol y salvaguardas anti-bloqueo.
 */

const NIVELES = ['None', 'Read', 'Write', 'Full'];

// Colores por nivel para feedback visual rápido
const NIVEL_STYLES = {
    None: 'bg-surface2 text-on-surface2 border-border',
    Read: 'bg-info text-on-info border-info',
    Write: 'bg-warning text-on-warning border-warning',
    Full: 'bg-success text-on-success border-success',
};

const PermissionsMatrix = () => {
    const { t } = useTmTr('PermissionsMatrix');
    const { user: currentUser, loadPermissions } = useStore();

    const [users, setUsers] = useState([]);
    const [selectedUid, setSelectedUid] = useState('');
    const [tables, setTables] = useState([]);
    const [permisos, setPermisos] = useState({});       // { nombreTabla: nivel } (estado editado)
    const [permisosOrig, setPermisosOrig] = useState({}); // estado original para detectar cambios
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Cargar usuarios y catálogo de tablas al montar
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const [resUsers, resTables] = await Promise.all([
                    userService.getGroupUsers({}),
                    permissionsService.getTables(),
                ]);
                if (resUsers.success && Array.isArray(resUsers.data)) setUsers(resUsers.data);
                if (resTables.success) setTables(resTables.tablas || []);
            } catch (e) {
                setErrorMsg(e.message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // Cargar permisos al seleccionar usuario
    useEffect(() => {
        if (!selectedUid) return;
        const fetchPerms = async () => {
            setLoading(true);
            setSuccessMsg(''); setErrorMsg('');
            try {
                const res = await permissionsService.getUserPermissions(selectedUid);
                if (res.success) {
                    setPermisos(res.permisos || {});
                    setPermisosOrig(res.permisos || {});
                }
            } catch (e) {
                setErrorMsg(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPerms();
    }, [selectedUid]);

    // Tablas agrupadas por módulo (orden de s_table)
    const grupos = useMemo(() => {
        const map = {};
        tables.forEach((tb) => {
            const mod = (tb.modulo || 'otros').toLowerCase();
            if (!map[mod]) map[mod] = [];
            map[mod].push(tb);
        });
        return map;
    }, [tables]);

    const hayCambios = useMemo(
        () => tables.some((tb) => (permisos[tb.nombre] || 'None') !== (permisosOrig[tb.nombre] || 'None')),
        [tables, permisos, permisosOrig]
    );

    const setNivel = (nombreTabla, nivel) => {
        setPermisos((prev) => ({ ...prev, [nombreTabla]: nivel }));
        setSuccessMsg('');
    };

    // Acción rápida: aplicar nivel a todas las tablas de un módulo
    const setNivelModulo = (modulo, nivel) => {
        setPermisos((prev) => {
            const next = { ...prev };
            (grupos[modulo] || []).forEach((tb) => { next[tb.nombre] = nivel; });
            return next;
        });
        setSuccessMsg('');
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccessMsg(''); setErrorMsg('');
        try {
            // Enviar solo los cambios (batch)
            const cambios = tables
                .filter((tb) => (permisos[tb.nombre] || 'None') !== (permisosOrig[tb.nombre] || 'None'))
                .map((tb) => ({ tid: tb.tid, permiso: permisos[tb.nombre] || 'None' }));

            if (cambios.length === 0) return;

            const res = await permissionsService.setUserPermissions(selectedUid, cambios);
            if (res.success) {
                setPermisosOrig({ ...permisos });
                setSuccessMsg(t('GuardadoExito') || `Permisos guardados (${res.aplicados} cambios)`);
                // Si el admin se edita a sí mismo, refrescar su matriz local
                if (Number(selectedUid) === Number(currentUser?.uid)) {
                    loadPermissions();
                }
            }
        } catch (e) {
            setErrorMsg(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-border pb-2">
                <Shield className="text-primary" /> {t('Titulo') || 'Permisos por Usuario'}
            </h2>

            {/* Selector de usuario */}
            <div className="max-w-md">
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <UserIcon size={16} className="text-primary" />
                    {t('SeleccionaUsuario') || 'Selecciona un usuario'}
                </label>
                <div className="relative">
                    <select
                        value={selectedUid}
                        onChange={(e) => setSelectedUid(e.target.value)}
                        className="w-full p-3 pr-10 bg-surface1 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
                    >
                        <option value="">{t('UsuarioPlaceholder') || '— Elegir usuario —'}</option>
                        {users.map((u) => (
                            <option key={u.uid} value={u.uid}>
                                {u.nombre} {u.apellido} ({u.usuario})
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface2" />
                </div>
            </div>

            {successMsg && (
                <div className="p-4 bg-success text-on-success border border-success rounded-xl font-medium">
                    {successMsg}
                </div>
            )}
            {errorMsg && (
                <div className="p-4 bg-destructive text-on-destructive border border-destructive rounded-xl font-medium">
                    {errorMsg}
                </div>
            )}

            {loading && (
                <div className="flex items-center gap-3 p-4 text-on-surface2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    {t('Cargando') || 'Cargando...'}
                </div>
            )}

            {/* Matriz por módulos */}
            {selectedUid && !loading && Object.entries(grupos).map(([modulo, tbs]) => (
                <div key={modulo} className="bg-surface2/40 border border-border rounded-2xl overflow-hidden">
                    {/* Cabecera de módulo + acciones rápidas */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-surface2 border-b border-border">
                        <span className="font-bold capitalize">{modulo}</span>
                        <div className="flex gap-2 text-xs">
                            <button onClick={() => setNivelModulo(modulo, 'Full')} className="px-2 py-1 rounded-md border border-success text-success hover:bg-success hover:text-on-success transition-colors">
                                {t('TodoFull') || 'Full en todo'}
                            </button>
                            <button onClick={() => setNivelModulo(modulo, 'Read')} className="px-2 py-1 rounded-md border border-info text-info hover:bg-info hover:text-on-info transition-colors">
                                {t('SoloLectura') || 'Solo lectura'}
                            </button>
                            <button onClick={() => setNivelModulo(modulo, 'None')} className="px-2 py-1 rounded-md border border-border text-on-surface2 hover:bg-surface-hover transition-colors">
                                {t('Ninguno') || 'Ninguno'}
                            </button>
                        </div>
                    </div>

                    {/* Filas de tablas */}
                    <div className="divide-y divide-border/50">
                        {tbs.map((tb) => {
                            const nivelActual = permisos[tb.nombre] || 'None';
                            const cambiado = nivelActual !== (permisosOrig[tb.nombre] || 'None');
                            return (
                                <div key={tb.tid} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                                    <div className="min-w-[180px]">
                                        <span className={`font-medium text-sm ${cambiado ? 'text-primary' : ''}`}>
                                            {tb.descripcion || tb.nombre}
                                        </span>
                                        <span className="block text-xs text-on-surface2 font-mono">{tb.nombre}</span>
                                    </div>
                                    {/* Selector segmentado de nivel */}
                                    <div className="flex rounded-lg overflow-hidden border border-border">
                                        {NIVELES.map((nivel) => (
                                            <button
                                                key={nivel}
                                                onClick={() => setNivel(tb.nombre, nivel)}
                                                className={`px-3 py-1.5 text-xs font-semibold transition-colors border-r last:border-r-0 border-border ${
                                                    nivelActual === nivel
                                                        ? NIVEL_STYLES[nivel]
                                                        : 'bg-surface1 text-on-surface2 hover:bg-surface-hover'
                                                }`}
                                            >
                                                {t(`Nivel${nivel}`) || nivel}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Guardar */}
            {selectedUid && !loading && (
                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} loading={saving} disabled={!hayCambios} leftIcon={<Save size={18} />}>
                        {t('GuardarPermisos') || 'Guardar permisos'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default PermissionsMatrix;
