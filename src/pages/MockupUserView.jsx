/**
 * MockupUserView.jsx — Prototipo visual de Gestión de Usuarios
 * Ruta pública: /mockup-user
 *
 * Usa el componente genérico <DataTable> para la tabla principal.
 */

import React, { useState } from 'react';
import {
    Users, Shield, Settings, X as CloseIcon, Save, Lock,
    Eye, Mail, Phone, Camera, ChevronDown, AlertCircle, Plus,
    User, Globe, Hash
} from 'lucide-react';
import DataTable from '../components/UI/DataTable';
import Button from '../components/UI/Button';
import Tabs from '../components/UI/Tabs';

// ============================================================================
// CONSTANTES
// ============================================================================

const ROL_MAP    = { 0: 'Invitado', 1: 'Usuario', 2: 'Admin', 3: 'SuperAdmin' };
const STATUS_CFG = {
    0: { label: 'Activo',   color: 'bg-green-500' },
    1: { label: 'Inactivo', color: 'bg-gray-400'  },
};

// ============================================================================
// DATOS MOCK
// ============================================================================

const MOCK_USERS = [
    { uid:1,  nombre:'Kimi',   apellido:'DeepMind',  email:'kimi@alkim.ia',       usuario:'kimi_alkim', prefijo_tel:'+34', telefono:'600 123 456', rol:3, estatus:0, ultima_sesion:new Date().toISOString(),                    verif_eml:1, verif_tel:1, intentos_fallidos:0, bloqueado_hasta:null,  fecha_creacion:'2024-01-01', idioma:1, tema:2, sep_miles:'.', sep_decimal:',', form_fecha:'DD/MM/YYYY', filasxtabla:50  },
    { uid:2,  nombre:'Ana',    apellido:'García',    email:'ana@alkim.ia',         usuario:'ana_garcia', prefijo_tel:'+34', telefono:'650 987 654', rol:2, estatus:0, ultima_sesion:new Date(Date.now()-86400000).toISOString(),  verif_eml:1, verif_tel:0, intentos_fallidos:0, bloqueado_hasta:null,  fecha_creacion:'2024-02-10', idioma:2, tema:1, sep_miles:',', sep_decimal:'.', form_fecha:'MM/DD/YYYY', filasxtabla:25  },
    { uid:3,  nombre:'Carlos', apellido:'Martínez',  email:'carlos@alkim.ia',      usuario:'carlos_m',   prefijo_tel:'+34', telefono:'620 555 777', rol:1, estatus:0, ultima_sesion:new Date(Date.now()-3*86400000).toISOString(),verif_eml:0, verif_tel:0, intentos_fallidos:2, bloqueado_hasta:null,  fecha_creacion:'2024-03-05', idioma:1, tema:1, sep_miles:'.', sep_decimal:',', form_fecha:'DD/MM/YYYY', filasxtabla:50  },
    { uid:4,  nombre:'Lucía',  apellido:'Fernández', email:'lucia@alkim.ia',       usuario:'lucia_f',    prefijo_tel:'+34', telefono:'',            rol:1, estatus:1, ultima_sesion:new Date(Date.now()-15*86400000).toISOString(),verif_eml:1, verif_tel:0, intentos_fallidos:0, bloqueado_hasta:null,  fecha_creacion:'2024-04-20', idioma:3, tema:3, sep_miles:'.', sep_decimal:',', form_fecha:'DD/MM/YYYY', filasxtabla:100 },
    { uid:5,  nombre:'David',  apellido:'López',     email:'david@alkim.ia',       usuario:'david_l',    prefijo_tel:'+1',  telefono:'415 234 5678',rol:0, estatus:0, ultima_sesion:null,                                         verif_eml:0, verif_tel:0, intentos_fallidos:5, bloqueado_hasta:new Date(Date.now()+3600000).toISOString(), fecha_creacion:'2024-05-11', idioma:2, tema:2, sep_miles:',', sep_decimal:'.', form_fecha:'MM/DD/YYYY', filasxtabla:50  },
    { uid:6,  nombre:'Marta',  apellido:'Ruiz',      email:'marta.ruiz@alkim.ia',  usuario:'marta_r',    prefijo_tel:'+34', telefono:'677 432 100', rol:1, estatus:0, ultima_sesion:new Date(Date.now()-2*86400000).toISOString(), verif_eml:1, verif_tel:1, intentos_fallidos:0, bloqueado_hasta:null,  fecha_creacion:'2024-06-01', idioma:1, tema:2, sep_miles:'.', sep_decimal:',', form_fecha:'DD/MM/YYYY', filasxtabla:50  },
    { uid:7,  nombre:'Pablo',  apellido:'Sánchez',   email:'pablo.s@alkim.ia',     usuario:'pablo_s',    prefijo_tel:'+34', telefono:'699 001 234', rol:2, estatus:0, ultima_sesion:new Date(Date.now()-1*86400000).toISOString(), verif_eml:1, verif_tel:0, intentos_fallidos:0, bloqueado_hasta:null,  fecha_creacion:'2024-07-14', idioma:1, tema:1, sep_miles:'.', sep_decimal:',', form_fecha:'DD/MM/YYYY', filasxtabla:25  },
    { uid:8,  nombre:'Elena',  apellido:'Torres',    email:'elena.t@alkim.ia',     usuario:'elena_t',    prefijo_tel:'+44', telefono:'7700 900 123',rol:1, estatus:1, ultima_sesion:new Date(Date.now()-30*86400000).toISOString(),verif_eml:0, verif_tel:0, intentos_fallidos:1, bloqueado_hasta:null,  fecha_creacion:'2024-08-08', idioma:2, tema:3, sep_miles:',', sep_decimal:'.', form_fecha:'MM/DD/YYYY', filasxtabla:50  },
    { uid:9,  nombre:'Jordi',  apellido:'Puig',      email:'jordi.puig@alkim.ia',  usuario:'jordi_p',    prefijo_tel:'+34', telefono:'611 789 456', rol:1, estatus:0, ultima_sesion:new Date(Date.now()-4*86400000).toISOString(), verif_eml:1, verif_tel:1, intentos_fallidos:0, bloqueado_hasta:null,  fecha_creacion:'2024-09-30', idioma:3, tema:2, sep_miles:'.', sep_decimal:',', form_fecha:'DD/MM/YYYY', filasxtabla:100 },
];

