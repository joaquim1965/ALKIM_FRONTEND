import React from 'react';
import { Landmark, Users, BadgeEuro } from 'lucide-react';
import Tabs from '../../../components/UI/Tabs';
import GestionBancos from './GestionBancos'; // Still useful for the entities part or we can split it
import PrestamosTab from './PrestamosTab';

/**
 * BancosPage - Centralized page for Bank Administration
 * Includes: Banks, Accounts, Contacts, and Loans/Mortgages.
 */
const BancosPage = () => {
    // Note: We use GestionBancos but we could also split it if we want flatter tabs.
    // For now, to fulfill the "4 tabs" requirement and keep it simple:
    // Entidades y cuentas se mudaron el 21/08/2026, y las tarjetas el 22/08, a
    // Tesorería ▸ Bancos, cuentas y tarjetas, donde se ven encadenadas: banco,
    // sus cuentas, y las tarjetas de la cuenta elegida. Duplicarlas aquí solo
    // servía para que las dos pantallas se desincronizaran.
    const tabs = [
        {
            id: 'contactos',
            label: 'Contactos / Gestores',
            icon: <Users size={18} />,
            content: <GestionBancos defaultSubTab="contactos" hideTabs={true} />
        },
        {
            id: 'prestamos',
            label: 'Préstamos e Hipotecas',
            icon: <BadgeEuro size={18} />,
            content: <PrestamosTab />
        }
    ];

    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in">
            {/* Cabecera y Navegación */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Landmark className="text-primary" size={32} />
                        Contactos y préstamos
                    </h1>
                    <p className="text-on-surface2 mt-1">
                        Gestores del banco y seguimiento de la financiación. Las entidades, sus cuentas y las tarjetas viven en Tesorería ▸ Bancos, cuentas y tarjetas.
                    </p>
                </div>
            </div>

            {/* Contenedor Principal con Tabs */}
            <div className="flex-1 bg-surface1/30 border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col p-1">
                <Tabs tabs={tabs} defaultTab="contactos" className="h-full" />
            </div>
        </div>
    );
};

export default BancosPage;
