import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  CornerDownRight
} from 'lucide-react';
import { ColumnMeta, Dataset, DataRow } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface DataGridViewProps {
  dataset: Dataset;
  filteredRows: DataRow[];
  onSelectRow: (row: DataRow) => void;
}

export const DataGridView: React.FC<DataGridViewProps> = ({
  dataset,
  filteredRows,
  onSelectRow,
}) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>(
    dataset.jiraFields?.keyCol || dataset.columns[0]?.key || ''
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColKeys, setVisibleColKeys] = useState<string[]>(() => {
    const keys: string[] = [];
    if (dataset.jiraFields?.keyCol) keys.push(dataset.jiraFields.keyCol);
    if (dataset.jiraFields?.summaryCol) keys.push(dataset.jiraFields.summaryCol);
    if (dataset.jiraFields?.statusCol) keys.push(dataset.jiraFields.statusCol);
    if (dataset.jiraFields?.priorityCol) keys.push(dataset.jiraFields.priorityCol);
    if (dataset.jiraFields?.typeCol) keys.push(dataset.jiraFields.typeCol);
    if (dataset.jiraFields?.assigneeCol) keys.push(dataset.jiraFields.assigneeCol);
    if (dataset.jiraFields?.startDateCol) keys.push(dataset.jiraFields.startDateCol);
    if (dataset.jiraFields?.departmentCol) keys.push(dataset.jiraFields.departmentCol);

    if (keys.length === 0) {
      return dataset.columns.filter(c => !c.key.startsWith('_derived_')).slice(0, 8).map(c => c.key);
    }
    return keys;
  });

  useEffect(() => {
    const activeSet = new Set(dataset.columns.map(c => c.key));
    setVisibleColKeys(prev => {
      const kept = prev.filter(k => activeSet.has(k));
      if (kept.length > 0) return kept;
      return dataset.columns.filter(c => !c.key.startsWith('_derived_')).slice(0, 8).map(c => c.key);
    });
    if (sortCol && !activeSet.has(sortCol)) {
      setSortCol(dataset.jiraFields?.keyCol || dataset.columns[0]?.key || '');
    }
  }, [dataset.columns, dataset.jiraFields, sortCol]);
  const [showColPicker, setShowColPicker] = useState(false);

  // Filter rows by table search
  const searchedRows = useMemo(() => {
    if (!search.trim()) return filteredRows;
    const q = search.toLowerCase().trim();
    return filteredRows.filter(row => {
      return visibleColKeys.some(key => {
        const val = row[key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
      });
    });
  }, [filteredRows, search, visibleColKeys]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortCol) return searchedRows;
    const sorted = [...searchedRows];
    sorted.sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }

      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return sorted;
  }, [searchedRows, sortCol, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleHeaderClick = (colKey: string) => {
    if (sortCol === colKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  };

  const toggleColumnVisibility = (colKey: string) => {
    setVisibleColKeys(prev =>
      prev.includes(colKey) ? prev.filter(k => k !== colKey) : [...prev, colKey]
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090b10] overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="p-3 border-b border-white/[0.06] flex items-center justify-between bg-[#0b0e14]">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder={t.filterWithinVisibleCols}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-[#141822] border border-white/[0.08] rounded text-xs text-slate-200 pl-8 pr-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500 w-72"
            />
          </div>

          <span className="text-2xs font-mono text-slate-400">
            {sortedRows.length.toLocaleString()} eşleşen kayıt
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Column Visibility Selector Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-2xs font-mono text-slate-300 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded transition-colors"
            >
              <Eye className="w-3 h-3 text-cyan-400" />
              <span>{t.columnsPicker} ({visibleColKeys.length})</span>
            </button>

            {showColPicker && (
              <div className="absolute right-0 top-9 w-64 max-h-80 bg-[#121622] border border-white/[0.12] rounded shadow-2xl z-50 p-2 overflow-y-auto space-y-1">
                <div className="text-2xs font-mono uppercase text-slate-400 px-2 py-1 border-b border-white/[0.06]">
                  Kolon Görünürlüğünü Değiştir
                </div>
                {dataset.columns.map(col => {
                  const isVis = visibleColKeys.includes(col.key);
                  return (
                    <div
                      key={col.key}
                      onClick={() => toggleColumnVisibility(col.key)}
                      className={`flex items-center space-x-2 px-2 py-1 text-2xs font-mono rounded cursor-pointer ${
                        isVis ? 'text-cyan-300 bg-cyan-950/30' : 'text-slate-400 hover:bg-white/[0.04]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isVis}
                        onChange={() => {}}
                        className="rounded border-white/20 bg-transparent text-cyan-500"
                      />
                      <span className="truncate">{col.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(1);
            }}
            className="bg-[#141822] border border-white/[0.08] text-2xs font-mono text-slate-300 rounded px-2 py-1.5 focus:outline-none"
          >
            <option value={25}>25 / sayfa</option>
            <option value={50}>50 / sayfa</option>
            <option value={100}>100 / sayfa</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs font-mono">
          <thead className="sticky top-0 bg-[#0e121a] z-10 border-b border-white/[0.08]">
            <tr>
              <th className="w-12 px-3 py-2 text-2xs text-slate-500 border-r border-white/[0.04]">#</th>
              {visibleColKeys.map(key => {
                const colMeta = dataset.columns.find(c => c.key === key);
                const isSorted = sortCol === key;
                return (
                  <th
                    key={key}
                    onClick={() => handleHeaderClick(key)}
                    className="px-3 py-2 text-2xs uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer border-r border-white/[0.04] whitespace-nowrap"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="truncate">{colMeta?.label || key}</span>
                      {isSorted ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-cyan-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-20" />
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="w-14 px-3 py-2 text-2xs text-slate-500 text-center">{t.detailAction}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {pagedRows.map((row, rIdx) => {
              const rowNum = (currentPage - 1) * pageSize + rIdx + 1;
              const typeVal = String(row[dataset.jiraFields?.typeCol || 'Konu Türü'] || '').toLowerCase();
              const parentKeyVal = String(row['Üst anahtar'] || '').trim();
              const isSubtask =
                typeVal.includes('alt görev') ||
                typeVal.includes('sub-task') ||
                typeVal.includes('subtask') ||
                Boolean(parentKeyVal);

              return (
                <tr
                  key={row._id}
                  onClick={() => onSelectRow(row)}
                  className={`cursor-pointer transition-colors group ${
                    isSubtask
                      ? 'bg-indigo-950/20 hover:bg-indigo-950/35 border-l-2 border-l-indigo-400'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <td className="px-3 py-2 text-2xs text-slate-600 border-r border-white/[0.04]">
                    {rowNum}
                  </td>
                  {visibleColKeys.map(key => {
                    const rawVal = row[key];
                    let display = '';
                    if (Array.isArray(rawVal)) {
                      display = rawVal.join(', ');
                    } else if (rawVal !== undefined && rawVal !== null) {
                      display = String(rawVal);
                    }

                    const isKeyCol = key === dataset.jiraFields?.keyCol;
                    const isSummaryCol = key === dataset.jiraFields?.summaryCol;
                    const isStatus = key === dataset.jiraFields?.statusCol;
                    const isPriority = key === dataset.jiraFields?.priorityCol;

                    return (
                      <td
                        key={key}
                        className="px-3 py-2 text-slate-300 border-r border-white/[0.04] truncate max-w-xs"
                      >
                        {isKeyCol ? (
                          <div className={`flex items-center space-x-1.5 ${isSubtask ? 'pl-2' : ''}`}>
                            {isSubtask && <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                            <span
                              className={`px-1.5 py-0.5 border rounded text-2xs font-bold ${
                                isSubtask
                                  ? 'bg-indigo-950/50 text-indigo-300 border-indigo-500/40'
                                  : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
                              }`}
                            >
                              {display}
                            </span>
                          </div>
                        ) : isSummaryCol && isSubtask ? (
                          <div>
                            <div className="flex items-center space-x-1.5 mb-0.5 text-[9px] font-mono">
                              <span className="px-1 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded uppercase font-bold">
                                Alt Görev
                              </span>
                              {parentKeyVal && (
                                <span className="text-indigo-400/90">Üst: {parentKeyVal}</span>
                              )}
                            </div>
                            <span className="truncate block" title={display}>{display || '-'}</span>
                          </div>
                        ) : isStatus ? (
                          <span className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] text-slate-300 rounded text-2xs">
                            {display}
                          </span>
                        ) : isPriority && display.toLowerCase().includes('high') ? (
                          <span className="px-1.5 py-0.5 bg-amber-950/40 text-amber-300 border border-amber-500/30 rounded text-2xs">
                            {display}
                          </span>
                        ) : (
                          <span className="truncate block" title={display}>
                            {display || '-'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center text-slate-500 group-hover:text-cyan-400">
                    <Maximize2 className="w-3.5 h-3.5 inline-block" />
                  </td>
                </tr>
              );
            })}

            {pagedRows.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColKeys.length + 2}
                  className="text-center py-12 text-slate-500 font-mono text-xs"
                >
                  Arama kriterlerine uyan kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-2.5 border-t border-white/[0.06] flex items-center justify-between text-2xs font-mono text-slate-400 bg-[#0b0e14]">
        <div>
          {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedRows.length)} / {sortedRows.length} kayıt gösteriliyor
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            {t.pageOf} {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