// ============================================================================
// HELPERS
// ============================================================================

const fmtDate = (d) => d ? new Date(d).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const badgeCls = 'bg-surface2 text-on-surface2 border border-border';

// ============================================================================
// DEFINICIÓN DE COLUMNAS
// ============================================================================

const COLUMNS = [
    {
        id: 'nombre', label: 'Nombre', sortField: 'nombre',
        render: (u) => (
            <span className="flex flex-col">
                <span className="font-medium text-on-background whitespace-nowrap text-xs">{u.nombre} {u.apellido}</span>
                <span className="text-xs text-on-surface2 font-mono">@{u.usuario}</span>
            </span>
        ),
    },
    {
        id: 'email', label: 'Email', sortField: 'email',
        render: (u) => <span className="text-xs truncate max-w-[130px] block">{u.email}</span>,
    },
    {
        id: 'telefono', label: 'Teléfono', sortField: 'prefijo_tel',
        render: (u) => <span className="text-xs whitespace-nowrap">{u.telefono ? `${u.prefijo_tel} ${u.telefono}` : <span className="text-disabled">—</span>}</span>,
    },
    {
        id: 'rol', label: 'Rol', sortField: 'rol',
        render: (u) => (
            <span className={`inline-flex items-center px-1.5 py-0 rounded text-xs font-medium ${badgeCls}`}>
                {ROL_MAP[u.rol]}
            </span>
        ),
    },
    {
        id: 'estatus', label: 'Estado', sortField: 'estatus',
        render: (u) => {
            const isBlocked = u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date();
            const s = STATUS_CFG[u.estatus] || STATUS_CFG[0];
            return (
                <span className="flex items-center gap-1 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBlocked ? 'bg-red-500' : s.color}`}/>
                    {isBlocked ? 'Bloqueado' : s.label}
                </span>
            );
        },
    },
    {
        id: 'verif', label: 'Verif.', sortField: null,
        render: (u) => (
            <div className="flex items-center gap-1 text-xs">
                <Mail  size={11} className={u.verif_eml  ? 'text-green-400' : 'text-disabled'}/>
                <Phone size={11} className={u.verif_tel ? 'text-green-400' : 'text-disabled'}/>
                {u.intentos_fallidos > 0 && (
                    <span className="px-1 bg-orange-500 text-white rounded text-xs font-bold">
                        {u.intentos_fallidos}✗
                    </span>
                )}
            </div>
        ),
    },
    {
        id: 'ultima_sesion', label: 'Última sesión', sortField: 'ultima_sesion',
        render: (u) => <span className="text-xs whitespace-nowrap">{fmtDate(u.ultima_sesion)}</span>,
    },
];

