/**
 * UI/Tabs.jsx
 *
 * COMPONENTE DE TABS PREMIUM
 * Soporta orientación horizontal y vertical con un diseño moderno.
 * Utiliza variables de tema de colors.css.
 */

import React, { useState, useEffect, useRef } from 'react';

/**
 * @param {object} props
 * @param {Array}  props.tabs        - Array de { id, label, content, icon?, disabled? }
 * @param {string} props.orientation - 'horizontal' | 'vertical'
 * @param {string} props.defaultTab  - ID del tab inicial
 * @param {string} props.className   - Clases adicionales para el contenedor
 * @param {Function} props.onChange  - Callback al cambiar de tab
 */
export const Tabs = ({
  tabs = [],
  orientation = 'horizontal',
  defaultTab,
  className = '',
  onChange
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef([]);
  const containerRef = useRef(null);

  const isVertical = orientation === 'vertical';

  useEffect(() => {
    const activeIndex = tabs.findIndex(t => t.id === activeTab);
    const tabEl = tabsRef.current[activeIndex];

    if (tabEl) {
      if (isVertical) {
        setIndicatorStyle({
          top: tabEl.offsetTop,
          height: tabEl.offsetHeight,
          width: '4px',
          left: 0
        });
      } else {
        setIndicatorStyle({
          left: tabEl.offsetLeft,
          width: tabEl.offsetWidth,
          height: '4px',
          bottom: 0
        });
      }
    } else {
      setIndicatorStyle({ display: 'none' }); // Ocultar si no se encuentra
    }
  }, [activeTab, isVertical, tabs]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (onChange) onChange(tabId);
  };

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className={`flex ${isVertical ? 'flex-row gap-6' : 'flex-col'} ${className}`}>
      {/* Tab List */}
      <div
        ref={containerRef}
        className={`relative flex ${isVertical ? 'flex-col border-r border-border' : 'flex-row border-b border-border'} shrink-0`}
        role="tablist"
      >
        {/* Animated Indicator */}
        <div
          className="absolute bg-tab-indicator rounded-full transition-all duration-300 ease-in-out z-10"
          style={{
            ...indicatorStyle,
            backgroundColor: 'var(--color-tab-indicator)'
          }}
        />

        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.id}
              ref={el => tabsRef.current[index] = el}
              role="tab"
              aria-selected={isActive}
              disabled={isDisabled}
              onClick={() => !isDisabled && handleTabClick(tab.id)}
              className={`
                relative px-6 py-4 text-sm font-bold transition-all duration-300
                flex items-center gap-3 outline-none border-b border-border/50
                ${isVertical ? 'text-left justify-start border-r border-transparent' : 'text-center flex-col md:flex-row'}
                ${isActive 
                  ? 'text-on-tab-hover bg-tab-hover' 
                  : 'text-on-tab hover:text-on-tab-hover hover:bg-tab-hover'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>

            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className={`flex-1 min-w-0 animate-fade-in ${isVertical ? '' : 'mt-4'}`}>
        {activeTabData?.content}
      </div>
    </div>
  );
};

export default Tabs;

