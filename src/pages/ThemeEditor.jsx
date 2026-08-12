/**
 * ThemeEditor.jsx
 *
 * Editor visual de temas para el nuevo sistema de CSS Variables
 *
 * Sistema:
 * - Lee y edita directamente las CSS Variables definidas en themes.css
 * - Permite editar los 3 temas: light, dark, high-contrast
 * - 10 categorías organizadas: Global, Navbar, Botones, Formularios, etc.
 * - Vista previa en tiempo real de los cambios
 * - Exporta themes.css completo para reemplazar el archivo original
 */

import React, { useState, useEffect } from 'react';
import { useTmTr } from '../contexts/TmTrContext';
import { useStore } from '../hooks/useStore';
import { calculateSmartPosition } from '../utils/uiUtils';
import { SuccessPopover } from '../components/UI/SuccessPopover';
import { ErrorPopover } from '../components/UI/ErrorPopover';
import { ConfirmPopover } from '../components/UI/ConfirmPopover';
import authService from '../services/authService';
import rawColorsCSS from '../styles/colors.css?raw';

import { Button } from '../components/UI/Button';
import ColorPickerModal from '../components/ThemeEditor/ColorPickerModal';
import { Sun, Moon, Zap, RotateCcw, Download, Save, FileDown, CheckCircle2 } from 'lucide-react';

// Eliminamos el proxy de traducciones ya que usaremos t(key) directamente con el contexto ThemeEditor


// Mapeo de nombres de variables CSS a claves de traducción
// Mapeo manual para variables que no siguen el patrón estándar --color-nombre
const VAR_TO_MNEMONIC = {
  '--color-background': 'varbackground',
  '--color-on-background': 'varonbackground',
  '--color-surface1': 'varsurface1',
  '--color-on-surface1': 'varonsurface1',
  '--color-surface2': 'varsurface2',
  '--color-on-surface2': 'varonsurface2',
  '--color-surface-hover': 'varsurfacehover',
  '--color-on-surface-hover': 'varonsurfacehover',
  '--color-border': 'varborder',
  '--color-shadow': 'varshadow',
  '--color-navbar': 'varnavbar',
  '--color-on-navbar': 'varonnavbar',
  '--color-navbar-hover': 'varnavbarhover',
  '--color-on-navbar-hover': 'varonnavbarhover',
  '--color-primary': 'varprimary',
  '--color-on-primary': 'varonprimary',
  '--color-primary-hover': 'varprimaryhover',
  '--color-on-primary-hover': 'varonprimaryhover',
  '--color-primary-border': 'varprimaryborder',
  '--color-secondary': 'varsecondary',
  '--color-on-secondary': 'varonsecondary',
  '--color-secondary-hover': 'varsecondaryhover',
  '--color-on-secondary-hover': 'varonsecondaryhover',
  '--color-secondary-border': 'varsecondaryborder',
  '--color-input': 'varinput',
  '--color-on-input': 'varoninput',
  '--color-input-border': 'varinputborder',
  '--color-input-focus': 'varinputfocus',
  '--color-input-focus-border': 'varinputfocusborder',
  '--color-input-invalid-border': 'varinputinvalidborder',
  '--color-ring': 'varring',
  '--color-focus-outline': 'varfocusoutline',
  '--color-disabled': 'vardisabled',
  '--color-on-disabled': 'varondisabled',
  '--color-link': 'varlink',
  '--color-link-hover': 'varlinkhover',
  '--color-table-header': 'vartableheader',
  '--color-on-table-header': 'varontableheader',
  '--color-table-row': 'vartablerow',
  '--color-on-table-row': 'varontablerow',
  '--color-table-row-hover': 'vartablerowhover',
  '--color-on-table-row-hover': 'varontablerowhover',
  '--color-table-row-selected': 'vartablerowselected',
  '--color-on-table-row-selected': 'varontablerowselected',
  '--color-table-row-striped': 'vartablerowstriped',
  '--color-on-table-row-striped': 'varontablerowstriped',
  '--color-tab': 'vartab',
  '--color-on-tab': 'varontab',
  '--color-tab-hover': 'vartabhover',
  '--color-on-tab-hover': 'varontabhover',
  '--color-tab-indicator': 'vartabindicator',
  '--color-tab-content': 'vartabcontent',
  '--color-on-tab-content': 'varontabcontent',
  '--color-success': 'varsuccess',
  '--color-on-success': 'varonsuccess',
  '--color-success-border': 'varsuccessborder',
  '--color-destructive': 'vardestructive',
  '--color-on-destructive': 'varondestructive',
  '--color-destructive-border': 'vardestructiveborder',
  '--color-warning': 'varwarning',
  '--color-on-warning': 'varonwarning',
  '--color-warning-border': 'varwarningborder',
  '--color-info': 'varinfo',
  '--color-on-info': 'varoninfo',
  '--color-info-border': 'varinfoborder',
  '--color-neutral': 'varneutral',
  '--color-on-neutral': 'varonneutral',
  '--color-neutral-border': 'varneutralborder',
  '--color-modal-backdrop': 'varmodalbackdrop',
};

// Los nombres de categorías y variables se traducen usando las claves definidas en s_translations
// con el contexto 'ThemeEditor'

