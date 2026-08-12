/**
 * SQLConsole.jsx
 *
 * Página de consultas SQL libres
 */

import React, { useState, useRef } from 'react';
import { Zap, Trash2, AlertTriangle } from 'lucide-react';
import { useTmTr } from '../contexts/TmTrContext';

import { TableExplorer } from '../components/SQL/TableExplorer';
import { SQLEditor } from '../components/SQL/SQLEditor';
import { ResultsViewer } from '../components/SQL/ResultsViewer';
import { TableDataEditor } from '../components/SQL/TableDataEditor';
import { Button } from '../components/UI/Button';
import { Checkbox } from '../components/UI/Checkbox';
import sqlService from '../services/sqlService';

// Claves exactas de s_dictionary WHERE contexto = 'SqlConsole'
const translations = {
  pageTitle:       'Pagetitle',
  safeMode:        'Safemode',
  clearButton:     'Clearbutton',
  executeButton:   'Executebutton',
  safeModeWarning: 'Safemodewarning',
  dangerWarning:   'Dangerwarning',
};


export function SQLConsole() {
  const { t } = useTmTr('SqlConsole');

  // Estados
  const [query, setQuery] = useState('');
  const [safeMode, setSafeMode] = useState(false);
  const [results, setResults] = useState(null);
  const [multiResults, setMultiResults] = useState(null);
  const [isMulti, setIsMulti] = useState(false);
  const [error, setError] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);
  const [rowCount, setRowCount] = useState(0);

  // Estados para modos de edición e inserción
  const [activeMode, setActiveMode] = useState('query'); // 'query' | 'edit' | 'insert'
  const [activeTable, setActiveTable] = useState(null);

  // Estados para divisores redimensionables
  const [leftWidth, setLeftWidth] = useState(250);
  const [topHeight, setTopHeight] = useState(300);
  const isDraggingVertical = useRef(false);
  const isDraggingHorizontal = useRef(false);
  const mainContentRef = useRef(null);

  // Ejecutar consulta
  const handleExecute = async () => {
    if (!query.trim()) {
      setError('La consulta no puede estar vacía');
      return;
    }

    setActiveMode('query');
    setActiveTable(null);

    try {
      setIsExecuting(true);
      setError(null);
      setResults(null);
      setMultiResults(null);
      setIsMulti(false);

      const response = await sqlService.executeQuery(query, safeMode);

      if (response.success || (response.isMulti && response.multiResults)) {
        setIsMulti(!!response.isMulti);
        setMultiResults(response.multiResults || null);
        setResults(response.isMulti ? null : (response.data ?? []));
        setExecutionTime(response.executionTime);
        setRowCount(response.isMulti ? (response.totalRows || 0) : (response.rowCount || 0));
        setError(null);
      } else {
        setError(response.error || 'Error desconocido');
        setResults(null);
        setMultiResults(null);
      }
    } catch (err) {
      console.error('Error executing query:', err);
      setError(err.error || err.message || 'Error al ejecutar la consulta');
      setResults(null);
      setMultiResults(null);
    } finally {
      setIsExecuting(false);
    }
  };

  // Limpiar todo
  const handleClear = () => {
    setQuery('');
    setResults(null);
    setMultiResults(null);
    setIsMulti(false);
    setError(null);
    setExecutionTime(null);
    setRowCount(0);
  };

  // Insertar texto en el editor
  const handleInsertText = (text) => {
    setQuery(prev => {
      // Si el query está vacío, insertar directamente
      if (!prev.trim()) {
        return text;
      }
      // Si termina en espacio, insertar directamente
      if (prev.endsWith(' ') || prev.endsWith('\n')) {
        return prev + text;
      }
      // Agregar espacio antes
      return prev + ' ' + text;
    });
  };

  // Ejecutar consulta directamente (para vistas)
  const handleExecuteQuery = async (queryText) => {
    if (!queryText.trim()) return;

    setActiveMode('query');
    setActiveTable(null);

    try {
      setQuery(queryText);
      setIsExecuting(true);
      setError(null);
      setResults(null);
      setMultiResults(null);
      setIsMulti(false);

      const response = await sqlService.executeQuery(queryText, safeMode);

      if (response.success || (response.isMulti && response.multiResults)) {
        setIsMulti(!!response.isMulti);
        setMultiResults(response.multiResults || null);
        setResults(response.isMulti ? null : (response.data ?? []));
        setExecutionTime(response.executionTime);
        setRowCount(response.isMulti ? (response.totalRows || 0) : (response.rowCount || 0));
        setError(null);
      } else {
        setError(response.error || 'Error desconocido');
        setResults(null);
        setMultiResults(null);
      }
    } catch (err) {
      console.error('Error executing query:', err);
      setError(err.error || err.message || 'Error al ejecutar la consulta');
      setResults(null);
      setMultiResults(null);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleEditTable = (tableName) => {
    handleClear();
    setActiveTable(tableName);
    setActiveMode('edit');
  };

  const handleInsertTable = (tableName) => {
    handleClear();
    setActiveTable(tableName);
    setActiveMode('insert');
  };

  const handleSetText = (text) => {
    handleClear();
    setQuery(text);
    setActiveMode('query');
    setActiveTable(null);
  };

  const handleCloseEditor = () => {
    setActiveMode('query');
    setActiveTable(null);
  };

  // Detectar si la consulta es peligrosa
  const isDangerousQuery = () => {
    if (!query.trim() || safeMode) return false;

    const queryUpper = query.toUpperCase();
    const dangerousKeywords = ['DELETE', 'DROP', 'TRUNCATE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE'];

    return dangerousKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(query);
    });
  };

  // Manejadores de arrastre para divisor vertical (izquierda | derecha)
  const handleMouseDownVertical = (e) => {
    e.preventDefault();
    isDraggingVertical.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Manejadores de arrastre para divisor horizontal (arriba | abajo)
  const handleMouseDownHorizontal = (e) => {
    e.preventDefault();
    isDraggingHorizontal.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // Agregar listeners globales
  React.useEffect(() => {
    const handleMouseMove = (e) => {
      // Divisor vertical
      if (isDraggingVertical.current) {
        const newWidth = e.clientX;
        if (newWidth > 150 && newWidth < 500) {
          setLeftWidth(newWidth);
        }
      }
      // Divisor horizontal
      if (isDraggingHorizontal.current && mainContentRef.current) {
        const rect = mainContentRef.current.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        const maxHeight = rect.height - 150; // Dejar espacio para resultados
        if (newHeight > 100 && newHeight < maxHeight) {
          setTopHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingVertical.current = false;
      isDraggingHorizontal.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col overflow-hidden">
      {/* Toolbar - Fixed */}
      <div className="bg-surface1 border-b border-border px-4 py-3 flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-on-surface1">
            {t(translations.pageTitle)}
          </h1>

          <div className="flex items-center gap-3 ml-auto">
            {/* Safe Mode Checkbox */}
            <div className="px-3 py-1.5 bg-surface2 rounded-md border border-border">
              <Checkbox
                label={t(translations.safeMode)}
                checked={safeMode}
                onChange={(e) => setSafeMode(e.target.checked)}
                className="text-on-surface2"
              />
            </div>

            {/* Clear Button */}
            <Button
              variant="secondary"
              onClick={handleClear}
              disabled={isExecuting}
              leftIcon={<Trash2 size={16} />}
              size="sm"
            >
              {t(translations.clearButton)}
            </Button>

            {/* Execute Button */}
            <Button
              variant="primary"
              onClick={handleExecute}
              disabled={isExecuting || !query.trim()}
              leftIcon={<Zap size={16} />}
              size="sm"
              className="px-6 shadow-lg"
            >
              {t(translations.executeButton)}
            </Button>
          </div>
        </div>

        {/* Warnings */}
        {safeMode && (
          <div className="mt-3 px-3 py-2 bg-info border border-info-border rounded-lg flex items-start gap-2">
            <AlertTriangle size={16} className="text-on-info mt-0.5 flex-shrink-0" />
            <p className="text-sm text-on-info">{t(translations.safeModeWarning)}</p>
          </div>
        )}

        {isDangerousQuery() && (
          <div className="mt-3 px-3 py-2 bg-destructive border border-destructive-border rounded-lg flex items-start gap-2">
            <AlertTriangle size={16} className="text-on-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-on-destructive font-medium">{t(translations.dangerWarning)}</p>
          </div>
        )}
      </div>

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        {/* Left Panel - Table Explorer */}
        <div style={{ width: leftWidth }} className="flex-shrink-0 overflow-hidden">
          <TableExplorer
            onInsertText={handleInsertText}
            onExecuteQuery={handleExecuteQuery}
            onEditTable={handleEditTable}
            onInsertTable={handleInsertTable}
            onSetText={handleSetText}
            activeTable={activeTable}
          />
        </div>

        {/* Vertical Divider */}
        <div
          className="w-1.5 bg-border hover:bg-primary cursor-col-resize transition-colors flex-shrink-0 z-10"
          onMouseDown={handleMouseDownVertical}
        />

        {/* Right Panel - Editor + Results */}
        <div ref={mainContentRef} className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {/* Top Panel - SQL Editor */}
          <div style={{ height: topHeight }} className="flex-shrink-0">
            <SQLEditor
              value={query}
              onChange={setQuery}
              onExecute={handleExecute}
              disabled={isExecuting}
            />
          </div>

          {/* Horizontal Divider */}
          <div
            className="h-1.5 bg-border hover:bg-primary cursor-row-resize transition-colors flex-shrink-0 z-10"
            onMouseDown={handleMouseDownHorizontal}
          />

          {/* Bottom Panel - Results */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeMode === 'query' ? (
              <ResultsViewer
                results={results}
                multiResults={multiResults}
                isMulti={isMulti}
                error={error}
                isExecuting={isExecuting}
                executionTime={executionTime}
                rowCount={rowCount}
              />
            ) : (
              <TableDataEditor
                tableName={activeTable}
                mode={activeMode}
                onClose={handleCloseEditor}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SQLConsole;

