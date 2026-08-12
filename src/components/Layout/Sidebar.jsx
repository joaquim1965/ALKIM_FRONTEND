import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home,
    Terminal,
    Building2,
    Building,
    BedDouble,
    Users,
    FileText,
    Wrench,
    Banknote,
    Calculator,
    Settings,
    X,
    Database
    ,BookOpen
} from 'lucide-react';
import { useTmTr } from '../../contexts/TmTrContext';
import { useStore } from '../../hooks/useStore';

const Sidebar = ({ isOpen, onClose }) => {
    const { t } = useTmTr('Sidebar');
    const { user } = useStore();
    
    // Roles con acceso a Consultas SQL (SuperAdmin o superior)
    const isSysadmin = user && (user.rol === 'superadmin' || user.rol === 'sysadmin' || parseInt(user.rol) >= 3);

    const menuItems = [
        { name: t('Home') || 'Home', path: '/', icon: <Home size={20} /> },
        { name: t('Consola') || 'Consola', path: '/consola', icon: <Terminal size={20} /> },
        { name: t('Documentacion') || 'Documentación', path: '/documentacion', icon: <BookOpen size={20} /> },
        ...(isSysadmin ? [{ name: t('ConsultasSql') || 'Consultas Sql', path: '/sql-console', icon: <Database size={20} /> }] : []),
        { name: t('Empresas') || 'Empresas', path: '/empresas', icon: <Building2 size={20} /> },
        { name: t('Inmuebles') || 'Inmuebles', path: '/inmuebles', icon: <Building size={20} /> },
        { name: t('Habitaciones') || 'Habitaciones', path: '/habitaciones', icon: <BedDouble size={20} /> },
        { name: t('Inquilinos') || 'Inquilinos', path: '/inquilinos', icon: <Users size={20} /> },
        { name: t('Contratos') || 'Contratos', path: '/contratos', icon: <FileText size={20} /> },
        { name: t('Reformas') || 'Reformas', path: '/reformas', icon: <Wrench size={20} /> },
        { name: t('Efectivo') || 'Efectivo', path: '/efectivo', icon: <Banknote size={20} /> },
        { name: t('Contabilidad') || 'Contabilidad', path: '/contabilidad', icon: <Calculator size={20} /> },
        { name: t('Extractos') || 'Extractos', path: '/tesoreria/extractos', icon: <Banknote size={20} /> },
        { name: t('Configuracion') || 'Configuración', path: '/configuracion', icon: <Settings size={20} /> },
    ];

    return (
        <>
            {/* Overlay para cerrar al hacer clic fuera */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black z-[105] md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Menú lateral */}
            <div
                className={`fixed top-0 left-0 h-full w-64 bg-surface1 text-on-surface1 z-[110] transform transition-transform duration-300 ease-in-out border-r border-border shadow-2xl flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-border h-16">
                    <span className="font-bold text-lg">Menú</span>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-surface-hover text-on-surface2 hover:text-on-surface1 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            onClick={onClose} // Cerrar sidebar al navegar (opcional)
                            className={({ isActive }) =>
                                `flex items-center px-6 py-3 transition-colors ${isActive
                                    ? 'bg-primary text-on-primary border-r-4 border-accent'
                                    : 'text-on-surface1 hover:bg-surface-hover hover:text-primary transition-colors'
                                }`
                            }
                        >
                            <div className="flex items-center gap-3">
                                <span className="flex-shrink-0">{item.icon}</span>
                                <span className="font-medium text-sm">{item.name}</span>
                            </div>
                        </NavLink>
                    ))}
                </nav>
            </div>
        </>
    );
};

export default Sidebar;
