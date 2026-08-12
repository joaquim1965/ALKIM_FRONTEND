/**
 * UserListStyled.jsx
 *
 * Componente VISUAL (View) para la gestión de usuarios.
 * Implementación táctil/visual con Tailwind CSS y DataTable genérico.
 */

import React, { useState } from 'react';
import {
    Users, Shield, Settings, X as CloseIcon, Save, Lock,
    Eye, Mail, Phone, Camera, ChevronDown, Plus,
    User, Globe, Hash, AlertTriangle, CheckCircle, Ban,
    Zap, Database
} from 'lucide-react';
import DataTable from '../UI/DataTable';
import Button from '../UI/Button';
import Dropdown from '../UI/Dropdown';
import Tabs from '../UI/Tabs';
import Input from '../UI/Input';
import UserSettings from '../../pages/UserSettings';

// --- CONSTANTES ---
const ROL_MAP = { 0: 'Invitado', 1: 'Usuario', 2: 'Admin', 3: 'SuperAdmin' };
const STATUS_CFG = {
    0: { label: 'Activo', color: 'bg-green-500', icon: <CheckCircle size={14} /> },
    1: { label: 'Inactivo', color: 'bg-gray-400', icon: <Ban size={14} /> },
};

const fmtDate = (d) => d ? new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const badgeCls = 'bg-surface2 text-on-surface2 border border-border';

