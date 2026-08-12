/**
 * SectionPreviews.jsx
 *
 * Componentes de preview para cada sección del Theme Editor
 */

import React from 'react';

// Preview para Global y Layout
export const GlobalLayoutPreview = () => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-background">
        <h3 className="font-semibold mb-2">Fondo Principal</h3>
        <p className="text-on-surface1">
          Este es el fondo principal de la aplicación con texto secundario.
        </p>
      </div>

      <div className="p-4 rounded-lg bg-surface2">
        <h3 className="font-semibold mb-2">Fondo Secundario</h3>
        <p className="text-on-surface1">
          Superficies secundarias como tarjetas y paneles.
        </p>
      </div>

      <div className="p-4 rounded-lg border border-border bg-background">
        <div className="inline-block px-3 py-1 rounded bg-primary text-on-primary">
          Color de Acento
        </div>
      </div>
    </div>
  );
};

// Preview para Navbar
export const NavbarPreview = () => {
  return (
    <div className="space-y-4">
      <nav className="p-4 rounded-lg bg-navbar">
        <div className="flex items-center justify-between">
          <div className="font-bold text-on-navbar">Mi App</div>
          <div className="flex gap-4">
            <a href="#" className="text-on-navbar hover:text-accent">Inicio</a>
            <a href="#" className="text-on-navbar font-semibold">Activo</a>
            <a href="#" className="text-on-navbar hover:text-accent">Ayuda</a>
          </div>
        </div>
      </nav>
    </div>
  );
};

// Preview para Botones
export const ButtonsPreview = () => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button className="px-4 py-2 rounded bg-primary text-on-primary hover:bg-primary-hover transition-colors">
          Botón Primario
        </button>
        <button className="px-4 py-2 rounded bg-secondary text-on-secondary border border-secondary-border hover:bg-surface-hover transition-colors">
          Botón Secundario
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="px-3 py-1.5 text-sm rounded bg-primary text-on-primary">
          Pequeño
        </button>
        <button className="px-6 py-3 rounded bg-primary text-on-primary">
          Grande
        </button>
      </div>
    </div>
  );
};

// Preview para Formularios
export const FormsPreview = () => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 text-on-background">
          Nombre
        </label>
        <input
          type="text"
          placeholder="Ingresa tu nombre"
          className="w-full px-3 py-2 rounded border border-input-border bg-input text-on-input focus:border-input-focus-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-on-background">
          Email
        </label>
        <input
          type="email"
          placeholder="correo@ejemplo.com"
          className="w-full px-3 py-2 rounded border border-input-border bg-input text-on-input focus:border-input-focus-border focus:outline-none"
        />
      </div>
    </div>
  );
};

// Preview para Tarjetas y Enlaces
export const CardsLinksPreview = () => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-surface1 border border-border">
        <h3 className="font-semibold mb-2">Tarjeta de Ejemplo</h3>
        <p className="text-on-surface1">
          Esta es una tarjeta con bordes y fondo personalizado.
        </p>
        <a href="#" className="inline-block mt-2 text-link hover:text-link-hover transition-colors">
          Leer más →
        </a>
      </div>

      <div className="p-4 rounded-lg bg-surface2">
        <p>
          Los <a href="#" className="text-link hover:text-link-hover underline">enlaces</a> pueden
          aparecer en <a href="#" className="text-link hover:text-link-hover underline">cualquier parte</a> del texto.
        </p>
      </div>
    </div>
  );
};

// Preview para Tablas
export const TablesPreview = () => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-table-header">
          <tr>
            <th className="px-4 py-2 text-left text-on-table-header">Nombre</th>
            <th className="px-4 py-2 text-left text-on-table-header">Estado</th>
            <th className="px-4 py-2 text-left text-on-table-header">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr className="hover:bg-table-row-hover transition-colors border-b border-border">
            <td className="px-4 py-2">Usuario 1</td>
            <td className="px-4 py-2">Activo</td>
            <td className="px-4 py-2">
              <button className="text-sm text-link">Editar</button>
            </td>
          </tr>
          <tr className="hover:bg-table-row-hover transition-colors border-b border-border">
            <td className="px-4 py-2">Usuario 2</td>
            <td className="px-4 py-2">Inactivo</td>
            <td className="px-4 py-2">
              <button className="text-sm text-link">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Preview para Tabs
export const TabsPreview = () => {
  return (
    <div className="space-y-4">
      <div className="border-b border-border">
        <div className="flex gap-4">
          <button className="px-4 py-2 text-on-tab border-b-2 border-tab-indicator font-medium">
            Pestaña Activa
          </button>
          <button className="px-4 py-2 text-on-tab hover:bg-tab-hover transition-colors">
            Pestaña 2
          </button>
          <button className="px-4 py-2 text-on-tab hover:bg-tab-hover transition-colors">
            Pestaña 3
          </button>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-tab-content">
        <h3 className="font-semibold mb-2">Contenido de la Pestaña</h3>
        <p className="text-on-surface1">
          Este es el contenido de la pestaña activa.
        </p>
      </div>
    </div>
  );
};

// Preview para Modales
export const ModalsPreview = () => {
  return (
    <div className="space-y-4">
      <div className="p-6 rounded-lg bg-surface1 text-on-surface1 shadow-lg border border-border">
        <h3 className="text-lg font-bold mb-2">Título del Modal</h3>
        <p className="text-on-surface1">
          Este es un ejemplo de cómo se ve un modal con el tema actual.
        </p>
        <div className="mt-4 flex gap-2">
          <button className="px-4 py-2 rounded bg-primary text-on-primary">
            Confirmar
          </button>
          <button className="px-4 py-2 rounded bg-secondary text-on-secondary border border-secondary-border">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

// Preview para Estados
export const StatesPreview = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="p-4 rounded-lg bg-success border border-success-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">✓</span>
          <div>
            <div className="font-semibold text-on-success">Éxito</div>
            <div className="text-sm text-on-success">Operación completada</div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-destructive border border-destructive-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">✕</span>
          <div>
            <div className="font-semibold text-on-destructive">Error</div>
            <div className="text-sm text-on-destructive">Algo salió mal</div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-warning border border-warning-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚠</span>
          <div>
            <div className="font-semibold text-on-warning">Advertencia</div>
            <div className="text-sm text-on-warning">Revisa esto</div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-info border border-info-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">ℹ</span>
          <div>
            <div className="font-semibold text-on-info">Información</div>
            <div className="text-sm text-on-info">Dato importante</div>
          </div>
        </div>
      </div>
    </div>
  );
};
