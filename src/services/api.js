/**
 * api.js
 *
 * Punto único por el que salen todas las llamadas al backend.
 *
 * Además de poner la URL base y las cabeceras, **renueva el token cuando
 * caduca**. El token de acceso dura 30 minutos (`JWT_ACCESS_EXPIRATION` en el
 * backend) y hasta el 22/08/2026 nadie lo renovaba durante la sesión: existía
 * `refreshToken()`, pero solo se llamaba al arrancar la aplicación. El
 * resultado era que media hora después de entrar, con la pestaña abierta,
 * cualquier acción respondía «Token expirado» y no quedaba más remedio que
 * recargar. Con dos pestañas abiertas, las dos.
 *
 * Ahora, ante un 401 por caducidad: se pide un token nuevo con la cookie de
 * refresco y **se reintenta la petición original una sola vez**. El usuario no
 * se entera. Si el refresco también falla —la cookie dura un día—, entonces sí
 * es una sesión terminada: se limpia y se manda al login.
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

// Las rutas de la propia sesión no pueden intentar renovarse a sí mismas: sería
// una recursión infinita en cuanto el refresco devolviera 401.
const SIN_RENOVACION = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/logout'];

/**
 * Un solo refresco a la vez.
 *
 * Una pantalla lanza varias peticiones en paralelo (bancos, cuentas, tarjetas).
 * Si caducan todas a la vez y cada una pide su propio token, el backend recibe
 * N refrescos simultáneos con la misma cookie y rota el refresh token N veces:
 * el último gana y los demás quedan inválidos. Compartiendo la promesa, se pide
 * una vez y todas esperan el mismo resultado.
 */
let renovacionEnCurso = null;

const renovarToken = () => {
  if (!renovacionEnCurso) {
    renovacionEnCurso = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (respuesta) => {
        const cuerpo = await respuesta.json().catch(() => ({}));
        const nuevo = cuerpo?.data?.accessToken;
        if (!respuesta.ok || !nuevo) throw new Error(cuerpo?.message || 'No se pudo renovar la sesión.');
        localStorage.setItem('accessToken', nuevo);
        return nuevo;
      })
      .finally(() => { renovacionEnCurso = null; });
  }
  return renovacionEnCurso;
};

/** ¿Este 401 es por token caducado, o por falta de permisos? */
const esTokenCaducado = async (respuesta) => {
  if (respuesta.status !== 401) return false;
  // El cuerpo solo se puede leer una vez: se clona para no consumir el original.
  const cuerpo = await respuesta.clone().json().catch(() => ({}));
  const mensaje = String(cuerpo?.message || '');
  return /expirad|expired|caducad/i.test(mensaje) || cuerpo?.code === 'TOKEN_EXPIRED';
};

/**
 * Wrapper de fetch con configuracion por defecto
 * @param {string} endpoint - Endpoint de la API (ej: '/auth/login')
 * @param {Object} options - Opciones de fetch
 * @returns {Promise<Response>} Respuesta de fetch
 */
export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  // Un fichero (FormData) **no puede llevar** `Content-Type: application/json`:
  // el navegador tiene que poner él `multipart/form-data` con su `boundary`, y
  // si la cabecera ya viene puesta no lo hace y el servidor no encuentra el
  // fichero (25/09/2026, carga manual de extractos).
  const esFormulario = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const construir = () => {
    const headers = {
      ...(esFormulario ? {} : defaultOptions.headers),
      ...(localStorage.getItem('empresaActiva') && localStorage.getItem('empresaActiva') !== 'todas'
        ? { 'X-Company-Id': localStorage.getItem('empresaActiva') }
        : {}),
      ...options.headers,
    };
    if (esFormulario) delete headers['Content-Type'];
    return { ...defaultOptions, ...options, headers };
  };

  const respuesta = await fetch(url, construir());

  if (SIN_RENOVACION.some((ruta) => endpoint.startsWith(ruta))) return respuesta;
  if (!(await esTokenCaducado(respuesta))) return respuesta;

  try {
    const nuevo = await renovarToken();
    const config = construir();
    // Quien llamó calculó su cabecera con el token viejo, antes de salir de
    // aquí. Se reescribe con el recién obtenido.
    if (config.headers.Authorization) config.headers.Authorization = `Bearer ${nuevo}`;
    return await fetch(url, config);
  } catch (error) {
    // La sesión ha terminado de verdad. Se limpia y se vuelve al login, salvo
    // que ya estemos en él (recargar el login en bucle no ayuda a nadie).
    localStorage.removeItem('accessToken');
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login?expirada=1');
    }
    return respuesta;
  }
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