const UserListStyled = ({
    users, loading, message, setMessage, currentUser, isAdmin,
    onView, onEdit, onDelete, onAdd,
    editUser, setEditUser, showAdd, setShowAdd,
    onSaveUser, onCreateUser, t
}) => {

    // --- COLUMNAS PARA DATATABLE ---
    const columns = [
        {
            id: 'usuario', 
            label: <span className="flex items-center gap-1.5"><User size={13} /> {t('TC s_user:usuario')}</span>,
            sortField: 'usuario',
            render: (u) => <span className="font-mono font-bold">@{u.usuario}</span>,
        },
        {
            id: 'nombre', 
            label: <span className="flex items-center gap-1.5"><User size={13} /> {t('TC s_user:nombre')}</span>,
            sortField: 'nombre',
            render: (u) => (
                <span className="font-medium whitespace-nowrap">{u.nombre} {u.apellido}</span>
            ),
        },
        {
            id: 'email', 
            label: <span className="flex items-center gap-1.5"><Mail size={13} /> {t('TC s_user:email')}</span>,
            sortField: 'email',
            render: (u) => <span className="truncate max-w-[130px] block">{u.email}</span>,
        },
        {
            id: 'telefono', 
            label: <span className="flex items-center gap-1.5"><Phone size={13} /> {t('TC s_user:telefono')}</span>,
            sortField: 'prefijo_tel',
            render: (u) => <span className="text-xs whitespace-nowrap">{u.telefono ? `${u.prefijo_tel || ''} ${u.telefono}` : <span className="text-disabled">—</span>}</span>,
        },
        {
            id: 'rol', 
            label: <span className="flex items-center gap-1.5"><Shield size={13} /> {t('TC s_user:rol')}</span>,
            sortField: 'rol',
            render: (u) => (
                <span className={`inline-flex items-center px-1.5 py-0 rounded text-xs font-medium ${badgeCls}`}>
                    {u.rol_label || ROL_MAP[u.rol]}
                </span>
            ),
        },
        {
            id: 'estatus', 
            label: <span className="flex items-center gap-1.5"><Zap size={13} /> {t('TC s_user:estatus')}</span>,
            sortField: 'estatus',
            render: (u) => {
                const isBlocked = u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date();
                const s = STATUS_CFG[u.estatus] || STATUS_CFG[0];
                return (
                    <span className="flex items-center gap-1 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBlocked ? 'bg-red-500' : s.color}`} />
                        {isBlocked ? 'Bloqueado' : (u.estatus_label || s.label)}
                    </span>
                );
            },
        },
        {
            id: 'verif', 
            label: <span className="flex items-center gap-1.5"><CheckCircle size={13} /> Verif.</span>,
            sortField: null,
            render: (u) => (
                <div className="flex items-center gap-1 text-xs">
                    <Mail size={11} className={u.verif_eml ? 'text-green-400' : 'text-disabled'} />
                    <Phone size={11} className={u.verif_tel ? 'text-green-400' : 'text-disabled'} />
                    {u.intentos_fallidos > 0 && (
                        <span className="px-1 bg-orange-500 text-white rounded text-xs font-bold">
                            {u.intentos_fallidos}✗
                        </span>
                    )}
                </div>
            ),
        },
        {
            id: 'ultima_sesion', 
            label: <span className="flex items-center gap-1.5"><Database size={13} /> {t('TC s_user:ultima_sesion')}</span>,
            sortField: 'ultima_sesion',
            render: (u) => <span className="text-xs whitespace-nowrap">{fmtDate(u.ultima_sesion)}</span>,
        },
    ];

    const filterFields = [
        // Perfil
        { id: 'usuario', label: t('TC s_user:usuario'), type: 'text', placeholder: 'Ej: admin', category: 'Perfil' },
        { id: 'nombre', label: t('TC s_user:nombre'), type: 'text', placeholder: 'Ej: Carlos', category: 'Perfil' },
        { id: 'apellido', label: t('TC s_user:apellido'), type: 'text', placeholder: 'Ej: García', category: 'Perfil' },
        { id: 'email', label: t('TC s_user:email'), type: 'text', placeholder: 'Ej: correo@alkim.ia', category: 'Perfil' },
        { id: 'prefijo_tel', label: t('TC s_user:prefijo_tel'), type: 'text', placeholder: 'Ej: +34', category: 'Perfil' },
        { id: 'telefono', label: t('TC s_user:telefono'), type: 'text', placeholder: 'Ej: 600123456', category: 'Perfil' },
        { id: 'grupo', label: t('TC s_user:grupo'), type: 'text', placeholder: 'Ej: IT', category: 'Perfil' },
        { id: 'rol', label: t('TC s_user:rol'), type: 'select', options: [['0', 'Invitado'], ['1', 'Usuario'], ['2', 'Admin'], ['3', 'SuperAdmin']], category: 'Perfil' },
        
        // Seguridad
        { id: 'estatus', label: t('TC s_user:estatus'), type: 'select', options: [['0', 'Activo'], ['1', 'Inactivo']], category: 'Seguridad' },
        { id: 'verif_eml', label: t('TC s_user:verif_eml'), type: 'select', options: [['0', 'No'], ['1', 'Sí']], category: 'Seguridad' },
        { id: 'verif_tel', label: t('TC s_user:verif_tel'), type: 'select', options: [['0', 'No'], ['1', 'Sí']], category: 'Seguridad' },
        { id: 'auth_provider', label: t('TC s_user:auth_provider'), type: 'select', options: [['local', 'Local'], ['google', 'Google'], ['facebook', 'Facebook']], category: 'Seguridad' },
        
        // Preferencias
        { id: 'idioma', label: t('TC s_userdata:idioma'), type: 'select', options: [['1', 'Español'], ['2', 'English'], ['3', 'Català'], ['4', 'Français']], category: 'Preferencias' },
        { id: 'tema', label: t('TC s_userdata:tema'), type: 'select', options: [['1', 'Light'], ['2', 'Dark'], ['3', 'High Contrast']], category: 'Preferencias' },
        { id: 'sep_miles', label: t('TC s_userdata:sep_miles'), type: 'select', options: [['.', 'Punto (.)'], [',', 'Coma (,)']], category: 'Preferencias' },
        { id: 'sep_decimal', label: t('TC s_userdata:sep_decimal'), type: 'select', options: [['.', 'Punto (.)'], [',', 'Coma (,)']], category: 'Preferencias' },
        { id: 'filasxtabla', label: t('TC s_userdata:filasxtabla'), type: 'number', placeholder: 'Ej: 50', category: 'Preferencias' },
    ];

    const filterFn = (u, f) => {
        if (f.usuario && !u.usuario?.toLowerCase().includes(f.usuario.toLowerCase())) return false;
        if (f.nombre && !u.nombre?.toLowerCase().includes(f.nombre.toLowerCase())) return false;
        if (f.apellido && !u.apellido?.toLowerCase().includes(f.apellido.toLowerCase())) return false;
        if (f.email && !u.email?.toLowerCase().includes(f.email.toLowerCase())) return false;
        if (f.prefijo_tel && !u.prefijo_tel?.includes(f.prefijo_tel)) return false;
        if (f.telefono && !u.telefono?.toLowerCase().includes(f.telefono.toLowerCase())) return false;
        if (f.grupo && !u.grupo?.toLowerCase().includes(f.grupo.toLowerCase())) return false;
        
        // Selects (Number/String conversion carefully)
        if (f.rol !== undefined && f.rol !== '' && u.rol !== parseInt(f.rol)) return false;
        if (f.estatus !== undefined && f.estatus !== '' && u.estatus !== parseInt(f.estatus)) return false;
        if (f.verif_eml !== undefined && f.verif_eml !== '' && u.verif_eml !== parseInt(f.verif_eml)) return false;
        if (f.verif_tel !== undefined && f.verif_tel !== '' && u.verif_tel !== parseInt(f.verif_tel)) return false;
        if (f.auth_provider && f.auth_provider !== '' && u.auth_provider !== f.auth_provider) return false;
        
        // Data Preference fields
        if (f.idioma !== undefined && f.idioma !== '' && u.idioma !== parseInt(f.idioma)) return false;
        if (f.tema !== undefined && f.tema !== '' && u.tema !== parseInt(f.tema)) return false;
        if (f.sep_miles && f.sep_miles !== '' && u.sep_miles !== f.sep_miles) return false;
        if (f.sep_decimal && f.sep_decimal !== '' && u.sep_decimal !== f.sep_decimal) return false;
        if (f.filasxtabla && u.filasxtabla !== parseInt(f.filasxtabla)) return false;

        return true;
    };

    const searchFn = (u, q) =>
        `${u.nombre} ${u.apellido} ${u.email} ${u.usuario} ${u.telefono || ''} ${u.grupo || ''}`.toLowerCase().includes(q);

    return (
        <div className="space-y-4">
            {/* Messages */}
            {message && (
                <div className={`p-4 mb-4 rounded-xl border shadow-lg flex justify-between items-center animate-in slide-in-from-top duration-300
                    ${message.type === 'success' ? 'bg-success text-on-success border-success' : 'bg-destructive text-on-destructive border-destructive'}`}>
                    <span className="font-medium">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="p-1 hover:bg-surface3 rounded-full transition-colors"><CloseIcon size={18} /></button>
                </div>
            )}

            <DataTable
                columns={columns}
                data={users}
                keyField="uid"
                rowsPerPage={10}
                searchFn={searchFn}
                filterFields={filterFields}
                filterFn={filterFn}
                onAdd={isAdmin ? onAdd : null}
                onView={onView}
                onEdit={onEdit}
                onDelete={isAdmin ? onDelete : null}
                emptyMessage="Sin usuarios que coincidan"
            />

            {/* Modales */}
            {editUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                     onClick={e => { if (e.target === e.currentTarget) setEditUser(null); }}>
                    <div className="bg-surface1 border border-border rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setEditUser(null)} 
                            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/20 text-white hover:bg-black/50 transition-colors"
                        >
                            <CloseIcon size={20} />
                        </button>
                        <UserSettings 
                            targetUser={editUser} 
                            onClose={() => setEditUser(null)} 
                            onUserUpdated={() => { onSaveUser(editUser.uid, null, 'refresh_only'); }} 
                        />
                    </div>
                </div>
            )}
            {showAdd && (
                <AddUserModal
                    onClose={() => setShowAdd(false)}
                    onCreate={onCreateUser}
                    t={t}
                />
            )}
        </div>
    );
};