const ThemeEditor = () => {
  const { tr, theme, setTheme, t, themeVariables, setThemeVariables } = useTmTr('ThemeEditor');
  const fetchTheme = useStore(state => state.fetchTheme);
  const saveTheme = useStore(state => state.saveTheme);
  const getVariableLabel = (varName) => {
    // Intentar obtener mnemónico manual o construir uno automático
    const mnemonic = VAR_TO_MNEMONIC[varName] || (varName.startsWith('--color-') ? `var${varName.replace('--color-', '').replace(/-/g, '')}` : varName.replace('--', '').replace(/-/g, '')).toLowerCase();

    const translated = t(mnemonic);
    // Si la traducción devuelve la clave (no existe), retornar el nombre limpio de la variable
    return translated === mnemonic ? varName.replace('--color-', '').replace(/-/g, ' ') : translated;
  };

  // Función helper para obtener el nombre traducido de una categoría
  const getCategoryLabel = (categoryName) => {
    // Limpiar nombre de categoría (por si viene con números del CSS antiguo)
    const cleanName = categoryName.replace(/^\d+\.?\s*/, '').trim();

    // Mapeo automático de categorías a camelCase con prefijo 'cat' (ej: "Global y Layout" -> "catGlobalLayout")
    const words = cleanName.split(/[\s()&y]+/).filter(Boolean);
    const mnemonic = 'cat' + words.join('').toLowerCase();

    const translated = t(mnemonic);
    return translated === mnemonic ? cleanName : translated;
  };

  // Estado para el tema activo en el editor (sincronizado con el tema global)
  const [activeEditorTheme, setActiveEditorTheme] = useState(theme);

  // Estado para almacenar los valores editados de cada tema
  const [themeValues, setThemeValues] = useState({
    light: {},
    dark: {},
    'high-contrast': {},
  });

  // Estado para indicar si hay cambios sin guardar
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showSaveError, setShowSaveError] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showRestoreSuccess, setShowRestoreSuccess] = useState(false);
  const [showRestoreError, setShowRestoreError] = useState(false);
  const [restoreErrorMessage, setRestoreErrorMessage] = useState('');
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showExportError, setShowExportError] = useState(false);
  const [exportErrorMessage, setExportErrorMessage] = useState('');
  const [exportPath, setExportPath] = useState('');

  // Referencias para posicionamiento
  const saveButtonRef = React.useRef(null);
  const exportButtonRef = React.useRef(null);
  const restoreButtonRef = React.useRef(null);

  // Estado para las categorías dinámicas leídas del CSS (solo colores para el editor)
  const [themeCategories, setThemeCategories] = useState({});
  // Estado para los valores por defecto puros parseados del CSS (sin contaminar con RGBs computados)
  const [cssDefaultValues, setCssDefaultValues] = useState({});

  /**
   * useEffect: Carga las categorías desde App.css al montar el componente
   */
  useEffect(() => {
    const initCategories = async () => {
      const { categories, defaultValues } = await loadCategoriesFromCSS();
      setThemeCategories(categories);
      setCssDefaultValues(defaultValues);
    };
    initCategories();
  }, []);

  /**
   * useEffect: Sincroniza activeEditorTheme con el tema global cuando cambia desde fuera
   * (por ejemplo, desde el navbar)
   */
  useEffect(() => {
    if (theme !== activeEditorTheme) {
      console.log('Sincronizando tema global:', theme, '→ activeEditorTheme');
      setActiveEditorTheme(theme);
    }
  }, [theme, activeEditorTheme]);

  /**
   * Helper: Obtiene el valor de una variable para un tema específico.
   * Modificado para leer primero desde la base de datos (EAV) y solo recurrir al DOM
   * si se añade una variable nueva que aún no está en la base de datos.
   * Evita colisiones con las variables inline inyectadas por el EAV.
   */
  const getCSSValue = (varName, themeName = 'light') => {
    // 1. Intentar EAV directo (sin prefijo '--')
    const cleanVarName = varName.replace('--', '');
    if (themeVariables[themeName] && themeVariables[themeName][cleanVarName]) {
      return themeVariables[themeName][cleanVarName];
    }

    // 2. Si es una variable nueva que no está en DB, leer de colors.css (DOM)
    const root = document.documentElement;
    // Guardar estilo inline actual
    const inlineVal = root.style.getPropertyValue(varName);
    const originalTheme = root.getAttribute('data-theme');

    // Limpiar versión inline para poder "ver" a través de ella hasta colors.css
    root.style.removeProperty(varName);

    // Aplicar temporalmente el tema solicitado al <html>
    if (themeName === 'light') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', themeName);
    }

    // Forzar reflow para asegurar lectura computada correcta
    void root.offsetWidth;

    // Leer el valor computado desde la hoja de estilos
    const value = getComputedStyle(root).getPropertyValue(varName).trim();

    // Restaurar el tema original
    if (originalTheme) {
      root.setAttribute('data-theme', originalTheme);
    } else {
      root.removeAttribute('data-theme');
    }

    // Restaurar estilo inline si existía
    if (inlineVal) {
      root.style.setProperty(varName, inlineVal);
    }

    return value;
  };

  /**
   * Helper: Establece un valor CSS en el tema actual
   */
  const setCSSValue = (varName, value) => {
    document.documentElement.style.setProperty(varName, value);
  };

  /**
   * Helper: Limpia todas las variables CSS inline del documento
   */
  const clearAllCSSVariables = () => {
    Object.entries(themeCategories).forEach(([category, variables]) => {
      Object.keys(variables).forEach((varName) => {
        document.documentElement.style.removeProperty(varName);
      });
    });
  };

  /**
   * Carga los valores por defecto del CSS para todos los temas
   * Fusionando la Base de Datos (EAV) con los defaults vírgenes en código.
   */
  useEffect(() => {
    if (Object.keys(themeCategories).length === 0) return;
    if (!themeVariables || Object.keys(themeVariables).length === 0) return;

    const loadedValues = {
      light: {},
      dark: {},
      'high-contrast': {},
    };

    Object.entries(themeCategories).forEach(([category, variables]) => {
      Object.keys(variables).forEach((varName) => {
        ['light', 'dark', 'high-contrast'].forEach((themeName) => {
          // 1. Intentar EAV directo (Base de Datos)
          const cleanVarName = varName.replace('--', '');
          let value = null;
          
          if (themeVariables[themeName] && themeVariables[themeName][cleanVarName]) {
            value = themeVariables[themeName][cleanVarName];
          } 
          // 2. Si no hay override en BD, usar el valor puro extraído estáticamente del archivo
          // Esto evita que el navegador convierta #hex a rgb() a través de getComputedStyle
          else if (cssDefaultValues[themeName] && cssDefaultValues[themeName][varName]) {
            value = cssDefaultValues[themeName][varName];
          }

          if (value) {
            loadedValues[themeName][varName] = value;
          }
        });
      });
    });

    setThemeValues(loadedValues);
  }, [themeCategories, themeVariables, cssDefaultValues]);

  /**
   * Cambia el tema activo en el editor
   */
  const handleChangeEditorTheme = (newTheme) => {
    setActiveEditorTheme(newTheme);
    setTheme(newTheme);
  };

  /**
   * useEffect: Aplica las variables CSS cuando cambia el tema activo
   */
  useEffect(() => {
    // Usar requestAnimationFrame para asegurar que el DOM se haya actualizado
    // después de que setTheme() cambie el data-theme attribute
    requestAnimationFrame(() => {
      // Limpiar todas las variables inline primero
      clearAllCSSVariables();

      // Aplicar las variables del tema seleccionado (si existen)
      const themeValuesForActive = themeValues[activeEditorTheme];
      if (themeValuesForActive && Object.keys(themeValuesForActive).length > 0) {
        // Aplicar las variables editadas del tema seleccionado como inline styles
        Object.entries(themeValuesForActive).forEach(([varName, value]) => {
          setCSSValue(varName, value);
        });
      }
      // Si no hay valores editados, las CSS Variables del colors.css tomarán efecto automáticamente
    });
  }, [activeEditorTheme, themeValues]);

  /**
   * Maneja el cambio de color de una variable
   */
  const handleColorChange = (varName, newColor) => {
    // 1. Actualizar el estado local del editor (instántaneo en el editor)
    setThemeValues((prev) => ({
      ...prev,
      [activeEditorTheme]: {
        ...prev[activeEditorTheme],
        [varName]: newColor,
      },
    }));

    // 2. Aplicar al store global usando el estado más reciente para evitar pérdida de datos
    const cleanVarName = varName.replace('--', '');
    const latestStoreVars = useStore.getState().themeVariables || { light: {}, dark: {}, 'high-contrast': {} };
    
    const nextThemeVariables = {
      ...latestStoreVars,
      [activeEditorTheme]: {
        ...(latestStoreVars[activeEditorTheme] || {}),
        [cleanVarName]: newColor
      }
    };
    
    setThemeVariables(nextThemeVariables);
    setHasUnsavedChanges(true);
  };

  /**
   * Resetea una variable a su valor por defecto exacto del CSS
   * ignorando cualquier valor de la Base de Datos (EAV)
   */
  const handleResetVariable = (varName) => {
    const cleanVarName = varName.replace('--', '');
    let defaultValue = '#000000';
    
    // Recuperar el valor original limpio directamente del objeto estático
    if (cssDefaultValues[activeEditorTheme] && cssDefaultValues[activeEditorTheme][varName]) {
      defaultValue = cssDefaultValues[activeEditorTheme][varName];
    } else {
      // Fallback a light theme si el dark/high-contrast no definen esta variable explícitamente
      if (cssDefaultValues['light'] && cssDefaultValues['light'][varName]) {
        defaultValue = cssDefaultValues['light'][varName];
      }
    }

    handleColorChange(varName, defaultValue);
    setHasUnsavedChanges(true);
  };

  /**
   * Parsea las variables CSS desde un bloque de texto
   */
  const parseCSSVariables = (cssBlock) => {
    const variables = {};
    // Regex para capturar líneas como: --nombre: valor;
    // Captura TODAS las variables: --color-xxx, --shadow-xxx, --focus-xxx, --opacity-xxx
    // IMPORTANTE: [a-z0-9-]+ incluye números para capturar surface1, surface2, etc.
    const varRegex = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let match;

    while ((match = varRegex.exec(cssBlock)) !== null) {
      const varName = match[1].trim();
      const value = match[2].trim();
      variables[varName] = value;
    }

    return variables;
  };

  /**
   * Encuentra y extrae un bloque CSS completo
   */
  const extractCSSBlock = (content, selector) => {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escapedSelector}\\s*\\{`, 'g');
    const match = regex.exec(content);

    if (!match) return null;

    let startIndex = match.index + match[0].length;
    let braceCount = 0;
    let endIndex = startIndex;
    let inBlock = true;

    // Contar llaves para encontrar el cierre del bloque
    for (let i = startIndex; i < content.length && inBlock; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        if (braceCount === 0) {
          endIndex = i;
          inBlock = false;
        } else {
          braceCount--;
        }
      }
    }

    return content.substring(startIndex, endIndex);
  };

  /**
   * Helper: Parsea el módulo ES que devuelve Vite con ?raw y extrae el contenido CSS
   * Vite devuelve: export default "contenido css escapado"
   * También puede incluir source maps al final: //# sourceMappingURL=...
   */
  const parseViteRawModule = (moduleText) => {
    if (!moduleText) return '';
    
    // Si el texto ya parece ser CSS puro (empieza con comentario o @theme), retornarlo
    if (moduleText.trim().startsWith('/**') || moduleText.trim().startsWith('@theme') || moduleText.trim().startsWith(':root')) {
      return moduleText;
    }

    // Buscar patrones de exportación de Vite (pueden usar comillas simples o dobles)
    const patterns = [
      /export\s+default\s+"([\s\S]*?)"\s*(?:\/\/# sourceMappingURL=|$)/,
      /export\s+default\s+'([\s\S]*?)'\s*(?:\/\/# sourceMappingURL=|$)/,
      /export\s+const\s+__vite__default\s*=\s*"([\s\S]*?)"/,
      /module\.exports\s*=\s*"([\s\S]*?)"/
    ];

    for (const pattern of patterns) {
      const match = moduleText.match(pattern);
      if (match) {
        try {
          const escapedContent = match[1];
          // JSON.parse procesa los escapes correctamente (\n, \t, etc.)
          // Pero necesitamos asegurar que esté envuelto en comillas para JSON.parse
          const decoded = JSON.parse(`"${escapedContent.replace(/"/g, '\\"')}"`);
          console.log('Módulo Vite parseado correctamente con patrón:', pattern);
          return decoded;
        } catch (e) {
          // Si JSON.parse falla, intentamos una decodificación manual básica de escapes
          return match[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\'/g, "'");
        }
      }
    }

    // Si llegamos aquí y el texto contiene "export default", es un problema
    if (moduleText.includes('export default')) {
      console.warn('Detectado export default pero no se pudo extraer el contenido. Limpiando manualmente.');
      // Intento desesperado: extraer lo que hay entre las primeras " o ' y las últimas
      const firstQuote = Math.min(
        moduleText.indexOf('"') === -1 ? Infinity : moduleText.indexOf('"'),
        moduleText.indexOf("'") === -1 ? Infinity : moduleText.indexOf("'")
      );
      const lastQuote = Math.max(moduleText.lastIndexOf('"'), moduleText.lastIndexOf("'"));
      
      if (firstQuote !== Infinity && lastQuote > firstQuote) {
        return moduleText.substring(firstQuote + 1, lastQuote);
      }
    }

    return moduleText;
  };

  /**
   * Extrae las categorías dinámicamente desde themes.css usando código importado crudo
   */
  const loadCategoriesFromCSS = async () => {
    try {
      const cssContent = rawColorsCSS;

      const themes = [
        { name: 'light', selector: '@theme' },
        { name: 'dark', selector: ':root[data-theme="dark"]' },
        { name: 'high-contrast', selector: ':root[data-theme="high-contrast"]' }
      ];

      const categories = {};
      const defaultValues = { light: {}, dark: {}, 'high-contrast': {} };

      // Extraer el bloque @theme (light) como base para estructurar las categorías
      const themeBlock = extractCSSBlock(cssContent, '@theme');
      if (!themeBlock) {
        console.error('No se encontró el bloque @theme en themes.css');
        return { categories: {}, defaultValues };
      }

      // Regex para encontrar comentarios de categoría: /* N. Nombre */ o /* N Nombre */
      const lines = themeBlock.split('\n');
      let currentCategory = null;

      lines.forEach((line) => {
        const categoryMatch = line.match(/\/\*\s*\d+\.?\s*([^*]+)\s*\*\//);
        if (categoryMatch) {
          currentCategory = categoryMatch[1].trim();
          categories[currentCategory] = {};
          return;
        }

        // Buscar variable CSS. EXCLUYE `--font-` o espaciados añadiendo explícitamente `--color-`
        // Esto evita que las fuentes aparezcan en los cuadrados de colores del editor.
        const varMatch = line.match(/(--color-[a-z0-9-]+)\s*:/);
        if (varMatch && currentCategory) {
          const varName = varMatch[1].trim();
          const label = getVariableLabel(varName);
          categories[currentCategory][varName] = label;
        }
      });

      // Extraer estáticamente los valores puros de hex/código para cada tema
      themes.forEach(({ name, selector }) => {
         const block = extractCSSBlock(cssContent, selector);
         if (block) {
           defaultValues[name] = parseCSSVariables(block);
         }
      });

      return { categories, defaultValues };
    } catch (err) {
      console.error('Error al cargar categorías desde themes.css:', err);
      return { categories: {}, defaultValues: { light: {}, dark: {}, 'high-contrast': {} } };
    }
  };

  /**
   * Restaura los valores originales desde themes.css
   */
  const handleRestoreFromCSS = async () => {
    if (!confirm('¿Restaurar todos los temas a los valores del archivo themes.css?\n\nSe perderán todos los cambios no guardados.')) {
      return;
    }

    try {
      // Leer desde colors.css (usamos ?raw para que Vite devuelva el contenido sin procesar)
      const response = await fetch('/src/styles/colors.css?raw');
      if (!response.ok) {
        throw new Error('No se pudo leer colors.css');
      }
      const moduleText = await response.text();
      const cssContent = parseViteRawModule(moduleText);

      // Definir los temas a parsear
      const themes = [
        { name: 'light', selector: '@theme' },
        { name: 'dark', selector: ':root[data-theme="dark"]' },
        { name: 'high-contrast', selector: ':root[data-theme="high-contrast"]' }
      ];

      const restoredValues = {
        light: {},
        dark: {},
        'high-contrast': {}
      };

      // Extraer variables de cada tema
      themes.forEach(({ name, selector }) => {
        const block = extractCSSBlock(cssContent, selector);
        if (block) {
          restoredValues[name] = parseCSSVariables(block);
        }
      });

      // Recargar las categorías desde el CSS actualizado
      const updatedCategories = await loadCategoriesFromCSS();
      setThemeCategories(updatedCategories);

      // Actualizar el estado
      setThemeValues(restoredValues);

      // Aplicar los valores del tema activo al DOM
      const activeThemeVars = restoredValues[activeEditorTheme];
      if (activeThemeVars) {
        Object.entries(activeThemeVars).forEach(([varName, value]) => {
          setCSSValue(varName, value);
        });
      }

      setHasUnsavedChanges(false);
      alert('✅ Valores restaurados desde themes.css\nLos 3 temas han sido recargados');
    } catch (err) {
      console.error('Error al restaurar:', err);
      alert('❌ Error al restaurar el tema');
    }
  };

  /**
   * Resetea todos los temas a sus valores guardados en el servidor (como si hiciera login)
   */
  /**
   * Dispara el flujo de restauración del tema
   */
  const handleResetTheme = () => {
    if (hasUnsavedChanges) {
      setShowRestoreConfirm(true);
    } else {
      executeRestore();
    }
  };

  /**
   * Ejecuta la recarga real desde el servidor
   */
  const executeRestore = async () => {
    try {
      await fetchTheme();
      setHasUnsavedChanges(false);
      setShowRestoreSuccess(true);
      setShowRestoreError(false);
    } catch (err) {
      console.error('Error al restaurar:', err);
      setRestoreErrorMessage(err.message || 'Error al conectar con el servidor');
      setShowRestoreError(true);
      setShowRestoreSuccess(false);
    }
  };

  /**
   * Genera el CSS con los valores editados de un tema específico
   * Usa CRLF (\r\n) para compatibilidad con Windows
   *
   * FORMATO IDÉNTICO A themes.css:
   * - Headers con guiones decorativos (───)
   * - Comentarios de categoría numerados (1. Global y Layout, 2. Barra de Navegación, etc.)
   * - Comentarios descriptivos para cada variable
   *
   * @param {string} themeName - Nombre del tema (light, dark, high-contrast)
   * @param {object} categoriesOverride - Opcional: categorías a usar en lugar de themeCategories del estado
   */
  const generateCSSForTheme = (themeName, categoriesOverride = null) => {
    const values = themeValues[themeName];

    // Generar header y selector según el tema
    let css = '';
    if (themeName === 'light') {
      css += '/* ───────────────────────────────────────────────────────────\r\n';
      css += '   1) TEMA BASE (LIGHT por defecto)\r\n';
      css += '   ─────────────────────────────────────────────────────────── */\r\n';
      css += '@theme {\r\n';
    } else if (themeName === 'dark') {
      css += '/* ───────────────────────────────────────────────────────────\r\n';
      css += '   2) OVERRIDES — DARK THEME\r\n';
      css += '   ─────────────────────────────────────────────────────────── */\r\n';
      css += ':root[data-theme="dark"] {\r\n';
    } else if (themeName === 'high-contrast') {
      css += '/* ───────────────────────────────────────────────────────────\r\n';
      css += '   3) OVERRIDES — HIGH CONTRAST THEME\r\n';
      css += '   ─────────────────────────────────────────────────────────── */\r\n';
      css += ':root[data-theme="high-contrast"] {\r\n';
    }

    // Generar variables por categoría con numeración (1-10)
    // Usa categoriesOverride si se proporciona, sino usa themeCategories del estado
    const categories = categoriesOverride || themeCategories || {};
    let categoryIndex = 1;
    Object.entries(categories).forEach(([category, variables]) => {
      css += `  /* ${categoryIndex}. ${category} */\r\n`;
      Object.keys(variables).forEach((varName) => {
        const value = values[varName];
        if (value) {
          // Agregar comentario descriptivo de la variable (traducido)
          const label = getVariableLabel(varName);
          css += `  /* ${label} */\r\n`;
          css += `  ${varName}: ${value};\r\n`;
        }
      });
      css += '\r\n';
      categoryIndex++;
    });

    css += '}\r\n';
    return css;
  };

  /**
   * FUNCIÓN COMÚN: Genera el archivo CSS completo con todos los temas
   * Esta función es usada por handleExportCSS
   *
   * IMPORTANTE:
   * - Solo reemplaza los valores de las variables editadas usando RegExp.
   * - Preserva comentarios, variables de fuentes/espaciado, y estructura original intacta.
   */
  const generateFullCSSFile = async () => {
    // Leer el archivo colors.css original
    const response = await fetch('/src/styles/colors.css?raw');
    if (!response.ok) {
      throw new Error('No se pudo leer colors.css');
    }
    const moduleText = await response.text();
    let fullContent = parseViteRawModule(moduleText);

    if (!hasUnsavedChanges) {
      return fullContent.replace(/\r?\n/g, '\r\n');
    }

    const themes = [
      { name: 'light', selector: '@theme' },
      { name: 'dark', selector: ':root[data-theme="dark"]' },
      { name: 'high-contrast', selector: ':root[data-theme="high-contrast"]' }
    ];

    // Para cada tema, encontrar el bloque existente y reemplazar SÓLO las variables modificadas
    themes.forEach(({ name, selector }) => {
      const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`${escapedSelector}\\s*\\{`, 'g');
      const match = regex.exec(fullContent);

      if (match && themeValues[name]) {
        let startIndex = match.index + match[0].length;
        let braceCount = 0;
        let endIndex = startIndex;
        let inBlock = true;

        for (let i = startIndex; i < fullContent.length && inBlock; i++) {
          if (fullContent[i] === '{') braceCount++;
          if (fullContent[i] === '}') {
            if (braceCount === 0) {
              endIndex = i;
              inBlock = false;
            } else {
              braceCount--;
            }
          }
        }

        let blockContent = fullContent.substring(startIndex, endIndex);

        // Reemplazar cada variable usando RegEx dentro de este bloque
        Object.entries(themeValues[name]).forEach(([varName, val]) => {
          if (val) {
             // Busca la línea exacta de la variable y preserva su estructura de CSS
             const varRegex = new RegExp(`(${varName}\\s*:)[^;]+;`, 'g');
             blockContent = blockContent.replace(varRegex, `$1 ${val};`);
          }
        });

        // Ensamblar nuevamente el string completo
        fullContent = fullContent.substring(0, startIndex) + blockContent + fullContent.substring(endIndex);
      }
    });

    return fullContent.replace(/\r?\n/g, '\r\n');
  };

  const handleSaveChanges = async () => {
    try {
      // 1. Recopilamos los valores actuales del editor (fuente de la verdad inmediata)
      const currentEditorValues = themeValues[activeEditorTheme] || {};
      const cleanedVariables = {};
      
      Object.entries(currentEditorValues).forEach(([key, val]) => {
        // Solo incluimos si el valor es un string válido para evitar errores de validación (Zod record)
        if (typeof val === 'string') {
          cleanedVariables[key.replace('--', '')] = val;
        } else if (val !== undefined && val !== null) {
          // Convertir a string si es otro tipo de dato (números, etc)
          cleanedVariables[key.replace('--', '')] = String(val);
        }
      });

      // 2. Actualizar el store global para mantener coherencia en toda la App
      const latestStoreVars = useStore.getState().themeVariables || { light: {}, dark: {}, 'high-contrast': {} };
      setThemeVariables({
        ...latestStoreVars,
        [activeEditorTheme]: cleanedVariables
      });

      // 3. Persistencia explícita en el backend pasando los datos directos
      await saveTheme(activeEditorTheme, cleanedVariables);
      
      setShowSaveSuccess(true);
      setShowSaveError(false);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error al guardar:', err);
      // Extraer mensaje detallado si existe
      let detailedMessage = err.message || 'Error desconocido';
      if (err.details && Array.isArray(err.details)) {
        const details = err.details.map(d => `${d.field}: ${d.message}`).join('\n');
        detailedMessage = `${err.message}:\n${details}`;
      }
      
      setSaveErrorMessage(detailedMessage);
      setShowSaveError(true);
      setShowSaveSuccess(false);
    }
  };

  /**
   * Genera y descarga el archivo colors.css completo
   */
  const handleExportCSS = async () => {
    try {
      const cssContent = await generateFullCSSFile();
      
      // SIEMPRE forzar la descarga en el navegador mediante Blob standard.
      // Escribir silenciosamente al disco local desde API provocaba que Vite
      // detectara el archivo como alterado y recargase la página violentamente,
      // corrompiendo la sesión de UI y cerrando popups inexplicablemente.
      const blob = new Blob([cssContent], { type: 'text/css' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'colors.css';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportPath('Carpeta de descargas del navegador');
      setShowExportSuccess(true);
    } catch (err) {
      console.error('Error al exportar:', err);
      setExportErrorMessage(err.message || 'Error desconocido');
      setShowExportError(true);
    }
  };


  /**
   * Normaliza un color (convierte rgb a hex)
   */
  const normalizeColor = (color) => {
    if (!color) return '#000000';

    // Si ya es hex, devolverlo
    if (color.startsWith('#')) return color;

    // Si es rgb/rgba, convertir a hex
    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match && match.length >= 3) {
        const r = parseInt(match[0]);
        const g = parseInt(match[1]);
        const b = parseInt(match[2]);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
    }

    return color;
  };

  /**
   * Abre el modal de selección de color para una variable
   */
  const handleOpenColorPicker = (varName) => {
    setEditingVariable(varName);
    setShowColorPicker(true);
  };

  /**
   * Maneja la selección de color desde el modal
   */
  const handleColorSelected = (hex) => {
    if (editingVariable) {
      handleColorChange(editingVariable, hex);
    }
    setShowColorPicker(false);
    setEditingVariable(null);
  };

  /**
   * Genera estilos CSS dinámicos para hover y focus en los previews
   */
  const DynamicPreviewStyles = () => {
    const theme = themeValues[activeEditorTheme] || {};

    return (
      <style>{`
        /* Surface hover */
        .preview-surface:hover {
          background-color: ${theme['--color-surface-hover']} !important;
          color: ${theme['--color-on-surface-hover']} !important;
        }

        /* Navbar hover */
        .preview-navbar-item:hover {
          background-color: ${theme['--color-navbar-hover']} !important;
          color: ${theme['--color-on-navbar-hover']} !important;
        }

        /* Primary button hover */
        .preview-btn-primary:hover {
          background-color: ${theme['--color-primary-hover']} !important;
          color: ${theme['--color-on-primary-hover']} !important;
        }

        /* Primary button focus */
        .preview-btn-primary:focus {
          outline: ${theme['--focus-outline-width']} solid ${theme['--color-focus-outline']} !important;
          outline-offset: ${theme['--focus-outline-offset']} !important;
        }

        /* Secondary button hover */
        .preview-btn-secondary:hover {
          background-color: ${theme['--color-secondary-hover']} !important;
          color: ${theme['--color-on-secondary-hover']} !important;
        }

        /* Secondary button focus */
        .preview-btn-secondary:focus {
          outline: ${theme['--focus-outline-width']} solid ${theme['--color-focus-outline']} !important;
          outline-offset: ${theme['--focus-outline-offset']} !important;
        }

        /* Input focus */
        .preview-input:focus {
          background-color: ${theme['--color-input-focus']} !important;
          border-color: ${theme['--color-input-focus-border']} !important;
          outline: ${theme['--focus-outline-width']} solid ${theme['--color-focus-outline']} !important;
          outline-offset: ${theme['--focus-outline-offset']} !important;
        }

        /* Link hover */
        .preview-link:hover {
          color: ${theme['--color-link-hover']} !important;
        }

        /* Table row hover */
        .preview-table-row:hover {
          background-color: ${theme['--color-table-row-hover']} !important;
          color: ${theme['--color-on-table-row-hover']} !important;
        }

        /* Tab hover */
        .preview-tab:hover {
          background-color: ${theme['--color-tab-hover']} !important;
          color: ${theme['--color-on-tab-hover']} !important;
        }
      `}</style>
    );
  };

  /**
   * Renderiza el preview específico para cada categoría
   */
  const renderCategoryPreview = (categoryName) => {
    const theme = themeValues[activeEditorTheme] || {};

    switch (categoryName) {
      case 'Global y Layout':
        return (
          <div className="rounded-lg border-2 overflow-hidden flex flex-col h-full" style={{ borderColor: theme['--color-border'] }}>
            <div className="space-y-4">
              <div className="p-2 rounded" style={{ backgroundColor: theme['--color-background'] }}>
                <p className="text-xs font-semibold" style={{ color: theme['--color-on-background'] }}>{t('varonbackground')}</p>
              </div>
              <div className="p-2 rounded preview-surface transition-all cursor-pointer shadow-md shadow-shadow" style={{
                backgroundColor: theme['--color-surface1'],
                color: theme['--color-on-surface1']
              }}>
                <p className="text-xs font-semibold">{t('varonsurface1')}</p>
              </div>
              <div className="p-2 rounded preview-surface transition-all cursor-pointer mb-4 shadow-xl shadow-shadow" style={{
                backgroundColor: theme['--color-surface2'],
                color: theme['--color-on-surface2']
              }}>
                <p className="text-xs font-semibold">{t('varonsurface2')}</p>
              </div>
            </div>
          </div>
        );

      case 'Barra de Navegación':
        return (
          <div className="rounded-lg border-2 overflow-hidden flex flex-col h-full" style={{ borderColor: theme['--color-border'] }}>
            <div className="flex-1 flex flex-col min-h-[220px]">
              {['--color-background', '--color-surface1', '--color-surface2'].map((bgVar, idx) => (
                <div key={bgVar} className={`p-4 flex items-center justify-center ${idx < 2 ? 'border-b-2' : ''}`} style={{ 
                  backgroundColor: theme[bgVar],
                  borderColor: theme['--color-border']
                }}>
                  <div className="w-full rounded overflow-hidden shadow-md" style={{
                    backgroundColor: theme['--color-navbar']
                  }}>
                    <div className="p-2 flex items-center justify-between gap-1">
                      <div className="flex gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded preview-navbar-item transition-all cursor-pointer whitespace-nowrap" style={{
                          color: theme['--color-on-navbar']
                        }}>{t('prevnavhome')}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded preview-navbar-item transition-all cursor-pointer whitespace-nowrap" style={{
                          color: theme['--color-on-navbar']
                        }}>{t('prevnavsettings')}</span>
                      </div>
                      <div className="flex gap-2 text-[12px]">
                        <span className="cursor-pointer" title="Español">🇪🇸</span>
                        <span className="cursor-pointer" title="English">🇺🇸</span>
                        <span className="cursor-pointer" title="Català">🇦nd</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Botones':
        return (
          <div className="rounded-lg border-2 overflow-hidden flex flex-col h-full" style={{ borderColor: theme['--color-border'] }}>
            <div className="flex-1 flex flex-col min-h-[300px]">
              {['--color-background', '--color-surface1', '--color-surface2'].map((bgVar, idx) => (
                <div key={bgVar} className={`p-4 flex flex-col gap-4 border-b-2 last:border-b-0`} style={{ 
                  backgroundColor: theme[bgVar],
                  borderColor: theme['--color-border']
                }}>
                  <div className="space-y-1">
                    <div className="flex flex-col gap-2">
                       <Button variant="primary" size="xs" className="w-full" style={{ opacity: 1 }}>
                        {t('primarybtnpreview')}
                      </Button>
                      <Button variant="secondary" size="xs" className="w-full" style={{ opacity: 1 }}>
                        {t('secondarybtnpreview')}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex flex-col gap-2">
                      <Button variant="primary" size="xs" className="w-full force-hover" style={{ opacity: 1 }}>
                        {t('primarybtnpreview')} (hover)
                      </Button>
                      <Button variant="secondary" size="xs" className="w-full force-hover" style={{ opacity: 1 }}>
                        {t('secondarybtnpreview')} (hover)
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Formularios':
        return (
          <div className="rounded-lg border-2 overflow-hidden flex flex-col h-full" style={{ borderColor: theme['--color-border'] }}>
            <div className="flex-1 flex flex-col min-h-[400px]">
              {['--color-background', '--color-surface1', '--color-surface2'].map((bgVar, idx) => (
                <div key={bgVar} className={`flex-1 p-3 flex flex-col gap-2 justify-center ${idx < 2 ? 'border-b-2' : ''}`} style={{ 
                  backgroundColor: theme[bgVar],
                  borderColor: theme['--color-border']
                }}>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Normal */}
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={t('varinput')}
                        onChange={() => {}}
                        className="input-base w-full px-2 py-1 text-[10px] rounded shadow-sm"
                        style={{
                          backgroundColor: theme['--color-input'],
                          color: theme['--color-on-input'],
                          border: `2px solid ${theme['--color-input-border']}`
                        }}
                        readOnly
                      />
                    </div>
                    {/* Simulated Focus */}
                    <div className="space-y-1">
                      <input
                        type="text"
                        value="Focus State"
                        onChange={() => {}}
                        className="input-base w-full px-2 py-1 text-[10px] rounded"
                        style={{
                          backgroundColor: theme['--color-input-focus'],
                          color: theme['--color-on-input'],
                          border: `2px solid ${theme['--color-input-focus-border']}`,
                          outline: `2px solid ${theme['--color-focus-outline']}`,
                          boxShadow: `0 0 0 3px ${theme['--color-ring']}`
                        }}
                        readOnly
                      />
                    </div>
                    {/* Invalid */}
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={t('previewinputinvalid')}
                        onChange={() => {}}
                        className="input-base w-full px-2 py-1 text-[10px] rounded shadow-sm"
                        style={{
                          backgroundColor: theme['--color-input'],
                          color: theme['--color-on-input'],
                          border: `2px solid ${theme['--color-input-invalid-border']}`
                        }}
                        readOnly
                      />
                    </div>
                    {/* Disabled */}
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={t('previewinputdisabled')}
                        onChange={() => {}}
                        disabled
                        className="input-base w-full px-2 py-1 text-[10px] rounded"
                        style={{
                          backgroundColor: theme['--color-disabled'],
                          color: theme['--color-on-disabled'],
                          border: `2px solid ${theme['--color-input-border']}`,
                          opacity: 1
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Enlaces':
      case 'Tarjetas y Enlaces':
        return (
          <div className="rounded-lg border-2 overflow-hidden flex flex-col h-full" style={{ borderColor: theme['--color-border'] }}>
            <div className="flex-1 flex flex-col min-h-[140px]">
              {['--color-background', '--color-surface1', '--color-surface2'].map((bgVar, idx) => (
                <div key={bgVar} className={`p-4 flex flex-col gap-3 ${idx < 2 ? 'border-b-2' : ''}`} style={{ 
                  backgroundColor: theme[bgVar],
                  borderColor: theme['--color-border']
                }}>
                  <a href="#" className="block text-xs font-bold underline preview-link transition-all" style={{
                    color: theme['--color-link']
                  }} onClick={(e) => e.preventDefault()}>{t('varlink')}</a>
                  
                  <div className="p-2 rounded border-2 shadow-sm" style={{ 
                    backgroundColor: theme[bgVar === '--color-background' ? '--color-surface1' : bgVar === '--color-surface1' ? '--color-surface2' : '--color-background'],
                    borderColor: theme['--color-border']
                  }}>
                    <a href="#" className="block text-[10px] font-bold underline preview-link transition-all leading-tight" style={{
                      color: theme['--color-link']
                    }} onClick={(e) => e.preventDefault()}>{t('previewlinkincard')}</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Tablas':
        return (
          <div className="rounded-lg border-2 overflow-hidden flex flex-col h-full" style={{ borderColor: theme['--color-border'] }}>
            <div className="flex-1 flex flex-col overflow-y-auto">
              {['--color-background', '--color-surface1', '--color-surface2'].map((bgVar, idx) => (
                <div key={bgVar} className={`p-4 flex items-center justify-center ${idx < 2 ? 'border-b-2' : ''}`} style={{ 
                  backgroundColor: theme[bgVar],
                  borderColor: theme['--color-border'],
                  minHeight: '120px'
                }}>
                  <div className="w-full max-w-md rounded border-2 overflow-hidden shadow-sm" style={{ borderColor: theme['--color-border'] }}>
                    <div className="px-2 py-1 text-[9px] font-bold" style={{
                      backgroundColor: theme['--color-table-header'],
                      color: theme['--color-on-table-header']
                    }}>{t('vartableheader')}</div>
                    <div className="px-2 py-1 text-[9px] preview-table-row transition-all border-b" style={{
                      backgroundColor: theme['--color-table-row'],
                      color: theme['--color-on-table-row'],
                      borderColor: theme['--color-border']
                    }}>{t('previewrowitem')}</div>
                    <div className="px-2 py-1 text-[9px] preview-table-row transition-all border-b" style={{
                      backgroundColor: theme['--color-table-row-striped'],
                      color: theme['--color-on-table-row-striped'],
                      borderColor: theme['--color-border']
                    }}>{t('previewstripedrow')}</div>
                    <div className="px-2 py-1 text-[9px] preview-table-row transition-all" style={{
                      backgroundColor: theme['--color-table-row-selected'],
                      color: theme['--color-on-table-row-selected']
                    }}>{t('previewrowselected')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Pestañas':
      case 'Pestañas (Tabs)':
        return (
          <div className="rounded-lg border-2 overflow-hidden flex flex-col h-full" style={{ borderColor: theme['--color-border'] }}>
            <div className="flex-1 flex flex-col min-h-[250px]">
              {['--color-background', '--color-surface1', '--color-surface2'].map((bgVar, idx) => (
                <div key={bgVar} className={`flex-1 p-2 flex items-center justify-center ${idx < 2 ? 'border-b-2' : ''}`} style={{ 
                  backgroundColor: theme[bgVar],
                  borderColor: theme['--color-border']
                }}>
                  <div className="w-full max-w-sm rounded overflow-hidden border shadow-sm" style={{ borderColor: theme['--color-border'] }}>
                    <div className="flex gap-1 p-1" style={{ backgroundColor: theme['--color-tab'] }}>
                      <span className="text-[8px] px-2 py-0.5 rounded preview-tab transition-all cursor-pointer" style={{
                        color: theme['--color-on-tab']
                      }}>{t('previewtab1')}</span>
                      <span className="text-[8px] px-2 py-0.5 rounded font-bold border-b-2" style={{
                        color: theme['--color-on-tab'],
                        borderColor: theme['--color-tab-indicator']
                      }}>{t('previewtabactive')}</span>
                    </div>
                    <div className="p-1 px-2 text-[9px]" style={{
                      backgroundColor: theme['--color-tab-content'],
                      color: theme['--color-on-tab-content']
                    }}>
                      {t('previewtabcontent')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Modales':
        return (
          <div className="p-3 rounded border-2" style={{ borderColor: theme['--color-border'] }}>
            <div className="p-4 rounded" style={{
              backgroundColor: theme['--color-modal-backdrop']
            }}>
              <div className="p-3 rounded text-xs" style={{
                backgroundColor: theme['--color-surface1'],
                color: theme['--color-on-surface1']
              }}>
                <p className="font-bold mb-1">{t('previewmodaltitle')}</p>
                <p>{t('previewmodalcontent')}</p>
              </div>
            </div>
          </div>
        );

      case 'Estados':
        return (
          <div className="rounded-lg border-2 overflow-hidden flex flex-col h-full" style={{ borderColor: theme['--color-border'] }}>
            <div className="flex-1 grid grid-cols-3 min-h-[250px]">
              {['--color-background', '--color-surface1', '--color-surface2'].map((bgVar, idx) => (
                <div key={bgVar} className={`p-2 flex flex-col gap-2 justify-center ${idx < 2 ? 'border-r-2' : ''}`} style={{ 
                  backgroundColor: theme[bgVar],
                  borderColor: theme['--color-border']
                }}>
                  {['success', 'destructive', 'warning', 'info'].map(status => (
                    <div key={status} className="p-1.5 rounded border shadow-sm" style={{
                      backgroundColor: theme[`--color-${status}`],
                      color: theme[`--color-on-${status}`],
                      borderColor: theme[`--color-${status}-border`]
                    }}>
                      <p className="text-[9px] font-bold uppercase truncate">{status}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );

      case 'Superficies':
        return (
          <div className="p-3 rounded border-2" style={{ borderColor: theme['--color-border'] }}>
            {/* Fondo primario (como el fondo de la aplicación) */}
            <div className="p-4 rounded" style={{ backgroundColor: theme['--color-background'] }}>
              <p className="text-[10px] mb-3" style={{ color: theme['--color-on-background'] }}>
                {t('previewappbackground')}
              </p>

              {/* Superficie - Como un card o elemento elevado */}
              <div className="p-3 rounded mb-3" style={{
                backgroundColor: theme['--color-surface'],
                border: `2px solid ${theme['--color-border']}`,
                boxShadow: theme['--shadow-sm']
              }}>
                <p className="text-xs font-semibold mb-1" style={{ color: theme['--color-on-surface'] }}>
                  {t('previewsurfacetitle')}
                </p>
                <p className="text-[10px]" style={{ color: theme['--color-on-surface'] }}>
                  {t('previewsurfacedesc')}
                </p>
              </div>

              {/* Muted - Superficie más suave */}
              <div className="p-3 rounded" style={{
                backgroundColor: theme['--color-muted'],
                border: `2px solid ${theme['--color-border']}`,
                boxShadow: theme['--shadow-md']
              }}>
                <p className="text-xs font-semibold mb-1" style={{ color: theme['--color-on-muted'] }}>
                  {t('previewmutedtitle')}
                </p>
                <p className="text-[10px]" style={{ color: theme['--color-on-muted'] }}>
                  {t('previewmuteddesc')}
                </p>
              </div>
            </div>
          </div>
        );

      case 'Hovers':
        return (
          <div className="p-3 rounded border-2" style={{ borderColor: theme['--color-border'] }}>
            <div className="space-y-2">
              <div className="p-2 rounded text-xs" style={{
                backgroundColor: theme['--color-primary-hover'],
                color: theme['--color-on-primary-hover']
              }}>{t('primaryhoverlabel')}</div>
              <div className="p-2 rounded text-xs" style={{
                backgroundColor: theme['--color-secondary-hover'],
                color: theme['--color-on-secondary-hover']
              }}>{t('secondaryhoverlabel')}</div>
              <div className="p-2 rounded text-xs" style={{
                backgroundColor: theme['--color-surface-hover'],
                color: theme['--color-on-surface-hover']
              }}>{t('surfacehoverlabel')}</div>
              <div className="p-2 rounded text-xs" style={{
                backgroundColor: theme['--color-muted-hover'],
                color: theme['--color-on-muted-hover']
              }}>{t('mutedhoverlabel')}</div>
            </div>
          </div>
        );

      case 'Elementos adicionales':
        return (
          <div className="p-3 rounded border-2" style={{ borderColor: theme['--color-border'] }}>
            <div className="space-y-2">
              <div className="p-2 rounded text-xs border-2" style={{ borderColor: theme['--color-border'] }}>
                {t('previewbordergeneral')}
              </div>
              <div className="p-2 rounded text-xs" style={{
                outline: `2px solid ${theme['--color-ring']}`,
                outlineOffset: '2px'
              }}>
                {t('previewfocusring')}
              </div>
            </div>
          </div>
        );

      case 'Sombras':
        return (
          <div className="p-3 rounded border-2" style={{ borderColor: theme['--color-border'] }}>
            <div className="space-y-3">
              <div className="p-2 rounded text-xs bg-surface" style={{ boxShadow: theme['--shadow-sm'] }}>
                {t('previewshadowsm')}
              </div>
              <div className="p-2 rounded text-xs bg-surface" style={{ boxShadow: theme['--shadow-md'] }}>
                {t('previewshadowmd')}
              </div>
              <div className="p-2 rounded text-xs bg-surface" style={{ boxShadow: theme['--shadow-lg'] }}>
                {t('previewshadowlg')}
              </div>
              <div className="p-2 rounded text-xs bg-surface" style={{ boxShadow: theme['--shadow-xl'] }}>
                {t('previewshadowxl')}
              </div>
            </div>
          </div>
        );

      case 'Opacidades':
        return (
          <div className="p-3 rounded border-2" style={{ borderColor: theme['--color-border'] }}>
            <h4 className="text-sm font-bold mb-2">{t('staticpreview')}</h4>
            <div className="space-y-2">
              <div className="p-2 rounded text-xs" style={{
                backgroundColor: theme['--color-primary'],
                color: theme['--color-on-primary'],
                opacity: theme['--opacity-disabled']
              }}>
                {t('vardisabled')} ({theme['--opacity-disabled']})
              </div>
              <div className="p-2 rounded text-xs" style={{
                backgroundColor: theme['--color-primary'],
                color: theme['--color-on-primary'],
                opacity: theme['--opacity-hover']
              }}>
                {t('varprimaryhover')} ({theme['--opacity-hover']})
              </div>
              <div className="p-2 rounded text-xs" style={{
                backgroundColor: theme['--color-primary'],
                color: theme['--color-on-primary'],
                opacity: theme['--opacity-focus']
              }}>
                {t('varinputfocus')} ({theme['--opacity-focus']})
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-3 rounded border-2 text-xs" style={{ borderColor: theme['--color-border'] }}>
            <p className="text-gray-500">{t('nopreview')}</p>
          </div>
        );
    }
  };

  /**
   * Helper: Obtiene los valores del tema activo del editor para aplicar en la UI
   */
  const getEditorThemeValue = (varName) => {
    // Si el valor está en themeValues, usarlo
    const storedValue = themeValues[activeEditorTheme]?.[varName];
    if (storedValue) {
      return storedValue;
    }

    // NUNCA MÁS se debe invocar a `getCSSValue` aquí. 
    // `getCSSValue` mutaba el tag <html data-theme="..."> en pleno ciclo de renderizado,
    // destruyendo el Virtual DOM de React y causando pantallas en blanco catastróficas.
    // Usamos variables CSS nativas para el fallback instántaneo de la UI.
    return `var(${varName})`;
  };

  return (
    <div
      className="min-h-screen p-6 transition-colors duration-300"
      style={{
        backgroundColor: getEditorThemeValue('--color-background'),
        color: getEditorThemeValue('--color-on-background')
      }}
    >
      {/* Estilos dinámicos para hover y focus en previews */}
      <DynamicPreviewStyles />

      <div className="max-w-7xl mx-auto">
        {/* Header Sticky */}
        <div
          className="sticky top-16 z-[90] pt-4 pb-4 mb-4 -mx-6 px-6 transition-colors duration-300"
          style={{
            backgroundColor: getEditorThemeValue('--color-background')
          }}
        >
          {/* Título */}
          <header className="mb-3">
            <h1 className="text-2xl font-bold">{t('title')}</h1>
          </header>

          {/* Panel de control */}
          <div
            className="p-4 rounded-lg transition-colors duration-300"
            style={{
              backgroundColor: getEditorThemeValue('--color-surface1'),
              color: getEditorThemeValue('--color-on-surface1')
            }}
          >
            {/* Fila 1: Selector de tema */}
            <div
              className="flex items-center justify-between gap-3 mb-3 pb-3 border-b-2 transition-colors duration-300"
              style={{ borderColor: getEditorThemeValue('--color-border') }}
            >
              {/* Izquierda: Selector de tema */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{t('editinglabel')}</span>
                <button
                  onClick={() => handleChangeEditorTheme('light')}
                  className="px-3 py-1.5 text-sm rounded-lg font-semibold transition-all"
                  style={
                    activeEditorTheme === 'light'
                      ? {
                        backgroundColor: getEditorThemeValue('--color-primary'),
                        color: getEditorThemeValue('--color-on-primary'),
                        boxShadow: '0 4px 6px -1px rgb(0 0 0)'
                      }
                      : {
                        backgroundColor: getEditorThemeValue('--color-secondary'),
                        color: getEditorThemeValue('--color-on-secondary'),
                        border: `2px solid ${getEditorThemeValue('--color-secondary-border')}`
                      }
                  }
                >
                  <Sun size={16} className="inline mr-1" /> {t('lighttheme')}
                </button>
                <button
                  onClick={() => handleChangeEditorTheme('dark')}
                  className="px-3 py-1.5 text-sm rounded-lg font-semibold transition-all"
                  style={
                    activeEditorTheme === 'dark'
                      ? {
                        backgroundColor: getEditorThemeValue('--color-primary'),
                        color: getEditorThemeValue('--color-on-primary'),
                        boxShadow: '0 4px 6px -1px rgb(0 0 0)'
                      }
                      : {
                        backgroundColor: getEditorThemeValue('--color-secondary'),
                        color: getEditorThemeValue('--color-on-secondary'),
                        border: `2px solid ${getEditorThemeValue('--color-secondary-border')}`
                      }
                  }
                >
                  <Moon size={16} className="inline mr-1" /> {t('darktheme')}
                </button>
                <button
                  onClick={() => handleChangeEditorTheme('high-contrast')}
                  className="px-3 py-1.5 text-sm rounded-lg font-semibold transition-all"
                  style={
                    activeEditorTheme === 'high-contrast'
                      ? {
                        backgroundColor: getEditorThemeValue('--color-primary'),
                        color: getEditorThemeValue('--color-on-primary'),
                        boxShadow: '0 4px 6px -1px rgb(0 0 0)'
                      }
                      : {
                        backgroundColor: getEditorThemeValue('--color-secondary'),
                        color: getEditorThemeValue('--color-on-secondary'),
                        border: `2px solid ${getEditorThemeValue('--color-secondary-border')}`
                      }
                  }
                >
                  <Zap size={16} className="inline mr-1" /> {t('highcontrasttheme')}
                </button>
              </div>

              {/* Derecha: Botones de acción */}
              <div className="flex items-center gap-2">
                <button
                  ref={restoreButtonRef}
                  onClick={handleResetTheme}
                  className="px-3 py-1.5 text-sm rounded-lg font-semibold transition-all flex items-center gap-2 hover:brightness-110 active:scale-95"
                  style={{
                    backgroundColor: getEditorThemeValue('--color-secondary'),
                    color: getEditorThemeValue('--color-on-secondary'),
                    border: `2px solid ${getEditorThemeValue('--color-secondary-border')}`
                  }}
                >
                  <RotateCcw size={16} /> 
                  <div className="flex flex-col items-start leading-tight">
                    <span>{t('restoreaction')}</span>
                    <span className="text-[9px]">{t('synctoserver')}</span>
                  </div>
                </button>

                {showRestoreConfirm && (
                  <ConfirmPopover
                    message={t('restoreconfirmtitle')}
                    subMessage={t('restoreconfirmmessage')}
                    onConfirm={executeRestore}
                    onClose={() => setShowRestoreConfirm(false)}
                    triggerRef={restoreButtonRef}
                    preferredSide="bottom"
                    confirmText={t('restoreaction')}
                  />
                )}

                {showRestoreSuccess && (
                  <SuccessPopover
                    message={t('restoresuccess')}
                    triggerRef={restoreButtonRef}
                    onClose={() => setShowRestoreSuccess(false)}
                    preferredSide="bottom"
                  />
                )}

                {showRestoreError && (
                  <ErrorPopover
                    message={t('restoreerror')}
                    errorDetails={restoreErrorMessage}
                    triggerRef={restoreButtonRef}
                    onClose={() => setShowRestoreError(false)}
                    preferredSide="bottom"
                  />
                )}
                <button
                  ref={exportButtonRef}
                  onClick={handleExportCSS}
                  className="px-3 py-1.5 text-sm rounded-lg font-semibold transition-all hover:brightness-110 active:scale-95"
                  style={{
                    backgroundColor: getEditorThemeValue('--color-secondary'),
                    color: getEditorThemeValue('--color-on-secondary'),
                    border: `2px solid ${getEditorThemeValue('--color-secondary-border')}`
                  }}
                  title={t('exporttooltip')}
                >
                  <FileDown size={16} className="inline mr-1" /> {t('exportbtn')}
                </button>
 

                {showExportSuccess && (
                  <SuccessPopover
                    message={t('exportsuccess')}
                    subMessage={exportPath}
                    triggerRef={exportButtonRef}
                    onClose={() => setShowExportSuccess(false)}
                    preferredSide="bottom"
                  />
                )}

                {showExportError && (
                  <ErrorPopover
                    message={t('exporterror')}
                    errorDetails={exportErrorMessage}
                    triggerRef={exportButtonRef}
                    onClose={() => setShowExportError(false)}
                    preferredSide="bottom"
                  />
                )}

                <button
                  ref={saveButtonRef}
                  onClick={handleSaveChanges}
                  className="px-4 py-1.5 text-sm rounded-lg font-semibold transition-all shadow-lg cursor-pointer flex-shrink-0 hover:brightness-110 active:scale-95"
                  style={{
                    backgroundColor: getEditorThemeValue('--color-primary'),
                    color: getEditorThemeValue('--color-on-primary')
                  }}
                  title={t('savetooltip')}
                >
                  <Save size={16} className="inline mr-1" /> {t('savebtn')}
                </button>

                {showSaveSuccess && (
                  <SuccessPopover
                    message={t('savesuccess')}
                    triggerRef={saveButtonRef}
                    onClose={() => setShowSaveSuccess(false)}
                    preferredSide="bottom"
                  />
                )}

                {showSaveError && (
                  <ErrorPopover
                    message={t('saveerror')}
                    errorDetails={saveErrorMessage}
                    triggerRef={saveButtonRef}
                    onClose={() => setShowSaveError(false)}
                    preferredSide="bottom"
                  />
                )}
              </div>
            </div>

            {/* Indicador de cambios sin guardar */}
            {hasUnsavedChanges && (
              <div
                className="rounded px-3 py-2 text-sm"
                style={{
                  backgroundColor: getEditorThemeValue('--color-warning'),
                  color: getEditorThemeValue('--color-on-warning'),
                  border: `2px solid ${getEditorThemeValue('--color-warning-border')}`
                }}
              >
                {t('unsavedchanges')}
              </div>
            )}
          </div>
        </div>

        {/* Secciones de Variables - cada una con su preview */}
        {Object.entries(themeCategories).map(([categoryName, variables], index) => (
          <section
            key={categoryName}
            className="mb-6 p-4 rounded-lg transition-colors duration-300"
            style={{
              backgroundColor: getEditorThemeValue('--color-surface1'),
              color: getEditorThemeValue('--color-on-surface1')
            }}
          >
            {/* Título de la sección */}
            <div
              className="mb-3 pb-2 border-b-2 transition-colors duration-300"
              style={{ borderColor: getEditorThemeValue('--color-border') }}
            >
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span
                  className="inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: getEditorThemeValue('--color-primary'),
                    color: getEditorThemeValue('--color-on-primary')
                  }}
                >
                  {index + 1}
                </span>
                {getCategoryLabel(categoryName)}
              </h2>
            </div>

            {/* Grid de dos columnas: Variables (izq) + Preview (der) */}
            {/* En pantallas estrechas: 2/3 + 1/3, en lg+: flex + 300px fijo */}
            <div className="grid grid-cols-[2fr_1fr] lg:grid-cols-[1fr_300px] gap-4">
              {/* Columna izquierda: Grid de variables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(variables).map(([varName, label]) => {
                  const currentValue = themeValues[activeEditorTheme]?.[varName] || '#000000';
                  const normalizedValue = normalizeColor(currentValue);

                  return (
                    <div
                      key={varName}
                      className="p-2 rounded transition-all duration-300"
                      style={{
                        backgroundColor: getEditorThemeValue('--color-surface2'),
                        color: getEditorThemeValue('--color-on-surface2')
                      }}
                    >
                      {/* Nombre de la variable */}
                      <div className="mb-1">
                        <div className="font-semibold text-xs truncate" title={label}>{label}</div>
                      </div>

                      {/* Color picker */}
                      <div className="flex items-center gap-2">
                        {/* Cuadrado de color clicable */}
                        <div className="relative">
                          <button
                            onClick={() => handleOpenColorPicker(varName)}
                            className="w-8 h-8 rounded border border-border-color cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: normalizedValue }}
                            title={`${t('clicktoselectcolor')}${varName}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={currentValue}
                            onChange={(e) => handleColorChange(varName, e.target.value)}
                            className="w-full px-1 py-0.5 text-[10px] font-mono border border-border rounded bg-input text-on-input"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Columna derecha: Preview específico de la categoría (siempre visible) */}
              <div
                className="pl-2 lg:pl-4 border-l-2 transition-colors duration-300 min-w-0"
                style={{ borderColor: getEditorThemeValue('--color-border') }}
              >
                {renderCategoryPreview(categoryName)}
              </div>
            </div>
          </section>
        ))}

        {/* Pie de página */}
        <div
          className="mt-8 p-4 rounded-lg text-center transition-colors duration-300"
          style={{
            backgroundColor: getEditorThemeValue('--color-surface1'),
            color: getEditorThemeValue('--color-on-surface1')
          }}
        >
          <p className="text-sm mb-2">
            {t('tiprealtime')}
          </p>
          <p className="text-xs">
            {t('tippermanent')}
          </p>
        </div>

        {/* Modal de selección de colores */}
        <ColorPickerModal
          isOpen={showColorPicker}
          onClose={() => {
            setShowColorPicker(false);
            setEditingVariable(null);
          }}
          onSelect={(hex) => {
            if (editingVariable) {
               handleColorChange(editingVariable, hex);
            }
          }}
          selectedColor={editingVariable ? themeValues[activeEditorTheme]?.[editingVariable] : null}
          t={t}
        />
      </div>
    </div>
  );
};

class ThemeEditorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ThemeEditor Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', backgroundColor: '#991b1b', color: 'white', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>💥 Error Crítico en el Editor de Temas</h1>
          <p style={{ marginBottom: '20px' }}>Por favor, copia este error y envíaselo al asistente de IA:</p>
          <div style={{ backgroundColor: '#450a0a', padding: '20px', borderRadius: '8px', overflowX: 'auto' }}>
            <p style={{ fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
            <pre style={{ marginTop: '10px', fontSize: '12px' }}>{this.state.error && this.state.error.stack}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ThemeEditorWrapper = (props) => (
  <ThemeEditorErrorBoundary>
    <ThemeEditor {...props} />
  </ThemeEditorErrorBoundary>
);

export default ThemeEditorWrapper;


