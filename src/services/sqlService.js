/**
 * sqlService.js
 *
 * Servicio para ejecutar consultas SQL y obtener esquema de base de datos
 */

import apiFetch, { authHeaders } from './api';

const sqlService = {
  /**
   * Ejecutar consulta SQL
   * @param {string} query - Consulta SQL
   * @param {boolean} safeMode - Si es true, solo permite SELECT
   * @returns {Promise}
   */
  executeQuery: async (query, safeMode = false) => {
    try {
      const response = await apiFetch('/sql/execute', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ query, safeMode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al ejecutar la consulta');
      }

      return data;
    } catch (error) {
      console.error('Error en executeQuery:', error);
      throw error;
    }
  },

  /**
   * Obtener esquema completo de la base de datos
   * @returns {Promise}
   */
  getSchema: async () => {
    try {
      const response = await apiFetch('/sql/schema', {
        method: 'GET',
        headers: authHeaders(),
        cache: 'no-store',  // Siempre pedir datos frescos (FK recién creadas, etc.)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener el esquema');
      }

      return data;
    } catch (error) {
      console.error('Error en getSchema:', error);
      throw error;
    }
  },

  /**
   * Obtener información de una tabla específica
   * @param {string} tableName - Nombre de la tabla
   * @returns {Promise}
   */
  getTableInfo: async (tableName) => {
    try {
      const response = await apiFetch(`/sql/tables/${tableName}`, {
        method: 'GET',
        headers: authHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener información de la tabla');
      }

      return data;
    } catch (error) {
      console.error('Error en getTableInfo:', error);
      throw error;
    }
  },

  /**
   * Obtener todos los triggers de la base de datos
   * @returns {Promise}
   */
  getTriggers: async () => {
    try {
      const response = await apiFetch('/sql/triggers', {
        method: 'GET',
        headers: authHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener los triggers');
      }

      return data;
    } catch (error) {
      console.error('Error en getTriggers:', error);
      throw error;
    }
  },

  /**
   * Obtener todos los events de la base de datos
   * @returns {Promise}
   */
  getEvents: async () => {
    try {
      const response = await apiFetch('/sql/events', {
        method: 'GET',
        headers: authHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener los events');
      }

      return data;
    } catch (error) {
      console.error('Error en getEvents:', error);
      throw error;
    }
  },

  /**
   * Obtener todas las vistas de la base de datos
   * @returns {Promise}
   */
  getViews: async () => {
    try {
      const response = await apiFetch('/sql/views', {
        method: 'GET',
        headers: authHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener las vistas');
      }

      return data;
    } catch (error) {
      console.error('Error en getViews:', error);
      throw error;
    }
  },
};

export default sqlService;
