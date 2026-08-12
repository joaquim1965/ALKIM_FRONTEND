/**
 * Layout/MainLayout.jsx
 *
 * LAYOUT PRINCIPAL DE LA APLICACIÓN
 * Integra el Navbar y el nuevo Sidebar dinámico gerenciado por estado.
 */

import React, { useState, useEffect } from 'react';
import Navbar from '../Navbar';
import Sidebar from '../UI/Sidebar';
import SidebarItem from '../UI/SidebarItem';
import SidebarGroup from '../UI/SidebarGroup';
import SidebarSubItem from '../UI/SidebarSubItem';
import AppBreadcrumbs from '../UI/AppBreadcrumbs';
import { 
    LayoutDashboard, Briefcase, FileText, Wallet, CalendarClock, 
    Settings2, History, Building2, Warehouse, Users, ScrollText,
    Receipt, Landmark, PiggyBank, Calendar, Contact2, Key,
    ReceiptEuro, HelpCircle, Cpu
} from 'lucide-react';
import { useStore } from '../../hooks/useStore';
import { useTmTr } from '../../contexts/TmTrContext';
import useMenuSpeech from '../../hooks/useMenuSpeech';
import GlobalActionTooltip from '../UI/GlobalActionTooltip';

export const MainLayout = ({ children }) => {
    const { isAuthenticated, can } = useStore();
    const { t } = useTmTr('Sidebar');
    useMenuSpeech();

    /**
     * Filtrado por permisos (Fase 1).
     * Cada entrada del menú vinculada a datos declara su tabla de s_table;
     * solo se muestra si el usuario tiene al menos nivel 'Read'.
     * Las entradas sin tabla asociada (módulos aún no implementados) se muestran siempre.
     */
    const canSee = (tabla) => !tabla || can(tabla, 'Read');

    // Visibilidad de sub-ítems con tabla asociada
    const verIngresos = canSee('m_ingresos');
    const verGastos = canSee('m_gastos');
    const verBancos = canSee('ban_account');
    const verConciliacion = canSee('ban_transaction');
    const verExtractos = canSee('ban_crawler');
    const verHistorialExtractos = canSee('ban_crawler_log');
    const verMovimientos = canSee('ban_transaction');
    const verContactos = canSee('m_contact');

    // Visibilidad de grupos: ocultos si no queda ningún sub-ítem visible
    const verGrupoContabilidad = verIngresos || verGastos || verBancos;
    const verGrupoProcesos = verConciliacion;
    const verGrupoTesoreria = verExtractos || verHistorialExtractos || verMovimientos;
    
    // Estado PERSISTENTE del sidebar
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('sidebar-open');
        return saved !== null ? saved === 'true' : true;
    });

    const toggleSidebar = () => {
        const nextState = !sidebarOpen;
        setSidebarOpen(nextState);
        localStorage.setItem('sidebar-open', nextState);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-background text-on-background">
                <Navbar />
                <main className="pt-16 p-6">{children}</main>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background text-on-background overflow-hidden">
            <GlobalActionTooltip />
            {/* Cabecera Superior Fija */}
            <Navbar />

            <div className="flex flex-1 pt-16 overflow-hidden">
                
                {/* Sidebar Dinámico (Controlado) */}
                <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar}>
                    <div className="flex flex-col gap-1 w-full h-full">
                        
                        {/* 1. Panel de Control */}
                        <SidebarItem 
                            to="/consola" 
                            icon={<LayoutDashboard size={18} />} 
                            label="Panel de control" 
                            collapsed={!sidebarOpen} 
                        />

                        {/* 2. Cartera */}
                        <SidebarGroup 
                            icon={<Briefcase size={18} />} 
                            label="Cartera" 
                            collapsed={!sidebarOpen}
                        >
                            <SidebarSubItem to="/cartera/activos" icon={<Building2 size={13}/>} label="Activos" />
                            <SidebarSubItem to="/cartera/unidades" icon={<Warehouse size={13}/>} label="Unid. Facturación (UF)" />
                            <SidebarSubItem to="/cartera/inquilinos" icon={<Users size={13}/>} label="Inquilinos" />
                            <SidebarSubItem to="/cartera/plantillas" icon={<ScrollText size={13}/>} label="Plantillas" />
                            <SidebarSubItem to="/cartera/historial" icon={<History size={13}/>} label="Historial" />
                        </SidebarGroup>

                        {/* 3. Documentación */}
                        <SidebarGroup 
                            icon={<FileText size={18} />} 
                            label="Documentación" 
                            collapsed={!sidebarOpen}
                        >
                            <SidebarSubItem to="/docs/propiedades" label="Propiedades" />
                            <SidebarSubItem to="/docs/uf" label="UF" />
                            <SidebarSubItem to="/docs/inquilinos" label="Inquilinos" />
                            <SidebarSubItem to="/documentacion" label="Archivos" />
                        </SidebarGroup>

                        {/* 4. Contabilidad (filtrado por permisos) */}
                        {verGrupoContabilidad && (
                            <SidebarGroup
                                icon={<Wallet size={18} />}
                                label="Contabilidad"
                                collapsed={!sidebarOpen}
                            >
                                {verIngresos && <SidebarSubItem to="/conta/ingresos" icon={<PiggyBank size={13}/>} label="Ingresos" />}
                                {verGastos && <SidebarSubItem to="/conta/gastos" icon={<Receipt size={13}/>} label="Gastos" />}
                                {verBancos && <SidebarSubItem to="/conta/bancos" icon={<Landmark size={13}/>} label="Bancos" />}
                            </SidebarGroup>
                        )}

                        {/* 5. Tesorería (filtrado por permisos) */}
                        {verGrupoTesoreria && (
                            <SidebarGroup
                                icon={<Landmark size={18} />}
                                label="Tesorería"
                                collapsed={!sidebarOpen}
                            >
                                {verExtractos && <SidebarSubItem to="/tesoreria/extractos" icon={<Receipt size={13}/>} label="Extractos" />}
                                {verMovimientos && <SidebarSubItem to="/tesoreria/movimientos" icon={<ReceiptEuro size={13}/>} label="Movimientos" />}
                                {verHistorialExtractos && <SidebarSubItem to="/tesoreria/extractos/logs" icon={<History size={13}/>} label="Historial de extractos" />}
                            </SidebarGroup>
                        )}

                        {/* 6. Procesos (filtrado por permisos) */}
                        {verGrupoProcesos && (
                            <SidebarGroup
                                icon={<Cpu size={18} />}
                                label="Procesos"
                                collapsed={!sidebarOpen}
                            >
                                {verConciliacion && <SidebarSubItem to="/procesos/conciliacion" icon={<Landmark size={13}/>} label="Conciliación Bancaria" />}
                            </SidebarGroup>
                        )}

                        {/* 7. Gestión */}
                        <SidebarGroup 
                            icon={<CalendarClock size={18} />} 
                            label="Gestión" 
                            collapsed={!sidebarOpen}
                        >
                            <SidebarSubItem to="/gestion/calendario" icon={<Calendar size={13}/>} label="Calendario" />
                            <SidebarSubItem to="/gestion/impuestos" icon={<ReceiptEuro size={13}/>} label="Impuestos (Saldo/Recibos)" />
                        </SidebarGroup>

                        {/* 8. Auxiliares (Contactos filtrado por permisos) */}
                        <SidebarGroup
                            icon={<Settings2 size={18} />}
                            label="Auxiliares"
                            collapsed={!sidebarOpen}
                        >
                            {verContactos && <SidebarSubItem to="/aux/contactos" icon={<Contact2 size={13}/>} label="Contactos" />}
                            <SidebarSubItem to="/aux/llaves" icon={<Key size={13}/>} label="Control de llaves" />
                        </SidebarGroup>

                        {/* Espaciado / Ayuda */}
                        <div className="mt-auto border-t border-border/30 pt-2">
                             <SidebarItem 
                                to="/helper" 
                                icon={<HelpCircle size={18} />} 
                                label="Ayuda y Soporte" 
                                collapsed={!sidebarOpen} 
                            />
                        </div>
                    </div>
                </Sidebar>

                {/* Contenedor de Contenido Principal Scrolleable */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-surface2/10 relative custom-scrollbar">
                    <AppBreadcrumbs />
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
