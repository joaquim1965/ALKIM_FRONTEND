/**
 * userService.js
 *
 * Servicio frontend para gestion de usuarios de empresa
 * Consume los endpoints de /users
 */

import apiFetch, { authHeaders } from './api';

/**
 * Listar usuarios del grupo del usuario autenticado
 * @param {Object} [filters] - Filtros opcionales
 * @param {string} [filters.search] - Busqueda por nombre/email/usuario
 * @param {number} [filters.rol] - Filtrar por rol
 */
export const getGroupUsers = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.rol !== undefined && filters.rol !== '') params.set('rol', filters.rol);
        if (filters.grupo) params.set('grupo', filters.grupo);

        const qs = params.toString();
        const url = `/users${qs ? '?' + qs : ''}`;

        const response = await apiFetch(url, { headers: authHeaders() });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('[UserService:getGroupUsers] Respuesta no JSON recibida:', text.substring(0, 100));
            throw new Error(`Error del servidor (No JSON). Status: ${response.status}`);
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error al listar usuarios');
        return data;
    } catch (error) {
        console.error('Error en getGroupUsers:', error);
        throw error;
    }
};

/**
 * Obtener detalle de un usuario
 */
export const getUserDetail = async (userId) => {
    try {
        const response = await apiFetch(`/users/${userId}`, { headers: authHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error al obtener usuario');
        return data;
    } catch (error) {
        console.error('Error en getUserDetail:', error);
        throw error;
    }
};

/**
 * Actualizar perfil personal de un usuario (Bloque A)
 */
export const updateUserProfile = async (userId, profileData) => {
    try {
        const response = await apiFetch(`/users/${userId}/profile`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(profileData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error al actualizar perfil');
        return data;
    } catch (error) {
        console.error('Error en updateUserProfile:', error);
        throw error;
    }
};

/**
 * Actualizar preferencias de un usuario (Bloque B)
 */
export const updateUserPreferences = async (userId, prefsData) => {
    try {
        const response = await apiFetch(`/users/${userId}/preferences`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(prefsData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error al actualizar preferencias');
        return data;
    } catch (error) {
        console.error('Error en updateUserPreferences:', error);
        throw error;
    }
};

/**
 * Actualizar seguridad de un usuario (Bloque C)
 */
export const updateUserSecurity = async (userId, securityData) => {
    try {
        const response = await apiFetch(`/users/${userId}/security`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(securityData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error al actualizar seguridad');
        return data;
    } catch (error) {
        console.error('Error en updateUserSecurity:', error);
        throw error;
    }
};

/**
 * Eliminar un usuario
 */
export const deleteUser = async (userId) => {
    try {
        const response = await apiFetch(`/users/${userId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error al eliminar usuario');
        return data;
    } catch (error) {
        console.error('Error en deleteUser:', error);
        throw error;
    }
};

/**
 * Obtener lista de grupos únicos (Solo SuperAdmin)
 */
export const getGroups = async () => {
    try {
        const response = await apiFetch('/users/groups', { headers: authHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error al obtener grupos');
        return data;
    } catch (error) {
        console.error('Error en getGroups:', error);
        throw error;
    }
};

const userService = {
    getGroupUsers,
    getUserDetail,
    updateUserProfile,
    updateUserPreferences,
    updateUserSecurity,
    deleteUser,
    getGroups,
    getCountries: async () => {
        try {
            const response = await apiFetch('/tables/s_country', { headers: authHeaders() });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Error al obtener países');
            return data;
        } catch (error) {
            console.error('Error en getCountries:', error);
            throw error;
        }
    },
    getCatalog: async (table) => {
        try {
            const response = await apiFetch(`/tables/${table}`, { headers: authHeaders() });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `Error al obtener ${table}`);
            return data;
        } catch (error) {
            console.error(`Error en getCatalog(${table}):`, error);
            throw error;
        }
    }
};

export default userService;