// ============================================================================
// FILTROS AVANZADOS
// ============================================================================

const FILTER_FIELDS = [
    { id: 'nombre',    label: 'Nombre o apellido', type: 'text',   placeholder: 'Ej: García' },
    { id: 'email',     label: 'Email',              type: 'text',   placeholder: 'Ej: usuario@alkim.ia' },
    { id: 'rol',       label: 'Rol',                type: 'select', options: [['0','Invitado'],['1','Usuario'],['2','Admin'],['3','SuperAdmin']] },
    { id: 'estatus',   label: 'Estado',             type: 'select', options: [['0','Activo'],['1','Inactivo']] },
    { id: 'verif_eml', label: 'Email verificado',   type: 'select', options: [['1','Verificado'],['0','Sin verificar']] },
];

const filterFn = (u, f) => {
    if (f.nombre    && !`${u.nombre} ${u.apellido}`.toLowerCase().includes(f.nombre.toLowerCase())) return false;
    if (f.email     && !u.email.toLowerCase().includes(f.email.toLowerCase())) return false;
    if (f.rol       !== undefined && f.rol !== '' && u.rol       !== parseInt(f.rol))       return false;
    if (f.estatus   !== undefined && f.estatus !== '' && u.estatus   !== parseInt(f.estatus))   return false;
    if (f.verif_eml !== undefined && f.verif_eml !== '' && u.verif_eml !== parseInt(f.verif_eml)) return false;
    return true;
};

const searchFn = (u, q) =>
    `${u.nombre} ${u.apellido} ${u.email} ${u.usuario}`.toLowerCase().includes(q);

// ============================================================================
// MODALES DE USUARIO
// ============================================================================

