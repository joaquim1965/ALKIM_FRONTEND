/**
 * UI/Modal.jsx
 *
 * COMPONENTE UNIFICADO DE MODAL
 * Contiene dos versiones exportadas del modal:
 *
 *   • ModalRaw  → Lógica pura (Escape, scroll lock, backdrop, accesibilidad). Sin clases de color.
 *   • Modal     → Componente estilizado que envuelve ModalRaw con clases utility CSS Variables.
 *
 * CARACTERÍSTICAS:
 * ✅ Tamaños: sm, md, lg, xl, full
 * ✅ Cierre con Escape, click en backdrop, o botón X
 * ✅ Previene scroll del body cuando está abierto
 * ✅ Header, body y footer configurables
 * ✅ Accesibilidad: ARIA dialog, focus management
 *
 * USO:
 * import Modal from '@/components/UI/Modal';
 * import { ModalRaw } from '@/components/UI/Modal';
 *
 * <Modal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Confirm Action"
 *   footer={<><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button onClick={onConfirm}>Confirm</Button></>}
 * >
 *   <p>Are you sure you want to proceed?</p>
 * </Modal>
 */

import React, { useEffect } from 'react';

// ══════════════════════════════════════════════════
// 📦 CONFIGURACIONES DE ESTILO (usadas por Modal)
// ══════════════════════════════════════════════════

/** Tamaños del modal */
const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-full mx-4',
};

// ══════════════════════════════════════════════════
// 🔩 MODALRAW — Lógica pura, estructura semántica
// ══════════════════════════════════════════════════

/**
 * ModalRaw
 *
 * Componente funcional "desnudo". Gestiona el comportamiento del modal
 * (Escape, scroll lock, backdrop click) y la estructura semántica completa
 * sin aplicar clases de color. Úsalo para construir modales personalizados
 * pasando clases externas vía `className` y `overlayClassName`.
 *
 * @param {object}           props
 * @param {boolean}          props.isOpen              - Si el modal está abierto
 * @param {Function}         props.onClose             - Callback al cerrar
 * @param {string}          [props.title]              - Título del modal
 * @param {React.ReactNode}  props.children            - Contenido (body)
 * @param {React.ReactNode} [props.footer]             - Footer (botones de acción)
 * @param {string}          [props.size="md"]          - Tamaño (sm, md, lg, xl, full)
 * @param {boolean}         [props.closeOnBackdrop=true] - Cerrar al clic en backdrop
 * @param {boolean}         [props.closeOnEscape=true]  - Cerrar con Escape
 * @param {boolean}         [props.showCloseButton=true]- Mostrar botón X
 * @param {string}          [props.className]          - Clases adicionales para el contenedor
 */
export function ModalRaw({
  isOpen = false,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}) {
  // ─── Cerrar con tecla Escape ───
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // ─── Prevenir scroll del body ───
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const containerClasses = [
    sizeClasses[size] || sizeClasses.md,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="modal-overlay">
      {/* Backdrop */}
      <div
        className="modal-backdrop"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Modal Container */}
      <div
        className={`modal-container ${containerClasses}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && (
              <h2 id="modal-title" className="modal-title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="modal-close-button"
                aria-label="Cerrar modal"
                type="button"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🎨 MODAL — Componente estilizado (alias de ModalRaw con defaults)
// ══════════════════════════════════════════════════

/**
 * Modal
 *
 * Componente estilizado completo. En este caso actúa como alias de ModalRaw
 * ya que el estilo se aplica mediante las clases utility del sistema
 * (modal-overlay, modal-container, etc.) definidas en utilities.css.
 *
 * @param {object}           props
 * @param {boolean}          props.isOpen              - Si el modal está abierto
 * @param {Function}         props.onClose             - Callback al cerrar
 * @param {string}          [props.title]              - Título del modal
 * @param {React.ReactNode}  props.children            - Contenido (body)
 * @param {React.ReactNode} [props.footer]             - Footer (botones de acción)
 * @param {string}          [props.size="md"]          - Tamaño (sm, md, lg, xl, full)
 * @param {boolean}         [props.closeOnBackdrop=true]
 * @param {boolean}         [props.closeOnEscape=true]
 * @param {boolean}         [props.showCloseButton=true]
 * @param {string}          [props.className]
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}) {
  return (
    <ModalRaw
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size={size}
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape={closeOnEscape}
      showCloseButton={showCloseButton}
      className={className}
    >
      {children}
    </ModalRaw>
  );
}

export default Modal;
