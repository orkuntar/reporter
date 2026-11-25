import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  RefreshCw,
  Search,
  Download,
  Table as TableIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  SlidersHorizontal,
  CornerDownRight,
} from 'lucide-react';
import Papa from 'papaparse';
import { ChartConfig, ColumnMeta, Dataset, DataRow } from '../../types';
import { parseCustomDate } from '../../core/parser';
import { generateXlsxBytes } from '../../core/xlsxExport';
import { ChartRenderer } from '../charts/ChartRenderer';

interface CompletedReportViewProps {
  dataset: Dataset;
  filteredRows: DataRow[];
  columnMetaMap: Map<string, ColumnMeta>;
  onSelectRow: (row: DataRow) => void;
  onChartElementClick?: (columnKey: string, value: string) => void;
  onOpenColumnSelection?: () => void;
}

export const CompletedReportView: React.FC<CompletedReportViewProps> = ({
  dataset,
  filteredRows,
  columnMetaMap,
  onSelectRow,
  onChartElementClick,
  onOpenColumnSelection,
}) => {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const jFields = dataset.jiraFields || {};
  const statusCol = jFields.statusCol && columnMetaMap.has(jFields.statusCol) ? jFields.statusCol : '';
  const keyCol = jFields.keyCol && columnMetaMap.has(jFields.keyCol) ? jFields.keyCol : '';
  const summaryCol = jFields.summaryCol && columnMetaMap.has(jFields.summaryCol) ? jFields.summaryCol : '';
  const descCol = columnMetaMap.has('Açıklama')
    ? 'Açıklama'
    : columnMetaMap.has('Description')
    ? 'Description'
    : '';
  const typeCol = jFields.typeCol && columnMetaMap.has(jFields.typeCol) ? jFields.typeCol : '';
  const startDateCol = jFields.startDateCol && columnMetaMap.has(jFields.startDateCol) ? jFields.startDateCol : '';
  const workStartDateCol =
    jFields.workStartDateCol && columnMetaMap.has(jFields.workStartDateCol)
      ? jFields.workStartDateCol
      : '';
  const dueCol = jFields.dueCol && columnMetaMap.has(jFields.dueCol) ? jFields.dueCol : '';
  const updatedCol =
    jFields.updatedCol && columnMetaMap.has(jFields.updatedCol)
      ? jFields.updatedCol
      : columnMetaMap.has('Güncellendi')
      ? 'Güncellendi'
      : '';
  const lastActorCol =
    jFields.lastActorCol && columnMetaMap.has(jFields.lastActorCol)
      ? jFields.lastActorCol
      : '';
  const hasParentKeyCol = columnMetaMap.has('Üst anahtar');

  // Filter active scope (which already reflects top DateFilterBar + QuickFacets + QueryBuilder)
  // down strictly to records with Durum = Tamam
  const tamamRows = useMemo(() => {
    if (!statusCol) return [];
    return filteredRows.filter(row => {
      const rawStatus = String(row[statusCol] || '').trim().toLocaleLowerCase('tr-TR');
      return rawStatus === 'tamam' || rawStatus === 'done';
    });
  }, [filteredRows, statusCol]);

  // Compute telemetry metrics for Tamam records
  const stats = useMemo(() => {
    let dueFilled = 0;
    let startFilled = 0;
    let workStartFilled = 0;
    let updatedFilled = 0;
    let latestUpdateMs = 0;
    let latestUpdateStr = '';

    tamamRows.forEach(r => {
      if (dueCol && String(r[dueCol] || '').trim() !== '') dueFilled++;
      if (startDateCol && String(r[startDateCol] || '').trim() !== '') startFilled++;
      if (workStartDateCol && String(r[workStartDateCol] || '').trim() !== '') workStartFilled++;
      if (updatedCol) {
        const uRaw = String(r[updatedCol] || '').trim();
        if (uRaw !== '') {
          updatedFilled++;
          const parsed = parseCustomDate(uRaw);
          if (parsed && parsed.getTime() > latestUpdateMs) {
            latestUpdateMs = parsed.getTime();
            latestUpdateStr = uRaw;
          }
        }
      }
    });

    const total = tamamRows.length;
    const dueRate = total > 0 ? Math.round((dueFilled / total) * 1000) / 10 : 0;
    const scopeRatio =
      filteredRows.length > 0 ? Math.round((total / filteredRows.length) * 1000) / 10 : 0;

    return {
      total,
      dueFilled,
      dueMissing: total - dueFilled,
      dueRate,
      startFilled,
      workStartFilled,
      updatedFilled,
      latestUpdateStr,
      scopeRatio,
    };
  }, [tamamRows, filteredRows.length, dueCol, startDateCol, workStartDateCol, updatedCol]);

  // Search filter within Tamam rows
  const searchedRows = useMemo(() => {
    if (!search.trim()) return tamamRows;
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return tamamRows.filter(row => {
      const fieldsToCheck = [
        keyCol ? row[keyCol] : row._id,
        summaryCol ? row[summaryCol] : '',
        descCol ? row[descCol] : '',
        startDateCol ? row[startDateCol] : '',
        workStartDateCol ? row[workStartDateCol] : '',
        dueCol ? row[dueCol] : '',
        updatedCol ? row[updatedCol] : '',
        lastActorCol ? row[lastActorCol] : '',
        statusCol ? row[statusCol] : '',
      ];
      return fieldsToCheck.some(v => String(v || '').toLocaleLowerCase('tr-TR').includes(q));
    });
  }, [
    tamamRows,
    search,
    keyCol,
    summaryCol,
    descCol,
    startDateCol,
    workStartDateCol,
    dueCol,
    updatedCol,
    lastActorCol,
    statusCol,
  ]);

  // Sort rows across the report columns
  const sortedRows = useMemo(() => {
    const activeSort = sortCol || dueCol || updatedCol || keyCol;
    if (!activeSort) return searchedRows;

    const isDateSort =
      activeSort === startDateCol ||
      activeSort === workStartDateCol ||
      activeSort === dueCol ||
      activeSort === updatedCol;

    const copy = [...searchedRows];
    copy.sort((a, b) => {
      const valA = a[activeSort];
      const valB = b[activeSort];

      const emptyA = valA === undefined || valA === null || String(valA).trim() === '';
      const emptyB = valB === undefined || valB === null || String(valB).trim() === '';
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

      if (activeSort === keyCol && keyCol) {
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
  }, [searchedRows, sortCol, sortDir, startDateCol, workStartDateCol, dueCol, updatedCol, keyCol]);

  const activeSortCol = sortCol || dueCol || updatedCol || keyCol;

  const handleSortClick = (colKey: string) => {
    if (!colKey) return;
    if (activeSortCol === colKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
    setPage(1);
  };

  const renderSortIcon = (colKey: string) => {
    if (!colKey) return null;
    if (activeSortCol !== colKey) {
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

  // Build rows for export (strictly matching this report's columns)
  const buildReportExportRows = () => {
    return sortedRows.map(r => {
      const obj: Record<string, string> = {
        Key: keyCol ? String(r[keyCol] || '') : r._id,
        Başlık: summaryCol ? String(r[summaryCol] || '') : '',
        Açıklama: descCol ? String(r[descCol] || '') : '',
        'Başlangıç Tarihi': startDateCol ? String(r[startDateCol] || '') : '',
        'Yapım Başlama Tarihi': workStartDateCol ? String(r[workStartDateCol] || '') : '',
        'Bitiş Tarihi': dueCol ? String(r[dueCol] || '') : '',
        'Son Güncelleme Tarihi': updatedCol ? String(r[updatedCol] || '') : '',
        'Son İşlem Yapan (E-posta)': lastActorCol ? String(r[lastActorCol] || '') : '',
        Durum: statusCol ? String(r[statusCol] || '') : '',
      };
      return obj;
    });
  };

  const handleExportCsv = () => {
    const csv = '\uFEFF' + Papa.unparse(buildReportExportRows());
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.saveFile) {
      electronAPI.saveFile({
        defaultName: `${dataset.name}-Tamamlananlar-Raporu.csv`,
        content: csv,
        filters: [{ name: 'CSV File', extensions: ['csv'] }],
      });
    } else {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset.name}-Tamamlananlar-Raporu.csv`;
      a.click();
    }
  };

  const handleExportXlsx = async () => {
    const bytes = generateXlsxBytes(buildReportExportRows(), 'Tamamlananlar');
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.saveBinaryFile) {
      await electronAPI.saveBinaryFile({
        defaultName: `${dataset.name}-Tamamlananlar-Raporu.xlsx`,
        data: Array.from(bytes),
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
      });
    } else {
      const blob = new Blob([bytes.slice().buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset.name}-Tamamlananlar-Raporu.xlsx`;
      a.click();
    }
  };

  if (!statusCol) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 font-mono">
        <div className="w-14 h-14 rounded-md bg-emerald-950/30 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-sm font-bold text-white">
            Tamamlananlar Raporu İçin Durum Kolonu Atanmamış
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Bu raporun <span className="text-emerald-300 font-semibold">Durum = Tamam</span> filtresini uygulayabilmesi için{' '}
            <span className="text-cyan-300 font-semibold">Durum (Status)</span> ana alanının eşleştirilmiş ve seçili olması gerekir.
          </p>
        </div>
        {onOpenColumnSelection && (
          <button
            onClick={onOpenColumnSelection}
            className="px-4 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-semibold text-cyan-300 transition-colors"
          >
            Ana Alan Eşleştirmesini Aç
          </button>
        )}
      </div>
    );
  }

  const reportCharts: ChartConfig[] = [
    ...(dueCol
      ? [
          {
            id: 'completed_by_due',
            title: 'Bitiş Tarihine Göre Tamamlananlar (Haftalık)',
            type: 'area' as const,
            xAxisCol: dueCol,
            dateGranularity: 'week' as const,
            aggregation: 'count' as const,
            colorPalette: 'emerald' as const,
            sortBy: 'date_asc' as const,
          },
        ]
      : []),
    ...(updatedCol
      ? [
          {
            id: 'completed_by_updated',
            title: 'Son Güncelleme Tarihine Göre Tamamlananlar',
            type: 'bar_vertical' as const,
            xAxisCol: updatedCol,
            dateGranularity: 'week' as const,
            aggregation: 'count' as const,
            colorPalette: 'technical' as const,
            sortBy: 'date_asc' as const,
          },
        ]
      : []),
  ];

  const renderTableRow = (row: DataRow, rowNum: number) => {
    const keyVal = keyCol ? row[keyCol] : row._id;
    const summaryVal = summaryCol ? row[summaryCol] : '';
    const descVal = descCol ? String(row[descCol] || '') : '';
    const startVal = startDateCol ? row[startDateCol] : '';
    const workStartVal = workStartDateCol ? row[workStartDateCol] : '';
    const dueVal = dueCol ? row[dueCol] : '';
    const updatedVal = updatedCol ? row[updatedCol] : '';
    const lastActorVal = lastActorCol ? String(row[lastActorCol] || '').trim() : '';
    const statusVal = statusCol ? row[statusCol] : '';

    const typeVal = typeCol ? String(row[typeCol] || '').toLowerCase() : '';
    const parentKeyVal = hasParentKeyCol ? String(row['Üst anahtar'] || '').trim() : '';
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
        <td className="px-3 py-2 text-2xs text-slate-600 border-r border-white/[0.04]">{rowNum}</td>

        {/* Key */}
        <td className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">
          <div className={`flex items-center space-x-1.5 ${isSubtask ? 'pl-2' : ''}`}>
            {isSubtask && <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
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

        {/* Başlık */}
        <td
          className="px-3 py-2 text-slate-200 border-r border-white/[0.04] font-medium max-w-xs truncate"
          title={summaryVal}
        >
          {summaryVal || '-'}
        </td>

        {/* Açıklama */}
        <td
          className="px-3 py-2 text-slate-400 border-r border-white/[0.04] max-w-sm truncate text-2xs"
          title={descVal}
        >
          {descVal ? descVal.replace(/\n/g, ' ') : '-'}
        </td>

        {/* Başlangıç Tarihi */}
        <td className="px-3 py-2 text-emerald-400 border-r border-white/[0.04] whitespace-nowrap text-2xs">
          {startVal || '-'}
        </td>

        {/* Yapım Başlama Tarihi */}
        <td className="px-3 py-2 text-cyan-400 border-r border-white/[0.04] whitespace-nowrap text-2xs">
          {workStartVal || '-'}
        </td>

        {/* Bitiş Tarihi */}
        <td className="px-3 py-2 text-amber-400 border-r border-white/[0.04] whitespace-nowrap text-2xs font-semibold">
          {dueVal || '-'}
        </td>

        {/* Son Güncelleme Tarihi */}
        <td className="px-3 py-2 text-slate-300 border-r border-white/[0.04] whitespace-nowrap text-2xs">
          {updatedVal || '-'}
        </td>

        {/* Son İşlem Yapan (E-posta) */}
        <td
          className="px-3 py-2 text-slate-300 border-r border-white/[0.04] whitespace-nowrap text-2xs max-w-[200px] truncate"
          title={lastActorVal}
        >
          {lastActorVal || '-'}
        </td>

        {/* Durum */}
        <td className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap">
          <span className="px-1.5 py-0.5 border rounded text-2xs font-medium bg-emerald-950/40 text-emerald-300 border-emerald-500/30">
            {statusVal || 'Tamam'}
          </span>
        </td>

        <td className="px-3 py-2 text-center text-slate-500 group-hover:text-cyan-400 no-print">
          <Maximize2 className="w-3.5 h-3.5 inline-block" />
        </td>
      </tr>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              Özel Durum & Tarih İzleme Raporu
            </span>
            <span className="px-1.5 py-0.2 bg-emerald-950/40 border border-emerald-500/30 text-2xs font-mono text-emerald-300 rounded">
              DURUM = TAMAM
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            Tamamlanan İşler Tarih & Güncelleme Raporu
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Üstteki tarih ve hızlı filtre kapsamı içindeki yalnızca <strong className="text-emerald-300">Tamam</strong> statüsündeki kayıtları listeler.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-2xs font-mono text-slate-400">
          {onOpenColumnSelection && (
            <button
              onClick={onOpenColumnSelection}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-white/[0.04] hover:bg-cyan-950/40 border border-white/[0.1] hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors no-print"
              title="Tarih ve Durum kolon eşleştirmelerini düzenle"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Alan Eşleştirme</span>
            </button>
          )}
          <div className="text-right">
            <div>
              RAPOR KAPSAMI: <span className="text-emerald-400 font-bold">{stats.total.toLocaleString()}</span> Tamam
            </div>
            <div className="text-slate-500 mt-0.5">
              Üst Filtre: {filteredRows.length.toLocaleString()} kayıt (%{stats.scopeRatio})
            </div>
          </div>
        </div>
      </div>

      {/* KPI Telemetry Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              Durum = Tamam Kayıt
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {stats.total.toLocaleString()}
          </div>
          <div className="mt-1 text-2xs font-mono text-emerald-400">
            Aktif filtrenin %{stats.scopeRatio}&apos;i
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/40" />
        </div>

        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              Bitiş Tarihi Dolu
            </span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {dueCol ? stats.dueFilled.toLocaleString() : '—'}
          </div>
          <div className="mt-1 text-2xs font-mono text-slate-400 flex items-center justify-between">
            <span>{dueCol ? `%${stats.dueRate} dolu` : 'Bitiş kolonu atanmamış'}</span>
            {dueCol && <span className="text-amber-400">{stats.dueMissing} boş</span>}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/40" />
        </div>

        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              Başlangıç & Yapım Tarihi
            </span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {startDateCol ? stats.startFilled.toLocaleString() : '—'}
          </div>
          <div className="mt-1 text-2xs font-mono text-slate-400 flex items-center justify-between">
            <span>Başlangıç dolu</span>
            <span className="text-cyan-400">
              {workStartDateCol ? `${stats.workStartFilled} yapım baş.` : 'Yapım baş. yok'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500/40" />
        </div>

        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              Son Güncelleme Tarihi
            </span>
            <RefreshCw className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-white truncate" title={stats.latestUpdateStr}>
            {updatedCol ? stats.latestUpdateStr || '-' : '—'}
          </div>
          <div className="mt-1 text-2xs font-mono text-indigo-400">
            {updatedCol ? `${stats.updatedFilled.toLocaleString()} kayıtta güncelleme var` : 'Güncelleme kolonu yok'}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500/40" />
        </div>
      </div>

      {/* Charts */}
      {reportCharts.length > 0 && (
        <div className={`grid grid-cols-1 ${reportCharts.length > 1 ? 'lg:grid-cols-2' : ''} gap-5`}>
          {reportCharts.map(cfg => (
            <div
              key={cfg.id}
              className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-2">
                <span className="text-xs font-mono font-semibold text-slate-200">{cfg.title}</span>
                <span className="text-2xs font-mono uppercase text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">
                  {cfg.type.replace('_', ' ')}
                </span>
              </div>
              <ChartRenderer
                config={cfg}
                rows={tamamRows}
                columnMetaMap={columnMetaMap}
                height={250}
                onElementClick={onChartElementClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* Report Data Table */}
      <div className="bg-[#0f1219] border border-white/[0.08] rounded-md overflow-hidden select-none print-break-inside">
        <div className="p-3.5 bg-[#0c0f16] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-slate-200">
                Tamamlanan Görevler Tablosu (Durum = Tamam)
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-2xs font-mono rounded">
                {sortedRows.length.toLocaleString()} kayıt
              </span>
            </div>
            <p className="text-2xs font-mono text-slate-500 mt-0.5">
              Kolonlar: Key, Başlık, Açıklama, Başlangıç Tarihi, Yapım Başlama Tarihi, Bitiş Tarihi, Son Güncelleme Tarihi, Son İşlem Yapan (E-posta), Durum
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Key, başlık, açıklama, e-posta veya tarih ara..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="bg-[#141822] border border-white/[0.08] rounded text-2xs text-slate-200 pl-7 pr-2.5 py-1 font-mono focus:outline-none focus:border-cyan-500 w-60"
              />
            </div>

            <button
              type="button"
              onClick={handleExportXlsx}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-2xs font-mono text-emerald-300 hover:text-white bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 rounded transition-colors"
              title="Bu raporu Excel (.xlsx) olarak indir"
            >
              <TableIcon className="w-3 h-3" />
              <span>XLSX</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-2xs font-mono text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded transition-colors"
              title="Bu raporu UTF-8 BOM CSV olarak indir"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {!lastActorCol && (
          <div className="px-3.5 py-2 bg-amber-950/20 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-2xs font-mono text-amber-200/90 no-print">
            <span>
              Bilgi: Yüklü CSV dosyasında kullanıcı e-posta veya &quot;Son İşlem Yapan&quot; kolonu bulunamadı (Jira Cloud CSV çıktıları yalnızca ad ve hesap kimliği içerir). E-posta içeren bir kolonunuz varsa eşleştirebilirsiniz.
            </span>
            {onOpenColumnSelection && (
              <button
                type="button"
                onClick={onOpenColumnSelection}
                className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 font-semibold transition-colors"
              >
                Kolon Eşleştir
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead className="bg-[#0a0c10] border-b border-white/[0.06] text-2xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-slate-600 border-r border-white/[0.04] w-10">#</th>
                <th
                  onClick={() => handleSortClick(keyCol)}
                  className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1">
                    <span>Key</span>
                    {renderSortIcon(keyCol)}
                  </div>
                </th>
                <th
                  onClick={() => handleSortClick(summaryCol)}
                  className="px-3 py-2 border-r border-white/[0.04] min-w-[200px] cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1">
                    <span>Başlık</span>
                    {renderSortIcon(summaryCol)}
                  </div>
                </th>
                <th
                  onClick={() => handleSortClick(descCol)}
                  className="px-3 py-2 border-r border-white/[0.04] min-w-[220px] cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1">
                    <span>Açıklama</span>
                    {renderSortIcon(descCol)}
                  </div>
                </th>
                <th
                  onClick={() => handleSortClick(startDateCol)}
                  className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1">
                    <span>Başlangıç Tarihi</span>
                    {renderSortIcon(startDateCol)}
                  </div>
                </th>
                <th
                  onClick={() => handleSortClick(workStartDateCol)}
                  className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1">
                    <span>Yapım Başlama Tarihi</span>
                    {renderSortIcon(workStartDateCol)}
                  </div>
                </th>
                <th
                  onClick={() => handleSortClick(dueCol)}
                  className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1">
                    <span>Bitiş Tarihi</span>
                    {renderSortIcon(dueCol)}
                  </div>
                </th>
                <th
                  onClick={() => handleSortClick(updatedCol)}
                  className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1">
                    <span>Son Güncelleme Tarihi</span>
                    {renderSortIcon(updatedCol)}
                  </div>
                </th>
                <th
                  onClick={() => handleSortClick(lastActorCol)}
                  className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1">
                    <span>Son İşlem Yapan (E-posta)</span>
                    {renderSortIcon(lastActorCol)}
                  </div>
                </th>
                <th
                  onClick={() => handleSortClick(statusCol)}
                  className="px-3 py-2 border-r border-white/[0.04] whitespace-nowrap cursor-pointer hover:text-white"
                >
                  <div className="flex items-center space-x-1">
                    <span>Durum</span>
                    {renderSortIcon(statusCol)}
                  </div>
                </th>
                <th className="px-3 py-2 text-center w-12 no-print">Detay</th>
              </tr>
            </thead>

            {/* Screen paginated rows */}
            <tbody className="divide-y divide-white/[0.04] print:hidden">
              {pagedRows.map((row, idx) =>
                renderTableRow(row, (currentPage - 1) * pageSize + idx + 1)
              )}

              {pagedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center py-8 text-slate-500 font-mono text-xs"
                  >
                    Aktif filtre kapsamında Durum = Tamam olan kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Print unpaginated rows */}
            <tbody className="hidden print:table-row-group divide-y divide-slate-200">
              {sortedRows.map((row, idx) => renderTableRow(row, idx + 1))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-2.5 border-t border-white/[0.06] bg-[#0c0f16] flex items-center justify-between text-2xs font-mono text-slate-400 no-print">
          <div>
            {sortedRows.length.toLocaleString()} kayıt listeleniyor (
            {sortedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
            {Math.min(currentPage * pageSize, sortedRows.length)})
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
              <option value={15}>15 / sayfa</option>
              <option value={25}>25 / sayfa</option>
              <option value={50}>50 / sayfa</option>
              <option value={100}>100 / sayfa</option>
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
                Sayfa {currentPage} / {totalPages}
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
    </div>
  );
};
