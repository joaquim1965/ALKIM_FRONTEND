import { apiFetch, authHeaders } from './api';

/**
 * El panel de Saldo: cuentas, grupos y límites.
 *
 * Una sola llamada trae los tres paneles —Saldo, Gastos e Ingresos—, porque los
 * tres enseñan las mismas cuentas con otro número. Pedirlo tres veces sería
 * tres consultas a la base de datos para el mismo dato.
 */
const request = async (endpoint, options = {}) => {
  const response = await apiFetch(endpoint, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // El servidor contesta de dos maneras según quién falle: los controladores
    // ponen `message` arriba, y el manejador de errores general lo mete dentro
    // de `error`. Mirando solo una, un 404 —«Ruta no encontrada», que es lo que
    // pasa cuando el backend no se ha reiniciado— salía como un fallo genérico
    // y no había manera de saber qué iba mal (26/08/2026).
    const dicho = data.message || data.error?.message;
    throw new Error(dicho ? `${dicho} (${response.status})` : `Error ${response.status}`);
  }
  return data;
};

const situacionService = {
  getSituacion: () => request('/situacion'),
  getConfig: () => request('/situacion/config'),
  guardarConfig: (config) => request('/situacion/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  }),
  actualizarAtrasadas: () => request('/situacion/actualizar', { method: 'POST' }),
};

export default situacionService;
