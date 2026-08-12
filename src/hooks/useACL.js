import { useStore } from './useStore';

/**
 * useACL
 *
 * Hook para la gestión de permisos de acceso a tablas y módulos (ACL).
 * Fase 1: usa el mapa `permissions` del store (cargado desde /permissions/me),
 * con fallback al objeto `permisos` del usuario (respuesta de login/getMe).
 *
 * Niveles de permiso: None < Read < Write < Full
 *
 * IMPORTANTE (decisión nº 2 del plan): SIN bypass por rol.
 * Todo usuario, admin incluido, se valida contra la matriz de permisos.
 * Los flags isAdmin/isSuperAdmin son solo para visibilidad de UI
 * (p. ej. mostrar la pestaña de administración), no para acceso a datos.
 */
export const useACL = () => {
    const user = useStore(state => state.user);
    const storePermissions = useStore(state => state.permissions);
    const permisos = (storePermissions && Object.keys(storePermissions).length > 0)
        ? storePermissions
        : (user?.permisos || {});

    const levels = {
        'None': 0,
        'Read': 1,
        'Write': 2,
        'Full': 3
    };

    /**
     * Verifica si el usuario tiene al menos un nivel de acceso específico.
     * Sin registro = 'None' (fail-closed). Sin bypass por rol.
     * @param {string} table - Nombre de la tabla (ej. 's_user', 'm_ingresos')
     * @param {string} requiredLevel - Nivel mínimo (None, Read, Write, Full)
     */
    const hasAccess = (table, requiredLevel = 'Read') => {
        const userLevel = permisos[table] || 'None';
        return (levels[userLevel] || 0) >= (levels[requiredLevel] || 0);
    };

    const rol = parseInt(user?.rol);

    return {
        hasAccess,
        canRead: (table) => hasAccess(table, 'Read'),
        canWrite: (table) => hasAccess(table, 'Write'),
        canFull: (table) => hasAccess(table, 'Full'),
        // Flags de rol SOLO para visibilidad de UI (no dan acceso a datos)
        isSuperAdmin: rol >= 3,
        isAdmin: rol >= 2,
        isUser: rol === 1
    };
};

export default useACL;
