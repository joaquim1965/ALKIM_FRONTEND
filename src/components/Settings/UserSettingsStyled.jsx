/**
 * UserSettingsStyled.jsx
 * 
 * Componente VISUAL para la página de Configuración.
 * Implementa la estructura de pestañas laterales con el nuevo diseño solicitado.
 */

import React from 'react';
import { 
    User, Key, Settings, Shield, Globe, Clock, Save, Hash, Lock, 
    CheckCircle, AlertTriangle, Users, Zap, Mail, Phone, Calendar, Monitor,
    ChevronDown, CreditCard, UserPlus, Fingerprint, LogOut
} from 'lucide-react';

const Feedback = ({ success, error }) => {
    if (!success && !error) return null;
    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-right-2 duration-300 shadow-lg border ${
            success 
                ? 'bg-success text-on-success border-success-border' 
                : 'bg-destructive text-on-destructive border-destructive-border'
        }`}>
            {success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {success || error}
        </div>
    );
};
import Tabs from '../UI/Tabs';
import Input from '../UI/Input';
import Button from '../UI/Button';
import PasswordInput from '../UI/PasswordInput';
import UserList from '../User/UserList';
import Dropdown from '../UI/Dropdown';

// --- CONSTANTS ---
// Las banderas se obtienen dinámicamente de la tabla s_country (countriesList)
const getFlagUrl = (isoCode) => {
    if (!isoCode || isoCode.length !== 2) return null;
    return `https://flagcdn.com/w40/${isoCode.toLowerCase()}.png`;
};


// --- SUB-COMPONENT: TAB CONTENT WRAPPER ---
const SectionWrapper = ({ title, desc, icon, children }) => (
    <div className="flex flex-col h-full bg-surface1">
        <div className="p-4 md:p-4 border-b border-border bg-surface2 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary border border-primary rounded-2xl text-on-primary shadow-sm">
                    {React.cloneElement(icon, { size: 24 })}
                </div>
                <div>
                    <h2 className="text-2xl font-black text-on-background tracking-tight leading-none mb-1">{title}</h2>
                    {desc && <p className="text-xs font-bold text-on-surface2 uppercase tracking-widest">{desc}</p>}
                </div>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-5 md:p-6 pb-24">
                {children}
            </div>
        </div>
    </div>
);

