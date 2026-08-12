/**
 * TableExplorer.jsx
 *
 * Explorador de tablas y triggers de la base de datos
 * Con tabs para cambiar entre vista de tablas y triggers
 */

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ChevronDown, ChevronRight, Key, Search, Database, AlertCircle, RefreshCw, Link2, Share2, Code, Eye, Trash2, Upload } from 'lucide-react';
import { useTmTr } from '../../contexts/TmTrContext';
import * as XLSX from 'xlsx';
const translations = new Proxy({}, { get: (_, prop) => prop });
import sqlService from '../../services/sqlService';
import { Tooltip } from '../UI/Tooltip';
import { DeleteConfirmPopover } from '../UI/DeleteConfirmPopover';
import { SqlTabGroup } from './SqlTabGroup';
import { Input } from '../UI/Input';
import { calculateSmartPosition } from '../../utils/uiUtils';

export function TableExplorer({ onInsertText, onExecuteQuery, onEditTable, onInsertTable, onSetText, activeTable }) {
  const { t } = useTmTr('SqlConsole');
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'triggers' | 'events' | 'views'
  const [schema, setSchema] = useState({});
  const [triggers, setTriggers] = useState([]);
  const [events, setEvents] = useState([]);
  const [views, setViews] = useState([]);
  const [expandedTables, setExpandedTables] = useState({});
  const [expandedFields, setExpandedFields] = useState({});
  const [expandedTriggers, setExpandedTriggers] = useState({});
  const [expandedEvents, setExpandedEvents] = useState({});
  const [expandedViews, setExpandedViews] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [deleteConfirmData, setDeleteConfirmData] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    itemName: null,
    itemType: 'table',
    // Para campos
    column: null,
    tableName: null,
  });

  const fileInputRef = useRef(null);
  const contextMenuRef = useRef(null);

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    const tableName = contextMenu.itemName;
    if (!file || !tableName) return;

    // Reset para poder volver a seleccionar el mismo archivo si es necesario
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: null });

        if (data.length === 0) {
          alert(t(translations.excelEmpty) || 'El archivo Excel está vacío.');
          return;
        }

        const tableDef = schema[tableName];
        if (!tableDef) {
          alert((t(translations.errorSchemaNotFound) || 'No se encontró esquema para ') + tableName);
          return;
        }

        const realColsMap = new Map();
        tableDef.columns.forEach(c => {
          realColsMap.set(c.name.toLowerCase().trim(), c.name);
        });

        const headersObj = {};
        data.forEach(row => {
          Object.keys(row).forEach(k => {
            headersObj[k] = true;
          });
        });
        const allHeaders = Object.keys(headersObj);

        // Solo insertamos las columnas que existen en la tabla (ignorando mayúsculas y espacios extra)
        const insertCols = [];
        allHeaders.forEach(h => {
          const normalized = h.toLowerCase().trim();
          if (realColsMap.has(normalized)) {
            insertCols.push({ excelKey: h, dbKey: realColsMap.get(normalized) });
          }
        });

        if (insertCols.length === 0) {
          alert(t(translations.excelNoMatchingColumns) || 'No se encontraron columnas coincidentes con la tabla.');
          return;
        }

        let valuesBatch = [];
        for (const row of data) {
          const rowVals = insertCols.map(col => {
            const val = row[col.excelKey];
            // "Si alguna fila no existe el nombre quiere decir que no tiene ningún dato... se pasa"
            // sheet_to_json ya pone todo a null si falta en la celda y con defval: null.
            if (val === null || val === undefined || val === '') return "NULL";
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? "1" : "0";

            // Escapar comillas dobles y comillas simples y barras
            const escaped = String(val).replace(/\\/g, '\\\\').replace(/'/g, "''");
            return `'${escaped}'`;
          });
          valuesBatch.push(`(${rowVals.join(', ')})`);
        }

        const chunkSize = 500;
        let queries = [];
        const dbColsJoined = insertCols.map(c => c.dbKey).join('`, `');
        for (let i = 0; i < valuesBatch.length; i += chunkSize) {
          const chunk = valuesBatch.slice(i, i + chunkSize);
          queries.push(`INSERT INTO \`${tableName}\` (\`${dbColsJoined}\`) VALUES ${chunk.join(', ')};`);
        }

        const fullQuery = `-- Importando Excel (${valuesBatch.length} filas en ${queries.length} lotes)\n${queries.join('\n')}`;

        // Ejecutar a través de la consola principal para que muestre el resultado e interfaz correctamente
        if (onExecuteQuery) {
          onExecuteQuery(fullQuery);
        } else {
          // Fallback por si acaso
          if (onSetText) onSetText(fullQuery);
        }

        // Ya no hacemos sqlService nosotros ni mostramos alerts() bloqueantes.
        // La consola SQL tratará esto como una multi-query y mostrará Todo (success o error).

      } catch (err) {
        alert((t(translations.errorParsingExcel) || 'Error al procesar Excel: ') + err.message);
      }
    };
    reader.readAsBinaryString(file);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError(null);

    // Ejecutar todas las cargas en paralelo, pero sin que una falle a las demás
    await Promise.allSettled([
      loadSchema(),
      loadTriggers(),
      loadEvents(),
      loadViews()
    ]);

    setLoading(false);
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Ajuste inteligente de posición para el menú contextual
  useLayoutEffect(() => {
    if (!contextMenu.visible || !contextMenuRef.current) return;

    const menu = contextMenuRef.current;
    
    // El ContextMenu se posiciona inicialmente en e.clientX/Y (coordenadas del click)
    // Creamos un triggerRect virtual de 1x1 en el punto del click
    const virtualTriggerRect = {
      left: contextMenu.x,
      top: contextMenu.y,
      right: contextMenu.x,
      bottom: contextMenu.y,
      width: 0,
      height: 0
    };

    const smartPos = calculateSmartPosition(virtualTriggerRect, menu.getBoundingClientRect(), {
      preferredSide: 'right',
      margin: 0
    });

    // Solo actualizar si realmente cambió (para evitar loops)
    const newX = parseInt(smartPos.left);
    const newY = parseInt(smartPos.top);

    if (newX !== contextMenu.x || newY !== contextMenu.y) {
      setContextMenu(prev => ({ ...prev, x: newX, y: newY }));
    }
  }, [contextMenu.visible]);

  const loadSchema = async () => {
    try {
      const response = await sqlService.getSchema();
      setSchema(response.schema || {});
    } catch (err) {
      console.error('Error loading schema:', err);
      setError(err.message || err.error || 'Error al cargar el esquema');
    }
  };

  const loadTriggers = async () => {
    try {
      const response = await sqlService.getTriggers();
      setTriggers(response.triggers || []);
    } catch (err) {
      console.error('Error loading triggers:', err);
      // No mostrar error al usuario, solo log en consola
    }
  };

  const loadEvents = async () => {
    try {
      const response = await sqlService.getEvents();
      setEvents(response.events || []);
    } catch (err) {
      console.error('Error loading events:', err);
      // No mostrar error al usuario, solo log en consola
    }
  };

  const loadViews = async () => {
    try {
      const response = await sqlService.getViews();
      setViews(response.views || []);
    } catch (err) {
      console.error('Error loading views:', err);
      // No mostrar error al usuario, solo log en consola
    }
  };

  const toggleTable = (tableName) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const toggleField = (tableName, fieldName) => {
    const key = `${tableName}.${fieldName}`;
    setExpandedFields(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleTrigger = (triggerName) => {
    setExpandedTriggers(prev => ({
      ...prev,
      [triggerName]: !prev[triggerName]
    }));
  };

  const toggleEvent = (eventName) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventName]: !prev[eventName]
    }));
  };

  const toggleView = (viewName) => {
    setExpandedViews(prev => ({
      ...prev,
      [viewName]: !prev[viewName]
    }));
  };

  const handleViewClick = (viewName, e) => {
    e.stopPropagation();
    if (onEditTable) {
      onEditTable(viewName);
    }
  };

  const handleTableClick = (tableName, e) => {
    e.stopPropagation();
    if (onEditTable) {
      onEditTable(tableName);
    }
  };

  const handleFieldClick = (tableName, fieldName, e) => {
    e.stopPropagation();
    if (onInsertText) {
      onInsertText(`${tableName}.${fieldName}`);
    }
  };

  const handleContextMenu = (e, itemName, itemType = 'table', extra = null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      itemName,
      itemType,
      column: extra?.column || null,
      tableName: extra?.tableName || null,
    });
  };

  const handleToggleForeignKey = (tableName, fieldName, e) => {
    e.stopPropagation();
    toggleField(tableName, fieldName);
  };

  const filteredTables = Object.keys(schema)
    .filter(tableName => tableName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort();

  const filteredTriggers = triggers.filter(trigger =>
    trigger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trigger.table.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedTriggers = filteredTriggers.reduce((acc, trigger) => {
    if (!acc[trigger.table]) {
      acc[trigger.table] = [];
    }
    acc[trigger.table].push(trigger);
    return acc;
  }, {});

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredViews = views.filter(view =>
    view.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full bg-surface1 border-r border-border p-4">
        <div className="flex items-center gap-2 text-primary">
          <Database size={16} />
          <span className="text-sm">{t(translations.loadingSchema)}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-surface1 border-r border-border p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-surface1 border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Database size={16} />
            {t(translations.tablesTitle)}
          </h3>

          {/* Refresh Button */}
          <button
            onClick={loadAll}
            disabled={loading}
            className="p-1.5 text-primary hover:bg-surface-hover rounded transition-colors"
            title="Actualizar esquema"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tabs */}
        <SqlTabGroup
          tabs={[
            { id: 'tables',   label: t(translations.tabTables) === 'tabTables' ? 'Tablas' : t(translations.tabTables) },
            { id: 'views',    label: t(translations.tabViews) === 'tabViews' ? 'Vistas' : t(translations.tabViews) },
            { id: 'triggers', label: t(translations.tabTriggers) === 'tabTriggers' ? 'Triggers' : t(translations.tabTriggers) },
            { id: 'events',   label: t(translations.tabEvents) === 'tabEvents' ? 'Eventos' : t(translations.tabEvents) },
          ]}
          activeTabId={activeTab}
          onTabChange={setActiveTab}
          variant="pill"
          className="mb-3"
        />

        {/* Search */}
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t(translations.searchPlaceholder)}
          leftIcon={<Search size={14} />}
          size="sm"
          className="w-full"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'tables' ? (
          /* TABLES VIEW */
          filteredTables.length === 0 ? (
            <div className="text-sm text-secondary text-center py-4">
              {t(translations.noTables)}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTables.map(tableName => {
                const table = schema[tableName];
                const isExpanded = expandedTables[tableName];

                return (
                  <div key={tableName} className="text-sm">
                    {/* Table Name */}
                    <div className="flex items-center group/table hover:bg-surface-hover rounded transition-colors">
                      <button
                        onClick={() => toggleTable(tableName)}
                        className={`p-1 hover:bg-surface-hover rounded transition-colors ${
                          activeTable === tableName ? 'text-on-primary' : 'text-primary'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} className="flex-shrink-0" />
                        ) : (
                          <ChevronRight size={14} className="flex-shrink-0" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleTableClick(tableName, e)}
                        onContextMenu={(e) => handleContextMenu(e, tableName, 'table')}
                        className={`flex-1 flex items-center gap-2 py-1.5 px-2 text-left rounded-r transition-all ${
                          activeTable === tableName 
                          ? 'bg-primary text-on-primary border-l-4 border-primary shadow-sm' 
                          : 'text-on-surface1 hover:bg-surface-hover'
                        }`}
                      >
                        <Database size={14} className={activeTable === tableName ? 'text-on-primary' : 'text-primary'} />
                        <span className={`truncate ${activeTable === tableName ? 'font-bold text-on-primary' : 'font-medium text-primary'}`}>{tableName}</span>
                        <span className={`ml-auto text-[10px] font-mono ${activeTable === tableName ? 'text-on-primary' : 'text-primary'}`}>
                          {table.rowCount || 0}
                        </span>
                      </button>
                    </div>

                    {/* Fields */}
                    {isExpanded && table.columns && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        {table.columns.map(column => {
                          const fieldKey = `${tableName}.${column.name}`;
                          const isForeignKey = column.foreignKey;
                          const isPrimaryKey = column.key === 'PRI';
                          const isUniqueKey = column.key === 'UNI';

                          // Determinar tipo de relación FK
                          const isOneToOne = isForeignKey && (isPrimaryKey || isUniqueKey);
                          const hasCascade = isForeignKey && (column.foreignKey.onDelete === 'CASCADE' || column.foreignKey.onUpdate === 'CASCADE');
                          const hasDetails = isForeignKey || isPrimaryKey;
                          const isFieldExpanded = expandedFields[fieldKey];

                          const tooltipContent = isForeignKey
                            ? `${column.columnType || column.type}${column.nullable ? '' : ' NOT NULL'}\nFK ${isOneToOne ? '(1-1)' : '(1-N)'} → ${column.foreignKey.referencedTable}.${column.foreignKey.referencedColumn}${column.foreignKey.onUpdate ? `\nON UPDATE ${column.foreignKey.onUpdate}` : ''}${column.foreignKey.onDelete ? `\nON DELETE ${column.foreignKey.onDelete}` : ''}`
                            : `${column.columnType || column.type}${column.nullable ? '' : ' NOT NULL'}${isPrimaryKey ? ' PRIMARY KEY' : ''}`;

                          return (
                            <div key={column.name}>
                              {/* Field Row */}
                              <div className="flex items-center gap-2">
                                <Tooltip content={tooltipContent} position="right">
                                  <button
                                    onClick={(e) => handleFieldClick(tableName, column.name, e)}
                                    onContextMenu={(e) => handleContextMenu(e, column.name, 'field', { column, tableName })}
                                    className="flex-1 flex items-center gap-2 px-2 py-1 text-primary hover:bg-surface-hover rounded transition-colors text-left group"
                                  >
                                    {isPrimaryKey && !isForeignKey && (
                                      <Key size={12} className="flex-shrink-0" />
                                    )}
                                    {isForeignKey && isOneToOne && (
                                      <div className="flex items-center gap-0.5">
                                        <Link2 size={12} className="flex-shrink-0" />
                                        {hasCascade && <span className="text-[10px] font-bold">c</span>}
                                      </div>
                                    )}
                                    {isForeignKey && !isOneToOne && (
                                      <div className="flex items-center gap-0.5">
                                        <Share2 size={12} className="flex-shrink-0 text-primary" />
                                        {hasCascade && <span className="text-[10px] font-bold text-primary">c</span>}
                                      </div>
                                    )}
                                    <span className="flex-shrink truncate min-w-0">{column.name}</span>
                                    <span className={`ml-auto text-xs flex-shrink-0 truncate max-w-[120px] ${activeTable === tableName ? 'text-on-primary' : 'text-primary'}`} title={column.columnType || column.type}>
                                      ({column.columnType || column.type})
                                    </span>
                                  </button>
                                </Tooltip>

                                {/* Toggle Button (FK o PK) */}
                                {hasDetails && (
                                  <Tooltip content={isForeignKey ? "Ver detalles de FK" : "Ver detalles de PK"}>
                                    <button
                                      onClick={(e) => handleToggleForeignKey(tableName, column.name, e)}
                                      className="p-1 hover:bg-surface-hover rounded transition-colors flex-shrink-0 text-primary"
                                    >
                                      {isFieldExpanded ? (
                                        <ChevronDown size={12} />
                                      ) : (
                                        <ChevronRight size={12} />
                                      )}
                                    </button>
                                  </Tooltip>
                                )}
                              </div>

                              {/* FK Details */}
                              {isForeignKey && isFieldExpanded && (
                                <div className="ml-6 mt-1 px-2 py-1.5 bg-surface1 border border-border rounded text-xs text-on-surface1">
                                  <div className="space-y-1">
                                    <div>
                                      <span className="text-secondary">{t(translations.referencesTable)}:</span>{' '}
                                      <span className="font-medium">{column.foreignKey.referencedTable}.{column.foreignKey.referencedColumn}</span>
                                    </div>
                                    {column.foreignKey.onDelete && (
                                      <div>
                                        <span className="text-secondary">{t(translations.onDelete)}:</span>{' '}
                                        <span className="font-medium">{column.foreignKey.onDelete}</span>
                                      </div>
                                    )}
                                    {column.foreignKey.onUpdate && (
                                      <div>
                                        <span className="text-secondary">{t(translations.onUpdate)}:</span>{' '}
                                        <span className="font-medium">{column.foreignKey.onUpdate}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* PK Details */}
                              {isPrimaryKey && !isForeignKey && isFieldExpanded && (
                                <div className="ml-6 mt-1 px-2 py-1.5 bg-surface1 border border-border rounded text-xs text-on-surface1">
                                  <div className="space-y-1">
                                    <div>
                                      <span className="text-secondary">Tipo:</span>{' '}
                                      <span className="font-medium">{column.columnType || column.type}</span>
                                    </div>
                                    <div>
                                      <span className="text-secondary">Nulable:</span>{' '}
                                      <span className="font-medium">{column.nullable ? 'YES' : 'NO'}</span>
                                    </div>
                                    <div>
                                      <span className="text-secondary">Clave:</span>{' '}
                                      <span className="font-medium">PRIMARY KEY</span>
                                    </div>
                                    {column.extra && (
                                      <div>
                                        <span className="text-secondary">Extra:</span>{' '}
                                        <span className="font-medium">{column.extra}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'triggers' ? (
          /* TRIGGERS VIEW */
          Object.keys(groupedTriggers).length === 0 ? (
            <div className="text-sm text-secondary text-center py-4">
              {t(translations.noTriggersFound)}
            </div>
          ) : (
            <div className="space-y-2">
              {Object.keys(groupedTriggers).sort().map(tableName => (
                <div key={tableName} className="text-sm">
                  {/* Table Name Header */}
                  <div className="px-2 py-1 text-xs font-semibold text-on-primary bg-primary rounded">
                    {tableName}
                  </div>

                  {/* Triggers for this table */}
                  <div className="ml-2 mt-1 space-y-1">
                    {groupedTriggers[tableName].map(trigger => {
                      const isTriggerExpanded = expandedTriggers[trigger.name];

                      return (
                        <div key={trigger.name}>
                          {/* Fila del nombre + botón eliminar */}
                          <div className="flex items-stretch group/trigger">
                            <button
                              onClick={() => toggleTrigger(trigger.name)}
                              onContextMenu={(e) => handleContextMenu(e, trigger.name, 'trigger')}
                              className="flex-1 flex items-center gap-2 px-2 py-1.5 text-primary hover:bg-surface-hover rounded-l transition-colors text-left min-w-0"
                            >
                              {isTriggerExpanded ? (
                                <ChevronDown size={14} className="flex-shrink-0" />
                              ) : (
                                <ChevronRight size={14} className="flex-shrink-0" />
                              )}
                              <Code size={14} className="text-primary flex-shrink-0" />
                              <span className="truncate">{trigger.name}</span>
                              <span className="ml-auto text-[10px] font-mono text-primary flex-shrink-0 pr-1">
                                {trigger.timing} {trigger.event}
                              </span>
                            </button>

                            {/* Botón eliminar — visible al hover */}
                            <button
                              title={`Eliminar trigger ${trigger.name}`}
                              className="invisible group-hover/trigger:visible px-1.5 py-1 text-primary hover:bg-surface-hover rounded-r transition-all flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const virtualTarget = { getBoundingClientRect: () => rect };
                                const name = trigger.name;
                                setDeleteConfirmTarget({ current: virtualTarget });
                                setDeleteConfirmData({ type: 'trigger', name });
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Trigger Code expandido */}
                          {isTriggerExpanded && (
                            <div className="ml-6 mt-1 px-2 py-2 bg-surface2 border border-border rounded text-xs">
                              <div className="mb-2 flex gap-4 text-on-surface1">
                                <div>
                                  <span className="font-medium">{t(translations.triggerTiming)}:</span> {trigger.timing}
                                </div>
                                <div>
                                  <span className="font-medium">{t(translations.triggerEvent)}:</span> {trigger.event}
                                </div>
                              </div>
                              <pre className="text-xs font-mono text-on-surface1 whitespace-pre-wrap overflow-x-auto">
                                {trigger.statement}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'events' ? (
          /* EVENTS VIEW */
          filteredEvents.length === 0 ? (
            <div className="text-sm text-secondary text-center py-4">
              {t(translations.noEventsFound)}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredEvents.map(event => {
                const isEventExpanded = expandedEvents[event.name];
                const isEnabled = event.status === 'ENABLED';

                return (
                  <div key={event.name} className="text-sm">
                    {/* Event Name */}
                    <button
                      onClick={() => toggleEvent(event.name)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-on-surface1 hover:bg-surface-hover rounded transition-colors text-left"
                    >
                      {isEventExpanded ? (
                        <ChevronDown size={14} className="flex-shrink-0 text-primary" />
                      ) : (
                        <ChevronRight size={14} className="flex-shrink-0 text-primary" />
                      )}
                      <Code size={14} className="text-primary flex-shrink-0" />
                      <span className="truncate text-primary">{event.name}</span>
                      <span className={`ml-auto text-xs font-medium flex-shrink-0 px-2 py-0.5 rounded ${isEnabled
                        ? 'bg-success text-white'
                        : 'bg-neutral text-white'
                        }`}>
                        {isEnabled ? t(translations.eventEnabled) : t(translations.eventDisabled)}
                      </span>
                    </button>

                    {/* Event Details */}
                    {isEventExpanded && (
                      <div className="ml-6 mt-1 px-2 py-2 bg-surface2 border border-border rounded text-xs">
                        {/* Schedule Info */}
                        <div className="mb-2 space-y-1 text-on-surface1">
                          <div>
                            <span className="font-medium">{t(translations.eventSchedule)}:</span>{' '}
                            EVERY {event.intervalValue} {event.intervalField}
                          </div>
                          {event.starts && (
                            <div>
                              <span className="font-medium">{t(translations.eventStarts)}:</span>{' '}
                              {new Date(event.starts).toLocaleString()}
                            </div>
                          )}
                          {event.ends && (
                            <div>
                              <span className="font-medium">{t(translations.eventEnds)}:</span>{' '}
                              {new Date(event.ends).toLocaleString()}
                            </div>
                          )}
                          {event.lastExecuted && (
                            <div>
                              <span className="font-medium">{t(translations.eventLastExecution)}:</span>{' '}
                              {new Date(event.lastExecuted).toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* Event Code */}
                        <div className="mt-2 pt-2 border-t border-border">
                          <pre className="text-xs font-mono text-on-surface1 whitespace-pre-wrap overflow-x-auto">
                            {event.statement}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'views' ? (
          /* VIEWS VIEW */
          filteredViews.length === 0 ? (
            <div className="text-sm text-secondary text-center py-4">
              {t(translations.noViewsFound)}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredViews.map(view => {
                const isViewExpanded = expandedViews[view.name];

                return (
                  <div key={view.name} className="text-sm">
                    {/* View Name - Click to execute */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleView(view.name)}
                        className="p-1 hover:bg-surface-hover rounded transition-colors flex-shrink-0"
                      >
                        {isViewExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleViewClick(view.name, e)}
                        onContextMenu={(e) => handleContextMenu(e, view.name, 'view')}
                        className={`flex-1 flex items-center gap-2 py-1.5 px-2 text-on-surface1 text-left rounded-r transition-all ${
                          activeTable === view.name 
                          ? 'bg-primary border-l-2 border-primary text-on-primary' 
                          : 'hover:bg-surface-hover'
                        }`}
                        title="Ver y editar vista"
                      >
                        <Eye size={14} className={activeTable === view.name ? 'text-on-primary' : 'text-primary'} />
                        <span className={`truncate ${activeTable === view.name ? 'font-bold text-on-primary' : 'font-medium text-primary'}`}>{view.name}</span>
                        <span className={`ml-auto text-[10px] font-medium flex-shrink-0 px-2 py-0.5 rounded ${view.isUpdatable === 'YES'
                          ? 'bg-success text-white'
                          : 'bg-neutral text-white'
                          }`}>
                          {view.isUpdatable === 'YES' ? 'MOD' : 'RO'}
                        </span>
                      </button>
                    </div>

                    {/* View Definition */}
                    {isViewExpanded && (
                      <div className="ml-6 mt-1 px-2 py-2 bg-surface2 border border-border rounded text-xs">
                        <div className="mb-1 text-on-surface1 font-medium">
                          {t(translations.viewDefinition)}:
                        </div>
                        <pre className="text-xs font-mono text-on-surface1 whitespace-pre-wrap overflow-x-auto">
                          {view.definition}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : null}
      </div>

      {/* Context Menu */}
      {
        contextMenu.visible && (
          <div
            ref={contextMenuRef}
            className="fixed z-50 bg-surface1 border border-border shadow-lg rounded py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.itemType === 'table' && (
              <>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-on-surface1 hover:bg-surface-hover transition-colors"
                  onClick={() => {
                    if (onExecuteQuery) {
                      onExecuteQuery(`SELECT * FROM \`${contextMenu.itemName}\``);
                    }
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                >
                  {t(translations.viewTable) || 'Ver la tabla'}
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-on-surface1 hover:bg-surface-hover transition-colors"
                  onClick={() => {
                    if (onExecuteQuery) {
                      onExecuteQuery(`SELECT * FROM \`${contextMenu.itemName}\` LIMIT 100`);
                    }
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                >
                  {t(translations.view100Rows) || 'Ver 100 filas'}
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-on-surface1 hover:bg-surface-hover transition-colors"
                  onClick={async () => {
                    const tableName = contextMenu.itemName;
                    setContextMenu(prev => ({ ...prev, visible: false }));

                    try {
                      const res = await sqlService.executeQuery(`SHOW CREATE TABLE \`${tableName}\``);
                      if (res.success && res.data && res.data.length > 0) {
                        const row = res.data[0];
                        const createStr = row['Create Table'] || row['Create View'] || '';
                        if (createStr) {
                          const safeStr = `-- Estructura de ${tableName}\n${createStr.replace(/CREATE TABLE/i, '-- CREATE TABLE')}`;
                          if (onSetText) {
                            onSetText(safeStr + '\n');
                          } else if (onInsertText) {
                            onInsertText(safeStr + '\n');
                          }
                        }
                      }
                    } catch (e) {
                      console.error("Error al obtener estructura de la tabla:", e);
                    }
                  }}
                >
                  {t(translations.viewStructure) || 'Ver estructura'}
                </button>
                <div className="border-t border-border my-1" />
                <button
                  className="w-full text-left px-4 py-2 text-sm text-on-surface1 hover:bg-surface-hover transition-colors flex items-center gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Upload size={14} />
                  {t(translations.importExcel) || 'Importar Excel'}
                </button>
              </>
            )}

            {contextMenu.itemType === 'field' && contextMenu.column && (
              <>
                {/* Cabecera con nombre de campo */}
                <div className="px-4 py-1.5 text-xs text-secondary border-b border-border select-none">
                  <span className="font-mono font-semibold">{contextMenu.tableName}</span>
                  <span className="text-secondary">.{contextMenu.itemName}</span>
                </div>

                {/* Eliminar columna */}
                <button
                  className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-2"
                  onClick={() => {
                    const sql = `ALTER TABLE \`${contextMenu.tableName}\` DROP COLUMN \`${contextMenu.itemName}\`;`;
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    if (onSetText) onSetText(sql);
                  }}
                >
                  <Trash2 size={14} />
                  {t(translations.deleteColumn) || 'Eliminar columna'}
                </button>

                {/* Eliminar Primary Key */}
                {contextMenu.column.key === 'PRI' && !contextMenu.column.foreignKey && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-warning hover:bg-warning hover:text-white transition-colors flex items-center gap-2"
                    onClick={() => {
                      const sql = `ALTER TABLE \`${contextMenu.tableName}\` DROP PRIMARY KEY;`;
                      setContextMenu(prev => ({ ...prev, visible: false }));
                      if (onSetText) onSetText(sql);
                    }}
                  >
                    <Key size={14} />
                    {t(translations.dropPrimaryKey) || 'Eliminar Primary Key'}
                  </button>
                )}

                {/* Eliminar Foreign Key */}
                {contextMenu.column.foreignKey && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-warning hover:bg-warning hover:text-white transition-colors flex items-center gap-2"
                    onClick={async () => {
                      const tbl = contextMenu.tableName;
                      const col = contextMenu.itemName;
                      setContextMenu(prev => ({ ...prev, visible: false }));

                      let sql;
                      try {
                        const res = await sqlService.executeQuery(
                          `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tbl}' AND COLUMN_NAME = '${col}' AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1`,
                          true
                        );
                        const fkName = res?.data?.[0]?.CONSTRAINT_NAME;
                        sql = fkName
                          ? `ALTER TABLE \`${tbl}\` DROP FOREIGN KEY \`${fkName}\`;`
                          : `-- No se encontró el constraint. Usa: SHOW CREATE TABLE \`${tbl}\`;\nALTER TABLE \`${tbl}\` DROP FOREIGN KEY \`<nombre_constraint>\`;`;
                      } catch (err) {
                        sql = `ALTER TABLE \`${tbl}\` DROP FOREIGN KEY \`<nombre_constraint>\`;`;
                      }

                      if (onSetText) onSetText(sql);
                    }}
                  >
                    <Link2 size={14} />
                    {t(translations.dropForeignKey) || 'Eliminar Foreign Key'}
                  </button>
                )}

                {/* Eliminar Unique Key */}
                {contextMenu.column.key === 'UNI' && !contextMenu.column.foreignKey && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-warning hover:bg-warning hover:text-white transition-colors flex items-center gap-2"
                    onClick={async () => {
                      const tbl = contextMenu.tableName;
                      const col = contextMenu.itemName;
                      setContextMenu(prev => ({ ...prev, visible: false }));

                      let sql;
                      try {
                        const res = await sqlService.executeQuery(
                          `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tbl}' AND COLUMN_NAME = '${col}' AND NON_UNIQUE = 0 LIMIT 1`,
                          true
                        );
                        const idxName = res?.data?.[0]?.INDEX_NAME;
                        sql = `ALTER TABLE \`${tbl}\` DROP INDEX \`${idxName || col}\`;`;
                      } catch (err) {
                        sql = `ALTER TABLE \`${tbl}\` DROP INDEX \`${col}\`;`;
                      }

                      if (onSetText) onSetText(sql);
                    }}
                  >
                    <Key size={14} />
                    {t(translations.dropUniqueKey) || 'Eliminar Unique Key'}
                  </button>
                )}
              </>
            )}

            {/* Opciones exclusivas de VISTA */}
            {contextMenu.itemType === 'view' && (
              <>
                <div className="px-4 py-1.5 text-xs text-secondary border-b border-border select-none font-mono font-semibold">
                  {contextMenu.itemName}
                </div>

                <button
                  className="w-full text-left px-4 py-2 text-sm text-on-surface1 hover:bg-surface-hover transition-colors"
                  onClick={() => {
                    if (onExecuteQuery) {
                      onExecuteQuery(`SELECT * FROM \`${contextMenu.itemName}\``);
                    }
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                >
                  {t(translations.viewTable) || 'Ver datos'}
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-on-surface1 hover:bg-surface-hover transition-colors"
                  onClick={() => {
                    if (onExecuteQuery) {
                      onExecuteQuery(`SELECT * FROM \`${contextMenu.itemName}\` LIMIT 100`);
                    }
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                >
                  {t(translations.view100Rows) || 'Ver 100 filas'}
                </button>

                {/* Ver estructura */}
                <button
                  className="w-full text-left px-4 py-2 text-sm text-on-surface1 hover:bg-surface-hover transition-colors"
                  onClick={async () => {
                    const name = contextMenu.itemName;
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    try {
                      // Usar SHOW CREATE TABLE también para vistas si falla SHOW CREATE VIEW o viceversa
                      // Pero MySQL soporta SHOW CREATE VIEW específicamente.
                      const res = await sqlService.executeQuery(`SHOW CREATE VIEW \`${name}\``);
                      if (res.success && res.data && res.data.length > 0) {
                        const row = res.data[0];
                        const createStr = row['Create View'] || '';
                        if (createStr && onSetText) {
                          onSetText(`-- Estructura de la vista: ${name}\n${createStr}\n`);
                        }
                      }
                    } catch (e) {
                      console.error('Error al obtener estructura de la vista:', e);
                    }
                  }}
                >
                  {t(translations.viewStructure) || 'Ver estructura'}
                </button>

                {/* Separador */}
                <div className="border-t border-border my-1" />

                {/* Eliminar vista */}
                <button
                  className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-surface-hover transition-colors font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const virtualTarget = { getBoundingClientRect: () => rect };
                    const name = contextMenu.itemName;
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    setDeleteConfirmTarget({ current: virtualTarget });
                    setDeleteConfirmData({ type: 'view', name });
                  }}
                >
                  {t(translations.dropView) || 'Eliminar vista'}
                </button>
              </>
            )}

            {/* Opciones exclusivas de TRIGGER */}
            {contextMenu.itemType === 'trigger' && (
              <button
                className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-surface-hover transition-colors font-medium flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const virtualTarget = { getBoundingClientRect: () => rect };
                  const name = contextMenu.itemName;
                  setContextMenu(prev => ({ ...prev, visible: false }));
                  setDeleteConfirmTarget({ current: virtualTarget });
                  setDeleteConfirmData({ type: 'trigger', name });
                }}
              >
                <Trash2 size={14} />
                {t(translations.dropTrigger) || 'Eliminar trigger'}
              </button>
            )}
          </div>
        )
      }
      {/* Hidden file input for Excel import */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx, .xls"
        onChange={handleImportExcel}
      />

      {/* Popover Inteligente de Borrado (Vistas y Triggers) */}
      {deleteConfirmTarget && deleteConfirmData && (
        <DeleteConfirmPopover
          triggerRef={deleteConfirmTarget}
          message={`¿Eliminar ${deleteConfirmData.type === 'trigger' ? 'el trigger' : 'la vista'} "${deleteConfirmData.name}"?`}
          onConfirm={async () => {
            const { type, name } = deleteConfirmData;
            try {
              const res = await sqlService.executeQuery(`DROP ${type.toUpperCase()} IF EXISTS \`${name}\``, false);
              if (res.success) {
                loadAll();
                if (onSetText) onSetText(`-- ${type} eliminado/a correctamente: ${name}\n`);
              } else {
                alert(`Error al eliminar: ${res.error}`);
              }
            } catch (err) {
              alert(`Error: ${err.message || err}`);
            }
            setDeleteConfirmTarget(null);
            setDeleteConfirmData(null);
          }}
          onCancel={() => {
            setDeleteConfirmTarget(null);
            setDeleteConfirmData(null);
          }}
        />
      )}
    </div >
  );
}

export default TableExplorer;
