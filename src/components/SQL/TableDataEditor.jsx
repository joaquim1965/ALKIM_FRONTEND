/**
 * TableDataEditor.jsx
 * Componente para editar e insertar filas en una tabla
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTmTr } from '../../contexts/TmTrContext';
import sqlService from '../../services/sqlService';
import { Save, AlertCircle, Edit2, Pencil, X, Check, Plus, Trash2 } from 'lucide-react';
import { HorizontalScrollbar } from '../UI/HorizontalScrollbar';
import { DeleteConfirmPopover } from '../UI/DeleteConfirmPopover';
import { SqlTabGroup } from './SqlTabGroup';

const translations = new Proxy({}, { get: (_, prop) => prop });

/**
 * Función auxiliar para calcular anchos estándar de columnas
 */
const getColWidth = (col) => {
    const name = col.name.toLowerCase();
    
    // Anchos específicos por nombre de campo (Consistente con ResultsViewer)
    if (name === 'uid' || name === 'id' || name.endsWith('_id')) return 80;
    if (name === 'id_grupo' || name === 'grupo') return 100;
    if (name === 'estatus' || name === 'activo' || name === 'rol') return 100;
    if (name.includes('fecha') || name.includes('date') || name.includes('time')) return 160;
    if (name.includes('email') || name.includes('correo')) return 220;
    if (name.includes('nombre') || name.includes('apellido') || name === 'usuario') return 160;
    if (name.includes('telefono') || name === 'tel' || name === 'phone') return 140;
    if (name === 'direccion_ip' || name === 'ip') return 130;
    if (name.includes('descripcion') || name.includes('observaciones') || name === 'texto' || name.includes('error')) return 400;
    
    // Si no hay match por nombre, intentar por tipo
    if (col.type) {
        if (col.type.includes('int')) return 80;
        if (col.type.includes('date') || col.type.includes('time')) return 160;
        if (col.type.includes('char') || col.type.includes('text')) {
            if (col.maxLength && col.maxLength <= 5) return 80;
            if (col.maxLength && col.maxLength <= 20) return 120;
            if (col.maxLength && col.maxLength <= 50) return 200;
            if (col.maxLength && col.maxLength <= 255) return 300;
            return 400;
        }
    }

    return 150; // Estándar por defecto
};

