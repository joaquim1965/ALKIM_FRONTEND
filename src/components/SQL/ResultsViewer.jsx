/**
 * ResultsViewer.jsx
 * Visualizador de resultados SQL con scrollbars personalizados
 * Soporta Chrome/Edge (webkit) y Firefox
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CheckCircle, XCircle, Copy, Download, Table as TableIcon, ChevronRight, AlertCircle, Zap } from 'lucide-react';
import { SqlTabGroup } from './SqlTabGroup';
import { useTmTr } from '../../contexts/TmTrContext';
const translations = new Proxy({}, { get: (_, prop) => prop });

// Contador global para IDs únicos
let idCounter = 0;

/**
 * Función auxiliar para calcular anchos estándar de columnas en SQL
 */
const getColWidth = (colName, sampleValue = null) => {
    const name = colName.toLowerCase();
    
    // Anchos específicos por nombre de campo
    if (name === 'uid' || name === 'id' || name.endsWith('_id')) return 80;
    if (name === 'id_grupo' || name === 'grupo') return 100;
    if (name === 'estatus' || name === 'activo' || name === 'rol') return 100;
    if (name.includes('fecha') || name.includes('date') || name.includes('time')) return 160;
    if (name.includes('email') || name.includes('correo')) return 220;
    if (name.includes('nombre') || name.includes('apellido') || name === 'usuario') return 160;
    if (name.includes('telefono') || name === 'tel' || name === 'phone') return 140;
    if (name === 'direccion_ip' || name === 'ip') return 130;
    if (name.includes('descripcion') || name.includes('observaciones') || name === 'texto' || name.includes('error')) return 400;
    if (name.includes('token') || name.includes('hash')) return 80;
    if (name === 'auth_provider' || name === 'idioma' || name === 'tema') return 120;
    
    // Si tenemos un valor de muestra, podemos intentar ajustar
    if (sampleValue !== null && sampleValue !== undefined) {
      const valStr = String(sampleValue);
      if (valStr.length > 100) return 400;
      if (valStr.length > 50) return 300;
      if (valStr.length > 20) return 200;
    }

    return 150; // Estándar por defecto
};

