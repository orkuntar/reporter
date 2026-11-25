import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  CornerDownRight
} from 'lucide-react';
import Papa from 'papaparse';
import { Dataset, DataRow } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface CuratedDataTableProps {
  dataset: Dataset;
  filteredRows: DataRow[];
  onSelectRow: (row: DataRow) => void;
  title?: string;
  defaultExpanded?: boolean;
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

  // Field keys resolution
  const jFields = dataset.jiraFields || {};
  const keyCol = jFields.keyCol || 'Konu anahtarı';
  const summaryCol = jFields.summaryCol || 'Özet';
  const statusCol = jFields.statusCol || 'Durum';
  const typeCol = jFields.typeCol || 'Konu Türü';
  const parentKeyCol = 'Üst anahtar';
  const parentSummaryCol = 'Parent summary';
  const deptCol = jFields.departmentCol || 'Özel alan (Talep Eden Departman)';
  const requesterCol = jFields.requesterCol || 'Özel alan (Talep Sahibi)';
  const descCol = 'Açıklama';
  const envCol = jFields.environmentCol || 'Özel alan (Ortam)';
  const devCol = jFields.assigneeCol || 'Atanan Kişi';
  const startCol = jFields.startDateCol || 'Özel alan (Başlangıç tarihi)';
  const workStartCol = jFields.workStartDateCol || 'Özel alan (Yapım Başlama Tarihi)';
  const dueCol = jFields.dueCol || 'Bitiş tarihi';

  // Search filter inside curated table
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return filteredRows;
    const q = search.toLowerCase().trim();
    return filteredRows.filter(row => {
      const k = String(row[keyCol] || '').toLowerCase();
      const s = String(row[summaryCol] || '').toLowerCase();
      const st = String(row[statusCol] || '').toLowerCase();
      const dp = String(row[deptCol] || '').toLowerCase();
      const rq = String(row[requesterCol] || '').toLowerCase();
      const ds = String(row[descCol] || '').toLowerCase();
      const env = String(row[envCol] || '').toLowerCase();
      const dev = String(row[devCol] || '').toLowerCase();
      return k.includes(q) || s.includes(q) || st.includes(q) || dp.includes(q) || rq.includes(q) || ds.includes(q) || env.includes(q) || dev.includes(q);
    });
  }, [filteredRows, search, keyCol, summaryCol, statusCol, deptCol, requesterCol, descCol, envCol, devCol]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(searchFiltered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = searchFiltered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Export this curated table specifically
  const handleExportCuratedCsv = () => {
    const exportData = searchFiltered.map(r => ({
      'Jira Key': r[keyCol] || '',
      'Başlık': r[summaryCol] || '',
      'Durum': r[statusCol] || '',
      'Departman': r[deptCol] || '',
      'Talep Sahibi': r[requesterCol] || '',
      'Açıklama': r[descCol] || '',
      'Ortam': r[envCol] || '',
      'Yazılımcı': r[devCol] || '',
      'Başlangıç Tarihi': r[startCol] || '',
      'Yapıma Başlama': r[workStartCol] || '',
      'Bitiş Tarihi': r[dueCol] || '',
    }));

    const csv = Papa.unparse(exportData);
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

  return (
    <div className="bg-[#0f1219] border border-white/[0.08] rounded-md overflow-hidden select-none">
      {/* Header Bar */}
      <div className="p-3.5 bg-[#0c0f16] border-b border-white/[0.06] flex items-center justify-between">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-slate-200 group-hover:text-white">
                {title || t.curatedTableTitle}
              </span>
              <span className="px-1.5 py-0.2 bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-2xs font-mono rounded">
                {searchFiltered.length.toLocaleString()} {t.records.toLowerCase()}
              </span>
            </div>
            <p className="text-2xs font-mono text-slate-500">
              {t.curatedTableSubtitle}
            </p>
          </div>
        </div>

        {isExpanded && (
          <div className="flex items-center space-x-2">
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
                  <th className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">{t.colJiraKey}</th>
                  <th className="px-3 py-2 border-r border-white/[0.04] min-w-[200px]">{t.colSummary}</th>
                  <th className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">{t.colStatus}</th>
                  <th className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">{t.colDepartment}</th>
                  <th className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">{t.colRequester}</th>
                  <th className="px-3 py-2 border-r border-white/[0.04] min-w-[220px]">{t.colDescription}</th>
                  <th className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">{t.colEnvironment}</th>
                  <th className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">{t.colDeveloper}</th>
                  <th className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">{t.colStartDate}</th>
                  <th className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">{t.colWorkStartDate}</th>
                  <th className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">{t.colEndDate}</th>
                  <th className="px-3 py-2 text-center w-12">{t.detailAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pagedRows.map((row, idx) => {
                  const rowNum = (currentPage - 1) * pageSize + idx + 1;
                  const keyVal = row[keyCol];
                  const summaryVal = row[summaryCol];
                  const statusVal = row[statusCol];
                  const typeVal = String(row[typeCol] || '').toLowerCase();
                  const parentKeyVal = String(row[parentKeyCol] || '').trim();
                  const parentSummaryVal = String(row[parentSummaryCol] || '').trim();
                  const isSubtask =
                    typeVal.includes('alt görev') ||
                    typeVal.includes('sub-task') ||
                    typeVal.includes('subtask') ||
                    Boolean(parentKeyVal);

                  const deptVal = row[deptCol];
                  const reqVal = row[requesterCol];
                  const descVal = row[descCol];
                  const envVal = row[envCol];
                  const devVal = row[devCol];
                  const startVal = row[startCol];
                  const workStartVal = row[workStartCol];
                  const dueVal = row[dueCol];

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

                      {/* Jira Key (Indented with hierarchy icon if Sub-task) */}
                      <td className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">
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
                            {keyVal || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Summary + Sub-task Breadcrumb */}
                      <td className="px-3 py-2 text-slate-200 border-r border-white/[0.04] font-medium max-w-xs" title={summaryVal}>
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
                        <div className="truncate">{summaryVal || '-'}</div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">
                        {statusVal ? (
                          <span
                            className={`px-1.5 py-0.5 border rounded text-2xs font-medium ${
                              String(statusVal).toLowerCase().includes('tamam') || String(statusVal).toLowerCase().includes('done')
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                                : String(statusVal).toLowerCase().includes('devam') || String(statusVal).toLowerCase().includes('progress')
                                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
                                : String(statusVal).toLowerCase().includes('test')
                                ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                                : String(statusVal).toLowerCase().includes('iptal') || String(statusVal).toLowerCase().includes('cancel')
                                ? 'bg-rose-950/50 text-rose-300 border-rose-500/30'
                                : 'bg-white/[0.04] text-slate-300 border-white/[0.08]'
                            }`}
                          >
                            {statusVal}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Department */}
                      <td className="px-3 py-2 text-slate-300 border-r border-white/[0.04] whitespace-nowrap">
                        {deptVal ? (
                          <span className="px-1.5 py-0.5 bg-white/[0.03] border border-white/[0.08] text-slate-300 rounded text-2xs">
                            {deptVal}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Requester */}
                      <td className="px-3 py-2 text-slate-300 border-r border-white/[0.04] whitespace-nowrap truncate max-w-[130px]" title={reqVal}>
                        {reqVal || '-'}
                      </td>

                      {/* Description */}
                      <td className="px-3 py-2 text-slate-400 border-r border-white/[0.04] max-w-sm truncate text-2xs" title={descVal}>
                        {descVal ? descVal.replace(/\n/g, ' ') : '-'}
                      </td>

                      {/* Environment */}
                      <td className="px-3 py-2 text-slate-300 border-r border-white/[0.04] whitespace-nowrap">
                        {envVal ? (
                          <span className="px-1.5 py-0.5 bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 rounded text-2xs">
                            {envVal}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Developer */}
                      <td className="px-3 py-2 text-slate-300 border-r border-white/[0.04] whitespace-nowrap truncate max-w-[130px]" title={devVal}>
                        {devVal || '-'}
                      </td>

                      {/* Start Date */}
                      <td className="px-3 py-2 text-emerald-400 border-r border-white/[0.04] whitespace-nowrap text-2xs">
                        {startVal || '-'}
                      </td>

                      {/* Work Start Date */}
                      <td className="px-3 py-2 text-cyan-400 border-r border-white/[0.04] whitespace-nowrap text-2xs">
                        {workStartVal || '-'}
                      </td>

                      {/* End Date */}
                      <td className="px-3 py-2 text-amber-400 border-r border-white/[0.04] whitespace-nowrap text-2xs">
                        {dueVal || '-'}
                      </td>

                      {/* Detail Icon */}
                      <td className="px-3 py-2 text-center text-slate-500 group-hover:text-cyan-400">
                        <Maximize2 className="w-3.5 h-3.5 inline-block" />
                      </td>
                    </tr>
                  );
                })}

                {pagedRows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-center py-8 text-slate-500 font-mono text-xs">
                      Filtreye uyan ham veri kaydı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="p-2.5 border-t border-white/[0.06] bg-[#0c0f16] flex items-center justify-between text-2xs font-mono text-slate-400">
            <div>
              {searchFiltered.length.toLocaleString()} {t.showingEntries} ({(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, searchFiltered.length)})
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
