/**
 * TermsModal.jsx
 *
 * Modal para mostrar los Términos y Condiciones
 * Incluye scroll, navegación por secciones y animaciones
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

/**
 * @param {object} props - Propiedades del componente
 * @param {boolean} props.isOpen - Si el modal está abierto
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {object} props.terms - Objeto con los términos (title, sections, etc.)
 */
export function TermsModal({ isOpen, onClose, terms }) {
  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black" />

      {/* Modal */}
      <div
        className="relative bg-surface1 rounded-lg shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2
              id="terms-modal-title"
              className="text-2xl font-bold text-on-surface1"
            >
              {terms.title}
            </h2>
            <p className="text-sm text-on-surface1 mt-1">
              {terms.lastUpdate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-on-surface1"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {terms.sections.map((section, index) => (
            <section key={index} className="space-y-3">
              <h3 className="text-lg font-bold text-on-surface1 sticky top-0 bg-surface1 py-2 z-10">
                {section.title}
              </h3>
              <div className="text-on-surface1 leading-relaxed whitespace-pre-line text-sm">
                {section.content}
              </div>
            </section>
          ))}

          {/* Fecha efectiva */}
          {terms.effectiveDate && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-on-surface1 italic">
                {terms.effectiveDate}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TermsModal;
