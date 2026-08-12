/**
 * UI/Tabsv1.jsx
 *
 * COMPONENTE UNIFICADO DE TABS V1 (versión avanzada con themeConfig)
 * Contiene dos versiones exportadas:
 *
 *   • TabsRawV1 → Lógica pura (tabs array de strings, content array, themeConfig, variantes).
 *   • TabsV1    → Componente estilizado con auto-themeConfig usando CSS Variables.
 *
 * CARACTERÍSTICAS:
 * ✅ Tabs como array de strings (títulos), content como array de ReactNode
 * ✅ Variantes: default, pills, underline
 * ✅ Modo controlado y no controlado
 * ✅ Height mínima configurable del contenido
 * ✅ Lazy rendering (solo renderiza el tab activo)
 * ✅ Navegación por teclado
 * ✅ themeConfig personalizable
 *
 * USO:
 * import TabsV1 from '@/components/UI/Tabsv1';
 * import { TabsRawV1 } from '@/components/UI/Tabsv1';
 *
 * <TabsV1
 *   tabs={['General', 'Avanzado', 'Acerca de']}
 *   content={[<div>General</div>, <div>Avanzado</div>, <div>Acerca de</div>]}
 * />
 *
 * // Con variante pills
 * <TabsV1 tabs={['Tab 1', 'Tab 2']} content={[...]} variant="pills" />
 */

import React, { useState, useRef } from 'react';

// ══════════════════════════════════════════════════
// 📦 CONFIGURACIONES PREDEFINIDAS
// ══════════════════════════════════════════════════

const minHeightClasses = {
  auto: 'min-h-fit',
  small: 'min-h-[300px]',
  medium: 'min-h-[600px]',
  large: 'min-h-[1000px]',
};

const defaultTheme = {
  tabActiveBg: 'bg-blue-100',
  tabActiveText: 'text-blue-900',
  tabActiveBorder: 'border-blue-500',
  tabInactiveBg: 'bg-gray-50',
  tabInactiveText: 'text-gray-700',
  tabInactiveBorder: 'border-gray-300',
  tabHover: 'hover:bg-gray-100',
  contentBg: 'bg-white',
  contentText: 'text-gray-900',
  borderColor: 'border-gray-300',
  errorBg: 'bg-red-50',
  errorText: 'text-red-600',
  errorBorder: 'border-red-300',
};

const variantStyles = {
  default: {
    tab: 'border-4 rounded-t-xl',
    tabActive: 'border-b-0',
    content: 'border-4 border-t-0 rounded-b-xl',
    separator: 'border-b-4',
  },
  pills: {
    tab: 'rounded-full px-6',
    tabActive: '',
    content: 'border-b-2 pt-4',
    separator: '',
  },
  underline: {
    tab: 'border-b-2 border-transparent rounded-none',
    tabActive: 'border-b-2',
    content: 'pt-4',
    separator: '',
  },
};

// ══════════════════════════════════════════════════
// 🔩 TABSRAWV1 — Lógica pura, themeConfig externo
// ══════════════════════════════════════════════════

/**
 * TabsRawV1
 *
 * Componente funcional "desnudo". Gestiona el estado, variantes y navegación
 * por teclado. Los colores se configuran íntegramente vía `themeConfig`.
 *
 * @param {object}         props
 * @param {string[]}       props.tabs                  - Títulos de las pestañas
 * @param {ReactNode[]}    props.content               - Contenidos de las pestañas
 * @param {number}        [props.defaultActiveTab=0]   - Índice inicial
 * @param {number}        [props.activeTab]            - Índice controlado externamente
 * @param {Function}      [props.onTabChange]          - Callback de cambio
 * @param {string}        [props.minContentHeight]     - Altura mínima (auto, small, medium, large)
 * @param {string}        [props.variant="default"]    - Variante (default, pills, underline)
 * @param {boolean}       [props.lazy=false]           - Solo renderiza el tab activo
 * @param {boolean}       [props.disableKeyboard=false]- Desactiva navegación por teclado
 * @param {object}        [props.themeConfig]          - Configuración de tema (clases Tailwind)
 * @param {string}        [props.className]            - Clases para el contenedor
 * @param {string}        [props.tabsClassName]        - Clases para la barra de tabs
 * @param {string}        [props.contentClassName]     - Clases para el área de contenido
 * @param {...any}         props.rest                  - Props HTML adicionales
 */
