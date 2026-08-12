/**
 * CssVarsDemo.jsx
 *
 * Página de demostración visual que muestra cómo funcionan las CSS Variables
 * en tiempo real.
 */

import React, { useState } from 'react';
import { useTmTr } from '../contexts/TmTrContext';

const translations = new Proxy({}, { get: (_, prop) => prop });


function CssVarsDemo() {
  const { theme, t } = useTmTr('CssVarsDemo');
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-background pt-20 px-4">
      <div className="max-w-6xl mx-auto py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('Parrafo1')}</h1>
          <p className="text-on-surface1">
            {t('Parrafo2')}
          </p>
        </div>

        {/* Current Theme Indicator */}
        <div className="bg-surface1 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold">{t('TemaActual')}</span>
              <span className="ml-2 px-3 py-1 rounded bg-primary text-on-primary">
                {theme}
              </span>
            </div>
            <button
              onClick={() => setShowCode(!showCode)}
              className="bg-secondary text-on-secondary border border-secondary-border px-4 py-2 rounded hover:bg-secondary-hover"
            >
              {showCode ? t('Ocultar') : t('Ver')} {t('CódigoCss')}
            </button>
          </div>

          {showCode && (
            <div className="mt-4 p-4 bg-black text-green-400 rounded font-mono text-sm overflow-x-auto">
              <pre>{`<!-- HTML -->
<html data-theme="${theme}">
  <button class="bg-primary-bg">
    Save
  </button>
</html>

/* CSS Variables activas en data-theme="${theme}" */
--color-primary-bg: ${theme === 'light' ? '#2563eb' : theme === 'dark' ? '#3b82f6' : '#ffff00'}
--color-text-primary: ${theme === 'light' ? '#0f172a' : theme === 'dark' ? '#e5e7eb' : '#ffffff'}
--color-background-primary: ${theme === 'light' ? '#ffffff' : theme === 'dark' ? '#0b1020' : '#000000'}

/* Clase Tailwind generada */
.bg-primary-bg {
  background-color: var(--color-primary-bg);
}
              `}</pre>
            </div>
          )}
        </div>

        {/* Grid de Ejemplos */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Ejemplo 1: Botones */}
          <div className="bg-surface2 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">{t('1Botones')}</h3>
            <div className="space-y-3">
              <button className="bg-primary text-on-primary hover:bg-primary-hover px-4 py-2 rounded w-full">
                {t('Parrafo3')}
              </button>
              <button className="bg-secondary text-on-secondary border border-secondary-border hover:bg-secondary-hover px-4 py-2 rounded w-full">
                {t('Parrafo4')}
              </button>
            </div>
            <div className="mt-4 p-3 bg-surface1 rounded text-sm font-mono">
              className="bg-primary text-on-primary"
            </div>
          </div>

          {/* Ejemplo 2: Inputs */}
          <div className="bg-surface2 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">{t('2Inputs')}</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder={t('InputNormal')}
                className="bg-input text-on-input border border-input-border focus:border-input-focus-border px-3 py-2 rounded w-full"
              />
              <input
                type="text"
                placeholder={t('Parrafo5')}
                className="bg-input text-on-input border border-input-invalid-border px-3 py-2 rounded w-full"
              />
            </div>
            <div className="mt-4 p-3 bg-surface1 rounded text-sm font-mono">
              className="bg-input text-on-input border-input-border"
            </div>
          </div>

          {/* Ejemplo 3: Elevación */}
          <div className="bg-surface2 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">{t('Parrafo2')}</h3>
            <div className="space-y-2">
              <div className="bg-background p-3 rounded">
                {t('Parrafo7')}
              </div>
              <div className="bg-surface1 p-3 rounded">
                {t('Parrafo8')}
              </div>
              <div className="bg-surface2 p-3 rounded border border-border">
                {t('Parrafo9')}
              </div>
            </div>
            <div className="mt-4 p-3 bg-surface1 rounded text-sm font-mono">
              className="bg-surface1"
            </div>
          </div>

          {/* Ejemplo 4: Estados */}
          <div className="bg-surface2 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">{t('Parrafo10')}</h3>
            <div className="space-y-2">
              <div className="bg-success text-on-success border border-success-border p-3 rounded">
                {t('SuccessBgsuccess')}
              </div>
              <div className="bg-destructive text-on-destructive border border-destructive-border p-3 rounded">
                {t('ErrorBgdestructive')}
              </div>
              <div className="bg-warning text-on-warning border border-warning-border p-3 rounded">
                {t('WarningBgwarning')}
              </div>
              <div className="bg-info text-on-info border border-info-border p-3 rounded">
                {t('InfoBginfo')}
              </div>
            </div>
            <div className="mt-4 p-3 bg-surface1 rounded text-sm font-mono">
              className="bg-success text-on-success"
            </div>
          </div>

          {/* Ejemplo 5: Card */}
          <div className="bg-surface2 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">{t('Parrafo11')}</h3>
            <div className="bg-surface1 border border-border p-4 rounded-lg shadow-sm shadow-shadow">
              <h4 className="font-bold mb-2">{t('CardTitle')}</h4>
              <p className="text-on-surface1">
                {t('Parrafo2')}
              </p>
              <div className="flex gap-2 mt-4">
                <button className="bg-primary text-on-primary hover:bg-primary-hover px-3 py-1 rounded text-sm">
                  {t('Action')}
                </button>
                <button className="bg-secondary text-on-secondary border border-secondary-border hover:bg-secondary-hover px-3 py-1 rounded text-sm">
                  {t('Cancel')}
                </button>
              </div>
            </div>
            <div className="mt-4 p-3 bg-surface1 rounded text-sm font-mono">
              className="bg-surface1 border-border"
            </div>
          </div>

          {/* Ejemplo 6: Tabla */}
          <div className="bg-surface2 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">{t('6Tabla')}</h3>
            <table className="w-full text-sm">
              <thead className="bg-table-header">
                <tr>
                  <th className="text-on-table-header text-left p-2">{t('Name')}</th>
                  <th className="text-on-table-header text-left p-2">{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-table-row-hover">
                  <td className="p-2">{t('Item1')}</td>
                  <td className="p-2">{t('Active')}</td>
                </tr>
                <tr className="bg-table-row-striped hover:bg-table-row-hover">
                  <td className="p-2">{t('Item2')}</td>
                  <td className="p-2">{t('Pending')}</td>
                </tr>
                <tr className="hover:bg-table-row-hover">
                  <td className="p-2">{t('Item3')}</td>
                  <td className="p-2">{t('Active')}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-4 p-3 bg-surface1 rounded text-sm font-mono">
              className="bg-table-header"
            </div>
          </div>

        </div>

        {/* Explicación */}
        <div className="bg-surface1 p-6 rounded-lg mt-6">
          <h3 className="text-xl font-bold mb-4">{t('CómoFunciona')}</h3>
          <div className="space-y-3">
            <div className="bg-info text-on-info border border-info-border p-4 rounded">
              <strong>{t('Parrafo2')}</strong> {t('Parrafo2')}
            </div>
            <div className="bg-info text-on-info border border-info-border p-4 rounded">
              <strong>{t('Parrafo2')}</strong> {t('Parrafo2')}
            </div>
            <div className="bg-info text-on-info border border-info-border p-4 rounded">
              <strong>{t('Parrafo2')}</strong> {t('Parrafo2')}
            </div>
            <div className="bg-info text-on-info border border-info-border p-4 rounded">
              <strong>{t('Parrafo2')}</strong> {t('Parrafo2')}
            </div>
            <div className="bg-success text-on-success border border-success-border p-4 rounded">
              <strong>{t('Resultado')}</strong> {t('Parrafo2')}
            </div>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-warning text-on-warning border border-warning-border p-6 rounded-lg mt-6">
          <h3 className="text-xl font-bold mb-2">{t('PruébaloAhora')}</h3>
          <p>
            {t('Parrafo2')}
          </p>
        </div>

      </div>
    </div>
  );
}

export default CssVarsDemo;