const UserModal = ({ user, mode, onClose }) => {
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);
    const isView = mode === 'view';

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 900);
    };

    const iCls = (dis) =>
        `w-full px-3.5 py-2.5 bg-surface2 border border-border rounded-lg text-sm text-on-surface1 outline-none
        ${dis ? 'text-disabled cursor-not-allowed' : 'focus:ring-2 focus:ring-primary focus:border-primary'} transition-all`;

    const Field = ({ label, value, type = 'text', disabled, icon: Icon }) => (
        <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-xs font-semibold text-on-surface2 uppercase tracking-wider">
                {Icon && <Icon size={10}/>} {label}
            </label>
            <input type={type} defaultValue={value} disabled={disabled || isView} className={iCls(disabled || isView)}/>
        </div>
    );

    const sFld = `w-full px-3 py-2.5 bg-surface2 border border-border rounded-lg text-sm text-on-surface1
        outline-none focus:ring-2 focus:ring-primary transition-all appearance-none disabled:text-disabled`;

    const SelField = ({ label, value, options }) => (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface2 uppercase tracking-wider block">{label}</label>
            <div className="relative">
                <select className={sFld} defaultValue={value} disabled={isView}>
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface2 pointer-events-none"/>
            </div>
        </div>
    );

    const isBlocked = user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date();

    const tabs = [
        {
            id: 'profile', label: 'Datos', icon: <User size={12}/>,
            content: (
                <div className="space-y-4 p-1">
                    <div className="flex items-center gap-4 p-3 bg-surface2 rounded-xl border border-border">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-base font-bold text-on-primary">
                                {user.nombre?.charAt(0)}{user.apellido?.charAt(0)}
                            </div>
                            {!isView && (
                                <button className="absolute -bottom-1 -right-1 p-1 bg-primary text-white rounded-lg border-2 border-surface1 hover:scale-110 transition-transform">
                                    <Camera size={10}/>
                                </button>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-on-background">{user.nombre} {user.apellido}</p>
                            <p className="text-xs text-on-surface2">@{user.usuario} · {ROL_MAP[user.rol]}</p>
                            <span className={`mt-1 inline-flex items-center gap-1 text-xs ${isBlocked ? 'text-red-400' : user.estatus===0 ? 'text-green-400' : 'text-on-surface2'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isBlocked ? 'bg-red-400' : user.estatus===0 ? 'bg-green-400' : 'bg-gray-400'}`}/>
                                {isBlocked ? 'Bloqueado' : STATUS_CFG[user.estatus]?.label}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Nombre"   value={user.nombre}      icon={User}/>
                        <Field label="Apellidos" value={user.apellido}   icon={User}/>
                        <Field label="Email"     value={user.email}      icon={Mail}  type="email" disabled/>
                        <Field label="Usuario"   value={user.usuario}    icon={Hash}/>
                        <Field label="Prefijo"   value={user.prefijo_tel} icon={Globe}/>
                        <Field label="Teléfono"  value={user.telefono || '—'} icon={Phone}/>
                    </div>
                    {!isView && (
                        <div className="flex justify-end"><Button onClick={handleSave} loading={saving} leftIcon={<Save size={13}/>}>{saved ? '✅ Guardado' : 'Guardar'}</Button></div>
                    )}
                </div>
            ),
        },
        {
            id: 'prefs', label: 'Preferencias', icon: <Settings size={12}/>,
            content: (
                <div className="space-y-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <SelField label="Idioma"       value={user.idioma}      options={[[1,'🇪🇸 Español'],[2,'🇬🇧 English'],[3,'🏴 Català']]}/>
                        <SelField label="Tema"         value={user.tema}        options={[[1,'☀️ Claro'],[2,'🌙 Oscuro'],[3,'⬛ Alto Contraste']]}/>
                        <SelField label="Sep. miles"   value={user.sep_miles}   options={[['.','Punto'],[',','Coma']]}/>
                        <SelField label="Sep. decimal" value={user.sep_decimal} options={[[',','Coma'],['.',  'Punto']]}/>
                        <SelField label="Fecha"        value={user.form_fecha}  options={[['DD/MM/YYYY','DD/MM/YYYY'],['MM/DD/YYYY','MM/DD/YYYY'],['YYYY-MM-DD','YYYY-MM-DD']]}/>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-on-surface2 uppercase block">Filas</label>
                            <input type="number" defaultValue={user.filasxtabla} disabled={isView} className={iCls(isView)}/>
                        </div>
                    </div>
                    {!isView && <div className="flex justify-end"><Button onClick={handleSave} loading={saving} leftIcon={<Save size={13}/>}>Guardar</Button></div>}
                </div>
            ),
        },
        {
            id: 'security', label: 'Seguridad', icon: <Shield size={12}/>,
            content: (
                <div className="space-y-4 p-1">
                    {!isView && (
                        <div className="p-3 bg-surface2 rounded-xl border border-border space-y-3">
                            <h4 className="font-semibold flex items-center gap-2 text-sm"><Lock size={13}/> Cambiar contraseña</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-semibold text-on-surface2 uppercase block mb-1">Actual</label><input type="password" placeholder="••••••••" className={iCls(false)}/></div>
                                <div><label className="text-xs font-semibold text-on-surface2 uppercase block mb-1">Nueva</label><input type="password" placeholder="••••••••" className={iCls(false)}/></div>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <SelField label="Estado"       value={user.estatus}          options={[[0,'Activo'],[1,'Inactivo']]}/>
                        <SelField label="Rol"          value={user.rol}              options={[[0,'Invitado'],[1,'Usuario'],[2,'Admin'],[3,'SuperAdmin']]}/>
                        <SelField label="Email verif." value={user.verif_eml}        options={[[1,'✅ Sí'],[0,'❌ No']]}/>
                        <SelField label="Tel. verif."  value={user.verif_tel}       options={[[1,'✅ Sí'],[0,'❌ No']]}/>
                        <div><label className="text-xs font-semibold text-on-surface2 uppercase block mb-1">Intentos fallidos</label><input type="number" defaultValue={user.intentos_fallidos} disabled={isView} className={iCls(isView)}/></div>
                        <div><label className="text-xs font-semibold text-on-surface2 uppercase block mb-1">Última sesión</label><input type="text" defaultValue={fmtDate(user.ultima_sesion)} disabled className={iCls(true)}/></div>
                    </div>
                    {!isView && <div className="flex justify-end"><Button onClick={handleSave} loading={saving} leftIcon={<Save size={13}/>}>Guardar</Button></div>}
                </div>
            ),
        },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-surface1 border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface2 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-sm font-bold text-on-primary">
                            {user.nombre?.charAt(0)}{user.apellido?.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-on-background text-sm">
                                {user.nombre} {user.apellido}
                                <span className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${isView ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>
                                    {isView ? 'Vista' : 'Editar'}
                                </span>
                            </h3>
                            <p className="text-xs text-on-surface2">@{user.usuario} · {ROL_MAP[user.rol]}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-surface3 rounded-full transition-colors text-on-surface2">
                        <CloseIcon size={16}/>
                    </button>
                </div>
                <div className="overflow-auto flex-1 p-2">
                    <Tabs tabs={tabs} orientation="horizontal"/>
                </div>
            </div>
        </div>
    );
};

const AddUserModal = ({ onClose }) => {
    const [saving, setSaving] = useState(false);
    const iCls = "w-full px-3.5 py-2.5 bg-surface2 border border-border rounded-lg text-sm text-on-surface1 outline-none focus:ring-2 focus:ring-primary transition-all";
    const Fld = ({ label, placeholder, type = 'text' }) => (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface2 uppercase tracking-wider block">{label}</label>
            <input type={type} placeholder={placeholder} className={iCls}/>
        </div>
    );
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-surface1 border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Plus size={14} className="text-on-primary"/></div>
                        <h3 className="font-bold text-on-background">Agregar usuario</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-surface3 rounded-full transition-colors text-on-surface2"><CloseIcon size={16}/></button>
                </div>
                <div className="p-5 space-y-4 overflow-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <Fld label="Nombre" placeholder="Ej: María"/>
                        <Fld label="Apellidos" placeholder="Ej: López"/>
                    </div>
                    <Fld label="Email" placeholder="usuario@alkim.ia" type="email"/>
                    <Fld label="Usuario" placeholder="Ej: maria_l"/>
                    <div className="grid grid-cols-3 gap-3">
                        <Fld label="Prefijo" placeholder="+34"/>
                        <div className="col-span-2"><Fld label="Teléfono" placeholder="600 000 000"/></div>
                    </div>
                    <Fld label="Contraseña" placeholder="Mín. 8 caracteres" type="password"/>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface2 uppercase tracking-wider block">Rol</label>
                        <div className="relative">
                            <select defaultValue={1} className="w-full px-3 py-2.5 bg-surface2 border border-border rounded-lg text-sm text-on-surface1 outline-none focus:ring-2 focus:ring-primary transition-all appearance-none">
                                <option value={0}>Invitado</option>
                                <option value={1}>Usuario</option>
                                <option value={2}>Admin</option>
                            </select>
                            <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface2 pointer-events-none"/>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-border flex justify-end gap-3 bg-surface2">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button leftIcon={<Plus size={13}/>} loading={saving}
                        onClick={() => { setSaving(true); setTimeout(() => { setSaving(false); onClose(); }, 1000); }}>
                        Crear usuario
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

const MockupUserView = () => {
    const [modal,   setModal]   = useState(null);   // { user, mode }
    const [showAdd, setShowAdd] = useState(false);

    return (
        <div className="min-h-screen bg-background text-on-background">
            {/* Banner prototipo */}
            <div className="bg-amber-500 border-b border-amber-600 px-4 py-1.5 text-center">
                <span className="text-xs font-medium text-white flex items-center justify-center gap-2">
                    <AlertCircle size={11}/> PROTOTIPO VISUAL — Sin conexión real a la BD
                </span>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6">
                {/* Header */}
                <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-extrabold text-on-background tracking-tight flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <Users size={17} className="text-primary"/>
                            </div>
                            Gestión de Usuarios
                        </h1>
                        <p className="text-on-surface2 mt-0.5 text-xs">
                            Grupo <span className="font-semibold text-primary">ALKIM</span> · {MOCK_USERS.length} usuarios registrados
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface1 border border-border rounded-lg text-xs text-on-surface2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"/>
                        Servidor online
                    </div>
                </div>

                {/* Tabla genérica */}
                <DataTable
                    columns={COLUMNS}
                    data={MOCK_USERS}
                    keyField="uid"
                    rowsPerPage={5}
                    searchFn={searchFn}
                    filterFields={FILTER_FIELDS}
                    filterFn={filterFn}
                    onAdd={() => setShowAdd(true)}
                    onView={(u) => setModal({ user: u, mode: 'view' })}
                    onEdit={(u) => setModal({ user: u, mode: 'edit' })}
                    onDelete={(u) => console.log('🗑 Eliminar (prototipo):', u.uid)}
                    emptyMessage="Sin usuarios que coincidan con la búsqueda"
                />
            </div>

            {/* Modales */}
            {modal   && <UserModal user={modal.user} mode={modal.mode} onClose={() => setModal(null)}/>}
            {showAdd && <AddUserModal onClose={() => setShowAdd(false)}/>}
        </div>
    );
};

export default MockupUserView;