export function TabsRawV1({
  tabs,
  content,
  defaultActiveTab = 0,
  activeTab: controlledActiveTab,
  onTabChange,
  minContentHeight = 'medium',
  variant = 'default',
  lazy = false,
  disableKeyboard = false,
  themeConfig = null,
  className = '',
  tabsClassName = '',
  contentClassName = '',
  ...rest
}) {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultActiveTab);
  const tabsRef = useRef([]);

  const isControlled = controlledActiveTab !== undefined;
  const activeTab = isControlled ? controlledActiveTab : internalActiveTab;
  const theme = themeConfig || defaultTheme;

  // Validaciones
  if (!tabs || !content || tabs.length === 0 || content.length === 0) {
    return (
      <div
        className={`p-4 rounded border ${theme.errorBg} ${theme.errorText} ${theme.errorBorder}`}
        role="alert"
      >
        <strong>Error:</strong> Tabs o content no son válidos o están vacíos.
      </div>
    );
  }

  if (tabs.length !== content.length) {
    return (
      <div
        className={`p-4 rounded border ${theme.errorBg} ${theme.errorText} ${theme.errorBorder}`}
        role="alert"
      >
        <strong>Error:</strong> El número de pestañas ({tabs.length}) y contenido ({content.length}) no coincide.
      </div>
    );
  }

  const handleTabClick = (index) => {
    if (isControlled) {
      onTabChange?.(index);
    } else {
      setInternalActiveTab(index);
    }
  };

  const handleKeyDown = (e, index) => {
    if (disableKeyboard) return;
    const key = e.key;
    let newIndex = null;
    if (key === 'ArrowRight') newIndex = (index + 1) % tabs.length;
    else if (key === 'ArrowLeft') newIndex = (index - 1 + tabs.length) % tabs.length;
    else if (key === 'Home') newIndex = 0;
    else if (key === 'End') newIndex = tabs.length - 1;

    if (newIndex !== null) {
      e.preventDefault();
      handleTabClick(newIndex);
      tabsRef.current[newIndex]?.focus();
    }
  };

  const styles = variantStyles[variant] || variantStyles.default;
  const heightClass = minHeightClasses[minContentHeight] || '';
  const heightStyle = heightClass === '' ? { minHeight: minContentHeight } : {};

  return (
    <div className={`tabs-container ${className}`} {...rest}>
      {/* Barra de pestañas */}
      <div className={`flex ${tabsClassName}`} role="tablist" aria-label="Pestañas">
        {tabs.map((tab, index) => {
          const isActive = activeTab === index;
          return (
            <button
              key={index}
              ref={(el) => (tabsRef.current[index] = el)}
              onClick={() => handleTabClick(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                py-2 px-4
                focus:outline-none focus:ring-2 focus:ring-blue-500
                transition duration-200 ease-in-out
                text-sm font-medium
                ${styles.tab}
                ${theme.borderColor}
                ${isActive
                  ? `${theme.tabActiveBg} ${theme.tabActiveText} ${theme.tabActiveBorder} ${styles.tabActive}`
                  : `${theme.tabInactiveBg} ${theme.tabInactiveText} ${theme.tabInactiveBorder} ${theme.tabHover}`
                }
              `}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${index}`}
              tabIndex={isActive ? 0 : -1}
              aria-label={`Ir a la pestaña ${tab}`}
            >
              {tab}
            </button>
          );
        })}

        {/* Línea de relleno para variant default */}
        {variant === 'default' && (
          <div className={`flex-grow ${styles.separator} ${theme.borderColor}`} />
        )}
      </div>

      {/* Área de contenido */}
      <div
        className={`
          ${heightClass}
          ${styles.content}
          ${theme.contentBg}
          ${theme.contentText}
          ${theme.borderColor}
          p-4
          ${contentClassName}
        `}
        style={heightStyle}
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {lazy ? (
          content[activeTab]
        ) : (
          content.map((item, index) => (
            <div key={index} style={{ display: index === activeTab ? 'block' : 'none' }}>
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🎨 TABSV1 — Componente estilizado con auto-themeConfig
// ══════════════════════════════════════════════════

/**
 * TabsV1
 *
 * Componente estilizado. Genera automáticamente un themeConfig con clases
 * Tailwind que consumen CSS Variables del sistema de diseño, manteniendo
 * la compatibilidad visual con el tema activo.
 *
 * @param {object}      props
 * @param {string[]}    props.tabs           - Títulos de las pestañas
 * @param {ReactNode[]} props.content        - Contenidos de las pestañas
 * @param {object}     [props.themeConfig]   - Override manual del tema (opcional)
 * @param {string}     [props.variant]       - Variante (default, pills, underline)
 * @param {...any}      props.rest           - Resto de props de TabsRawV1
 */
export function TabsV1({ tabs, content, themeConfig, variant = 'default', ...rest }) {
  const autoThemeConfig = !themeConfig
    ? {
      tabActiveBg: 'bg-tab',
      tabActiveText: 'text-on-tab',
      tabActiveBorder: 'border-border',
      tabActiveHover: 'hover:bg-tab-hover',
      tabInactiveBg: 'bg-tab',
      tabInactiveText: 'text-on-tab',
      tabInactiveBorder: 'border-border',
      tabInactiveHover: 'hover:bg-tab-hover',
      tabHover: 'hover:bg-tab-hover',
      contentBg: 'bg-tab-content',
      contentText: 'text-on-background',
      borderColor: 'border-border',
      errorBg: 'bg-destructive',
      errorText: 'text-on-destructive',
      errorBorder: 'border-destructive-border',
    }
    : undefined;

  return (
    <TabsRawV1
      tabs={tabs}
      content={content}
      variant={variant}
      themeConfig={themeConfig || autoThemeConfig}
      {...rest}
    />
  );
}

export default TabsV1;
