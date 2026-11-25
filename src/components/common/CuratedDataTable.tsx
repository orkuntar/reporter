import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  CornerDownRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import Papa from 'papaparse';
import { Dataset, DataRow } from '../../types';
import { parseCustomDate } from '../../core/parser';
import { useLanguage } from '../../i18n/LanguageContext';

interface CuratedDataTableProps {
  dataset: Dataset;
  filteredRows: DataRow[];
  onSelectRow: (row: DataRow) => void;
  title?: string;
  defaultExpanded?: boolean;
}

interface TableColSpec {
  id: string;
  key: string;
  label: string;
  isDate?: boolean;
  isKey?: boolean;
  isEnv?: boolean;
  minWidthClass?: string;
}

export const CuratedDataTable: React.FC<CuratedDataTableProps> = ({
  dataset,
  filteredRows,
  onSelectRow,
  title,
  defaultExpanded = true,
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const activeColumns = useMemo(
    () => dataset.columns.filter(c => !c.key.startsWith('_derived_')),
    [dataset.columns]
  );
  const activeKeySet = useMemo(
    () => new Set(activeColumns.map(c => c.key)),
    [activeColumns]
  );

  // Field keys strictly restricted to selected columns
  const jFields = dataset.jiraFields || {};
  const keyCol = jFields.keyCol && activeKeySet.has(jFields.keyCol) ? jFields.keyCol : '';
  const summaryCol = jFields.summaryCol && activeKeySet.has(jFields.summaryCol) ? jFields.summaryCol : '';
  const statusCol = jFields.statusCol && activeKeySet.has(jFields.statusCol) ? jFields.statusCol : '';
  const typeCol = jFields.typeCol && activeKeySet.has(jFields.typeCol) ? jFields.typeCol : '';
  const parentKeyCol = activeKeySet.has('Üst anahtar') ? 'Üst anahtar' : '';
  const parentSummaryCol = activeKeySet.has('Parent summary') ? 'Parent summary' : '';
  const deptCol = jFields.departmentCol && activeKeySet.has(jFields.departmentCol) ? jFields.departmentCol : '';
  const requesterCol = jFields.requesterCol && activeKeySet.has(jFields.requesterCol) ? jFields.requesterCol : '';
  const descCol = activeKeySet.has('Açıklama')
    ? 'Açıklama'
    : activeKeySet.has('Description')
    ? 'Description'
    : '';
  const envMergedCol = '_merged_Özel alan (Ortam)';
  const envCol = activeKeySet.has(envMergedCol)
    ? envMergedCol
    : jFields.environmentCol && activeKeySet.has(jFields.environmentCol)
    ? jFields.environmentCol
    : '';
  const devCol = jFields.assigneeCol && activeKeySet.has(jFields.assigneeCol) ? jFields.assigneeCol : '';
  const startCol = jFields.startDateCol && activeKeySet.has(jFields.startDateCol) ? jFields.startDateCol : '';
  const workStartCol = jFields.workStartDateCol && activeKeySet.has(jFields.workStartDateCol) ? jFields.workStartDateCol : '';
  const dueCol = jFields.dueCol && activeKeySet.has(jFields.dueCol) ? jFields.dueCol : '';

  const tableSpecs = useMemo<TableColSpec[]>(() => {
    const curated: TableColSpec[] = [];
    if (keyCol) curated.push({ id: 'key', key: keyCol, label: t.colJiraKey, isKey: true });
    if (summaryCol) curated.push({ id: 'summary', key: summaryCol, label: t.colSummary, minWidthClass: 'min-w-[200px]' });
    if (statusCol) curated.push({ id: 'status', key: statusCol, label: t.colStatus });
    if (deptCol) curated.push({ id: 'dept', key: deptCol, label: t.colDepartment });
    if (requesterCol) curated.push({ id: 'requester', key: requesterCol, label: t.colRequester });
    if (descCol) curated.push({ id: 'desc', key: descCol, label: t.colDescription, minWidthClass: 'min-w-[220px]' });
    if (envCol) curated.push({ id: 'env', key: envCol, label: t.colEnvironment, isEnv: true });
    if (devCol) curated.push({ id: 'dev', key: devCol, label: t.colDeveloper });
    if (startCol) curated.push({ id: 'start', key: startCol, label: t.colStartDate, isDate: true });
    if (workStartCol) curated.push({ id: 'workStart', key: workStartCol, label: t.colWorkStartDate, isDate: true });
    if (dueCol) curated.push({ id: 'due', key: dueCol, label: t.colEndDate, isDate: true });

    if (curated.length >= 2) return curated;

    // Fallback: render checked columns dynamically when user selects a custom non-curated subset
    return activeColumns.slice(0, 12).map(col => ({
      id: col.key,
      key: col.key,
      label: col.label,
      isDate: col.type === 'date' || Boolean(col.isDateColumn),
      isKey: col.key === keyCol,
      isEnv: col.key === envCol,
    }));
  }, [
    keyCol,
    summaryCol,
    statusCol,
    deptCol,
    requesterCol,
    descCol,
    envCol,
    devCol,
    startCol,
    workStartCol,
    dueCol,
    activeColumns,
    t,
  ]);

  const getEnvList = (row: DataRow): string[] => {
    if (!envCol) return [];
    const val = row[envCol];
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    return val && String(val).trim() ? [String(val).trim()] : [];
  };

  const formatGenericCell = (val: any): string => {
    if (val === undefined || val === null) return '';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  // Search filter strictly across active table columns
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return filteredRows;
    const q = search.toLocaleLowerCase('tr-TR').trim();
    return filteredRows.filter(row =>
      tableSpecs.some(spec => {
        const val = spec.isEnv ? getEnvList(row).join(' ') : formatGenericCell(row[spec.key]);
        return val.toLocaleLowerCase('tr-TR').includes(q);
      })
    );
  }, [filteredRows, search, tableSpecs, envCol]);

  // Sort rows (supports Turkish strings, natural Jira keys, and Turkish date formats)
  const sortedRows = useMemo(() => {
    if (!sortCol) return searchFiltered;
    const activeSpec = tableSpecs.find(s => s.key === sortCol);
    if (!activeSpec) return searchFiltered;

    const isDateSort = Boolean(activeSpec.isDate);
    const copy = [...searchFiltered];
    copy.sort((a, b) => {
      const valA = activeSpec.isEnv ? getEnvList(a).join(', ') : formatGenericCell(a[sortCol]);
      const valB = activeSpec.isEnv ? getEnvList(b).join(', ') : formatGenericCell(b[sortCol]);

      const emptyA = !valA || valA.trim() === '';
      const emptyB = !valB || valB.trim() === '';
      if (emptyA && emptyB) return 0;
      if (emptyA) return 1;
      if (emptyB) return -1;

      if (isDateSort) {
        const dA = parseCustomDate(valA);
        const dB = parseCustomDate(valB);
        const tA = dA ? dA.getTime() : 0;
        const tB = dB ? dB.getTime() : 0;
        return sortDir === 'asc' ? tA - tB : tB - tA;
      }

      if (sortCol === keyCol && keyCol) {
        const numA = parseInt(String(valA).replace(/^\D+/g, ''), 10);
        const numB = parseInt(String(valB).replace(/^\D+/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDir === 'asc' ? numA - numB : numB - numA;
        }
      }

      const cmp = String(valA).localeCompare(String(valB), 'tr-TR');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [searchFiltered, sortCol, sortDir, tableSpecs, keyCol]);

  const handleSortClick = (colKey: string) => {
    if (sortCol === colKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
    setPage(1);
  };

  const renderSortIcon = (colKey: string) => {
    if (sortCol !== colKey) {
      return <ArrowUpDown className="w-2.5 h-2.5 opacity-25 flex-shrink-0" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-cyan-400 flex-shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400 flex-shrink-0" />
    );
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Export active table columns specifically with UTF-8 BOM
  const handleExportCuratedCsv = () => {
    const exportData = sortedRows.map(r => {
      const obj: Record<string, string> = {};
      tableSpecs.forEach(spec => {
        obj[spec.label] = spec.isEnv ? getEnvList(r).join(', ') : formatGenericCell(r[spec.key]);
      });
      return obj;
    });

    const csv = '\uFEFF' + Papa.unparse(exportData);
    const electronAPI = (window as any).electronAPI;

    if (electronAPI?.saveFile) {
      electronAPI.saveFile({
        defaultName: `${dataset.name}-Rapor-Ozeti.csv`,
        content: csv,
        filters: [{ name: 'CSV File', extensions: ['csv'] }]
      });
    } else {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset.name}-Rapor-Ozeti.csv`;
      a.click();
    }
  };

  const renderSpecCell = (row: DataRow, spec: TableColSpec, isSubtask: boolean, parentKeyVal: string, parentSummaryVal: string) => {
    const val = row[spec.key];

    if (spec.id === 'key') {
      return (
        <td key={spec.id} className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">
          <div className={`flex items-center space-x-1.5 ${isSubtask ? 'pl-2' : ''}`}>
            {isSubtask && (
              <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            )}
            <span
              className={`px-1.5 py-0.5 border rounded text-2xs font-bold font-mono ${
                isSubtask
                  ? 'bg-indigo-950/50 text-indigo-300 border-indigo-500/40'
                  : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
              }`}
            >
              {val || '-'}
            </span>
          </div>
        </td>
      );
    }

    if (spec.id === 'summary') {
      return (
        <td key={spec.id} className="px-3 py-2 text-slate-200 border-r border-white/[0.04] font-medium max-w-xs" title={val}>
          {isSubtask && (
            <div className="flex items-center space-x-1.5 mb-0.5 text-2xs font-mono">
              <span className="px-1 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded uppercase tracking-wider text-[9px] font-bold">
                Alt Görev
              </span>
              {parentKeyVal && (
                <span
                  className="text-indigo-400/90 truncate max-w-[190px]"
                  title={parentSummaryVal ? `${parentKeyVal}: ${parentSummaryVal}` : parentKeyVal}
                >
                  Üst: {parentKeyVal}{parentSummaryVal ? ` · ${parentSummaryVal}` : ''}
                </span>
              )}
            </div>
          )}
          <div className="truncate">{val || '-'}</div>
        </td>
      );
    }

    if (spec.id === 'status') {
      return (
        <td key={spec.id} className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">
          {val ? (
            <span
              className={`px-1.5 py-0.5 border rounded text-2xs font-medium ${
                String(val).toLowerCase().includes('tamam') || String(val).toLowerCase().includes('done')
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                  : String(val).toLowerCase().includes('devam') || String(val).toLowerCase().includes('progress')
                  ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
                  : String(val).toLowerCase().includes('test')
                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                  : String(val).toLowerCase().includes('iptal') || String(val).toLowerCase().includes('cancel')
                  ? 'bg-rose-950/50 text-rose-300 border-rose-500/30'
                  : 'bg-white/[0.04] text-slate-300 border-white/[0.08]'
              }`}
            >
              {val}
            </span>
          ) : '-'}
        </td>
      );
    }

    if (spec.id === 'dept') {
      return (
        <td key={spec.id} className="px-3 py-2 text-slate-300 border-r border-white/[0.04] whitespace-nowrap">
          {val ? (
            <span className="px-1.5 py-0.5 bg-white/[0.03] border border-white/[0.08] text-slate-300 rounded text-2xs">
              {val}
            </span>
          ) : '-'}
        </td>
      );
    }

    if (spec.id === 'desc') {
      return (
        <td key={spec.id} className="px-3 py-2 text-slate-400 border-r border-white/[0.04] max-w-sm truncate text-2xs" title={val}>
          {val ? String(val).replace(/\n/g, ' ') : '-'}
        </td>
      );
    }

    if (spec.isEnv) {
      const envList = getEnvList(row);
      return (
        <td key={spec.id} className="px-3 py-2 text-slate-300 border-r border-white/[0.04] whitespace-nowrap">
          {envList.length > 0 ? (
            <div className="flex items-center space-x-1">
              {envList.map(ev => (
                <span key={ev} className="px-1.5 py-0.5 bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 rounded text-2xs">
                  {ev}
                </span>
              ))}
            </div>
          ) : '-'}
        </td>
      );
    }

    if (spec.id === 'start') {
      return (
        <td key={spec.id} className="px-3 py-2 text-emerald-400 border-r border-white/[0.04] whitespace-nowrap text-2xs">
          {val || '-'}
        </td>
      );
    }

    if (spec.id === 'workStart') {
      return (
        <td key={spec.id} className="px-3 py-2 text-cyan-400 border-r border-white/[0.04] whitespace-nowrap text-2xs">
          {val || '-'}
        </td>
      );
    }

    if (spec.id === 'due') {
      return (
        <td key={spec.id} className="px-3 py-2 text-amber-400 border-r border-white/[0.04] whitespace-nowrap text-2xs">
          {val || '-'}
        </td>
      );
    }

    const formatted = formatGenericCell(val);
    return (
      <td key={spec.id} className="px-3 py-2 text-slate-300 border-r border-white/[0.04] whitespace-nowrap truncate max-w-[180px]" title={formatted}>
        {formatted || '-'}
      </td>
    );
  };

  const renderRowCells = (row: DataRow, rowNum: number) => {
    const typeVal = typeCol ? String(row[typeCol] || '').toLowerCase() : '';
    const parentKeyVal = parentKeyCol ? String(row[parentKeyCol] || '').trim() : '';
    const parentSummaryVal = parentSummaryCol ? String(row[parentSummaryCol] || '').trim() : '';
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

        {tableSpecs.map(spec => renderSpecCell(row, spec, isSubtask, parentKeyVal, parentSummaryVal))}

        {/* Detail Icon */}
        <td className="px-3 py-2 text-center text-slate-500 group-hover:text-cyan-400 no-print">
          <Maximize2 className="w-3.5 h-3.5 inline-block" />
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-[#0f1219] border border-white/[0.08] rounded-md overflow-hidden select-none print-break-inside">
      {/* Header Bar */}
      <div className="p-3.5 bg-[#0c0f16] border-b border-white/[0.06] flex items-center justify-between">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors no-print" />
          ) : (
            <ChevronDown className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors no-print" />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-slate-200 group-hover:text-white">
                {title || t.curatedTableTitle}
              </span>
              <span className="px-1.5 py-0.2 bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-2xs font-mono rounded">
                {sortedRows.length.toLocaleString()} {t.records.toLowerCase()}
              </span>
              <span className="px-1.5 py-0.2 bg-white/[0.04] text-slate-400 border border-white/[0.08] text-2xs font-mono rounded">
                {tableSpecs.length} kolon
              </span>
            </div>
            <p className="text-2xs font-mono text-slate-500">
              {t.curatedTableSubtitle}
            </p>
          </div>
        </div>

        {isExpanded && (
          <div className="flex items-center space-x-2 no-print">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
              <input
                type="text"
                placeholder={t.searchTable}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="bg-[#141822] border border-white/[0.08] rounded text-2xs text-slate-200 pl-7 pr-2.5 py-1 font-mono focus:outline-none focus:border-cyan-500 w-52"
              />
            </div>

            <button
              onClick={handleExportCuratedCsv}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-2xs font-mono text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded transition-colors"
              title={t.exportCuratedCsv}
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Table Content */}
      {isExpanded && (
        <div className="flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead className="bg-[#0a0c10] border-b border-white/[0.06] text-2xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-slate-600 border-r border-white/[0.04] w-10">#</th>
                  {tableSpecs.map(spec => (
                    <th
                      key={spec.id}
                      onClick={() => handleSortClick(spec.key)}
                      className={`px-3 py-2 border-r border-white/[0.04] whitespace-nowrap cursor-pointer hover:text-white ${spec.minWidthClass || ''}`}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{spec.label}</span>
                        {renderSortIcon(spec.key)}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center w-12 no-print">{t.detailAction}</th>
                </tr>
              </thead>

              {/* Interactive Paginated View (Screen) */}
              <tbody className="divide-y divide-white/[0.04] print:hidden">
                {pagedRows.map((row, idx) => renderRowCells(row, (currentPage - 1) * pageSize + idx + 1))}

                {pagedRows.length === 0 && (
                  <tr>
                    <td colSpan={tableSpecs.length + 2} className="text-center py-8 text-slate-500 font-mono text-xs">
                      Filtreye uyan ham veri kaydı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Full Unpaginated Rows (PDF / Print Mode) */}
              <tbody className="hidden print:table-row-group divide-y divide-slate-200">
                {sortedRows.map((row, idx) => renderRowCells(row, idx + 1))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="p-2.5 border-t border-white/[0.06] bg-[#0c0f16] flex items-center justify-between text-2xs font-mono text-slate-400 no-print">
            <div>
              {sortedRows.length.toLocaleString()} {t.showingEntries} ({sortedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, sortedRows.length)})
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="bg-[#141822] border border-white/[0.08] text-2xs text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value={10}>10 / sayfa</option>
                <option value={25}>25 / sayfa</option>
                <option value={50}>50 / sayfa</option>
              </select>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>
                  {t.pageOf} {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
