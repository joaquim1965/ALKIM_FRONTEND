/**
 * UI/HorizontalScrollbar.jsx
 *
 * SCROLLBAR HORIZONTAL PERSONALIZADO
 * Scrollbar horizontal sincronizado con elemento de contenido.
 *
 * CARACTERÍSTICAS:
 * ✅ Sincronización bidireccional con elemento referenciado
 * ✅ Estilos CSS inyectados con !important para evitar conflictos
 * ✅ Hover nativo via CSS (no React state) - sin cambios de tamaño
 * ✅ ID único por instancia para múltiples scrollbars
 *
 * USO:
 * import { HorizontalScrollbar } from '@/components/UI/HorizontalScrollbar';
 *
 * // Uso básico
 * <HorizontalScrollbar
 *   contentSize={tableWidth}
 *   scrollRef={bodyRef}
 * />
 *
 * // Con callback de scroll
 * <HorizontalScrollbar
 *   contentSize={tableWidth}
 *   scrollRef={bodyRef}
 *   onScroll={(scrollLeft) => setHeaderOffset(scrollLeft)}
 * />
 *
 * // Con colores personalizados
 * <HorizontalScrollbar
 *   contentSize={tableWidth}
 *   scrollRef={bodyRef}
 *   size={16}
 *   thumbColor="var(--color-primary)"
 *   trackColor="var(--color-surface2)"
 * />
 */

import React, { useRef, useEffect, useId } from 'react';

/**
 * @param {object} props - Propiedades del componente
 * @param {number} [props.contentSize=2000] - Ancho total del contenido
 * @param {React.RefObject} props.scrollRef - Ref del elemento a sincronizar
 * @param {function} [props.onScroll] - Callback cuando cambia scrollLeft
 * @param {number} [props.size=13] - Altura del scrollbar en px
 * @param {string} [props.thumbColor] - Color del thumb normal
 * @param {string} [props.trackColor] - Color del track/fondo
 * @param {string} [props.thumbHoverColor] - Color del thumb en hover
 */
export function HorizontalScrollbar({
  contentSize = 2000,
  scrollRef,
  onScroll,
  size = 13,
  thumbColor = 'var(--color-on-background)',
  trackColor = 'var(--color-surface1)',
  thumbHoverColor = 'var(--color-surface1)'
}) {
  const scrollbarRef = useRef(null);
  const uniqueId = useId().replace(/:/g, '');

  // Sincronizar scroll entre scrollbar y contenido
  useEffect(() => {
    const scrollbarEl = scrollbarRef.current;
    const contentEl = scrollRef?.current;

    if (!scrollbarEl || !contentEl) return;

    let isScrollingFromScrollbar = false;
    let isScrollingFromContent = false;

    const syncScrollbarToContent = () => {
      if (isScrollingFromContent) return;
      isScrollingFromScrollbar = true;
      contentEl.scrollLeft = scrollbarEl.scrollLeft;
      onScroll?.(scrollbarEl.scrollLeft);
      requestAnimationFrame(() => { isScrollingFromScrollbar = false; });
    };

    const syncContentToScrollbar = () => {
      if (isScrollingFromScrollbar) return;
      isScrollingFromContent = true;
      scrollbarEl.scrollLeft = contentEl.scrollLeft;
      onScroll?.(contentEl.scrollLeft);
      requestAnimationFrame(() => { isScrollingFromContent = false; });
    };

    scrollbarEl.addEventListener('scroll', syncScrollbarToContent);
    contentEl.addEventListener('scroll', syncContentToScrollbar);

    return () => {
      scrollbarEl.removeEventListener('scroll', syncScrollbarToContent);
      contentEl.removeEventListener('scroll', syncContentToScrollbar);
    };
  }, [scrollRef, contentSize, onScroll]);

  // Estilos inline para el contenedor
  const containerStyle = {
    height: `${size}px`,
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    flexShrink: 0,
    backgroundColor: trackColor,
  };

  // Estilos inline para el contenido interno
  const innerStyle = {
    width: contentSize > 0 ? contentSize : 2000,
    height: '1px',
  };

  // CSS estático con :hover nativo - NO cambia con React state
  const scrollbarCSS = `
    .ui-hscroll-${uniqueId}::-webkit-scrollbar {
      height: ${size}px !important;
      background: ${trackColor} !important;
    }
    .ui-hscroll-${uniqueId}::-webkit-scrollbar-track {
      background: ${trackColor} !important;
    }
    .ui-hscroll-${uniqueId}::-webkit-scrollbar-thumb {
      background: ${thumbColor} !important;
      border-radius: 6px !important;
      min-height: ${size}px !important;
      max-height: ${size}px !important;
    }
    .ui-hscroll-${uniqueId}::-webkit-scrollbar-thumb:hover {
      background: ${thumbHoverColor} !important;
    }
  `;

  return (
    <>
      <style>{scrollbarCSS}</style>
      <div
        ref={scrollbarRef}
        className={`ui-hscroll-${uniqueId}`}
        style={containerStyle}
      >
        <div style={innerStyle} />
      </div>
    </>
  );
}

export default HorizontalScrollbar;