// --- SUBCOMPONENTES DE MODAL ---

const AddUserModal = ({ onClose, onCreate, t }) => {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        nombre: '', apellido: '', email: '', usuario: '',
        prefijo_tel: '+34', telefono: '', password: '', rol: 1
    });

    const iCls = "w-full px-3 py-1.5 bg-surface2 border border-border rounded-lg text-sm text-on-surface1 outline-none focus:ring-2 focus:ring-primary transition-all";

    const handleCreate = async () => {
        setSaving(true);
        const ok = await onCreate(form);
        setSaving(false);
        if (ok) onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-surface1 border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Plus size={14} className="text-on-primary" /></div>
                        <h3 className="font-bold text-on-background">Agregar usuario</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-surface3 rounded-full transition-colors text-on-surface2"><CloseIcon size={16} /></button>
                </div>
                <div className="p-4 space-y-3 overflow-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-on-surface2 uppercase">{t('TC s_user:nombre')}</label>
                            <input placeholder="Ej: María" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className={iCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-on-surface2 uppercase">{t('TC s_user:apellido')}</label>
                            <input placeholder="Ej: López" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} className={iCls} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface2 uppercase">{t('TC s_user:email')}</label>
                        <input type="email" placeholder="usuario@alkim.ia" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={iCls} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface2 uppercase">{t('TC s_user:usuario')}</label>
                        <input placeholder="Ej: maria_l" value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value})} className={iCls} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-on-surface2 uppercase">{t('TC s_user:prefijo_tel')}</label>
                            <input placeholder="+34" value={form.prefijo_tel} onChange={e => setForm({...form, prefijo_tel: e.target.value})} className={iCls} />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-xs font-semibold text-on-surface2 uppercase">{t('TC s_user:telefono')}</label>
                            <input placeholder="600 000 000" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} className={iCls} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface2 uppercase">Contraseña</label>
                        <input type="password" placeholder="Mín. 8 caracteres" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={iCls} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface2 uppercase">{t('TC s_user:rol')}</label>
                        <Dropdown
                            options={[
                                { value: 0, label: 'Invitado' },
                                { value: 1, label: 'Usuario' },
                                { value: 2, label: 'Admin' }
                            ]}
                            onSelect={(v) => setForm({...form, rol: v})}
                            selectedValue={form.rol}
                            className="w-full"
                            triggerClassName="w-full px-3 py-1.5 bg-surface2 border border-border rounded-lg text-sm text-on-surface1 outline-none justify-between font-normal"
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-border flex justify-end gap-3 bg-surface2">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button leftIcon={<Plus size={13} />} loading={saving} onClick={handleCreate}>
                        Crear usuario
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default UserListStyled;
