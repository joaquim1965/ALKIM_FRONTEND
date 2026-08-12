/**
 * authService.js
 *
 * Servicio de autenticacion para el frontend
 * Maneja todas las llamadas a la API de autenticacion
 */

import apiFetch, { authHeaders } from './api';

/**
 * Registrar nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.nombre - Nombre
 * @param {string} userData.apellido - Apellido
 * @param {string} userData.usuario - Username
 * @param {string} userData.email - Email
 * @param {string} userData.password - Contraseña
 * @param {string} userData.prefijo_tel - Prefijo telefonico (+34, +1, etc)
 * @param {string} userData.telefono - Numero de telefono
 * @returns {Promise<Object>} { success, message, data: { accessToken, user } }
 */
export const register = async (userData) => {
  try {
    const response = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al registrar usuario');
    }

    // Guardar access token en localStorage
    if (data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
    }

    return data;
  } catch (error) {
    console.error('Error en register:', error);
    throw error;
  }
};

/**
 * Iniciar sesion
 * @param {string} emailOrUsername - Email o nombre de usuario
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} { success, message, data: { accessToken, user } }
 */
export const login = async (emailOrUsername, password, rememberMe = false) => {
  try {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, password, rememberMe }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || data.error?.message || 'Error al iniciar sesion');
      error.status = response.status;
      error.code = data.code || data.error?.code;
      error.details = data.details || data.error?.details;
      error.retryAfter = data.retryAfter || data.error?.retryAfter;
      throw error;
    }

    // Guardar access token en localStorage
    if (data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
    }

    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};

/**
 * Cerrar sesion
 * Revoca el refresh token y limpia el access token del localStorage
 * @returns {Promise<Object>} { success, message }
 */
export const logout = async () => {
  try {
    const token = localStorage.getItem('accessToken');

    if (token) {
      const response = await apiFetch('/auth/logout', {
        method: 'POST',
        headers: authHeaders(token),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn('Error al cerrar sesion en el servidor:', data.message);
      }
    }

    // Limpiar access token del localStorage siempre
    localStorage.removeItem('accessToken');

    return { success: true, message: 'Sesion cerrada exitosamente' };
  } catch (error) {
    console.error('Error en logout:', error);
    // Limpiar token aunque falle la peticion
    localStorage.removeItem('accessToken');
    throw error;
  }
};

/**
 * Renovar access token usando refresh token
 * El refresh token se envia automaticamente via cookie HttpOnly
 * @returns {Promise<Object>} { success, message, data: { accessToken } }
 */
export const refreshToken = async () => {
  try {
    const response = await apiFetch('/auth/refresh', {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al renovar token');
    }

    // Actualizar access token en localStorage
    if (data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
    }

    return data;
  } catch (error) {
    console.error('Error en refreshToken:', error);
    // Si falla el refresh, limpiar el access token
    localStorage.removeItem('accessToken');
    throw error;
  }
};

/**
 * Obtener datos del usuario autenticado
 * @returns {Promise<Object>} { success, message, data: { user } }
 */
export const getMe = async () => {
  try {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No hay token de autenticacion');
    }

    const response = await apiFetch('/auth/me', {
      method: 'GET',
      headers: authHeaders(token),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || data.error?.message || 'Error al obtener datos del usuario');
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en getMe:', error);
    throw error;
  }
};

/**
 * Verificar si el usuario esta autenticado
 * Comprueba si existe un access token valido
 * @returns {Promise<boolean>} true si esta autenticado, false en caso contrario
 */
export const isAuthenticated = async () => {
  try {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      return false;
    }

    // Intentar obtener datos del usuario para verificar que el token es valido
    await getMe();
    return true;
  } catch (error) {
    // Si falla, intentar renovar el token
    try {
      await refreshToken();
      return true;
    } catch (refreshError) {
      return false;
    }
  }
};

/**
 * Obtener el access token actual
 * @returns {string|null} Access token o null si no existe
 */
export const getAccessToken = () => {
  return localStorage.getItem('accessToken');
};

/**
 * Verificar email con token
 * @param {string} token - Token de verificación
 * @returns {Promise<Object>} { success, message }
 */
export const verifyEmail = async (token) => {
  try {
    const response = await apiFetch(`/auth/verify-email/${token}`, {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al verificar email');
    }

    return data;
  } catch (error) {
    console.error('Error en verifyEmail:', error);
    throw error;
  }
};

/**
 * Reenviar email de verificación
 * @param {string} email - Email del usuario
 * @returns {Promise<Object>} { success, message }
 */
export const resendVerification = async (email) => {
  try {
    const response = await apiFetch('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al reenviar verificación');
    }

    return data;
  } catch (error) {
    console.error('Error en resendVerification:', error);
    throw error;
  }
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Obtener todas las sesiones activas del usuario
 * @returns {Promise<Object>} { success, message, data: { sessions, total } }
 */
export const getSessions = async () => {
  try {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No hay token de autenticacion');
    }

    const response = await apiFetch('/auth/sessions', {
      method: 'GET',
      headers: authHeaders(token),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener sesiones');
    }

    return data;
  } catch (error) {
    console.error('Error en getSessions:', error);
    throw error;
  }
};

/**
 * Revocar una sesión específica
 * @param {number} sessionId - ID de la sesión a revocar
 * @returns {Promise<Object>} { success, message }
 */
export const revokeSession = async (sessionId) => {
  try {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No hay token de autenticacion');
    }

    const response = await apiFetch(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al cerrar sesión');
    }

    return data;
  } catch (error) {
    console.error('Error en revokeSession:', error);
    throw error;
  }
};

/**
 * Revocar todas las sesiones excepto la actual
 * @returns {Promise<Object>} { success, message, data: { revoked } }
 */
export const revokeAllSessions = async () => {
  try {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No hay token de autenticacion');
    }

    const response = await apiFetch('/auth/sessions', {
      method: 'DELETE',
      headers: authHeaders(token),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al cerrar sesiones');
    }

    return data;
  } catch (error) {
    console.error('Error en revokeAllSessions:', error);
    throw error;
  }
};

/**
 * Cambiar contraseña de usuario logueado
 * @param {string} currentPassword - Contraseña actual
 * @param {string} newPassword - Contraseña nueva
 * @param {string} newPasswordConfirm - Confirmacion
 * @returns {Promise<Object>} { success, message }
 */
export const changePassword = async (currentPassword, newPassword, newPasswordConfirm) => {
  try {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No hay token de autenticacion');
    }

    const response = await apiFetch('/auth/change-password', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ currentPassword, newPassword, newPasswordConfirm }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al cambiar contraseña');
    }

    return data;
  } catch (error) {
    console.error('Error en changePassword:', error);
    throw error;
  }
};