export function TableDataEditor({ tableName, mode, onClose }) {
    const { t } = useTmTr('SqlConsole');
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [primaryKey, setPrimaryKey] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados para inserción
    const [insertData, setInsertData] = useState({});

    // Estados para edición
    const [editingRowIdx, setEditingRowIdx] = useState(null);
    const [editData, setEditData] = useState({});

    // Estado confirmación de borrado inteligente
    const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
    const [deleteConfirmIdx, setDeleteConfirmIdx] = useState(null);

    // Tipos de vista: 'row' (en fila) | 'form' (formulario vertical)
    const [viewMode, setViewMode] = useState('row');
    const [showInsertRow, setShowInsertRow] = useState(true);
    const [colWidths, setColWidths] = useState({});

    // Referencias y estado para Scrollbar Horizontal
    const scrollContainerRef = useRef(null);
    const tableRef = useRef(null);
    const [contentWidth, setContentWidth] = useState(0);
    const [viewportWidth, setViewportWidth] = useState(0);

    // Calcular anchos
    useEffect(() => {
        const updateWidths = () => {
            if (tableRef.current && scrollContainerRef.current) {
                setContentWidth(tableRef.current.scrollWidth);
                setViewportWidth(scrollContainerRef.current.clientWidth);
            }
        };
        updateWidths();
        window.addEventListener('resize', updateWidths);
        const timer = setTimeout(updateWidths, 100); // Dar tiempo al render
        return () => {
            window.removeEventListener('resize', updateWidths);
            clearTimeout(timer);
        };
    }, [data, columns, mode]);

    useEffect(() => {
        if (tableName) {
            loadTableData();
        }
    }, [tableName, mode]);

    const loadTableData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Obtener información del esquema para saber la Primary Key y las columnas
            const schemaResponse = await sqlService.getSchema();
            const tableSchema = schemaResponse.schema[tableName];

            if (!tableSchema) {
                throw new Error(`Esquema no encontrado para la tabla ${tableName}`);
            }

            setColumns(tableSchema.columns || []);
            const pk = tableSchema.columns.find(c => c.key === 'PRI');
            setPrimaryKey(pk ? pk.name : null);

            // Cargar los últimos 50 registros
            const dataResponse = await sqlService.executeQuery(`SELECT * FROM \`${tableName}\` LIMIT 50`, false);
            if (dataResponse.success) {
                setData(dataResponse.data || []);
            } else {
                throw new Error(dataResponse.error || 'Error al obtener datos de la tabla');
            }

            // Reiniciar estados
            resetInsertData(tableSchema.columns || []);
            setEditingRowIdx(null);
            setEditData({});
            if (dataResponse.data && dataResponse.data.length === 0) {
                setShowInsertRow(true);
            }

            // Calcular anchos basados en contenido
            calculateWidths(tableSchema.columns || [], dataResponse.data || []);
        } catch (err) {
            console.error('Error in TableDataEditor:', err);
            setError(err.message || 'Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const calculateWidths = (cols, rows) => {
        const widths = {};
        cols.forEach(col => {
            // Ancho base por nombre de columna (aprox 8-10px por caracter + padding)
            let maxLen = col.name.length + (col.name === primaryKey ? 4 : 2); // Pequeño margen para padding/iconos
            
            // Revisar datos de las primeras 50 filas
            rows.forEach(row => {
                const val = row[col.name];
                const contentLen = val ? String(val).length : 4; // 4 para "NULL"
                if (contentLen > maxLen) maxLen = contentLen;
            });

            // Convertir a pixeles (estimación agresiva: 8px por char + 12px padding)
            let width = Math.min(Math.max(maxLen * 8, 40), 600);
            
            // Ajustes específicos por tipo o nombre (mínimos de seguridad corregidos)
            const name = col.name.toLowerCase();
            if (name.includes('fecha') || name.includes('date')) width = Math.max(width, 140);
            if (name.includes('email')) width = Math.max(width, 180);
            if (col.type?.includes('text')) width = Math.max(width, 200);
            
            // Si es un token o un hash, limitar el ancho para que no desplace el resto (el usuario puede ver el contenido al hover)
            if (name.includes('token') || name.includes('hash')) width = 80;
            
            widths[col.name] = Math.ceil(width);
        });
        setColWidths(widths);
    };

    const resetInsertData = (cols) => {
        const initial = {};
        cols.forEach(c => {
            initial[c.name] = '';
        });
        setInsertData(initial);
    };

    const handleInsertChange = (colName, value) => {
        setInsertData(prev => ({ ...prev, [colName]: value }));
    };

    const handleEditChange = (colName, value) => {
        setEditData(prev => ({ ...prev, [colName]: value }));
    };

    const startEditing = (idx, row) => {
        setEditingRowIdx(idx);
        setEditData({ ...row });
    };

    const cancelEditing = () => {
        setEditingRowIdx(null);
        setEditData({});
    };

    const handleInsert = async () => {
        try {
            setError(null);
            // Validar datos mínimos?
            const colsToInsert = [];
            const valsToInsert = [];

            Object.entries(insertData).forEach(([key, val]) => {
                if (val !== '') {
                    colsToInsert.push(`\`${key}\``);
                    valsToInsert.push(`'${val.replace(/'/g, "''")}'`); // Escape simple
                }
            });

            if (colsToInsert.length === 0) {
                setError('No hay datos para insertar');
                return;
            }

            const query = `INSERT INTO \`${tableName}\` (${colsToInsert.join(', ')}) VALUES (${valsToInsert.join(', ')})`;
            const response = await sqlService.executeQuery(query, false);

            if (response.success) {
                // Recargar datos
                await loadTableData();
            } else {
                throw new Error(response.error || 'Error al insertar');
            }
        } catch (err) {
            setError(err.message || 'Error al ejecutar la inserción');
        }
    };

    const handleSaveEdit = async (rowIdx) => {
        if (!primaryKey) {
            setError('No se puede editar: la tabla no tiene Primary Key');
            return;
        }

        try {
            setError(null);
            const originalRow = data[rowIdx];
            const pkValue = originalRow[primaryKey];

            const setClauses = [];
            Object.entries(editData).forEach(([key, val]) => {
                // Solo actualizar si cambió
                if (val !== originalRow[key]) {
                    if (val === null || val === '') {
                        setClauses.push(`\`${key}\` = NULL`);
                    } else {
                        setClauses.push(`\`${key}\` = '${val.replace(/'/g, "''")}'`);
                    }
                }
            });

            if (setClauses.length === 0) {
                cancelEditing();
                return;
            }

            // Si pkValue es un string, lo entrecomillamos, si no, lo dejamos (mejor asumo string / usa escape)
            const pkFilter = typeof pkValue === 'string' ? `'${pkValue.replace(/'/g, "''")}'` : pkValue;
            const query = `UPDATE \`${tableName}\` SET ${setClauses.join(', ')} WHERE \`${primaryKey}\` = ${pkFilter}`;

            const response = await sqlService.executeQuery(query, false);

            if (response.success) {
                // Actualizar estado local (opcional) o recargar
                await loadTableData();
            } else {
                throw new Error(response.error || 'Error al actualizar');
            }
        } catch (err) {
            setError(err.message || 'Error al ejecutar la actualización');
        }
    };

    const handleDeleteRow = async (rowIdx) => {
        if (!primaryKey) {
            setError('No se puede eliminar: la tabla no tiene Primary Key');
            return;
        }

        try {
            setError(null);
            const row = data[rowIdx];
            const pkValue = row[primaryKey];
            const pkFilter = typeof pkValue === 'string' ? `'${pkValue.replace(/'/g, "''")}'` : pkValue;

            const query = `DELETE FROM \`${tableName}\` WHERE \`${primaryKey}\` = ${pkFilter}`;
            const response = await sqlService.executeQuery(query, false);

            if (response.success) {
                await loadTableData();
            } else {
                throw new Error(response.error || 'Error al eliminar');
            }
        } catch (err) {
            setError(err.message || 'Error al ejecutar la eliminación');
        }
    };

    if (loading) {
        return (
            <div className="h-full bg-surface1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-full bg-surface1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2 border-b border-border flex items-center justify-between" style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-on-surface2)' }}>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                        {tableName}
                    </span>
                    {!primaryKey && (
                        <span className="text-xs text-on-warning ml-2 flex items-center gap-1 bg-warning px-2 py-0.5 rounded">
                            <AlertCircle size={14} /> Solo lectura (Sin PK)
                        </span>
                    )}

                    <SqlTabGroup
                        tabs={[
                            { id: 'row',  label: t(translations.spreadView) || 'Vista Fila' },
                            { id: 'form', label: t(translations.formView) || 'Vista Formulario' },
                        ]}
                        activeTabId={viewMode}
                        onTabChange={setViewMode}
                        variant="pill"
                        className="ml-4"
                    />

                    {viewMode === 'row' && (
                        <button 
                            onClick={() => setShowInsertRow(!showInsertRow)}
                            className={`ml-2 p-1.5 rounded transition-colors ${showInsertRow ? 'bg-success text-on-success' : 'bg-surface1 text-on-surface1 border border-border hover:bg-surface-hover'}`}
                            title={t(translations.toggleInsertRow) || 'Alternar fila de inserción'}
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadTableData} className="p-1.5 hover:bg-surface-hover rounded transition-colors" title="Refrescar">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded transition-colors text-destructive">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="px-4 py-2 border-b text-sm" style={{ 
                    backgroundColor: 'var(--color-destructive)', 
                    color: 'var(--color-on-destructive)',
                    borderColor: 'var(--color-destructive-border)'
                }}>
                    {error}
                </div>
            )}

            {/* CSS para ocultar el scroll nativo de forma transparente (Chromium/Webkit) y Firefox */}
            <style>
                {`
                .tde-scroll-hidden::-webkit-scrollbar { display: none; }
                `}
            </style>

            {/* Scrollbar Horizontal Personalizado (si el contenido supera el viewport) */}
            {contentWidth > viewportWidth && (
                <HorizontalScrollbar
                    scrollRef={scrollContainerRef}
                    contentSize={contentWidth}
                />
            )}

            {/* Contenido (Tabla) */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-auto tde-scroll-hidden"
                style={{ scrollbarWidth: 'none' /* Firefox */ }}
            >
                {viewMode === 'row' ? (
                    <table ref={tableRef} className="w-full text-sm text-left border-collapse relative" style={{ minWidth: 'max-content', tableLayout: 'fixed' }}>
                        <thead style={{ backgroundColor: 'var(--color-table-header)', color: 'var(--color-on-table-header)' }} className="sticky top-0 z-10">
                            <tr>
                                <th className="px-2 py-1.5 border-b border-border font-semibold w-[80px] text-center" style={{ width: '80px' }}>
                                    
                                </th>
                                {columns.map(col => {
                                    const width = colWidths[col.name] || 150;
                                    return (
                                        <th key={col.name} className="px-2 py-1.5 border-b border-border font-semibold whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}>
                                            {col.name}
                                            {col.name === primaryKey && <span className="ml-1 text-primary text-[10px] font-bold" title="Primary Key">PK</span>}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Fila de Inserción siempre disponible en modo fila si se activa */}
                            {showInsertRow && (
                                <tr style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-on-surface2)' }} className="border-b border-border group/insert">
                                    <td className="px-2 py-1 text-center">
                                        <button
                                            onClick={handleInsert}
                                            className="p-1.5 bg-success text-on-success rounded transition-all flex items-center justify-center mx-auto"
                                            title={t(translations.Insertarfila) || 'Insertar fila'}
                                        >
                                            <Check size={16} />
                                        </button>
                                    </td>
                                    {columns.map(col => {
                                        const width = colWidths[col.name] || 150;
                                        return (
                                            <td key={`insert-${col.name}`} className="px-2 py-1" style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}>
                                                <input
                                                    type={col.type.includes('int') ? 'number' : 'text'}
                                                    value={insertData[col.name] || ''}
                                                    onChange={(e) => handleInsertChange(col.name, e.target.value)}
                                                    placeholder={col.name}
                                                    maxLength={col.maxLength || undefined}
                                                    className="w-full px-2 py-1 text-xs bg-input border border-border rounded focus:outline-none focus:border-primary placeholder:text-secondary"
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            )}

                            {/* Datos Existentes */}
                            {data.map((row, idx) => {
                                const isEditing = editingRowIdx === idx;
                                const isStriped = idx % 2 === 1;
                                const bgColor = isEditing ? 'var(--color-table-row-selected)' : (isStriped ? 'var(--color-table-row-striped)' : 'var(--color-table-row)');
                                const textColor = isEditing ? 'var(--color-on-table-row-selected)' : (isStriped ? 'var(--color-on-table-row-striped)' : 'var(--color-on-table-row)');
                                
                                return (
                                    <tr 
                                        key={idx} 
                                        className="border-b border-border transition-colors group/row"
                                        style={{ backgroundColor: bgColor, color: textColor }}
                                    >
                                        <td className="px-2 py-1 text-center w-[80px] border-r border-border">
                                            <div className="flex items-center justify-center gap-1 transition-opacity">
                                                {primaryKey && (
                                                    isEditing ? (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(idx); }} className="p-1 text-success hover:bg-success rounded transition-colors" title={t(translations.saveRow) || 'Guardar'}>
                                                                <Check size={16} />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); cancelEditing(); }} className="p-1 text-destructive hover:bg-destructive rounded transition-colors" title={t(translations.cancel) || 'Cancelar'}>
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); startEditing(idx, row); }} className="p-1 text-primary hover:bg-primary hover:text-on-primary rounded transition-colors" title={t(translations.Editarfila) || 'Editar fila'}>
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteConfirmTarget(e.currentTarget);
                                                                    setDeleteConfirmIdx(idx);
                                                                }}
                                                                className="p-1 text-destructive hover:bg-destructive hover:text-on-destructive rounded transition-colors"
                                                                title={t(translations.deleteRow) || 'Borrar fila'}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                        {columns.map(col => {
                                            const width = colWidths[col.name] || 150;
                                            return (
                                                <td key={`${idx}-${col.name}`} className="px-2 py-1.5 whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}>
                                                    {isEditing ? (
                                                        <input
                                                            type={col.type.includes('int') ? 'number' : 'text'}
                                                            value={editData[col.name] !== undefined && editData[col.name] !== null ? editData[col.name] : ''}
                                                            onChange={(e) => handleEditChange(col.name, e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                            disabled={col.name === primaryKey} // No editar PK
                                                            maxLength={col.maxLength || undefined}
                                                            className={`w-full px-2 py-1 text-xs bg-input border border-border rounded focus:outline-none focus:border-primary ${col.name === primaryKey ? 'cursor-not-allowed' : ''}`}
                                                        />
                                                    ) : (
                                                        <span className="text-xs" title={String(row[col.name])}>{row[col.name] === null ? <em className="text-secondary italic">NULL</em> : String(row[col.name])}</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                            {data.length === 0 && !showInsertRow && (
                                <tr>
                                    <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-sm text-on-surface2">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle size={24} className="text-secondary" />
                                            <span>No hay datos en esta tabla</span>
                                            <button 
                                                onClick={() => setShowInsertRow(true)}
                                                className="mt-2 px-4 py-2 bg-primary text-on-primary rounded text-xs font-medium"
                                            >
                                                Insertar primer registro
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    /* MODO FORMULARIO */
                    <div className="p-6 max-w-4xl mx-auto w-full">
                        <div className="bg-surface2 border border-border rounded-xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-border bg-surface1 flex items-center justify-between">
                                <h4 className="font-semibold text-on-surface1 flex items-center gap-2">
                                    <Plus size={18} className="text-success" />
                                    Insertar nuevo registro
                                </h4>
                                <button
                                    onClick={handleInsert}
                                    className="px-6 py-2 bg-success text-on-success rounded-lg transition-all font-semibold flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    Guardar Registro
                                </button>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                {columns.map(col => (
                                    <div key={`form-${col.name}`} className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-on-surface2 flex items-center gap-1">
                                            {col.name}
                                            {col.name === primaryKey && <span className="text-primary">(PK)</span>}
                                            <span className="font-normal text-secondary">({col.type})</span>
                                        </label>
                                        <input
                                            type={col.type.includes('int') ? 'number' : 'text'}
                                            value={insertData[col.name] || ''}
                                            onChange={(e) => handleInsertChange(col.name, e.target.value)}
                                            placeholder={`Ingresar ${col.name}...`}
                                            maxLength={col.maxLength || undefined}
                                            disabled={col.extra === 'auto_increment'}
                                            className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {data.length > 0 && (
                            <div className="mt-8">
                                <h4 className="text-sm font-bold text-secondary mb-4 px-2 uppercase tracking-wider">Registros recientes</h4>
                                <div className="space-y-3">
                                    {data.slice(0, 5).map((row, idx) => (
                                        <div key={`rec-${idx}`} className="bg-surface2 border border-border rounded-lg px-4 py-3 flex items-center justify-between group">
                                            <div className="flex-1 flex gap-4 overflow-hidden">
                                                {columns.slice(0, 3).map(col => (
                                                    <div key={`cell-rec-${col.name}`} className="min-w-0">
                                                        <div className="text-[10px] font-bold text-secondary uppercase">{col.name}</div>
                                                        <div className="text-sm truncate">{String(row[col.name]) || '-'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setViewMode('row');
                                                        startEditing(idx, row);
                                                    }}
                                                    className="p-2 hover:bg-primary text-primary hover:text-on-primary rounded-lg transition-colors"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Popover inteligente de confirmación de borrado */}
            {deleteConfirmTarget && deleteConfirmIdx !== null && (
                <DeleteConfirmPopover
                    triggerRef={{ current: deleteConfirmTarget }}
                    message={t(translations.confirmDeleteRow) || '¿Estás seguro de que quieres borrar esta fila?'}
                    onConfirm={() => {
                        handleDeleteRow(deleteConfirmIdx);
                        setDeleteConfirmTarget(null);
                        setDeleteConfirmIdx(null);
                    }}
                    onCancel={() => {
                        setDeleteConfirmTarget(null);
                        setDeleteConfirmIdx(null);
                    }}
                />
            )}
        </div>
    );
}

export default TableDataEditor;
