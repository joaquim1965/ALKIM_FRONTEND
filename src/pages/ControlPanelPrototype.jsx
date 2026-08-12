import React from 'react';
import ControlPanelLayout from '../components/Layout/ControlPanelLayout';
import AccountSettings from '../components/Settings/AccountSettings';

/**
 * ControlPanelPrototype
 * 
 * Página de prototipo para visualizar el nuevo panel de control 
 * con diseño estilo Notion y los campos solicitados.
 */
const ControlPanelPrototype = () => {
  return (
    <ControlPanelLayout initialSection="profile">
      {(props) => {
        const { activeSection } = props;
        
        // Renderizado condicional del contenido basado en la sección activa
        switch (activeSection) {
          case 'profile':
            return <AccountSettings />;
          
          case 'security':
          case 'appearance':
          case 'regional':
          case 'billing':
          case 'users':
          case 'modules':
          case 'integrations':
          case 'logs':
            return (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-4 bg-surface2 rounded-full text-secondary border border-border">
                  <span className="text-4xl">🏗️</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-on-background capitalize">
                    Sección {activeSection}
                  </h3>
                  <p className="text-secondary mt-1 max-w-xs">
                    Esta sección está en construcción para el prototipo visual.
                  </p>
                </div>
              </div>
            );
            
          default:
            return <AccountSettings />;
        }
      }}
    </ControlPanelLayout>
  );
};

export default ControlPanelPrototype;
