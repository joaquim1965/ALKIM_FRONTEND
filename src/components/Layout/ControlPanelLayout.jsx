import React, { useState } from 'react';
import { 
  User, 
  Shield, 
  Palette, 
  Globe, 
  Users, 
  Layers, 
  FileText,
  CreditCard,
  AppWindow
} from 'lucide-react';
import { useTmTr } from '../../contexts/TmTrContext';
import ControlPanelLayoutStyled from './ControlPanelLayoutStyled';

/**
 * ControlPanelLayout
 * 
 * Componente ESTÁNDAR para el layout del panel de control.
 * Gestiona la navegación interna y la lógica del sidebar.
 */
const ControlPanelLayout = ({ children, initialSection = 'profile' }) => {
  const { t } = useTmTr('ControlPanel');
  const [activeSection, setActiveSection] = useState(initialSection);

  // Definición de secciones del sidebar (Estructura de datos)
  const sections = [
    {
      title: 'Ajustes',
      items: [
        { id: 'profile', label: 'Mi Perfil', icon: <User size={18} /> },
        { id: 'security', label: 'Seguridad', icon: <Shield size={18} /> },
        { id: 'appearance', label: 'Apariencia', icon: <Palette size={18} /> },
        { id: 'regional', label: 'Regional', icon: <Globe size={18} /> },
        { id: 'billing', label: 'Facturación', icon: <CreditCard size={18} /> },
      ]
    },
    {
      title: 'Administración',
      items: [
        { id: 'users', label: 'Usuarios', icon: <Users size={18} /> },
        { id: 'modules', label: 'Módulos', icon: <Layers size={18} /> },
        { id: 'integrations', label: 'Integraciones', icon: <AppWindow size={18} /> },
        { id: 'logs', label: 'Logs del Sistema', icon: <FileText size={18} /> },
      ]
    }
  ];

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    // Aquí se podría añadir telemetría o persistencia de la sección activa
  };

  return (
    <ControlPanelLayoutStyled
      sections={sections}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      t={t}
    >
      {/* Pasar la sección activa a los hijos si fuera necesario, 
          o usar un contextProvider interno */}
      {typeof children === 'function' 
        ? children({ activeSection }) 
        : React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { activeSection });
            }
            return child;
          })
      }
    </ControlPanelLayoutStyled>
  );
};

export default ControlPanelLayout;
