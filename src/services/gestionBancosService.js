import api from './api';

const gestionBancosService = {
    // Entidades
    getEntidades: async () => { const r = await api.get('/gestion-bancos/entidades'); return r.data.data; },
    createEntidad: async (data) => { const r = await api.post('/gestion-bancos/entidades', data); return r.data; },
    deleteEntidad: async (id) => { const r = await api.delete(`/gestion-bancos/entidades/${id}`); return r.data; },

    // Cuentas
    getCuentas: async () => { const r = await api.get('/gestion-bancos/cuentas'); return r.data.data; },
    createCuenta: async (data) => { const r = await api.post('/gestion-bancos/cuentas', data); return r.data; },
    deleteCuenta: async (id) => { const r = await api.delete(`/gestion-bancos/cuentas/${id}`); return r.data; },

    // Contactos
    getContactos: async () => { const r = await api.get('/gestion-bancos/contactos'); return r.data.data; },
    createContacto: async (data) => { const r = await api.post('/gestion-bancos/contactos', data); return r.data; },
    deleteContacto: async (id) => { const r = await api.delete(`/gestion-bancos/contactos/${id}`); return r.data; },

    // Tarjetas
    getTarjetas: async () => { const r = await api.get('/gestion-bancos/tarjetas'); return r.data.data; },
    createTarjeta: async (data) => { const r = await api.post('/gestion-bancos/tarjetas', data); return r.data; },
    deleteTarjeta: async (id) => { const r = await api.delete(`/gestion-bancos/tarjetas/${id}`); return r.data; }
};

export default gestionBancosService;
