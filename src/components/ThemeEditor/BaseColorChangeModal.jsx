/**
 * BaseColorChangeModal.jsx
 *
 * Modal de confirmación al cambiar el Color Base Global
 * Ofrece dos opciones:
 * - Aplicar a todo: modifica todas las variables que usan color base
 * - Solo actuales: solo cambia el color base sin afectar variables personalizadas
 */

import React from 'react';

const BaseColorChangeModal = ({ isOpen, onClose, onApplyToAll, onApplyToBase, newColor }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl shadow-shadow max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          Cambiar Color Base
        </h2>

        <div className="mb-6">
          <p className="text-sm text-on-surface1 mb-4">
            Has seleccionado un nuevo Color Base:
          </p>

          <div className="flex items-center gap-3 p-3 rounded border border-border">
            <div
              className="w-12 h-12 rounded border-2 border-white shadow-sm shadow-shadow"
              style={{ backgroundColor: newColor?.hex }}
            />
            <div>
              <div className="font-semibold">
                {newColor?.family}-{newColor?.tone}
              </div>
              <div className="text-xs text-on-surface1 font-mono">
                {newColor?.hex}
              </div>
            </div>
          </div>

          <p className="text-sm text-on-surface1 mt-4">
            ¿Cómo quieres aplicar este cambio?
          </p>
        </div>

        <div className="space-y-3">
          {/* Aplicar a todo */}
          <button
            onClick={onApplyToAll}
            className="w-full text-left p-4 rounded-lg border-2 border-border hover:bg-surface-hover transition-all"
          >
            <div className="font-semibold mb-1">
              ✅ Aplicar a todo
            </div>
            <div className="text-sm text-on-surface1">
              Actualiza todas las variables que usan Color Base (recomendado)
            </div>
          </button>

          {/* Solo actuales */}
          <button
            onClick={onApplyToBase}
            className="w-full text-left p-4 rounded-lg border-2 border-border hover:bg-surface-hover transition-all"
          >
            <div className="font-semibold mb-1">
              ⚠️ Solo Color Base
            </div>
            <div className="text-sm text-on-surface1">
              Cambia solo el Color Base, sin afectar variables con colores personalizados
            </div>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-secondary text-on-secondary hover:bg-secondary-hover transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BaseColorChangeModal;
