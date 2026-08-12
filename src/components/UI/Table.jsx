/**
 * UI/Table.jsx
 *
 * COMPONENTE UNIFICADO DE TABLE
 * Contiene dos versiones exportadas:
 *
 *   • TableRaw → Lógica pura (sorting, paginación, selección, búsqueda). Sin estilos de color.
 *   • Table    → Componente estilizado con clases utility del sistema de diseño.
 *
 * CARACTERÍSTICAS:
 * ✅ Sorting por columnas
 * ✅ Paginación integrada
 * ✅ Selección de filas (checkboxes)
 * ✅ Búsqueda/filtrado
 * ✅ Acciones por fila
 * ✅ Estados: loading, empty
 * ✅ Filas alternadas (striped) y hover
 *
 * USO:
 * import Table from '@/components/UI/Table';
 * import { TableRaw } from '@/components/UI/Table';
 *
 * const columns = [
 *   { key: 'id', label: 'ID', sortable: true },
 *   { key: 'name', label: 'Name', sortable: true },
 * ];
 * const data = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
 *
 * <Table columns={columns} data={data} sortable pagination />
 */

import React, { useState, useMemo } from 'react';
import { ButtonRaw } from './Button';
import { InputRaw } from './Input';

// ══════════════════════════════════════════════════
// 🔩 TABLERAW — Lógica pura, sin estilos de color
// ══════════════════════════════════════════════════

/**
 * TableRaw
 *
 * Componente funcional "desnudo". Gestiona sorting, paginación, selección y
 * búsqueda sin aplicar clases de color del sistema de diseño.
 *
 * @param {object}   props
 * @param {Array}    props.columns                - Columnas [{key, label, sortable?, render?, width?}]
 * @param {Array}    props.data                   - Datos (array de objetos)
 * @param {boolean} [props.sortable=false]        - Si permite sorting
 * @param {boolean} [props.pagination=false]      - Si muestra paginación
 * @param {number}  [props.pageSize=10]           - Tamaño de página
 * @param {boolean} [props.selectable=false]      - Si permite selección de filas
 * @param {Function}[props.onSelectionChange]     - Callback cuando cambia selección
 * @param {Array}   [props.actions=[]]            - Acciones por fila [{label, onClick, icon, variant, disabled}]
 * @param {boolean} [props.searchable=false]      - Si muestra barra de búsqueda
 * @param {string}  [props.searchPlaceholder]     - Placeholder del search
 * @param {Function}[props.searchFilter]          - Función custom de búsqueda
 * @param {boolean} [props.loading=false]         - Estado de carga
 * @param {string}  [props.emptyMessage]          - Mensaje cuando no hay datos
 * @param {boolean} [props.striped=false]         - Si alterna colores de filas
 * @param {boolean} [props.hoverable=true]        - Si resalta filas al hover
 * @param {string}  [props.className]             - Clases CSS adicionales
 */
export function TableRaw({
  columns = [],
  data = [],
  sortable = false,
  pagination = false,
  pageSize = 10,
  selectable = false,
  onSelectionChange,
  actions = [],
  searchable = false,
  searchPlaceholder = 'Search...',
  searchFilter,
  loading = false,
  emptyMessage = 'No data available',
  striped = false,
  hoverable = true,
  className = '',
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrado
  const filteredData = useMemo(() => {
    if (!searchable || !searchTerm) return data;
    return data.filter((row) => {
      if (searchFilter) return searchFilter(row, searchTerm);
      return Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [data, searchTerm, searchable, searchFilter]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortable || !sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig, sortable]);

  // Paginación
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pagination, currentPage, pageSize]);

  const totalPages = pagination ? Math.ceil(sortedData.length / pageSize) : 1;

  // Handlers
  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.(new Set());
    } else {
      const allIds = new Set(paginatedData.map((_, idx) => idx));
      setSelectedRows(allIds);
      onSelectionChange?.(allIds);
    }
  };

  const handleSelectRow = (index) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  const renderSortIcon = (columnKey) => {
    if (!sortable) return null;
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const renderCell = (row, column) => {
    if (column.render) return column.render(row[column.key], row);
    return row[column.key];
  };

  const renderActions = (row, rowIndex) => {
    if (!actions.length) return null;
    return (
      <td className="table-cell text-right">
        <div className="flex items-center justify-end gap-2">
          {actions.map((action, idx) => (
            <ButtonRaw
              key={idx}
              size="sm"
              variant={action.variant || 'ghost'}
              onClick={() => action.onClick(row, rowIndex)}
              disabled={action.disabled?.(row)}
            >
              {action.label}
            </ButtonRaw>
          ))}
        </div>
      </td>
    );
  };

  if (loading) {
    return (
      <div className={`table-empty ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-secondary">Loading...</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={`table-empty ${className}`}>
        <svg className="mx-auto h-12 w-12 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="mt-4">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`table-container ${className}`}>
      {searchable && (
        <div className="table-search-bar">
          <InputRaw
            type="search"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table-base">
          <thead className="table-header">
            <tr>
              {selectable && (
                <th className="table-header-cell">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-border"
                  />
                </th>
              )}
              {columns.map((column) => {
                const isSortable = column.sortable && sortable;
                return (
                  <th
                    key={column.key}
                    className={`table-header-cell ${isSortable ? 'sortable' : ''}`}
                    onClick={() => isSortable && handleSort(column.key)}
                    style={{ width: column.width }}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {isSortable && renderSortIcon(column.key)}
                    </div>
                  </th>
                );
              })}
              {actions.length > 0 && (
                <th className="table-header-cell text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="table-body">
            {paginatedData.map((row, rowIndex) => {
              const isSelected = selectedRows.has(rowIndex);
              const rowClasses = [
                'table-row',
                hoverable ? 'hoverable' : '',
                striped && rowIndex % 2 === 1 ? 'striped' : '',
                isSelected ? 'selected' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <tr key={rowIndex} className={rowClasses}>
                  {selectable && (
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(rowIndex)}
                        className="rounded border-border"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="table-cell">
                      {renderCell(row, column)}
                    </td>
                  ))}
                  {renderActions(row, rowIndex)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="table-pagination">
          <div className="text-sm text-secondary">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </div>
          <div className="flex gap-2">
            <ButtonRaw
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </ButtonRaw>
            <span className="px-4 py-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <ButtonRaw
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </ButtonRaw>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🎨 TABLE — Componente estilizado (alias de TableRaw con defaults)
// ══════════════════════════════════════════════════

/**
 * Table
 *
 * Componente estilizado. Las clases del sistema de diseño se aplican internamente
 * mediante las utility classes (table-container, table-header, etc.) de utilities.css.
 * Table es un alias tipado de TableRaw que hace explícitos los props principales.
 */
export function Table({ columns, data, ...rest }) {
  return <TableRaw columns={columns} data={data} {...rest} />;
}

export default Table;
