// src/componentes/DropdownTheme.jsx

/**
 * DropdownTheme - Selector de tema de la aplicación
 *
 * Componente específico que usa el Dropdown genérico
 * para seleccionar entre los temas disponibles.
 *
 * CARACTERÍSTICAS:
 * ✅ Usa Dropdown genérico de UI/
 * ✅ Iconos específicos para cada tema
 * ✅ Traducciones desde useTmTr()
 * ✅ Sincronizado con el tema actual
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "./UI/Dropdown";
import { useTmTr } from "../contexts/TmTrContext";
import { Sun, Moon, Zap, Edit3 } from "lucide-react";

const ThemeDropdown = () => {
  const { theme, tr, setTheme } = useTmTr();
  const navigate = useNavigate();

  // ═══ Iconos para cada tema ═══
  const themeIcons = {
    light: <Sun className="w-5 h-5" />,
    dark: <Moon className="w-5 h-5" />,
    "high-contrast": <Zap className="w-5 h-5" />,
  };

  // ═══ Opciones del dropdown ═══
  const themeOptions = [
    {
      value: "light",
      label: tr.themes.light,
      icon: themeIcons.light,
    },
    {
      value: "dark",
      label: tr.themes.dark,
      icon: themeIcons.dark,
    },
    {
      value: "high-contrast",
      label: tr.themes["high-contrast"],
      icon: themeIcons["high-contrast"],
    },
    {
      value: "divider",
      label: "",
      isDivider: true,
    },
    {
      value: "edit-theme",
      label: "Editar Tema",
      icon: <Edit3 className="w-5 h-5" />,
      onClick: () => navigate("/coloreditor"),
    },
  ];

  // ═══ Manejador de selección ═══
  const handleSelect = (value) => {
    const option = themeOptions.find(opt => opt.value === value);
    if (option?.onClick) {
      option.onClick();
    } else if (value !== "divider") {
      setTheme(value);
    }
  };

  // ═══ Renderizado ═══
  return (
    <Dropdown
      triggerIcon={themeIcons[theme]}
      options={themeOptions}
      onSelect={handleSelect}
      selectedValue={theme}
      variant="navbar"
      position="right"
    />
  );
};

export default ThemeDropdown;
