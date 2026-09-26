/**
 * gestionBancosService.js
 *
 * Entidades, cuentas, contactos, tarjetas y préstamos.
 *
 * Hasta el 22/08/2026 este fichero hacía `import api from './api'` y llamaba a
 * `api.get(...)`, como si el módulo exportara una instancia de axios. No lo
 * hace: exporta `apiFetch`, una función envoltorio de `fetch`. Así que
 * `api.get` era `undefined` y **cada llamada lanzaba `api.get is not a
 * function` antes de salir del navegador**. La pantalla vieja se lo tragaba con
 * un `console.error` y enseñaba las tablas vacías, que es como pasó meses sin
 * que nadie lo viera.
 *
 * Ahora usa `apiFetch` + `authHeaders`, igual que el resto de servicios, y los
 * errores llevan el `status` de la respuesta para que quien los muestre pueda
 * distinguir una sesión caducada de un fallo del servidor.
 */

import { apiFetch, authHeaders } from './api';

const request = async (endpoint, options = {}) => {
    const response = await apiFetch(endpoint, {
        ...options,
        headers: {
            ...authHeaders(),
            ...options.headers,
        },
    });

    const cuerpo = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(cuerpo.message || 'No se pudo completar la operación.');
        error.status = response.status;
        throw error;
    }
    return cuerpo;
};

// Las lecturas devuelven directamente la lista: el envoltorio `{success, data}`
// es detalle del transporte y no tiene por qué llegar a las pantallas.
const listar = async (endpoint) => (await request(endpoint)).data ?? [];

const enviar = (endpoint, metodo, datos) => request(endpoint, {
    method: metodo,
    body: JSON.stringify(datos),
});

const gestionBancosService = {
    // Entidades
    getEntidades: () => listar('/gestion-bancos/entidades'),
    createEntidad: (data) => enviar('/gestion-bancos/entidades', 'POST', data),
    updateEntidad: (id, data) => enviar(`/gestion-bancos/entidades/${id}`, 'PUT', data),
    deleteEntidad: (id) => request(`/gestion-bancos/entidades/${id}`, { method: 'DELETE' }),

    // Cuentas
    getCuentas: () => listar('/gestion-bancos/cuentas'),
    createCuenta: (data) => enviar('/gestion-bancos/cuentas', 'POST', data),
    contarArchivosCuenta: (id) => request(`/gestion-bancos/cuentas/${id}/archivos`),
    updateCuenta: (id, data) => enviar(`/gestion-bancos/cuentas/${id}`, 'PUT', data),
    deleteCuenta: (id) => request(`/gestion-bancos/cuentas/${id}`, { method: 'DELETE' }),

    // Contactos
    getContactos: () => listar('/gestion-bancos/contactos'),
    createContacto: (data) => enviar('/gestion-bancos/contactos', 'POST', data),
    deleteContacto: (id) => request(`/gestion-bancos/contactos/${id}`, { method: 'DELETE' }),

    // Tarjetas
    getTarjetas: () => listar('/gestion-bancos/tarjetas'),
    createTarjeta: (data) => enviar('/gestion-bancos/tarjetas', 'POST', data),
    updateTarjeta: (id, data) => enviar(`/gestion-bancos/tarjetas/${id}`, 'PUT', data),
    deleteTarjeta: (id) => request(`/gestion-bancos/tarjetas/${id}`, { method: 'DELETE' }),

    // Préstamos
    getPrestamos: () => listar('/gestion-bancos/prestamos'),
    createPrestamo: (data) => enviar('/gestion-bancos/prestamos', 'POST', data),
    updatePrestamo: (id, data) => enviar(`/gestion-bancos/prestamos/${id}`, 'PUT', data),
    deletePrestamo: (id) => request(`/gestion-bancos/prestamos/${id}`, { method: 'DELETE' }),
};

export default gestionBancosService;
