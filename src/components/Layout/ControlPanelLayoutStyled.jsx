import React from 'react';

/**
 * ControlPanelLayoutStyled
 * 
 * Versión ESTILIZADA del layout del panel de control.
 * Implementa la estética estilo Notion con Tailwind CSS.
 */
const ControlPanelLayoutStyled = ({ 
  sections, 
  activeSection, 
  onSectionChange, 
  children,
  t 
}) => {
  return (
    <div className="flex bg-background min-h-[calc(100vh-64px)] animate-fade-in">
      {/* Sidebar Interno (Notion-style) */}
      <aside className="w-64 border-r border-border bg-surface1 p-4 hidden md:flex flex-col gap-6">
        {sections.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="px-3 text-[11px] font-bold text-secondary uppercase tracking-widest">
              {t(group.title) || group.title}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-all duration-200
                      ${isActive 
                        ? 'bg-surface-hover text-on-surface-hover font-medium shadow-sm' 
                        : 'text-on-surface1 hover:bg-surface-hover'}
                    `}
                  >
                    <span className={`${isActive ? 'text-primary' : 'text-secondary'}`}>
                      {item.icon}
                    </span>
                    {t(item.label) || item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ControlPanelLayoutStyled;
