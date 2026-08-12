/**
 * UI/Card.jsx
 *
 * COMPONENTE UNIFICADO DE CARD
 *
 *   • CardRaw  → Estructura y lógica (header, footer, imagen, accesibilidad) sin estilo de variante.
 *   • Card     → Componente estilizado con sombra, padding y hover usando CSS Variables.
 *
 * USO:
 * import Card, { CardRaw } from '@/components/UI/Card';
 *
 * <Card header="Título" footer={<button>Action</button>} hoverable>
 *   <p>Cuerpo de la card</p>
 * </Card>
 */

import React from 'react';

// ══════════════════════════════════════════════════
// 📦 CONFIGURACIONES DE ESTILO (usadas por Card)
// ══════════════════════════════════════════════════

const paddingClasses = {
  none: '',
  sm: 'p-[var(--space-3)]',
  md: 'p-[var(--space-4)]',
  lg: 'p-[var(--space-6)]',
  xl: 'p-[var(--space-8)]',
};

const shadowClasses = {
  none: 'shadow-none',
  sm: 'shadow-sm shadow-shadow',
  md: 'shadow-md shadow-shadow',
  lg: 'shadow-lg shadow-shadow',
  xl: 'shadow-xl shadow-shadow',
};

// ══════════════════════════════════════════════════
// 🔩 CARDRAW — Estructura pura, sin estilo de variante
// ══════════════════════════════════════════════════

/**
 * CardRaw
 *
 * Estructura de card sin estilos de color/sombra. Úsalo como base
 * para layouts personalizados pasando clases vía `className`.
 *
 * @param {object}           props
 * @param {React.ReactNode}  props.children          - Contenido (body)
 * @param {React.ReactNode} [props.header]           - Contenido del header
 * @param {React.ReactNode} [props.footer]           - Contenido del footer
 * @param {string}          [props.image]            - URL de imagen (top)
 * @param {string}          [props.imageAlt=""]      - Alt text de la imagen
 * @param {boolean}         [props.clickable=false]  - Cursor pointer
 * @param {Function}        [props.onClick]          - Callback onClick
 * @param {string}          [props.headerClassName]  - Clases extra del header
 * @param {string}          [props.bodyClassName]    - Clases extra del body
 * @param {string}          [props.footerClassName]  - Clases extra del footer
 * @param {string}          [props.className]        - Clases CSS del contenedor
 * @param {...any}           props.rest              - Props HTML nativas de div
 */
export function CardRaw({
  children,
  header = null,
  footer = null,
  image = null,
  imageAlt = '',
  clickable = false,
  onClick,
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  className = '',
  ...rest
}) {
  const isInteractive = clickable || !!onClick;

  return (
    <div
      className={['rounded-lg overflow-hidden', className].filter(Boolean).join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); }
      } : undefined}
      style={isInteractive ? { cursor: 'pointer' } : undefined}
      {...rest}
    >
      {image && (
        <div className="w-full">
          <img src={image} alt={imageAlt} className="w-full h-48 object-cover" />
        </div>
      )}

      {header && (
        <div className={[
          'px-[var(--space-6)] py-[var(--space-4)]',
          'border-b border-border bg-surface1 text-on-surface1 font-semibold',
          headerClassName
        ].filter(Boolean).join(' ')}>
          {header}
        </div>
      )}

      <div className={bodyClassName}>
        {children}
      </div>

      {footer && (
        <div className={[
          'px-[var(--space-6)] py-[var(--space-4)]',
          'border-t border-border bg-surface1 text-on-surface1',
          footerClassName
        ].filter(Boolean).join(' ')}>
          {footer}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🎨 CARD — Componente estilizado
// ══════════════════════════════════════════════════

/**
 * Card
 *
 * @param {object}           props
 * @param {React.ReactNode}  props.children          - Contenido principal
 * @param {React.ReactNode} [props.header]           - Header del card
 * @param {React.ReactNode} [props.footer]           - Footer del card
 * @param {string}          [props.image]            - URL de imagen superior
 * @param {string}          [props.imageAlt=""]      - Alt de la imagen
 * @param {string}          [props.padding="md"]     - Padding body (none, sm, md, lg, xl)
 * @param {string}          [props.shadow="md"]      - Sombra (none, sm, md, lg, xl)
 * @param {boolean}         [props.hoverable=false]  - Efecto hover
 * @param {boolean}         [props.clickable=false]  - Cursor pointer
 * @param {Function}        [props.onClick]          - Callback onClick
 * @param {string}          [props.className]        - Clases CSS adicionales
 * @param {...any}           props.rest              - Props HTML nativas de div
 */
export function Card({
  children,
  header,
  footer,
  image,
  imageAlt = '',
  padding = 'md',
  shadow = 'md',
  hoverable = false,
  clickable = false,
  onClick,
  className = '',
  ...rest
}) {
  const styledClasses = [
    'card-base',
    shadowClasses[shadow] || shadowClasses.md,
    hoverable ? 'card-hover' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <CardRaw
      header={header}
      footer={footer}
      image={image}
      imageAlt={imageAlt}
      clickable={clickable}
      onClick={onClick}
      bodyClassName={paddingClasses[padding] || paddingClasses.md}
      className={styledClasses}
      {...rest}
    >
      {children}
    </CardRaw>
  );
}

export default Card;