// --- SECCIÓN: CUENTA (Default) ---
const AccountSection = ({ sections, onSave, t, label, loading, user, getEnumLabel, enums, countriesList, success, error }) => {
    const myRol = user ? parseInt(user.rol) : 1;
    return (
        <SectionWrapper title={label('AccountTab')} icon={<User />}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl">
                <Input id="input-usuario-settings" label={t('TC s_user:usuario')} value={sections.account.usuario} onChange={(e) => onSave('account', { usuario: e.target.value }, false)} leftIcon={<User size={16} />} size="md" required />
            <Input id="input-nombre-settings" label={t('TC s_user:nombre')} value={sections.account.nombre} onChange={(e) => onSave('account', { nombre: e.target.value }, false)} size="md" required />
            <Input id="input-apellido-settings" label={t('TC s_user:apellido')} value={sections.account.apellido} onChange={(e) => onSave('account', { apellido: e.target.value }, false)} size="md" required />
            
            
            <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row gap-3">
                <div className="w-full md:w-[240px] space-y-1.5 flex flex-col">
                    <label className="text-[11px] font-black text-on-surface1 tracking-wider ml-1">{t('TC s_user:prefijo_tel')}</label>
                    <div className="relative group">
                        <div className="flex-1">
                            <Dropdown
                                triggerLabel={sections.account.prefijo_tel || '--'}
                                options={countriesList?.filter(c => c.prefijo_tel).map(c => {
                                    const pref = c.prefijo_tel.toString().startsWith('+') ? c.prefijo_tel : `+${c.prefijo_tel}`;
                                    return {
                                        value: pref,
                                        label: `${pref} (${c.nombre})`,
                                        icon: c.codiso ? (
                                            <img 
                                                src={getFlagUrl(c.codiso)} 
                                                alt={c.codiso} 
                                                className="w-4 h-3 object-cover rounded-[2px]"
                                            />
                                        ) : null
                                    };
                                })}
                                onSelect={(val) => onSave('account', { prefijo_tel: val }, false)}
                                selectedValue={sections.account.prefijo_tel}
                                className="w-full"
                                triggerClassName="input-base w-full px-4 h-[45px] bg-surface2 border-border font-bold text-sm rounded-xl justify-between"
                                position="left"
                                showChevron={false}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex-1">
                    <Input id="input-telefono-settings" label={t('TC s_user:telefono')} value={sections.account.telefono} onChange={(e) => onSave('account', { telefono: e.target.value }, false)} leftIcon={<Phone size={16} />} size="md" maxLength={21} fullWidth />
                </div>
            </div>



            <div className="space-y-1.5 flex flex-col">
                <label className="text-[11px] font-black text-on-surface1 tracking-wider ml-1">{t('TC s_user:grupo')}</label>
                <div className="relative group">
                    {parseInt(user.rol) >= 3 ? (
                        <Input 
                            value={sections.account.grupo} 
                            onChange={(e) => onSave('account', { grupo: e.target.value }, false)}
                            size="md"
                        />
                    ) : (
                        <div className="relative">
                            <select className="input-base w-full px-4 h-[45px] pr-10 appearance-none bg-surface2 border-border font-bold text-sm rounded-xl opacity-70" value={sections.account.grupo} disabled>
                                <option value={sections.account.grupo}>{sections.account.grupo}</option>
                            </select>
                            <Users size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface2" />
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-1.5 flex flex-col">
                <label className="text-[11px] font-black text-on-surface1 tracking-wider ml-1">{t('TC s_user:rol')}</label>
                <div className="relative group flex items-center gap-2">
                    <div className="relative flex-1">
                        <select 
                            className={`input-base w-full px-4 h-[45px] pr-10 appearance-none bg-surface2 border-border font-bold text-sm rounded-xl ${myRol >= 3 ? 'hover:bg-surface1 transition-all focus:ring-2 focus:ring-primary' : 'opacity-70'}`}
                            value={sections.account.rol} 
                            disabled={myRol < 3}
                            onChange={(e) => onSave('account', { rol: parseInt(e.target.value) }, false)}
                        >
                            {enums?.s_user?.rol ? (
                                Object.entries(enums.s_user.rol)
                                    .filter(([val]) => {
                                        const r = parseInt(val);
                                        if (myRol === 3) return r <= 3;
                                        if (myRol >= 4) return r <= 4;
                                        return r === parseInt(sections.account.rol);
                                    })
                                    .map(([val, labelText]) => (
                                        <option key={val} value={val}>{labelText}</option>
                                    ))
                            ) : (
                                <option value={sections.account.rol}>{getEnumLabel('s_user', 'rol', sections.account.rol)}</option>
                            )}
                        </select>
                        {myRol >= 3 && <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface2 group-hover:text-primary transition-colors" />}
                    </div>
                </div>
            </div>
            
            <Input label={t('TC s_user:bloqueado_hasta')} value={sections.account.bloqueado_hasta || '—'} disabled leftIcon={<Lock size={16} />} size="md" />
            <Input label={t('TC s_user:intentos_fallidos')} value={sections.account.intentos_fallidos} disabled size="md" />
            <Input label={t('TC s_user:fecha_ultimo_intento')} value={sections.account.fecha_ultimo_intento ? new Date(sections.account.fecha_ultimo_intento).toLocaleString() : '—'} disabled leftIcon={<Calendar size={16} />} size="md" />
            
            <div className="col-span-1 md:col-span-2 flex gap-4 mt-auto">
                <div className={`flex flex-1 items-center justify-center gap-2 h-[45px] px-4 rounded-xl font-bold text-sm border ${sections.account.verif_eml ? 'bg-success text-on-success border-success-border' : 'bg-warning/20 text-warning border-warning-border'}`}>
                    {sections.account.verif_eml ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    {sections.account.verif_eml ? label('EmailVerified') : label('EmailNotVerified')}
                </div>
                <div className={`flex flex-1 items-center justify-center gap-2 h-[45px] px-4 rounded-xl font-bold text-sm border ${sections.account.verif_tel ? 'bg-success text-on-success border-success-border' : 'bg-warning/20 text-warning border-warning-border'}`}>
                    {sections.account.verif_tel ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    {sections.account.verif_tel ? label('PhoneVerified') : label('PhoneNotVerified')}
                </div>
            </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-end mt-6 pt-4 border-t border-border gap-4">
            <Feedback success={success} error={error} />
            <Button variant="primary" size="lg" onClick={() => onSave('account')} loading={loading} leftIcon={<Save size={20} />} className="w-full md:w-auto">
                {label('Save')}
            </Button>
        </div>
    </SectionWrapper>
        );
};

// --- SECCIÓN: CONTRASEÑA, EMAIL ---
const AuthSection = ({ sections, onSave, label, loading, user, success, error }) => (
    <SectionWrapper title={label('AuthTab')} icon={<Key />}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
            {/* Bloque Cambio de Contraseña */}
            <div className="space-y-4 bg-surface2 p-5 rounded-3xl border border-border shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                    <Lock className="text-primary" size={18} />
                    <h3 className="text-lg font-black tracking-tight">{label('ChangePassword')}</h3>
                </div>
                <PasswordInput label={`${label('CurrentPassword')} *`} value={sections.auth.currentPassword} onChange={(e) => onSave('auth', { currentPassword: e.target.value }, false)} size="md" />
                <hr className="border-border/50" />
                <PasswordInput label={`${label('NewPassword', 'Nueva Contraseña')} *`} value={sections.auth.newPassword} onChange={(e) => onSave('auth', { newPassword: e.target.value }, false)} showStrength size="md" />
                <PasswordInput label={`${label('ConfirmPassword')} *`} value={sections.auth.newPasswordConfirm} onChange={(e) => onSave('auth', { newPasswordConfirm: e.target.value }, false)} size="md" />
                <div className="pt-4 mt-auto flex items-center gap-4">
                    <Feedback success={success} error={error} />
                    <Button variant="primary" fullWidth onClick={() => onSave('auth', { type: 'password' })} loading={loading}>{label('Save')}</Button>
                </div>
            </div>

            {/* Bloque Cambio de Email */}
            <div className="space-y-4 bg-surface2 p-5 rounded-3xl border border-border shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                    <Mail className="text-accent" size={18} />
                    <h3 className="text-lg font-black tracking-tight">{label('ChangeEmail')}</h3>
                </div>
                <Input label={label('ConfirmNewEmail')} value={sections.auth.newEmailConfirm} onChange={(e) => onSave('auth', { newEmailConfirm: e.target.value }, false)} leftIcon={<Mail size={16} />} size="md" />
                <div className="p-4 bg-surface1 rounded-2xl border border-primary text-[11px] font-bold text-on-surface1 leading-relaxed uppercase tracking-wider">
                    <AlertTriangle size={14} className="inline mr-2 text-primary" />
                    {label('EmailChangeNotice')}
                </div>
                <div className="pt-4 mt-auto flex items-center gap-4">
                    <Feedback success={success} error={error} />
                    <Button variant="secondary" fullWidth onClick={() => onSave('auth', { type: 'email' })} loading={loading}>{label('Save')}</Button>
                </div>
            </div>
        </div>
    </SectionWrapper>
);

// --- SECCIÓN: DETALLES ---
const DetailsSection = ({ sections, onSave, t, label, loading, getEnumLabel, enums, success, error, languagesList, themesList, timezonesList, countriesList }) => (
    <SectionWrapper title={label('DetailsTab')} icon={<Settings />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl">
            {/* Idioma */}
            <div className="space-y-1.5 flex flex-col">
                <label className="text-[11px] font-black text-on-surface1 tracking-wider ml-1">{t('TC s_userdata:idioma')}</label>
                <div className="relative group">
                    <select className="input-base w-full px-4 h-[45px] pr-10 appearance-none bg-surface2 border-border font-bold text-sm rounded-xl focus:ring-2 focus:ring-primary transition-all hover:bg-surface2" value={sections.details.idioma} onChange={(e) => onSave('details', { idioma: parseInt(e.target.value) }, false)}>
                        {languagesList.length > 0 && (
                            languagesList.map(l => (
                                <option key={l.lid} value={l.lid}>{l.nombre} {l.codigo === 'es' ? '🇪🇸' : l.codigo === 'en' ? '🇺🇸' : l.codigo === 'ca' ? '🇦nd' : l.codigo === 'fr' ? '🇫🇷' : ''}</option>
                            ))
                        )}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface2 group-hover:text-primary transition-colors" />
                </div>
            </div>

            {/* Tema */}
            <div className="space-y-1.5 flex flex-col">
                <label className="text-[11px] font-black text-on-surface1 tracking-wider ml-1">{t('TC s_userdata:tema')}</label>
                <div className="relative group">
                    <select className="input-base w-full px-4 h-[45px] pr-10 appearance-none bg-surface2 border-border font-bold text-sm rounded-xl" value={sections.details.tema} onChange={(e) => onSave('details', { tema: parseInt(e.target.value) }, false)}>
                        {themesList.length > 0 && (
                            themesList
                                .filter(t => parseInt(t.id_idioma) === parseInt(sections.details.idioma))
                                .map(t => (
                                    <option key={t.tid} value={t.id_tema}>{t.nombre}</option>
                                ))
                        )}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface2" />
                </div>
            </div>

            {/* País con círculo de bandera */}
            <div className="space-y-1.5 flex flex-col">
                <label className="text-[11px] font-black text-on-surface1 tracking-wider ml-1">{t('TC s_userdata:pais')}</label>
                <div className="relative group flex items-center gap-2">
                    <div className="relative flex-1">
                        {/* Bandera circular */}
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full overflow-hidden border border-border flex items-center justify-center bg-surface2 shadow-inner z-10 pointer-events-none">
                            {(() => {
                                const country = countriesList?.find(c => parseInt(c.cid) === parseInt(sections.details.pais));
                                if (country?.codiso) {
                                    return <img src={getFlagUrl(country.codiso)} alt={country.codiso} className="w-full h-full object-cover scale-150" />;
                                }
                                return <span className="text-lg leading-none transform translate-y-px">🏳️</span>;
                            })()}
                        </div>
                        <Dropdown
                            triggerLabel={countriesList?.find(c => parseInt(c.cid) === parseInt(sections.details.pais))?.nombre || label('SelectCountry')}
                            options={countriesList?.length > 0 ? countriesList.map(c => ({
                                value: c.cid,
                                label: c.nombre,
                                icon: c.codiso ? (
                                    <img 
                                        src={getFlagUrl(c.codiso)} 
                                        alt={c.codiso} 
                                        className="w-4 h-3 object-cover rounded-[2px]"
                                    />
                                ) : null
                            })) : []}
                            onSelect={(val) => onSave('details', { pais: parseInt(val) }, false)}
                            selectedValue={sections.details.pais}
                            className="w-full"
                            triggerClassName="input-base w-full pl-12 pr-10 h-[45px] bg-surface2 border-border font-bold text-sm rounded-xl justify-between"
                            position="left"
                            showChevron={false}
                        />
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface2 group-hover:text-primary transition-colors hover:text-primary" />
                    </div>
                </div>
            </div>

            {/* Zona Horaria */}
            <div className="space-y-1.5 flex flex-col md:col-span-2 lg:col-span-1">
                <label className="text-[11px] font-black text-on-surface1 tracking-wider ml-1">{t('TC s_userdata:zona_horaria')}</label>
                <div className="relative group">
                    <select className="input-base w-full px-4 h-[45px] pr-10 appearance-none bg-surface2 border-border font-bold text-sm rounded-xl" value={sections.details.zona_horaria || ''} onChange={(e) => onSave('details', { zona_horaria: parseInt(e.target.value) }, false)}>
                        {timezonesList.length > 0 && (
                            timezonesList.map(tz => (
                                <option key={tz.tzid} value={tz.tzid}>({tz.relativo_utc}) {tz.tz_nombre}</option>
                            ))
                        )}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface2" />
                </div>
            </div>

            <div className="space-y-1.5 flex flex-col">
                <label className="text-[11px] font-black text-on-surface1 tracking-wider ml-1">{t('TC s_userdata:sep_miles')}</label>
                <select className="input-base w-full px-4 h-[45px] bg-surface2/50 border-border/50 font-bold text-sm rounded-xl" value={sections.details.sep_miles} onChange={(e) => {
                    const val = e.target.value;
                    const opposite = val === '.' ? ',' : '.';
                    onSave('details', { sep_miles: val, sep_decimal: opposite }, false);
                }}>
                    <option value=".">{label('Dot', 'Punto')} (.)</option>
                    <option value=",">{label('Comma', 'Coma')} (,)</option>
                </select>
            </div>

            <div className="space-y-1.5 flex flex-col">
                <label className="text-[11px] font-black text-on-surface1 tracking-wider ml-1">{t('TC s_userdata:sep_decimal')}</label>
                <select className="input-base w-full px-4 h-[45px] bg-surface2/50 border-border/50 font-bold text-sm rounded-xl" value={sections.details.sep_decimal} onChange={(e) => {
                    const val = e.target.value;
                    const opposite = val === '.' ? ',' : '.';
                    onSave('details', { sep_decimal: val, sep_miles: opposite }, false);
                }}>
                    <option value=",">{label('Comma', 'Coma')} (,)</option>
                    <option value=".">{label('Dot', 'Punto')} (.)</option>
                </select>
            </div>

            <div className="space-y-1.5 flex flex-col">
                <label className="text-[11px] font-black text-on-surface1 tracking-wider ml-1">{t('TC s_userdata:form_fecha')}</label>
                <select className="input-base w-full px-4 h-[45px] bg-surface2 border-border font-bold text-sm rounded-xl" value={sections.details.form_fecha} onChange={(e) => onSave('details', { form_fecha: e.target.value }, false)}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                </select>
            </div>

            <Input label={t('TC s_userdata:filasxtabla')} value={sections.details.filasxtabla} onChange={(e) => onSave('details', { filasxtabla: parseInt(e.target.value) }, false)} leftIcon={<Monitor size={16} />} size="md" />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-start mt-6 pt-4 border-t border-border gap-4">
            <Button variant="primary" size="lg" onClick={() => onSave('details')} loading={loading} leftIcon={<Save size={20} />}>
                {label('Save')}
            </Button>
            <Feedback success={success} error={error} />
        </div>
    </SectionWrapper>
);

// --- SECCIÓN: SEGURIDAD ---
const SecuritySection = ({ sections, onSave, t, label, loading, getEnumLabel, enums, success, error }) => (
    <SectionWrapper title={label('ActivityTab')} icon={<Shield />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-7xl mb-6">
            <div className="p-6 bg-surface2 border border-border rounded-3xl flex items-center justify-between shadow-sm group hover:border-primary transition-all duration-300">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-on-primary group-hover:scale-110 transition-transform"><Clock size={24}/></div>
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-on-surface2 mb-0.5">{label('LastSession')}</p>
                        <p className="text-xl font-black text-on-background">{sections.security.ultima_sesion || '—'}</p>
                    </div>
                </div>
            </div>
            <div className="p-6 bg-surface2 border border-border rounded-3xl flex items-center justify-between shadow-sm group hover:border-success transition-all duration-300">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-success rounded-2xl flex items-center justify-center text-on-success group-hover:scale-110 transition-transform"><Zap size={24}/></div>
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-on-surface2 mb-0.5">{label('LastActivity')}</p>
                        <p className="text-xl font-black text-on-background">{sections.security.ultima_actividad || label('ActiveNow')}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-7xl">
            <Input label={t('TC s_user:tpomax_sesion_horas')} value={sections.security.tpomax_sesion_horas} onChange={(e) => onSave('security', { tpomax_sesion_horas: parseInt(e.target.value) }, false)} leftIcon={<CreditCard size={16} />} size="md" />
            <Input label={t('TC s_user:tpomax_inactividad_min')} value={sections.security.tpomax_inactividad_min} onChange={(e) => onSave('security', { tpomax_inactividad_min: parseInt(e.target.value) }, false)} leftIcon={<Clock size={16} />} size="md" />
        </div>

        <div className="p-4 bg-surface1 rounded-2xl border border-primary text-xs font-bold text-on-surface1 leading-relaxed uppercase tracking-widest max-w-7xl mt-6 flex items-start gap-3">
            <AlertTriangle size={18} className="text-primary shrink-0" />
            <p>{label('SecurityPolicyNote')}</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-start mt-6 pt-4 border-t border-border gap-4 max-w-7xl">
            <Button variant="primary" size="lg" onClick={() => onSave('security')} loading={loading} leftIcon={<Save size={20} />}>
                {label('Save')}
            </Button>
            <Feedback success={success} error={error} />
        </div>
    </SectionWrapper>
);

// --- SECCIÓN: USUARIOS DEL GRUPO (Solo Admin/Superadmin) ---
const GroupUsersSection = ({ isSysAdmin, selectedGroup, groups, onGroupChange, label, user, onSave, loading }) => (
    <SectionWrapper title={label('GroupUsersTitle')} icon={<Users />}>
        <div className="space-y-6">
            {isSysAdmin && (
                <div className="flex flex-col md:flex-row items-end gap-4 bg-surface2 p-5 rounded-3xl border border-border shadow-sm">
                    <div className="flex-1 space-y-1.5 w-full">
                        <label className="text-[11px] font-black text-on-surface1 tracking-wider ml-1">{label('SelectGroup')}</label>
                        <div className="relative group">
                            <select 
                                className="input-base w-full px-4 h-[45px] pr-10 appearance-none bg-background border-border font-bold text-sm rounded-xl focus:ring-2 focus:ring-primary/20" 
                                value={selectedGroup} 
                                onChange={(e) => onGroupChange(e.target.value)}
                            >
                                {groups.length > 0 ? groups.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                )) : (
                                    <option value={user?.grupo}>{user?.grupo}</option>
                                )}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface2/50" />
                        </div>
                    </div>
                    <Button variant="primary" size="lg" onClick={() => onSave('account', { grupo: selectedGroup })} loading={loading} leftIcon={<Save size={20} />}>
                        {label('Save')}
                    </Button>
                </div>
            )}
            
            <div className="bg-surface2 rounded-3xl border border-border overflow-hidden shadow-2xl min-h-[500px]">
                <UserList grupo={selectedGroup} />
            </div>
        </div>
    </SectionWrapper>
);

// --- SECCIÓN: SESIÓN (Solo SysAdmin) ---
const SessionSection = ({ sections, t, label, user, getEnumLabel, enums }) => (
    <SectionWrapper title={label('SessionTab')} icon={<Monitor />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl">
            <Input label="UID" value={sections.session.uid} disabled size="md" />
            <Input label={t('TC s_user:auth_provider')} value={sections.session.auth_provider?.toUpperCase() || 'LOCAL'} disabled leftIcon={<Fingerprint size={16}/>} size="md" />
            <Input label={t('TC s_user:fecha_creacion')} value={sections.session.fecha_creacion ? new Date(sections.session.fecha_creacion).toLocaleString() : '—'} disabled leftIcon={<Calendar size={16}/>} size="md" />
            <Input label={t('TC s_user:vereml_fecha')} value={sections.session.vereml_fecha ? new Date(sections.session.vereml_fecha).toLocaleString() : '—'} disabled leftIcon={<CheckCircle size={16}/>} size="md" />
            <Input label={t('TC s_user:vertel_fecha')} value={sections.session.vertel_fecha ? new Date(sections.session.vertel_fecha).toLocaleString() : '—'} disabled leftIcon={<CheckCircle size={16}/>} size="md" />
            <Input label={t('TC s_user:direccion_ip')} value={sections.session.direccion_ip || label('Unknown', 'Desconocido')} disabled leftIcon={<Globe size={16}/>} size="md" />
            <hr className="md:col-span-2 lg:col-span-3 border-border/50 my-2" />
            <Input label={label('EmailVerificationToken', 'Email Verification Token')} value={sections.session.email_verification_token || '—'} disabled size="md" />
            <Input label={label('EmailTokenExpires', 'Email Token Expires')} value={sections.session.email_verification_expires || '—'} disabled size="md" />
            <Input label={label('PasswordResetToken', 'Password Reset Token')} value={sections.session.password_reset_token || '—'} disabled size="md" />
            <Input label={label('PasswordTokenExpires', 'Password Token Expires')} value={sections.session.password_reset_expires || '—'} disabled size="md" />
        </div>
        
        <div className="mt-12 p-8 bg-surface2 rounded-[40px] border border-destructive max-w-4xl">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-destructive rounded-2xl text-on-destructive"><LogOut size={24}/></div>
                <div>
                    <h3 className="text-xl font-black text-on-background tracking-tight">{label('TerminateSession')}</h3>
                    <p className="text-xs font-bold text-destructive uppercase tracking-wider">{label('TerminateDesc')}</p>
                </div>
            </div>
            <p className="text-sm font-bold text-on-surface2 mb-6 uppercase tracking-widest leading-relaxed">
                {label('SecurityRiskNotice')}
            </p>
            <div className="flex flex-wrap gap-4">
                <Button variant="danger" size="md">{label('InvalidateTokens')}</Button>
                <Button variant="destructive" size="md" outline>{label('CloseOtherSessions')}</Button>
            </div>
        </div>
    </SectionWrapper>
);

const UserSettingsStyled = ({
    user,
    sections,
    activeTab,
    onTabChange,
    onSave,
    loading,
    error,
    success,
    t,
    tr,
    groups,
    selectedGroup,
    onGroupChange,
    getEnumLabel,
    enums,
    countriesList,
    languagesList,
    themesList,
    timezonesList
}) => {
    const myRol = user ? parseInt(user.rol) : 1;
    const isSysAdmin = myRol >= 3;

    // Helper para etiquetas traducidas con valor por defecto
    const label = (key) => t(key);

    // --- TAB CONFIGURATION ---
    const menuTabs = [
        { 
            id: 'cuenta', 
            label: label('AccountTab'), 
            icon: <User size={20} />, 
            content: <AccountSection sections={sections} onSave={onSave} t={t} label={label} loading={loading} user={user} getEnumLabel={getEnumLabel} enums={enums} countriesList={countriesList} success={success} error={error} /> 
        },
        { 
            id: 'auth', 
            label: label('AuthTab'), 
            icon: <Key size={20} />, 
            content: <AuthSection sections={sections} onSave={onSave} label={label} loading={loading} user={user} success={success} error={error} /> 
        },
        { 
            id: 'detalles', 
            label: label('DetailsTab'), 
            icon: <Settings size={20} />, 
            content: <DetailsSection 
                        sections={sections} 
                        onSave={onSave} 
                        t={t} 
                        label={label} 
                        loading={loading} 
                        getEnumLabel={getEnumLabel} 
                        enums={enums} 
                        success={success} 
                        error={error} 
                        languagesList={languagesList}
                        themesList={themesList}
                        timezonesList={timezonesList}
                        countriesList={countriesList}
                    /> 
        },
        { 
            id: 'actividad', 
            label: label('ActivityTab'), 
            icon: <Shield size={20} />, 
            content: <SecuritySection sections={sections} onSave={onSave} t={t} label={label} loading={loading} getEnumLabel={getEnumLabel} enums={enums} success={success} error={error} /> 
        },
    ];

    if (myRol >= 2) {
        menuTabs.push({ 
            id: 'usuarios', label: label('GroupUsersTab'), icon: <Users size={20} />, 
            content: <GroupUsersSection isSysAdmin={isSysAdmin} selectedGroup={selectedGroup} groups={groups} onGroupChange={onGroupChange} label={label} user={user} onSave={onSave} loading={loading} />
        });
    }

    if (myRol >= 3) {
        menuTabs.push({ 
            id: 'sesion', label: label('SessionTab'), icon: <Monitor size={20} />, 
            content: <SessionSection sections={sections} t={t} label={label} user={user} getEnumLabel={getEnumLabel} enums={enums} />
        });
    }

    return (
        <div className="h-[calc(100vh-64px)] bg-background flex overflow-hidden border-t border-border">
            <div className="flex-1 h-full shadow-2xl relative">
                <Tabs 
                    tabs={menuTabs} 
                    orientation="vertical" 
                    defaultTab={activeTab}
                    onChange={onTabChange}
                    className="h-full bg-surface1 border-r border-border"
                />
            </div>
        </div>
    );
};

export default UserSettingsStyled;
