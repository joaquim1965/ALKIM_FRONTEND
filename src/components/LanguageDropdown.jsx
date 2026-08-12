// src/componentes/DropdownLanguage.jsx

/**
 * DropdownLanguage - Selector de idioma de la aplicación
 *
 * Componente específico que usa el Dropdown genérico
 * para seleccionar entre los idiomas disponibles.
 *
 * CARACTERÍSTICAS:
 * ✅ Usa Dropdown genérico de UI/
 * ✅ Lista de idiomas soportados
 * ✅ Sincronizado con el idioma actual
 * ✅ Fácil de extender con más idiomas
 *
 * NOTA: Si se añaden idiomas aquí, también actualizar:
 * - src/hooks/useStore.js (supportedLanguages)
 * - src/config/translations.js (añadir traducciones)
 */

import React from "react";
import { Dropdown } from "./UI/Dropdown";
import { useTmTr } from "../contexts/TmTrContext";
import { Globe } from "lucide-react";

const translations = new Proxy({}, { get: (_, prop) => prop });


const LanguageDropdown = () => {
  const { language, setLanguage } = useTmTr();

  // ═══ Configuración de idiomas disponibles ═══
  // Para añadir más idiomas:
  // 1. Añadir aquí
  // 2. Actualizar useStore.js (supportedLanguages)
  // 3. Añadir traducciones en translations.js
  const languageOptions = [
    { value: "es", label: "Español" },
    { value: "en", label: "English" },
    { value: "ca", label: "Català" },
    { value: "fr", label: "Français" },
  ];

  // ═══ Renderizado ═══
  return (
    <Dropdown
      triggerIcon={<Globe className="w-5 h-5" />}
      options={languageOptions}
      onSelect={setLanguage}
      selectedValue={language}
      variant="navbar"
      position="right"
    />
  );
};

export default LanguageDropdown;
