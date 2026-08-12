/**
 * UI/VerticalScrollbar.jsx
 *
 * SCROLLBAR VERTICAL PERSONALIZADO
 * Scrollbar vertical sincronizado con elemento de contenido.
 *
 * CARACTERÍSTICAS:
 * ✅ Sincronización bidireccional con elemento referenciado
 * ✅ Estilos CSS inyectados con !important para evitar conflictos
 * ✅ Hover nativo via CSS (no React state) - sin cambios de tamaño
 * ✅ ID único por instancia para múltiples scrollbars
 *
 * USO:
 * import { VerticalScrollbar } from '@/components/UI/VerticalScrollbar';
 *
 * // Uso básico
 * <VerticalScrollbar
 *   contentSize={tableHeight}
 *   scrollRef={bodyRef}
 * />
 *
 * // Con callback de scroll
 * <VerticalScrollbar
 *   contentSize={tableHeight}
 *   scrollRef={bodyRef}
 *   onScroll={(scrollTop) => setSidebarOffset(scrollTop)}
 * />
 *
 * // Con colores personalizados
 * <VerticalScrollbar
 *   contentSize={tableHeight}
 *   scrollRef={bodyRef}
 *   size={16}
 *   thumbColor="var(--color-primary)"
 *   trackColor="var(--color-surface2)"
 * />
 */

import React, { useRef, useEffect, useId } from 'react';

/**
 * @param {object} props - Propiedades del componente
 * @param {number} [props.contentSize=2000] - Altura total del contenido
 * @param {React.RefObject} props.scrollRef - Ref del elemento a sincronizar
 * @param {function} [props.onScroll] - Callback cuando cambia scrollTop
 * @param {number} [props.size=13] - Ancho del scrollbar en px
 * @param {string} [props.thumbColor] - Color del thumb normal
 * @param {string} [props.trackColor] - Color del track/fondo
 * @param {string} [props.thumbHoverColor] - Color del thumb en hover
 */
export function VerticalScrollbar({
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
      contentEl.scrollTop = scrollbarEl.scrollTop;
      onScroll?.(scrollbarEl.scrollTop);
      requestAnimationFrame(() => { isScrollingFromScrollbar = false; });
    };

    const syncContentToScrollbar = () => {
      if (isScrollingFromScrollbar) return;
      isScrollingFromContent = true;
      scrollbarEl.scrollTop = contentEl.scrollTop;
      onScroll?.(contentEl.scrollTop);
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
    width: `${size}px`,
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    flexShrink: 0,
    backgroundColor: trackColor,
  };

  // Estilos inline para el contenido interno
  const innerStyle = {
    width: '1px',
    height: contentSize > 0 ? contentSize : 2000,
  };

  // CSS estático con :hover nativo - NO cambia con React state
  const scrollbarCSS = `
    .ui-vscroll-${uniqueId}::-webkit-scrollbar {
      width: ${size}px !important;
      background: ${trackColor} !important;
    }
    .ui-vscroll-${uniqueId}::-webkit-scrollbar-track {
      background: ${trackColor} !important;
    }
    .ui-vscroll-${uniqueId}::-webkit-scrollbar-thumb {
      background: ${thumbColor} !important;
      border-radius: 6px !important;
      min-width: ${size}px !important;
      max-width: ${size}px !important;
    }
    .ui-vscroll-${uniqueId}::-webkit-scrollbar-thumb:hover {
      background: ${thumbHoverColor} !important;
    }
  `;

  return (
    <>
      <style>{scrollbarCSS}</style>
      <div
        ref={scrollbarRef}
        className={`ui-vscroll-${uniqueId}`}
        style={containerStyle}
      >
        <div style={innerStyle} />
      </div>
    </>
  );
}

export default VerticalScrollbar;
