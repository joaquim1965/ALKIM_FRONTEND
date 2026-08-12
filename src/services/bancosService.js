import { apiFetch, authHeaders } from './api';

const request = async (endpoint, options = {}) => {
    const response = await apiFetch(endpoint, {
        ...options,
        headers: {
            ...authHeaders(),
            ...options.headers,
        },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'No se pudo completar la operación bancaria.');
    }
    return data;
};

const bancosService = {
    getDashboard: () => request('/bancos'),
    getReconciliationData: () => request('/bancos/conciliacion'),
    getMovements: (filters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') params.set(key, value);
        });
        const query = params.toString();
        return request(`/bancos/movimientos${query ? `?${query}` : ''}`);
    },
    uploadMovements: (cuentaId, movements) => request('/bancos/import', {
        method: 'POST',
        body: JSON.stringify({ cuentaId, movements }),
    }),
    matchMovements: (movementId, relatedType, relatedId) => request('/bancos/match', {
        method: 'POST',
        body: JSON.stringify({ movementId, relatedType, relatedId }),
    }),
};

export default bancosService;
