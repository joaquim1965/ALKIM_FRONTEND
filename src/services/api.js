/**
 * api.js
 *
 * Configuracion central de la API
 * Define la URL base y funciones auxiliares para las llamadas HTTP
 */

// URL base de la API segun el entorno
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Configuracion base para fetch
 * Incluye headers comunes y manejo de credenciales
 */
const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  credentials: 'include', // Incluir cookies (para refresh token)
};

/**
 * Wrapper de fetch con configuracion por defecto
 * @param {string} endpoint - Endpoint de la API (ej: '/auth/login')
 * @param {Object} options - Opciones de fetch
 * @returns {Promise<Response>} Respuesta de fetch
 */
export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  return fetch(url, config);
};

/**
 * Helper para añadir token de autorizacion a las headers
 * @param {string} token - Access token JWT (opcional, si no se pasa usa localStorage)
 * @returns {Object} Headers con autorizacion
 */
export const authHeaders = (token = null) => {
  const actualToken = token || localStorage.getItem('accessToken');
  return {
    'Authorization': `Bearer ${actualToken}`,
  };
};

export default apiFetch;