export function ResultsViewer({ results, multiResults, isMulti, error, isExecuting, executionTime, rowCount }) {
  const { t } = useTmTr('SqlConsole');
  const [copied, setCopied] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  // Tab activo en modo multi
  const [activeTab, setActiveTab] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [hThumbHover, setHThumbHover] = useState(false);
  const [vThumbHover, setVThumbHover] = useState(false);
  // Ordenación de columnas
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
  const bodyScrollRef = useRef(null);
  const rowNumbersRef = useRef(null);
  const hTrackRef = useRef(null);
  const vTrackRef = useRef(null);
  // ID único válido para CSS (debe empezar con letra)
  const uniqueId = useMemo(() => `sqlrv${++idCounter}`, []);

  /*
   * CSS para ocultar scrollbar nativo en Chrome/Edge
   * Firefox usa scrollbarWidth: 'none' en style inline
   */
  const scrollbarCSS = `
    .sql-body-${uniqueId}::-webkit-scrollbar,
    .sql-rownums-${uniqueId}::-webkit-scrollbar {
      display: none;
    }
  `;

  const toggleRowSelection = (rowIdx) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIdx)) {
        newSet.delete(rowIdx);
      } else {
        newSet.add(rowIdx);
      }
      return newSet;
    });
  };

  useEffect(() => {
    setSelectedRows(new Set());
    setActiveTab(0);
    setSortCol(null);
    setSortDir('asc');
  }, [results, multiResults]);

  /** Manejo de click en encabezado: toggle dirección si misma col, reset si cambia */
  const handleHeaderClick = (col) => {
    setSortCol(prev => {
      if (prev === col) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return col;
      } else {
        setSortDir('asc');
        return col;
      }
    });
    // Reset selección al reordenar
    setSelectedRows(new Set());
  };

  /** Aplica la ordenación a un array de rows */
  const applySortToData = (data) => {
    if (!sortCol || !data || data.length === 0) return data;
    return [...data].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (va === null && vb === null) return 0;
      if (va === null) return sortDir === 'asc' ? 1 : -1;
      if (vb === null) return sortDir === 'asc' ? -1 : 1;
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      const numA = Number(va);
      const numB = Number(vb);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  };

  /** Icono indicador de ordenación */
  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span style={{ marginLeft: '4px', fontSize: '10px', color: 'var(--color-secondary)' }}>↕</span>;
    return <span style={{ marginLeft: '4px', fontSize: '10px', color: 'var(--color-primary)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  /** Función genérica para exportar a CSV */
  const exportToCSV = (data) => {
    if (!data || data.length === 0) return;
    try {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row =>
          headers.map(h => {
            const value = row[h] ?? '';
            return typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))
              ? '"' + value.replace(/"/g, '""') + '"'
              : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `query_results_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Error al generar el archivo CSV');
    }
  };

  // Calcular dimensiones del contenido y viewport
  useEffect(() => {
    const bodyEl = bodyScrollRef.current;
    if (!bodyEl) return;

    const updateDimensions = () => {
      const table = bodyEl.querySelector('table');
      if (table) {
        setContentWidth(table.scrollWidth);
        setContentHeight(table.scrollHeight);
      }
      setViewportWidth(bodyEl.clientWidth);
      setViewportHeight(bodyEl.clientHeight);
    };

    const timer = setTimeout(updateDimensions, 50);
    window.addEventListener('resize', updateDimensions);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [results]);

  // Sincronizar scroll del body con los thumbs custom
  useEffect(() => {
    const bodyEl = bodyScrollRef.current;
    if (!bodyEl) return;

    const handleScroll = () => {
      setScrollLeft(bodyEl.scrollLeft);
      setScrollTop(bodyEl.scrollTop);
      // Sincronizar scroll de números de fila
      if (rowNumbersRef.current) {
        rowNumbersRef.current.scrollTop = bodyEl.scrollTop;
      }
    };

    bodyEl.addEventListener('scroll', handleScroll);
    return () => bodyEl.removeEventListener('scroll', handleScroll);
  }, [results]);

  // Calcular tamaño y posición del thumb horizontal
  const hThumbWidth = viewportWidth > 0 && contentWidth > 0
    ? Math.max(30, (viewportWidth / contentWidth) * viewportWidth)
    : 0;
  const hThumbLeft = contentWidth > viewportWidth
    ? (scrollLeft / (contentWidth - viewportWidth)) * (viewportWidth - hThumbWidth)
    : 0;
  const showHScroll = contentWidth > viewportWidth;

  // Calcular tamaño y posición del thumb vertical
  const vThumbHeight = viewportHeight > 0 && contentHeight > 0
    ? Math.max(30, (viewportHeight / contentHeight) * viewportHeight)
    : 0;
  const vThumbTop = contentHeight > viewportHeight
    ? (scrollTop / (contentHeight - viewportHeight)) * (viewportHeight - vThumbHeight)
    : 0;
  // Mostrar scrollbar vertical siempre que haya datos (se oculta el thumb si no hay scroll)
  const showVScroll = true;
  const hasVScroll = contentHeight > viewportHeight;

  // Handler para drag del scrollbar horizontal
  const handleHTrackMouseDown = (e) => {
    const track = hTrackRef.current;
    const bodyEl = bodyScrollRef.current;
    if (!track || !bodyEl) return;

    const trackRect = track.getBoundingClientRect();
    const clickX = e.clientX - trackRect.left;
    const thumbStart = hThumbLeft;
    const thumbEnd = hThumbLeft + hThumbWidth;

    // Click en el thumb - iniciar drag
    if (clickX >= thumbStart && clickX <= thumbEnd) {
      const startX = e.clientX;
      const startScrollLeft = bodyEl.scrollLeft;

      const handleMouseMove = (moveE) => {
        const deltaX = moveE.clientX - startX;
        const scrollRatio = deltaX / (viewportWidth - hThumbWidth);
        bodyEl.scrollLeft = startScrollLeft + scrollRatio * (contentWidth - viewportWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      // Click en el track - saltar a esa posición
      const ratio = clickX / viewportWidth;
      bodyEl.scrollLeft = ratio * (contentWidth - viewportWidth);
    }
  };

  // Handler para drag del scrollbar vertical
  const handleVTrackMouseDown = (e) => {
    const track = vTrackRef.current;
    const bodyEl = bodyScrollRef.current;
    if (!track || !bodyEl) return;

    const trackRect = track.getBoundingClientRect();
    const clickY = e.clientY - trackRect.top;
    const thumbStart = vThumbTop;
    const thumbEnd = vThumbTop + vThumbHeight;

    // Click en el thumb - iniciar drag
    if (clickY >= thumbStart && clickY <= thumbEnd) {
      const startY = e.clientY;
      const startScrollTop = bodyEl.scrollTop;

      const handleMouseMove = (moveE) => {
        const deltaY = moveE.clientY - startY;
        const scrollRatio = deltaY / (viewportHeight - vThumbHeight);
        const newScrollTop = startScrollTop + scrollRatio * (contentHeight - viewportHeight);
        bodyEl.scrollTop = newScrollTop;
        // Sincronizar números de fila
        if (rowNumbersRef.current) {
          rowNumbersRef.current.scrollTop = newScrollTop;
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      // Click en el track - saltar a esa posición
      const ratio = clickY / viewportHeight;
      const newScrollTop = ratio * (contentHeight - viewportHeight);
      bodyEl.scrollTop = newScrollTop;
      // Sincronizar números de fila
      if (rowNumbersRef.current) {
        rowNumbersRef.current.scrollTop = newScrollTop;
      }
    }
  };

  /**
   * Renderiza la tabla de resultados de una sola consulta (SELECT/SHOW/DESCRIBE)
   */
  const renderTable = (data, selectedRowsSet, onToggleRow) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    const cols = Object.keys(data[0]);
    const sortedData = applySortToData(data);
    return (
      <div className="h-full w-full bg-surface1 flex flex-col overflow-hidden">
        <div className={`flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden`}>
          {/* Header */}
          <div className="flex flex-shrink-0 overflow-hidden">
            <div className="flex-shrink-0 px-2 py-2 text-center text-xs font-semibold border-b border-r border-border" style={{ backgroundColor: 'var(--color-table-header)', color: 'var(--color-on-table-header)', width: '40px', minWidth: '40px' }}>#</div>
            <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--color-table-header)', color: 'var(--color-on-table-header)' }}>
              <div style={{ paddingRight: '0' }}>
                <table style={{ minWidth: 'max-content', tableLayout: 'fixed' }} className="text-sm border-collapse">
                  <thead>
                    <tr>
                      {cols.map((col, idx) => {
                        const width = getColWidth(col, data[0][col]);
                        return (
                          <th 
                            key={idx} 
                            onClick={() => handleHeaderClick(col)} 
                            className="px-4 py-2 text-left text-xs font-semibold border-b border-border whitespace-nowrap cursor-pointer select-none transition-all overflow-hidden text-ellipsis" 
                            style={{ 
                                userSelect: 'none', 
                                width: `${width}px`,
                                minWidth: `${width}px`,
                                maxWidth: `${width}px`
                            }}
                          >
                            {col}<SortIcon col={col} />
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                </table>
              </div>
            </div>
          </div>
          {/* Body */}
          <div className="flex-1 min-h-0 flex overflow-auto">
            <div className="flex-shrink-0 border-r border-border select-none" style={{ backgroundColor: 'var(--color-table-row)', width: '40px', minWidth: '40px', overflowY: 'auto' }}>
              {sortedData.map((_, rowIdx) => {
                const isSel = selectedRowsSet?.has(rowIdx);
                const isStriped = rowIdx % 2 === 1;
                let rowBg = 'var(--color-table-row)';
                let rowText = 'var(--color-on-table-row)';
                
                if (isSel) {
                   rowBg = 'var(--color-table-row-selected)';
                   rowText = 'var(--color-on-table-row-selected)';
                } else if (isStriped) {
                   rowBg = 'var(--color-table-row-striped)';
                   rowText = 'var(--color-on-table-row-striped)';
                }

                return (
                  <div key={rowIdx} className="px-2 py-2 text-center text-xs font-mono border-b border-border" style={{ backgroundColor: rowBg, color: rowText, height: '33px', lineHeight: '17px' }}>
                    {rowIdx + 1}
                  </div>
                );
              })}
            </div>
            <div className="flex-1 overflow-auto">
              <table style={{ minWidth: 'max-content', tableLayout: 'fixed' }} className="text-sm border-collapse">
                <tbody>
                  {sortedData.map((row, rowIdx) => {
                    const isSel = selectedRowsSet?.has(rowIdx);
                    const isStriped = rowIdx % 2 === 1;
                    let rowStyle = {};
                    if (isSel) rowStyle = { backgroundColor: 'var(--color-table-row-selected)', color: 'var(--color-on-table-row-selected)' };
                    else if (isStriped) rowStyle = { backgroundColor: 'var(--color-table-row-striped)', color: 'var(--color-on-table-row-striped)' };
                    else rowStyle = { backgroundColor: 'var(--color-table-row)', color: 'var(--color-on-table-row)' };
                    
                    return (
                      <tr 
                        key={rowIdx} 
                        onClick={() => onToggleRow && onToggleRow(rowIdx)} 
                        style={{ ...rowStyle, height: '33px' }} 
                        className="border-b border-border cursor-pointer transition-colors"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-table-row-hover)';
                          e.currentTarget.style.color = 'var(--color-on-table-row-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = rowStyle.backgroundColor;
                          e.currentTarget.style.color = rowStyle.color;
                        }}
                      >
                        {cols.map((col, colIdx) => {
                          const width = getColWidth(col, row[col]);
                          return (
                            <td 
                                key={colIdx} 
                                className="px-4 py-2 font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis" 
                                style={{ 
                                    height: '33px', 
                                    lineHeight: '17px',
                                    width: `${width}px`,
                                    minWidth: `${width}px`,
                                    maxWidth: `${width}px`
                                }}
                            >
                              {row[col] === null ? <span className="text-secondary italic">NULL</span> : String(row[col])}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renderiza el panel de resultado de una sentencia no-SELECT
   */
  const renderNonSelectResult = (stmtResult) => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <CheckCircle size={40} className="mx-auto mb-3 text-success" />
        <p className="text-sm text-on-surface1 font-medium">{stmtResult.affectedRows ?? stmtResult.rowCount} filas afectadas</p>
        <p className="text-xs text-secondary mt-1">{stmtResult.executionTime}</p>
      </div>
    </div>
  );

  /**
   * Renderiza un error de sentencia
   */
  const renderStmtError = (stmtResult) => (
    <div className="flex-1 p-4 overflow-auto">
      <div className="bg-destructive border border-destructive-border rounded-lg p-4">
        <p className="text-sm text-on-destructive font-mono whitespace-pre-wrap">{stmtResult.error}</p>
      </div>
    </div>
  );

  // ===== MODO MULTI: varios resultados con tabs =====
  if (isMulti && multiResults && multiResults.length > 0) {
    const currentResult = multiResults[activeTab];
    const errorCount = multiResults.filter(r => !r.success).length;
    const successCount = multiResults.filter(r => r.success).length;

    return (
      <div className="h-full w-full bg-surface1 flex flex-col overflow-hidden">
        {/* Barra de estado multi */}
        <div className="flex-shrink-0 border-b border-border" style={{ 
          backgroundColor: errorCount > 0 ? 'var(--color-warning)' : 'var(--color-success)',
          color: errorCount > 0 ? 'var(--color-on-warning)' : 'var(--color-on-success)',
          padding: '8px 16px'
        }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {errorCount > 0
                ? <AlertCircle size={16} />
                : <CheckCircle size={16} />}
              <span className="text-sm font-semibold">
                {multiResults.length} sentencias: {successCount} OK{errorCount > 0 ? `, ${errorCount} con error` : ''}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              {executionTime && <span>Total: {executionTime}</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <SqlTabGroup
          tabs={multiResults.map((r, idx) => ({
            id: idx,
            label: `#${idx + 1} ${r.isDataQuery ? `(${r.rowCount})` : `(${r.affectedRows ?? r.rowCount}+)`}`,
            icon: r.success 
              ? <CheckCircle size={12} className="text-success" /> 
              : <XCircle size={12} className="text-destructive" />,
            hasError: !r.success
          }))}
          activeTabId={activeTab}
          onTabChange={setActiveTab}
          variant="underline"
          className="bg-surface2"
        />

        {/* Contenido del tab activo */}
        {currentResult && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Info de la sentencia */}
            <div className="px-4 py-1.5 bg-surface2 border-b border-border flex items-center gap-2 flex-shrink-0">
              <Zap size={12} className="text-primary flex-shrink-0" />
              <code className="text-xs text-on-surface2 font-mono truncate">
                {currentResult.query.length > 120 ? currentResult.query.substring(0, 120) + '...' : currentResult.query}
              </code>
              <span className="text-xs text-on-surface2 flex-shrink-0 ml-2">{currentResult.executionTime}</span>
              
              {currentResult.success && currentResult.isDataQuery && currentResult.data?.length > 0 && (
                <button 
                  onClick={() => exportToCSV(currentResult.data)} 
                  className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded bg-primary text-on-primary hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                  title={`${t(translations.exportCSV)} (C:\\Users\\Kimi\\Downloads)`}
                >
                  <Download size={12} />
                  {t(translations.exportCSV)}
                </button>
              )}
            </div>

            {/* Resultado */}
            {!currentResult.success
              ? renderStmtError(currentResult)
              : currentResult.isDataQuery && currentResult.data && currentResult.data.length > 0
                ? renderTable(currentResult.data, selectedRows, toggleRowSelection)
                : currentResult.isDataQuery
                  ? <div className="flex-1 flex items-center justify-center text-on-surface1"><p className="text-sm">0 resultados</p></div>
                  : renderNonSelectResult(currentResult)
            }
          </div>
        )}
      </div>
    );
  }

  // ===== MODO SIMPLE (comportamiento anterior) =====

  const handleCopy = () => {
    if (!results || results.length === 0) return;
    const headers = Object.keys(results[0]);
    const csvContent = [
      headers.join('\t'),
      ...results.map(row => headers.map(h => row[h] ?? '').join('\t'))
    ].join('\n');
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    exportToCSV(results);
  };

  if (!isExecuting && !results && !error) {
    return (
      <div className="h-full bg-surface1 flex flex-col">
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <TableIcon size={16} className="text-on-surface1" />
          <span className="text-sm font-medium text-on-surface1">Resultados</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-on-surface1">
          <div className="text-center">
            <TableIcon size={48} className="mx-auto mb-3" />
            <p className="text-sm">{t(translations.noResults)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isExecuting) {
    return (
      <div className="h-full bg-surface1 flex flex-col">
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <TableIcon size={16} className="text-on-surface1" />
          <span className="text-sm font-medium text-on-surface1">{t(translations.executing)}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-surface1 flex flex-col">
        <div className="px-4 py-3 border-b" style={{ 
          backgroundColor: 'var(--color-destructive)', 
          borderColor: 'var(--color-destructive-border)',
          color: 'var(--color-on-destructive)'
        }}>
          <div className="flex items-center gap-2">
            <XCircle size={16} />
            <span className="text-sm font-semibold">{t(translations.errorTitle)}</span>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <div className="bg-destructive border border-destructive-border rounded-lg p-4">
            <p className="text-sm text-on-destructive font-mono whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasData = results && Array.isArray(results) && results.length > 0;
  const columns = hasData ? Object.keys(results[0]) : [];
  const sortedResults = applySortToData(results);

  return (
    <div className="h-full w-full bg-surface1 flex flex-col overflow-hidden">
      {/* Barra de estado con mensaje de éxito - ARRIBA */}
      <div className="px-4 py-2 flex items-center gap-4 flex-shrink-0" style={{ 
        backgroundColor: 'var(--color-success)',
        color: 'var(--color-on-success)'
      }}>
        <div className="flex items-center gap-2">
          <CheckCircle size={16} />
          <span className="text-sm font-semibold">{t(translations.success)}</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span>{rowCount} {rowCount === 1 ? 'fila' : t(translations.rowCount)}</span>
          {selectedRows.size > 0 && (
            <span className="font-semibold">({selectedRows.size} seleccionada{selectedRows.size > 1 ? 's' : ''})</span>
          )}
          {executionTime && <span>{t(translations.executionTime)}: {executionTime}</span>}
        </div>
        {hasData && (
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleCopy} className="px-3 py-1.5 text-xs rounded transition-opacity flex items-center gap-1.5" style={{ 
              backgroundColor: 'var(--color-on-success)',
              color: 'var(--color-success)'
            }} title={t(translations.copyResults)}>
              <Copy size={14} />
              {copied ? t(translations.copied) : t(translations.copyResults)}
            </button>
            <button onClick={handleExportCSV} className="px-3 py-1.5 text-xs rounded transition-opacity flex items-center gap-1.5" style={{ 
              backgroundColor: 'var(--color-on-success)',
              color: 'var(--color-success)'
            }} title={t(translations.exportCSV)}>
              <Download size={14} />
              {t(translations.exportCSV)} (C:\Users\Kimi\Downloads)
            </button>
          </div>
        )}
      </div>

      {/* Tabla con scrollbars CUSTOM (no nativos) */}
      {hasData ? (
        <>
          <style>{scrollbarCSS}</style>
          <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
            {/* Scrollbar horizontal CUSTOM - ARRIBA */}
            {showHScroll && (
              <div
                ref={hTrackRef}
                style={{
                  height: '13px',
                  width: '100%',
                  position: 'relative',
                  flexShrink: 0,
                  cursor: 'pointer',
                  backgroundColor: hThumbHover ? 'var(--color-on-surface1)' : 'var(--color-surface1)',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseDown={handleHTrackMouseDown}
                onMouseEnter={() => setHThumbHover(true)}
                onMouseLeave={() => setHThumbHover(false)}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    height: '9px',
                    width: `${hThumbWidth}px`,
                    left: `${hThumbLeft}px`,
                    backgroundColor: hThumbHover ? 'var(--color-surface1)' : 'var(--color-on-background)',
                    borderRadius: '6px',
                    transition: 'background-color 0.15s ease'
                  }}
                />
              </div>
            )}

            {/* Header de la tabla - se mueve con transform */}
            <div className="flex flex-shrink-0 overflow-hidden">
              {/* Columna de números - header */}
              <div
                className="flex-shrink-0 px-2 py-2 text-center text-xs font-semibold border-b border-r border-border"
                style={{
                  backgroundColor: 'var(--color-table-header)',
                  color: 'var(--color-on-table-header)',
                  width: '40px',
                  minWidth: '40px'
                }}
              >
                #
              </div>
              {/* Headers de columnas */}
              <div
                className="flex-1 overflow-hidden"
                style={{ backgroundColor: 'var(--color-table-header)', color: 'var(--color-on-table-header)' }}
              >
                <div style={{ transform: `translateX(-${scrollLeft}px)`, paddingRight: showVScroll ? '13px' : '0' }}>
                  <table style={{ minWidth: 'max-content', tableLayout: 'fixed' }} className="text-sm border-collapse">
                    <thead>
                      <tr>
                        {columns.map((col, idx) => {
                          const width = getColWidth(col, results[0][col]);
                          return (
                            <th 
                                key={idx} 
                                onClick={() => handleHeaderClick(col)} 
                                className="px-4 py-2 text-left text-xs font-semibold border-b border-border whitespace-nowrap cursor-pointer select-none transition-all overflow-hidden text-ellipsis" 
                                style={{ 
                                    userSelect: 'none',
                                    width: `${width}px`,
                                    minWidth: `${width}px`,
                                    maxWidth: `${width}px`
                                }}
                            >
                                {col}<SortIcon col={col} />
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                  </table>
                </div>
              </div>
            </div>

            {/* Contenedor del body + scrollbar vertical */}
            <div className="flex-1 min-h-0 flex">
              {/* Columna de números de fila - sincronizada con scroll vertical */}
              <div
                ref={rowNumbersRef}
                className={`sql-rownums-${uniqueId} flex-shrink-0 border-r border-border select-none`}
                style={{
                  backgroundColor: 'var(--color-table-row)',
                  width: '40px',
                  minWidth: '40px',
                  overflowY: 'auto',
                  scrollbarWidth: 'none'  /* Firefox */
                }}
              >
                {sortedResults.map((_, rowIdx) => {
                  const isSelected = selectedRows.has(rowIdx);
                  const isStriped = rowIdx % 2 === 1;
                  let bgColor = 'var(--color-table-row)';
                  let textColor = 'var(--color-on-table-row)';
                  
                  if (isSelected) {
                    bgColor = 'var(--color-table-row-selected)';
                    textColor = 'var(--color-on-table-row-selected)';
                  } else if (isStriped) {
                    bgColor = 'var(--color-table-row-striped)';
                    textColor = 'var(--color-on-table-row-striped)';
                  }
                  
                  return (
                    <div
                      key={rowIdx}
                      className="px-2 py-2 text-center text-xs font-mono border-b border-border"
                      style={{
                        backgroundColor: bgColor,
                        color: textColor,
                        height: '33px',
                        lineHeight: '17px'
                      }}
                    >
                      {rowIdx + 1}
                    </div>
                  );
                })}
              </div>

              {/* Body con scroll oculto - scrollbar nativo hidden */}
              <div
                ref={bodyScrollRef}
                className={`sql-body-${uniqueId} flex-1`}
                style={{
                  overflowX: 'hidden',
                  overflowY: 'auto',
                  scrollbarWidth: 'none'  /* Firefox */
                }}
              >
                <table style={{ minWidth: 'max-content', tableLayout: 'fixed' }} className="text-sm border-collapse">
                  <tbody>
                    {sortedResults.map((row, rowIdx) => {
                      const isSelected = selectedRows.has(rowIdx);
                      const isStriped = rowIdx % 2 === 1;
                      let rowStyle = {};
                      if (isSelected) {
                        rowStyle = { backgroundColor: 'var(--color-table-row-selected)', color: 'var(--color-on-table-row-selected)' };
                      } else if (isStriped) {
                        rowStyle = { backgroundColor: 'var(--color-table-row-striped)', color: 'var(--color-on-table-row-striped)' };
                      } else {
                        rowStyle = { backgroundColor: 'var(--color-table-row)', color: 'var(--color-on-table-row)' };
                      }
                      return (
                        <tr 
                          key={rowIdx} 
                          onClick={() => toggleRowSelection(rowIdx)} 
                          style={{ ...rowStyle, height: '33px' }} 
                          className="border-b border-border cursor-pointer transition-colors"
                          onMouseEnter={(e) => {
                             e.currentTarget.style.backgroundColor = 'var(--color-table-row-hover)';
                             e.currentTarget.style.color = 'var(--color-on-table-row-hover)';
                          }}
                          onMouseLeave={(e) => {
                             e.currentTarget.style.backgroundColor = rowStyle.backgroundColor;
                             e.currentTarget.style.color = rowStyle.color;
                          }}
                        >
                          {columns.map((col, colIdx) => {
                            const width = getColWidth(col, row[col]);
                            return (
                                <td 
                                    key={colIdx} 
                                    className="px-4 py-2 font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis" 
                                    style={{ 
                                        height: '33px', 
                                        lineHeight: '17px',
                                        width: `${width}px`,
                                        minWidth: `${width}px`,
                                        maxWidth: `${width}px`
                                    }}
                                >
                                  {row[col] === null ? <span className="text-secondary italic">NULL</span> : String(row[col])}
                                </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Scrollbar vertical CUSTOM - DERECHA (mismo formato que horizontal) */}
              {showVScroll && (
                <div
                  ref={vTrackRef}
                  style={{
                    width: '13px',
                    height: '100%',
                    position: 'relative',
                    flexShrink: 0,
                    cursor: hasVScroll ? 'pointer' : 'default',
                    backgroundColor: vThumbHover && hasVScroll ? 'var(--color-on-surface1)' : 'var(--color-surface1)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseDown={hasVScroll ? handleVTrackMouseDown : undefined}
                  onMouseEnter={() => hasVScroll && setVThumbHover(true)}
                  onMouseLeave={() => setVThumbHover(false)}
                >
                  {/* Thumb solo visible si hay contenido que scrollear */}
                  {hasVScroll && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '2px',
                        width: '9px',
                        height: `${vThumbHeight}px`,
                        top: `${vThumbTop}px`,
                        backgroundColor: vThumbHover ? 'var(--color-surface1)' : 'var(--color-on-background)',
                        borderRadius: '6px',
                        transition: 'background-color 0.15s ease'
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-on-surface1">
          <p className="text-sm">{t(translations.success)} - 0 {t(translations.rowCount)}</p>
        </div>
      )}
    </div>
  );
}

export default ResultsViewer;
