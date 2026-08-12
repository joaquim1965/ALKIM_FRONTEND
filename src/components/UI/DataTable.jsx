/**
 * UI/DataTable.jsx
 *
 * COMPONENTE GENÉRICO DE TABLA CON FUNCIONALIDADES AVANZADAS
 *
 * CARACTERÍSTICAS:
 * ✅ Toolbar: botón añadir (+), filtro avanzado, buscador, contador
 * ✅ Cabeceras ordenables (sort tri-estado: asc → desc → sin orden)
 * ✅ Columnas reordenables con drag-and-drop
 * ✅ Separadores verticales entre columnas
 * ✅ Filas compactas
 * ✅ Acciones por fila en 2 filas: ver/editar / eliminar
 * ✅ Popover de confirmación de borrado (sin blur, posicionado junto al botón)
 * ✅ Boundary detection del popover en los 4 bordes de pantalla
 * ✅ Paginación completa: |◀ ‹ páginas › ▶|  + contador
 * ✅ Modal de filtros avanzados genérico (definido por props)
 *
 * USO:
 * import DataTable from '@/components/UI/DataTable';
 *
 * <DataTable
 *   columns={[
 *     { id: 'nombre', label: 'Nombre', sortField: 'nombre', render: (row) => <span>{row.nombre}</span> },
 *     { id: 'email',  label: 'Email',  sortField: 'email',  render: (row) => row.email },
 *   ]}
 *   data={users}
 *   keyField="uid"
 *   onAdd={() => setShowAddModal(true)}
 *   onView={(row) => setDetail(row)}
 *   onEdit={(row) => setEdit(row)}
 *   onDelete={(row) => deleteUser(row.uid)}
 *   searchFn={(row, q) => row.nombre.toLowerCase().includes(q)}
 *   filterFields={[
 *     { id: 'rol', label: 'Rol', type: 'select', options: [[1,'Usuario'],[2,'Admin']] },
 *   ]}
 *   filterFn={(row, f) => !f.rol || row.rol === parseInt(f.rol)}
 * />
 */

import React, { useState, useMemo, useRef } from 'react';
import {
    Plus, Filter, Search,
    ChevronUp, ChevronDown, ChevronsUpDown,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    GripVertical, Eye, Edit, Trash2, Settings, X as CloseIcon,
} from 'lucide-react';
import Button from './Button';
import Dropdown from './Dropdown';

// ============================================================================
// SORT ICON — tres estados: asc / desc / sin orden
// ============================================================================

const SortIcon = ({ state }) => {
    if (state === 'asc')  return <ChevronUp   size={12} className="shrink-0" style={{ color: 'var(--color-primary)' }} />;
    if (state === 'desc') return <ChevronDown size={12} className="shrink-0" style={{ color: 'var(--color-primary)' }} />;
    return <ChevronsUpDown size={12} className="text-secondary shrink-0" />;
};

// ============================================================================
// PAGINATION — primera / anterior / páginas / siguiente / última + contador
// ============================================================================

const Pagination = ({ total, page, perPage, onChange }) => {
    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) return null;

    const from = (page - 1) * perPage + 1;
    const to   = Math.min(page * perPage, total);

    const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
    const visible  = allPages.filter(p =>
        p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)
    );

    const btnCls = "p-1.5 rounded-md bg-surface2 border border-border text-on-surface2 hover:bg-surface3 hover:text-on-surface3 disabled:cursor-not-allowed transition-all";

    return (
        <div className="flex items-center gap-3 px-3 py-2 border-t border-border bg-surface1 flex-wrap">
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(1)}            disabled={page === 1}          className={btnCls} title="Primera página"><ChevronsLeft  size={13}/></button>
                <button onClick={() => onChange(page - 1)}     disabled={page === 1}          className={btnCls} title="Anterior"><ChevronLeft    size={13}/></button>

                {visible.map((p, i) => {
                    const prev = visible[i - 1];
                    return (
                        <React.Fragment key={p}>
                            {prev && p - prev > 1 && <span className="px-1 text-xs text-secondary">…</span>}
                            <button onClick={() => onChange(p)}
                                className={`min-w-[26px] h-6 px-1 rounded-md text-xs font-medium border transition-all
                                    ${p === page
                                        ? 'bg-primary text-on-primary border-primary'
                                        : 'bg-surface2 border-border text-on-surface2 hover:bg-surface3 hover:text-on-surface3'
                                    }`}>
                                {p}
                            </button>
                        </React.Fragment>
                    );
                })}

                <button onClick={() => onChange(page + 1)}     disabled={page === totalPages} className={btnCls} title="Siguiente"><ChevronRight   size={13}/></button>
                <button onClick={() => onChange(totalPages)}   disabled={page === totalPages} className={btnCls} title="Última página"><ChevronsRight size={13}/></button>
            </div>

            <span className="text-xs text-on-surface2">
                <span className="font-medium text-on-surface1">{from}–{to}</span> de{' '}
                <span className="font-medium text-on-surface1">{total}</span>
                <span className="mx-2 text-secondary">·</span>
                Pág. <span className="font-medium text-primary">{page}</span>
                {' '}/ <span className="font-medium text-on-surface1">{totalPages}</span>
            </span>
        </div>
    );
};

