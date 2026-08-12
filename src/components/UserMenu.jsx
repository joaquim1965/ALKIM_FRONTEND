import React, { useRef, useState } from "react";
import { User, LogOut, Settings, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { useTmTr } from "../contexts/TmTrContext";
import { useCloseDropdown } from "../hooks/useCloseDropdown";
import Menu from "./UI/Menu";

const UserMenu = () => {
    const navigate = useNavigate();
    const { logout, user } = useStore();
    console.log('[UserMenu:Debug] user:', user, 'isSysadmin?', user && (user.rol === 'sysadmin' || parseInt(user.rol) >= 3));
    const { tr } = useTmTr();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useCloseDropdown(menuRef, isOpen, () => setIsOpen(false));

    const handleLogout = () => {
        logout();
        navigate("/");
        setIsOpen(false);
    };

    const handleNavigate = (path) => {
        navigate(path);
        setIsOpen(false);
    };

    // Roles con acceso a la Consola SQL (SuperAdmin >= 3)
    const currentRol = user?.rol || user?.role;
    const isSysadmin = user && (
        currentRol === 'sysadmin' || 
        currentRol === 'superadmin' || 
        parseInt(currentRol) >= 3 ||
        user.permisos?.includes('sql.console')
    );

    const menuItems = [
        {
            id: "settings",
            label: tr.Settings || "Configuración",
            icon: <Settings size={16} />,
            onClick: () => handleNavigate("/settings"),
        },
        {
            id: "panel",
            label: tr.ControlPanel || "Panel de control",
            icon: <Database size={16} />,
            onClick: () => handleNavigate("/control-panel"),
        },
        ...(isSysadmin ? [
            {
                id: "sql-console",
                label: "Consultas Sql",
                icon: <Database size={16} />,
                onClick: () => handleNavigate("/sql-console"),
            },
        ] : []),
        { type: "separator" },
        {
            id: "logout",
            label: tr.Logout || "Cerrar sesión",
            icon: <LogOut size={16} className="text-danger" />,
            onClick: handleLogout,
        },
    ];

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="dropdown-trigger flex items-center space-x-2 px-3 py-2 rounded-lg
                           text-sm font-medium transition-colors duration-200
                           hover:bg-navbar-hover hover:text-on-navbar-hover bg-transparent text-on-navbar focus:outline-none"
                aria-haspopup="menu"
                aria-expanded={isOpen}
            >
                <User className="w-5 h-5" />
                <span>{user?.nombre?.split(' ')[0] || ""}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-52 shadow-lg shadow-shadow z-50 rounded-md">
                    <Menu items={menuItems} />
                </div>
            )}
        </div>
    );
};

export default UserMenu;
