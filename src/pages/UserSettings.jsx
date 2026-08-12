/**
 * UserSettings.jsx
 * 
 * Componente LÓGICO para la página de Configuración Personal.
 * Gestiona el estado de los formularios de Cuenta, Auth, Detalles, Seguridad, Usuarios y Sesión.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../hooks/useStore';
import { useTmTr } from '../contexts/TmTrContext';
import userService from '../services/userService';
import authService from '../services/authService';
import UserSettingsStyled from '../components/Settings/UserSettingsStyled';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const UserSettings = ({ targetUser, onClose, onUserUpdated }) => {
    const { user: currentUser, setUser, fetchMe, getEnumLabel, enums, setTheme, setLanguage } = useStore();
    const { t, tr } = useTmTr('UserSettings');
    
    // Si se provee targetUser, estamos en modo admin (editando a otro usuario dentro de un popup)
    const user = targetUser || currentUser;
    const adminMode = !!targetUser;
    
    const [activeTab, setActiveTab] = useState('cuenta');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Auto-ocultar mensajes de éxito/error tras 5 segundos
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    // Estado para grupos (solo rol 3)
    const [groups, setGroups] = useState([]);
    const [countriesList, setCountriesList] = useState([]);
    const [languagesList, setLanguagesList] = useState([]);
    const [themesList, setThemesList] = useState([]);
    const [timezonesList, setTimezonesList] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(user?.grupo || '');
    
    // Estado para el prefijo de telefono por defecto (ALKIM prefer: +34)
    const [defaultPrefix, setDefaultPrefix] = useState('+34');

    // Estado local para los formularios (dividido por secciones según pedido)
    const [sections, setSections] = useState({
        account: {
            usuario: '',
            nombre: '',
            apellido: '',
            email: '',
            verif_eml: 0,
            prefijo_tel: '',
            telefono: '',
            verif_tel: 0,
            grupo: '',
            rol: 1,
            password_hash: '****************************************',
            estatus: 0,
            bloqueado_hasta: null,
            intentos_fallidos: 0,
            fecha_ultimo_intento: null
        },
        auth: {
            newEmail: '',
            currentPassword: '',
            newPassword: '',
            newPasswordConfirm: ''
        },
        details: {
            idioma: 1,
            tema: 1,
            pais: 59,
            zona_horaria: 1,
            sep_miles: '.',
            sep_decimal: ',',
            form_fecha: 'DD/MM/YYYY',
            filasxtabla: 50
        },
        security: {
            ultima_sesion: '',
            tpomax_sesion_horas: 24,
            ultima_actividad: '',
            tpomax_inactividad_min: 60
        },
        session: {} // Para sysadmin, resto de campos
    });

    // Cargar datos del usuario al inicio
    useEffect(() => {
        if (user) {
            setSections(prev => ({
                ...prev,
                account: {
                    usuario: user.usuario || '',
                    nombre: user.nombre || '',
                    apellido: user.apellido || '',
                    email: user.email || '',
                    verif_eml: user.verif_eml ?? 0,
                    prefijo_tel: user.prefijo_tel ? (user.prefijo_tel.toString().startsWith('+') ? user.prefijo_tel : `+${user.prefijo_tel}`) : defaultPrefix,
                    telefono: user.telefono || '',
                    verif_tel: user.verif_tel ?? 0,
                    grupo: user.grupo || '',
                    rol: user.rol || 1,
                    password_hash: '****************************************',
                    estatus: user.estatus ?? 0,
                    bloqueado_hasta: user.bloqueado_hasta || null,
                    intentos_fallidos: user.intentos_fallidos ?? 0,
                    fecha_ultimo_intento: user.fecha_ultimo_intento || null
                },
                details: {
                    idioma: user.idioma || 1,
                    tema: user.tema || 1,
                    pais: user.pais || 59,
                    zona_horaria: user.zona_horaria || 1,
                    sep_miles: user.sep_miles || '.',
                    sep_decimal: user.sep_decimal || ',',
                    form_fecha: user.form_fecha || 'DD/MM/YYYY',
                    filasxtabla: user.filasxtabla || 50
                },
                security: {
                    ultima_sesion: user.ultima_sesion ? new Date(user.ultima_sesion).toLocaleString() : '—',
                    tpomax_sesion_horas: user.tpomax_sesion_horas || 24,
                    ultima_actividad: user.ultima_actividad ? new Date(user.ultima_actividad).toLocaleString() : '—',
                    tpomax_inactividad_min: user.tpomax_inactividad_min || 60
                },
                session: {
                    uid: user.uid,
                    auth_provider: user.auth_provider,
                    fecha_creacion: user.fecha_creacion,
                    vereml_fecha: user.vereml_fecha,
                    vertel_fecha: user.vertel_fecha,
                    direccion_ip: user.direccion_ip,
                    email_verification_token: user.email_verification_token,
                    email_verification_expires: user.email_verification_expires,
                    password_reset_token: user.password_reset_token,
                    password_reset_expires: user.password_reset_expires
                }
            }));
            
            if (!selectedGroup) setSelectedGroup(user.grupo);
            
            // Cargar grupos si es sysadmin
            if (parseInt(user.rol) >= 3) {
                fetchGroups();
            }
            fetchCountries();
            fetchCatalogs();
        }
    }, [user, selectedGroup]);

    const fetchCatalogs = async () => {
        try {
            const [langs, themes, tzs] = await Promise.all([
                userService.getCatalog('sa_language'),
                userService.getCatalog('sa_theme'),
                userService.getCatalog('sa_timezone')
            ]);
            setLanguagesList(langs.data || langs);
            setThemesList(themes.data || themes);
            setTimezonesList(tzs.data || tzs);
        } catch (err) {
            console.error('Error fetching catalogs:', err);
        }
    };

    const fetchCountries = async () => {
        try {
            const res = await userService.getCountries();
            if (Array.isArray(res)) {
                setCountriesList(res);
            } else if (res && res.data && Array.isArray(res.data)) {
                setCountriesList(res.data);
            }
        } catch (err) {
            console.error('Error fetching countries:', err);
        }
    };

    const fetchGroups = async () => {
        try {
            const res = await userService.getGroups();
            if (res.success) {
                setGroups(res.data);
            }
        } catch (err) {
            console.error('Error fetching groups:', err);
        }
    };

    const handleSave = async (sectionName, dataOverride = null, performSubmit = true) => {
        if (!performSubmit && dataOverride) {
            // Solo actualizar estado local (parcial)
            setSections(prev => ({
                ...prev,
                [sectionName]: { ...prev[sectionName], ...dataOverride }
            }));
            return;
        }

        const submitType = dataOverride?.type || null;
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            let res;
            const uid = user.uid || user.id;

            const finalData = { ...sections[sectionName], ...(dataOverride || {}) };

            if (sectionName === 'account') {
                res = await userService.updateUserProfile(uid, {
                    nombre: finalData.nombre,
                    apellido: finalData.apellido,
                    usuario: finalData.usuario,
                    prefijo_tel: finalData.prefijo_tel,
                    telefono: finalData.telefono,
                    grupo: finalData.grupo,
                    rol: finalData.rol
                });
            } else if (sectionName === 'auth') {
                if (submitType === 'password') {
                    res = await authService.changePassword(
                        finalData.currentPassword,
                        finalData.newPassword,
                        finalData.newPasswordConfirm
                    );
                } else if (submitType === 'email') {
                    res = await authService.requestEmailChange(finalData.newEmail);
                }
            } else if (sectionName === 'details') {
                res = await userService.updateUserPreferences(uid, finalData);
            } else if (sectionName === 'security') {
                res = await userService.updateUserSecurity(uid, {
                    tpomax_sesion_horas: finalData.tpomax_sesion_horas,
                    tpomax_inactividad_min: finalData.tpomax_inactividad_min
                });
            }

            if (res && res.success) {
                // Notificar éxito al contenedor principal
                if (res.data) {
                    const updatedUser = res.data.user || res.data;
                    
                    // Si NO estamos en modo admin, actulizamos nuestra propia sesión global en vivo
                    if (!adminMode) {
                        setUser(updatedUser);

                        // Si es MIUI (mi propio perfil) y toco mis detalles, aplico el tema dinámico inmediatamente
                        if (sectionName === 'details') {
                            if (finalData.idioma) {
                                const foundLang = languagesList.find(l => parseInt(l.lid) === parseInt(finalData.idioma));
                                if (foundLang && foundLang.codigo) setLanguage(foundLang.codigo);
                            }
                            if (finalData.tema) setTheme(finalData.tema);
                        }
                    } else if (onUserUpdated) {
                        // Si estamos en modo admin, informamos al listado maestro que vuelva a hacer fetch
                        onUserUpdated();
                    }
                }

                let successMsg = res.message;
                if (sectionName === 'account') successMsg = t('ProfileSaved', 'Perfil guardado');
                if (sectionName === 'details') successMsg = t('PreferencesSaved', 'Preferencias guardadas');
                if (sectionName === 'security') successMsg = t('SecuritySaved', 'Seguridad actualizada');
                if (sectionName === 'auth') {
                    if (submitType === 'password') successMsg = t('PasswordUpdated', 'Contraseña actualizada');
                    if (submitType === 'email') successMsg = t('EmailRequestSent', 'Solicitud de cambio enviada');
                }
                setSuccess(successMsg);
                setTimeout(() => setSuccess(null), 5000);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const content = (
        <UserSettingsStyled 
            user={user}
            sections={sections}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSave={handleSave}
            loading={loading}
            error={error}
            success={success}
            t={t}
            tr={tr}
            groups={groups}
            selectedGroup={selectedGroup}
            onGroupChange={setSelectedGroup}
            getEnumLabel={getEnumLabel}
            enums={enums}
            countriesList={countriesList}
            languagesList={languagesList}
            themesList={themesList}
            timezonesList={timezonesList}
            onClose={onClose}
            adminMode={adminMode}
        />
    );

    return adminMode ? (
        <div className="h-full w-full bg-background relative overflow-hidden flex flex-col rounded-2xl">
            {content}
        </div>
    ) : (
        <div className="min-h-screen bg-background relative overflow-hidden">
            <div className="h-full">
                {content}
            </div>
        </div>
    );
};

export default UserSettings;
