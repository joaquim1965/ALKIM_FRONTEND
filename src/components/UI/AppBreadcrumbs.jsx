import React from 'react';
import { useLocation } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';

const ROUTE_BREADCRUMBS = {
  '/tesoreria/movimientos': [{ label: 'Tesorería' }, { label: 'Movimientos' }],
  '/muestra': [{ label: 'Pruebas' }, { label: 'Muestra' }],
  '/mockup-user': [{ label: 'Pruebas' }, { label: 'Vista de usuario' }],
  '/colorslist': [{ label: 'Pruebas' }, { label: 'Paleta de colores' }],
  '/cssvars': [{ label: 'Pruebas' }, { label: 'Variables CSS' }],
  '/conta/ingresos': [{ label: 'Contabilidad' }, { label: 'Ingresos' }],
  '/conta/gastos': [{ label: 'Contabilidad' }, { label: 'Gastos' }],
  '/conta/bancos': [{ label: 'Contabilidad' }, { label: 'Bancos' }],
  '/procesos/conciliacion': [{ label: 'Procesos' }, { label: 'Conciliación bancaria' }],
  '/tesoreria/extractos': [{ label: 'Tesorería' }, { label: 'Extractos' }],
  '/tesoreria/extractos/logs': [{ label: 'Tesorería' }, { label: 'Extractos', path: '/tesoreria/extractos' }, { label: 'Historial' }],
  '/documentacion': [{ label: 'Documentación' }, { label: 'Archivos' }],
  '/sql-console': [{ label: 'Administración' }, { label: 'Consola SQL' }],
  '/themeeditor': [{ label: 'Personalización' }, { label: 'Temas' }],
  '/coloreditor': [{ label: 'Personalización' }, { label: 'Colores' }],
  '/verify-phone': [{ label: 'Cuenta' }, { label: 'Verificación de teléfono' }],
  '/sessions': [{ label: 'Cuenta' }, { label: 'Sesiones' }],
  '/settings': [{ label: 'Cuenta' }, { label: 'Configuración' }],
  '/control-panel': [{ label: 'Administración' }, { label: 'Panel de control' }],
  '/control-panel-prototype': [{ label: 'Pruebas' }, { label: 'Panel de control' }],
};

const AppBreadcrumbs = () => {
  const { pathname } = useLocation();
  const items = ROUTE_BREADCRUMBS[pathname];

  if (!items) return null;
  return <Breadcrumb items={items} />;
};

export default AppBreadcrumbs;
