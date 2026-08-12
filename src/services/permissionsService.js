/**
 * permissionsService.js
 *
 * Cliente API del sistema de permisos (Fase 1).
 * Endpoints del backend: /permissions/*
 */

import { apiFetch, authHeaders } from './api';

/**
 * Permisos del usuario autenticado + catálogo de tablas activas.
 * @returns {Promise<{success, permisos: Object, tablas: Array}>}
 */
export const getMyPermissions = async () => {
  const response = await apiFetch('/permissions/me', { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al obtener permisos');
  return data;
};

/**
 * Catálogo completo de s_table (admin).
 * @returns {Promise<{success, tablas: Array}>}
 */
export const getTables = async () => {
  const response = await apiFetch('/permissions/tables', { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al obtener el catálogo de tablas');
  return data;
};

/**
 * Permisos de un usuario concreto (admin).
 * @param {number} uid
 * @returns {Promise<{success, uid, permisos: Object}>}
 */
export const getUserPermissions = async (uid) => {
  const response = await apiFetch(`/permissions/user/${uid}`, { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al obtener permisos del usuario');
  return data;
};

/**
 * Asignación batch de permisos (admin).
 * @param {number} uid
 * @param {Array<{tid:number, permiso:'None'|'Read'|'Write'|'Full'}>} permisos
 * @returns {Promise<{success, message, aplicados}>}
 */
export const setUserPermissions = async (uid, permisos) => {
  const response = await apiFetch(`/permissions/user/${uid}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ permisos }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al asignar permisos');
  return data;
};

/**
 * Revocar permiso de un usuario sobre una tabla (admin).
 * @param {number} uid
 * @param {number} tid
 */
export const deleteUserPermission = async (uid, tid) => {
  const response = await apiFetch(`/permissions/user/${uid}/table/${tid}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al revocar permiso');
  return data;
};

export default {
  getMyPermissions,
  getTables,
  getUserPermissions,
  setUserPermissions,
  deleteUserPermission,
};
