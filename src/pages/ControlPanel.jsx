import React, { useState, useEffect } from "react";
import PasswordInput from "../components/UI/PasswordInput";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import Tabs from "../components/UI/Tabs";
import authService from "../services/authService";
import { useStore } from "../hooks/useStore";
import { changePasswordSchema, updateProfileSchema } from "../validations/authSchemas";
import { useTmTr } from "../contexts/TmTrContext";
import { Lock, User, Shield, Sun, Moon, Zap, Globe, Save, KeyRound } from "lucide-react";
import PermissionsMatrix from "../components/User/PermissionsMatrix";

/**
 * ControlPanel: Vista unificada de gestión de perfil, apariencia y seguridad.
 * Utiliza el estado global de useStore para mantener la consistencia en toda la app.
 */
const ControlPanel = () => {
    const { tr, t, theme, setTheme, language, setLanguage } = useTmTr("ControlPanel");
    const { user, setUser, loading: storeLoading } = useStore();

    // Estado local para los formularios
    const [generalData, setGeneralData] = useState({
        nombre: "",
        apellido: "",
        prefijo_tel: "",
        telefono: "",
        red: "",
        tema_preferido: "",
        idioma: 1,
    });

    const [securityData, setSecurityData] = useState({
        currentPassword: "",
        newPassword: "",
        newPasswordConfirm: "",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [serverError, setServerError] = useState("");

    // Sincronizar estado local con el usuario del store cuando este carga
    useEffect(() => {
        if (user) {
            setGeneralData({
                nombre: user.nombre || "",
                apellido: user.apellido || "",
                prefijo_tel: user.prefijo_tel || "",
                telefono: user.telefono || "",
                red: user.red || "",
                tema_preferido: user.tema_preferido || theme || "dark",
                idioma: user.idioma || (language === 'en' ? 2 : 1),
            });
        }
    }, [user, theme, language]);

    const handleInputChange = (e, stateSetter) => {
        const { name, value } = e.target;
        stateSetter((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        setGeneralData(prev => ({ ...prev, tema_preferido: newTheme }));
    };

    const handleLanguageChange = (e) => {
        const value = parseInt(e.target.value);
        setGeneralData(prev => ({ ...prev, idioma: value }));
        const langMap = { 1: 'es', 2: 'en', 3: 'ca', 4: 'fr' };
        if (langMap[value]) setLanguage(langMap[value]);
    };

    const handleGeneralSubmit = async (e) => {
        e.preventDefault();
        setSuccessMsg(""); setServerError("");
        try {
            updateProfileSchema.parse(generalData);
            setErrors({});
            setLoading(true);
            const res = await authService.updateProfile(generalData);
            if (res.success) {
                setUser(res.data.user);
                setSuccessMsg(t('Guardarexito') || "Perfil actualizado correctamente");
            }
        } catch (error) {
            if (error.errors) {
                const newErrors = {};
                error.errors.forEach((err) => { if (err.path[0]) newErrors[err.path[0]] = err.message; });
                setErrors(newErrors);
            } else {
                setServerError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSecuritySubmit = async (e) => {
        e.preventDefault();
        setSuccessMsg(""); setServerError("");
        try {
            changePasswordSchema.parse(securityData);
            setErrors({});
            setLoading(true);
            await authService.changePassword(
                securityData.currentPassword,
                securityData.newPassword,
                securityData.newPasswordConfirm
            );
            setSuccessMsg(t('Contraseñaexito') || "Contraseña actualizada con éxito");
            setSecurityData({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
        } catch (error) {
            setServerError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- TAB COMPONENTS ---
    // (Definidos aquí fuera del render return para claridad, pero dentro para usar scopes)

    const GeneralTab = () => (
        <form onSubmit={handleGeneralSubmit} className="space-y-6 max-w-2xl animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-border pb-2">
                <User className="text-primary" /> {t('Perfilgeneral') || 'Perfil General'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label={t('Nombre') || 'Nombre'} name="nombre" value={generalData.nombre} onChange={e => handleInputChange(e, setGeneralData)} error={errors.nombre} required />
                <Input label={t('Apellido') || 'Apellido'} name="apellido" value={generalData.apellido} onChange={e => handleInputChange(e, setGeneralData)} error={errors.apellido} required />
                <Input label={t('Prefijo') || 'Prefijo'} name="prefijo_tel" value={generalData.prefijo_tel} onChange={e => handleInputChange(e, setGeneralData)} error={errors.prefijo_tel} />
                <Input label={t('Telefono') || 'Teléfono'} name="telefono" value={generalData.telefono} onChange={e => handleInputChange(e, setGeneralData)} error={errors.telefono} />
            </div>
            <Input label={t('Empresa') || 'Empresa / Red'} name="red" value={generalData.red} onChange={e => handleInputChange(e, setGeneralData)} error={errors.red} />
            <div className="flex justify-end pt-6">
                <Button type="submit" loading={loading} leftIcon={<Save size={18} />}>
                    {t('Guardarcambios') || 'Grabas'}
                </Button>
            </div>
        </form>
    );

    const AppearanceTab = () => (
        <div className="space-y-8 animate-in fade-in duration-300 max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-border pb-2">
                <Sun className="text-primary" /> {t('Appearance') || 'Apariencia'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['light', 'dark', 'high-contrast'].map((mode) => (
                    <button
                        key={mode}
                        onClick={() => handleThemeChange(mode)}
                        className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all duration-200 transform hover:scale-105 ${theme === mode ? "border-primary bg-primary text-on-primary shadow-lg shadow-primary" : "border-border hover:bg-surface2"}`}
                    >
                        {mode === 'light' ? <Sun size={32} /> : mode === 'dark' ? <Moon size={32} /> : <Zap size={32} />}
                        <span className="font-bold capitalize">{tr.themes?.[mode] || t(mode) || mode}</span>
                    </button>
                ))}
            </div>
            <div className="p-6 bg-surface2 rounded-2xl border border-border">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Globe size={18} className="text-primary" /> {t('Idioma') || 'Idioma de la Interfaz'}
                </h3>
                <select
                    value={generalData.idioma}
                    onChange={handleLanguageChange}
                    className="w-full p-3 bg-surface1 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                    <option value={1}>Español</option>
                    <option value={2}>English</option>
                    <option value={3}>Català</option>
                    <option value={4}>Français</option>
                </select>
            </div>
        </div>
    );

    const SecurityTab = () => (
        <form onSubmit={handleSecuritySubmit} className="space-y-6 max-w-xl animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-border pb-2">
                <Shield className="text-primary" /> {t('Safety') || 'Seguridad'}
            </h2>
            <PasswordInput label={t('Currentpassword') || "Contraseña Actual"} name="currentPassword" value={securityData.currentPassword} onChange={e => handleInputChange(e, setSecurityData)} error={errors.currentPassword} required />
            <PasswordInput label={t('Newpassword') || "Nueva Contraseña"} name="newPassword" value={securityData.newPassword} onChange={e => handleInputChange(e, setSecurityData)} error={errors.newPassword} showStrength required />
            <PasswordInput label={t('Confirmpassword') || "Confirmar Nueva Contraseña"} name="newPasswordConfirm" value={securityData.newPasswordConfirm} onChange={e => handleInputChange(e, setSecurityData)} error={errors.newPasswordConfirm} required />
            <div className="flex justify-end pt-6">
                <Button type="submit" loading={loading} variant="primary">
                    {t('Actualizarpassword') || 'Actualizar Contraseña'}
                </Button>
            </div>
        </form>
    );

    // Pestaña de administración de permisos: solo roles admin (2), superadmin (3) y sysadmin (4).
    // El backend valida igualmente el rol en /permissions/* (la pestaña es solo visibilidad de UI).
    const isAdmin = parseInt(user?.rol) >= 2;

    const tabItems = [
        { id: 'general', label: t('General') || 'General', icon: <User size={18} />, content: <GeneralTab /> },
        { id: 'apariencia', label: t('Appearance') || 'Apariencia', icon: <Sun size={18} />, content: <AppearanceTab /> },
        { id: 'seguridad', label: t('Safety') || 'Seguridad', icon: <Lock size={18} />, content: <SecurityTab /> },
        ...(isAdmin ? [{ id: 'permisos', label: t('Permisos') || 'Permisos', icon: <KeyRound size={18} />, content: <PermissionsMatrix /> }] : []),
    ];

    if (storeLoading && !user) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-on-surface2">{t('Loading') || 'Cargando datos...'}</p>
        </div>
    );

    if (!user && !storeLoading) return (
        <div className="p-10 text-center text-destructive">
            <p>No se pudo cargar la información del usuario. Por favor, intenta de nuevo.</p>
            <Button onClick={() => window.location.reload()} variant="link">Recargar</Button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-on-background tracking-tight">{t('Panelcontrol') || 'Panel de Control'}</h1>
                <p className="text-on-surface2 mt-1">Configura tus preferencias, perfil y seguridad de la cuenta.</p>
            </div>

            {successMsg && (
                <div className="p-4 mb-6 bg-success text-on-success border border-success rounded-xl animate-in slide-in-from-top duration-300 font-medium">
                    {successMsg}
                </div>
            )}

            {serverError && (
                <div className="p-4 mb-6 bg-destructive text-on-destructive border border-destructive rounded-xl animate-in slide-in-from-top duration-300 font-medium">
                    {serverError}
                </div>
            )}

            <div className="bg-surface1 border border-border rounded-3xl shadow-shadow overflow-hidden min-h-[600px]">
                <Tabs
                    tabs={tabItems}
                    orientation="vertical"
                    className="h-full"
                />
            </div>
        </div>
    );
};

export default ControlPanel;