/**
 * Actualizar perfil de usuario
 * @param {Object} profileData - Datos del perfil {nombre, apellido, telefono, red...}
 * @returns {Promise<Object>} { success, message, data: { user } }
 */
export const updateProfile = async (profileData) => {
  try {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No hay token de autenticacion');
    }

    const response = await apiFetch('/auth/profile', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(profileData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al actualizar perfil');
    }

    return data;
  } catch (error) {
    console.error('Error en updateProfile:', error);
    throw error;
  }
};

/**
 * Obtener todos los usuarios (Admin/Superadmin)
 */
export const getUsers = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await apiFetch('/auth/users', {
      method: 'GET',
      headers: authHeaders(token),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualizar datos de otro usuario (Admin/Superadmin)
 */
export const updateUser = async (id, userData) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await apiFetch(`/auth/users/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(userData),
    });
    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Eliminar un usuario
 */
export const deleteUser = async (id) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await apiFetch(`/auth/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    return await response.json();
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// EXPORTACIONES
// ============================================================================

const authService = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  isAuthenticated,
  getAccessToken,
  verifyEmail,
  resendVerification,
  changePassword,
  updateProfile,
  getSessions,
  getUsers,
  revokeSession,
  revokeAllSessions,
};

/**
 * Actualizar tema preferido y variables del sistema (EAV)
 * @param {string} theme - Tema a establecer (light, dark, high-contrast)
 * @param {Object} variables - Objeto con variables CSS personalizadas
 * @returns {Promise<Object>} { success, message }
 */
export const updateTheme = async (theme, variables = {}) => {
  try {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No hay token de autenticacion');
    }

    const response = await apiFetch('/auth/theme', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ tema: theme, variables }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'Error al actualizar tema');
      error.details = data.errors; // Adjuntar errores de Zod si existen
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en updateTheme:', error);
    throw error;
  }
};

const exportTheme = async (token, cssContent, fileName = 'colors_theme.css') => {
  try {
    if (!token) throw new Error('No hay token de autenticacion');

    const response = await apiFetch('/auth/export-theme', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ cssContent, fileName }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error al exportar tema');
    return data;
  } catch (error) {
    console.error('Error en exportTheme:', error);
    throw error;
  }
};

export default {
  ...authService,
  updateTheme,
  exportTheme
};