// ============================================================================
// DELETE CONFIRM POPOVER — posicionado junto al botón, sin blur
// ============================================================================

const DeletePopover = ({ row, pos, onConfirm, onClose }) => {
    const [deleting, setDeleting] = useState(false);

    // Boundary detection — 4 bordes
    const popW   = 220;
    const popH   = 88;
    const margin = 8;

    const left = Math.max(margin, Math.min(pos.left, window.innerWidth - popW - margin));

    const spaceBelow = window.innerHeight - pos.bottom;
    const spaceAbove = pos.top;
    let top;
    if (spaceBelow >= popH + margin)       top = pos.bottom + 6;
    else if (spaceAbove >= popH + margin)  top = pos.top - popH - 6;
    else top = spaceBelow >= spaceAbove ? window.innerHeight - popH - margin : margin;

    const handle = () => {
        setDeleting(true);
        setTimeout(() => { setDeleting(false); onConfirm(row); }, 700);
    };

    return (
        <>
            <div className="fixed inset-0 z-[69]" onClick={onClose} />
            <div style={{ position: 'fixed', top, left, zIndex: 70, width: popW }}
                className="bg-surface1 border border-border rounded-md shadow-2xl p-4 flex flex-col gap-3 animate-in zoom-in-95 duration-150">
                <p className="text-xs text-on-surface1 text-center leading-relaxed">
                    ¿Confirma que quiere eliminar el registro?
                </p>
                <div className="flex justify-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={deleting}>Cancelar</Button>
                    <button autoFocus onClick={handle} disabled={deleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive
                            text-on-destructive text-xs font-semibold ring-2 ring-destructive
                            disabled:text-disabled disabled:cursor-not-allowed transition-all focus:outline-none">
                        {deleting
                            ? <><span className="w-3 h-3 border-2 border-on-destructive border-t-on-destructive rounded-full animate-spin"/> Eliminando…</>
                            : <><Trash2 size={11}/> Eliminar</>
                        }
                    </button>
                </div>
            </div>
        </>
    );
};

// ============================================================================
// FILTER MODAL — genérico por filterFields prop
// ============================================================================

const FilterModal = ({ filterFields = [], filters, onApply, onClose }) => {
    const [local, setLocal] = useState({ ...filters });

    const groupedFields = useMemo(() => {
        const groups = {};
        filterFields.forEach(f => {
            const cat = f.category || 'General';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(f);
        });
        return groups;
    }, [filterFields]);

    const tabs = Object.keys(groupedFields);
    const hasTabs = tabs.length > 1;
    const [activeTab, setActiveTab] = useState(tabs[0] || 'General');

    const inputCls = "input-base w-full px-3 py-2 text-sm transition-all";

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-surface1 border border-border rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Cabecera Fija */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-surface1 shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <Filter size={16}/>
                        </div>
                        <div>
                            <h3 className="font-semibold text-on-background text-base">Filtros Avanzados</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface3 rounded-full transition-colors text-on-surface2">
                        <CloseIcon size={18}/>
                    </button>
                </div>

                {/* Contenido (Tabs + Campos) */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Tabs Sidebar */}
                    {hasTabs && (
                        <div className="w-48 border-r border-border bg-surface2/30 p-4 overflow-y-auto hidden sm:block shrink-0">
                            <div className="space-y-1">
                                {tabs.map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                            activeTab === tab 
                                                ? 'bg-primary text-on-primary shadow-sm' 
                                                : 'text-on-surface2 hover:bg-surface3 hover:text-on-surface1'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Campos */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar bg-surface1">
                        {filterFields.length === 0 ? (
                            <p className="text-center text-sm text-on-surface2 mt-10">No hay filtros configurados.</p>
                        ) : (
                            <>
                                {hasTabs && <h4 className="text-lg font-bold mb-6 text-on-background border-b border-border pb-2 sm:hidden">{activeTab}</h4>}
                                <div className="space-y-4 max-w-2xl">
                                    {(groupedFields[activeTab] || []).map(field => (
                                        <div key={field.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-center">
                                            <div className="sm:col-span-1">
                                                <label className="text-sm font-semibold text-on-surface1">{field.label}</label>
                                            </div>
                                            <div className="sm:col-span-2">
                                                {field.type === 'select' ? (
                                                    <Dropdown
                                                        options={[
                                                            { value: '', label: 'Todos' },
                                                            ...(field.options || []).map(([v, l]) => ({ value: v, label: l }))
                                                        ]}
                                                        onSelect={(v) => setLocal({ ...local, [field.id]: v })}
                                                        selectedValue={local[field.id] ?? ''}
                                                        className="w-full"
                                                        triggerClassName="input-base w-full px-3 py-2 text-sm justify-between font-normal"
                                                        showChevron={true}
                                                        position="left"
                                                    />
                                                ) : (
                                                    <input
                                                        type={field.type || 'text'}
                                                        placeholder={field.placeholder || ''}
                                                        value={local[field.id] || ''}
                                                        onChange={e => setLocal({ ...local, [field.id]: e.target.value })}
                                                        className={inputCls}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Pie Fijo */}
                <div className="flex justify-end gap-3 p-4 border-t border-border bg-surface2/50 relative z-10 shrink-0">
                    <Button variant="ghost" onClick={() => { onApply({}); onClose(); }}>Limpiar Filtros</Button>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => { onApply(local); onClose(); }}>Aplicar Filtros</Button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// DATA TABLE — componente principal
// ============================================================================

/**
 * DataTable
 *
 * @param {Array}    columns       - [{id, label, sortField?, render}]
 * @param {Array}    data          - Filas de datos
 * @param {string}   keyField      - Campo clave única (default: 'id')
 * @param {number}   rowsPerPage   - Filas por página (default: 5)
 * @param {Function} searchFn      - (row, query) => bool
 * @param {Function} onAdd         - () => void
 * @param {Function} onView        - (row) => void
 * @param {Function} onEdit        - (row) => void
 * @param {Function} onDelete      - (row) => void  (llamado tras confirmar)
 * @param {Array}    filterFields  - [{id, label, type, options?, placeholder?}]
 * @param {Function} filterFn      - (row, filters) => bool
 * @param {Function} extraActions  - (row) => ReactNode  (acciones extra opcionales)
 * @param {string}   emptyMessage  - Texto cuando no hay resultados
 */
export function DataTable({
    columns       = [],
    data          = [],
    keyField      = 'id',
    rowsPerPage   = 5,
    searchFn,
    onAdd,
    onView,
    onEdit,
    onDelete,
    filterFields  = [],
    filterFn,
    extraActions,
    emptyMessage  = 'Sin resultados',
    striped       = true,
    hoverable     = true,
    selectedId    = null,
}) {
    // ── Estado ────────────────────────────────────────────
    const [searchInput, setSearchInput] = useState('');
    const [sortField,   setSortField]   = useState(null);
    const [sortDir,     setSortDir]     = useState(null);
    const [page,        setPage]        = useState(1);
    const [advFilters,  setAdvFilters]  = useState({});
    const [showFilter,  setShowFilter]  = useState(false);
    const [confirmDel,  setConfirmDel]  = useState(null);   // { row, pos }
    const [colOrder,    setColOrder]    = useState(columns.map(c => c.id));

    // Sincronizar colOrder si columns cambia desde fuera
    const orderedCols = useMemo(() => {
        const map = Object.fromEntries(columns.map(c => [c.id, c]));
        return colOrder.map(id => map[id]).filter(Boolean);
    }, [colOrder, columns]);

    // ── Drag-and-drop de columnas ─────────────────────────
    const dragId  = useRef(null);
    const overIdx = useRef(null);

    const onDragStart = (id) => { dragId.current = id; };
    const onDragOver  = (id) => { overIdx.current = id; };
    const onDrop      = () => {
        if (!dragId.current || dragId.current === overIdx.current) return;
        const next = [...colOrder];
        const from = next.indexOf(dragId.current);
        const to   = next.indexOf(overIdx.current);
        if (from < 0 || to < 0) return;
        next.splice(to, 0, next.splice(from, 1)[0]);
        setColOrder(next);
        dragId.current = null;
    };

    // ── Sort tri-estado ───────────────────────────────────
    const handleSort = (field) => {
        if (!field) return;
        if (sortField !== field)    { setSortField(field); setSortDir('asc');  }
        else if (sortDir === 'asc') { setSortDir('desc'); }
        else                        { setSortField(null);  setSortDir(null);   }
        setPage(1);
    };

    // ── Datos procesados ──────────────────────────────────
    const processed = useMemo(() => {
        const q = searchInput.toLowerCase();
        let list = data.filter(row => {
            const matchSearch = !q || (searchFn
                ? searchFn(row, q)
                : Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
            );
            const matchFilter = !filterFn || filterFn(row, advFilters);
            return matchSearch && matchFilter;
        });
        if (sortField && sortDir) {
            list = [...list].sort((a, b) => {
                let va = a[sortField] ?? '', vb = b[sortField] ?? '';
                if (typeof va === 'string') va = va.toLowerCase();
                if (typeof vb === 'string') vb = vb.toLowerCase();
                if (va < vb) return sortDir === 'asc' ? -1 : 1;
                if (va > vb) return sortDir === 'asc' ?  1 : -1;
                return 0;
            });
        }
        return list;
    }, [data, searchInput, sortField, sortDir, advFilters, searchFn, filterFn]);

    const paginated = useMemo(() =>
        processed.slice((page - 1) * rowsPerPage, page * rowsPerPage),
    [processed, page, rowsPerPage]);

    const hasFilters = Object.values(advFilters).some(v => v !== '' && v != null);

    const handleSearch = (v) => { setSearchInput(v); setPage(1); };
    const handleApplyFilters = (f) => { setAdvFilters(f); setPage(1); };

    // ── Render ────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-3">
            {/* Toolbar */}
            <div className="bg-surface1 border border-border rounded-lg p-2 flex items-center gap-2 shadow-sm flex-wrap">

                {/* Añadir */}
                {onAdd && (
                    <button onClick={onAdd} title="Añadir"
                        className="w-8 h-8 rounded-full bg-surface2 border border-border text-on-surface2
                            flex items-center justify-center shrink-0
                            hover:bg-surface3 hover:text-on-surface1 active:scale-95 transition-all">
                        <Plus size={15} strokeWidth={2.5}/>
                    </button>
                )}

                {/* Filtro avanzado */}
                {filterFields.length > 0 && (
                    <button onClick={() => setShowFilter(true)} title="Filtros avanzados"
                        className={`relative w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all
                            ${hasFilters
                                ? 'bg-primary border-primary text-on-primary hover:bg-primary-hover'
                                : 'bg-surface2 border-border text-on-surface2 hover:bg-surface3 hover:text-on-surface1'
                            }`}>
                        <Filter size={13}/>
                        {hasFilters && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-success"/>}
                    </button>
                )}

                {/* Separador */}
                {(onAdd || filterFields.length > 0) && (
                    <div className="w-px h-5 bg-border shrink-0"/>
                )}

                {/* Buscador */}
                <input type="text" placeholder="Buscar..."
                    value={searchInput} onChange={e => handleSearch(e.target.value)}
                    className="input-base w-40 md:w-52 px-3 py-1.5 text-sm transition-all"/>

                {/* Contador */}
                <span className="text-xs text-on-surface2 font-medium whitespace-nowrap shrink-0">
                    {processed.length} {processed.length === 1 ? 'registro' : 'registros'}
                </span>
            </div>

            {/* Tabla */}
            <div className="bg-surface1 border border-border rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar relative">
                    <table className="w-full min-w-max table-auto">
                        <thead>
                            <tr className="uppercase tracking-wider border-b border-border font-bold"
                                style={{ backgroundColor: 'var(--color-table-header)', color: 'var(--color-on-table-header)' }}>
                                {/* Columna de acciones fija */}
                                {(onView || onEdit || onDelete || extraActions) && (
                                    <th className="px-3 py-2 text-center border-r border-border w-12 shrink-0"
                                        style={{ color: 'var(--color-on-table-header)' }}>
                                        <div className="flex justify-center items-center h-full">
                                            <Settings size={14}/>
                                        </div>
                                    </th>
                                )}

                                {/* Cabeceras arrastrables */}
                                {orderedCols.map((col, idx) => (
                                    <th key={col.id}
                                        draggable
                                        onDragStart={() => onDragStart(col.id)}
                                        onDragOver={e => { e.preventDefault(); onDragOver(col.id); }}
                                        onDrop={onDrop}
                                        onClick={() => handleSort(col.sortField)}
                                        className={`px-4 py-2 font-bold whitespace-nowrap border-b border-border
                                            outline-none select-none transition-colors
                                            ${col.sortField ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
                                            ${idx < orderedCols.length - 1 ? 'border-r' : ''}
                                            group`}
                                        style={{ color: sortField === col.sortField ? 'var(--color-primary)' : 'var(--color-on-table-header)' }}>
                                        <span className="inline-flex items-center gap-2">
                                            <GripVertical size={10} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                            {col.label}
                                            {col.sortField && (
                                                <SortIcon state={sortField === col.sortField ? sortDir : null}/>
                                            )}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={(onView || onEdit || onDelete || extraActions ? 1 : 0) + orderedCols.length} className="text-center py-12" style={{ color: 'var(--color-on-table-row)' }}>
                                        <Search size={26} className="mx-auto mb-2 text-disabled"/>
                                        <p className="text-sm">{emptyMessage}</p>
                                    </td>
                                </tr>
                            ) : paginated.map((row, idx) => {
                                const isSelected = selectedId !== null && row[keyField] === selectedId;
                                const isStriped = striped && idx % 2 === 1;
                                
                                // Determinar colores base según estado
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
                                    <tr key={row[keyField]} 
                                        className="transition-colors duration-100 group"
                                        style={{ 
                                            backgroundColor: bgColor,
                                            color: textColor
                                        }}
                                        onMouseEnter={(e) => {
                                            if (hoverable) {
                                                e.currentTarget.style.backgroundColor = 'var(--color-table-row-hover)';
                                                e.currentTarget.style.color = 'var(--color-on-table-row-hover)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = bgColor;
                                            e.currentTarget.style.color = textColor;
                                        }}
                                    >

                                        {/* Acciones */}
                                        {(onView || onEdit || onDelete || extraActions) && (
                                            <td className="px-2 py-1 text-center border-r border-border">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-0.5">
                                                        {onView && (
                                                            <button onClick={() => onView(row)} title="Ver"
                                                                className="p-1 rounded hover:bg-black/5 hover:text-primary transition-all">
                                                                <Eye size={12}/>
                                                            </button>
                                                        )}
                                                        {onEdit && (
                                                            <button onClick={() => onEdit(row)} title="Editar"
                                                                className="p-1 rounded hover:bg-black/5 hover:text-primary transition-all">
                                                                <Edit size={12}/>
                                                            </button>
                                                        )}
                                                        {extraActions?.(row)}
                                                    </div>
                                                    {onDelete && (
                                                        <button
                                                            onClick={e => {
                                                                const r = e.currentTarget.getBoundingClientRect();
                                                                setConfirmDel({ row, pos: r });
                                                            }}
                                                            title="Eliminar"
                                                            className="p-1 rounded hover:bg-black/5 hover:text-destructive transition-all">
                                                                <Trash2 size={12}/>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        {/* Celdas de datos */}
                                        {orderedCols.map((col, cidx) => (
                                            <td key={col.id} className={`px-4 py-1.5 ${cidx < orderedCols.length - 1 ? 'border-r' : ''} border-border`}>
                                                {col.render ? col.render(row) : (row[col.id] ?? '—')}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    total={processed.length}
                    page={page}
                    perPage={rowsPerPage}
                    onChange={setPage}
                />
            </div>



            {/* Modales */}
            {showFilter && (
                <FilterModal
                    filterFields={filterFields}
                    filters={advFilters}
                    onApply={handleApplyFilters}
                    onClose={() => setShowFilter(false)}
                />
            )}

            {confirmDel && (
                <DeletePopover
                    row={confirmDel.row}
                    pos={confirmDel.pos}
                    onConfirm={row => { onDelete?.(row); setConfirmDel(null); }}
                    onClose={() => setConfirmDel(null)}
                />
            )}
        </div>
    );
}

export default DataTable;
