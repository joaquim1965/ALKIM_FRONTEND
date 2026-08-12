// src/componentes/Navbar.jsx

import React from "react";
import { Link, useNavigate } from "react-router-dom";

import { useStore } from "../hooks/useStore";
import { useTmTr } from "../contexts/TmTrContext";
import Button from "./UI/Button";
import LanguageDropdown from "./LanguageDropdown";
import ThemeDropdown from "./ThemeDropdown";
import UserMenu from "./UserMenu";
import { Database } from "lucide-react";

const Navbar = () => {
  const { isAuthenticated } = useStore();
  const { tr } = useTmTr();
  const navigate = useNavigate();

  // Estilos de link con hover de botón primario
  const linkClasses = `
    flex items-center px-3 py-2 rounded-lg
    no-underline transition-all duration-200
    hover:bg-navbar-hover hover:text-on-navbar-hover
  `;

  return (
    <nav
      className={`
            fixed top-0 w-full px-4 font-bold flex
            justify-between items-center h-16 z-[100]
            bg-navbar text-on-navbar
            border-b-2 border-border shadow-lg shadow-shadow shadow-offset-2 shadow-blur-10 shadow-spread-0
          `}
    >
      {/* Sección izquierda: Enlaces principales */}
      <div className="flex items-center space-x-4 ml-2">
        <Link to="/" className={linkClasses}></Link>

        <Link to="/tests" className={linkClasses}>
          {tr.Tests}
        </Link>

        <Link to="/Muestra" className={linkClasses}>
          Muestra
        </Link>

        <Link to="/colorslist" className={linkClasses}>
          📋 {tr.ColorsList}
        </Link>

        <Link to="/sql-console" className={linkClasses}>
          <Database size={18} className="mr-1" />
          SQL
        </Link>

      </div>

      {/* Sección derecha: Botones de autenticación y menús */}
      <div className="flex items-center space-x-4">
        {!isAuthenticated ? (
          <div className="flex gap-2">
            <Button 
              className="bg-transparent text-on-navbar border-transparent hover:bg-navbar-hover hover:text-on-navbar-hover shadow-none" 
              onClick={() => navigate('/login')}
            >
              {tr.Login}
            </Button>

            <Button 
              className="bg-surface1 text-on-surface1 border-border hover:bg-navbar-hover hover:text-on-navbar-hover shadow-sm" 
              onClick={() => navigate('/register')}
            >
              {tr.Register}
            </Button>
          </div>
        ) : (
          <UserMenu />
        )}
        <LanguageDropdown />
        <ThemeDropdown />
      </div>
    </nav>
  );
};

export default Navbar;
