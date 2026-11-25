import React, { useState } from 'react';
import {
  Printer,
  Trash2,
  Plus,
  MoveUp,
  MoveDown,
} from 'lucide-react';
import { ChartConfig, ColumnMeta, Dataset, DataRow } from '../../types';
import { ChartRenderer } from '../charts/ChartRenderer';
import { CuratedDataTable } from '../common/CuratedDataTable';
import { useLanguage } from '../../i18n/LanguageContext';

interface ComposerViewProps {
  dataset: Dataset;
  filteredRows: DataRow[];
  columnMetaMap: Map<string, ColumnMeta>;
  composerCharts: ChartConfig[];
  reportTitle: string;
  reportNotes: string;
  onChangeReportTitle: (title: string) => void;
  onChangeReportNotes: (notes: string) => void;
  onUpdateComposerCharts: (charts: ChartConfig[]) => void;
  onSelectRow: (row: DataRow) => void;
}

export const ComposerView: React.FC<ComposerViewProps> = ({
  dataset,
  filteredRows,
  columnMetaMap,
  composerCharts,
  reportTitle,
  reportNotes,
  onChangeReportTitle,
  onChangeReportNotes,
  onUpdateComposerCharts,
  onSelectRow,
}) => {
  const { t } = useLanguage();
  const electronAPI = (window as any).electronAPI;
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= composerCharts.length) return;
    const next = [...composerCharts];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    onUpdateComposerCharts(next);
  };

  const handleRemove = (id: string) => {
    onUpdateComposerCharts(composerCharts.filter(c => c.id !== id));
  };

  const handleAddDefaultChart = () => {
    const newChart: ChartConfig = {
      id: `composer_${Date.now()}`,
      title: 'Yeni Analitik Blok',
      type: 'bar_vertical',
      xAxisCol: dataset.columns[0]?.key || '',
      aggregation: 'count',
      colorPalette: 'technical',
      topN: 10,
    };
    onUpdateComposerCharts([...composerCharts, newChart]);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportStatus('PDF raporu oluşturuluyor...');
    try {
      if (electronAPI?.exportPdf) {
        const res = await electronAPI.exportPdf({
          fileName: `${dataset.name}-Raporu.pdf`,
          landscape: true,
        });
        if (res?.success) {
          setExportStatus(`Rapor başarıyla kaydedildi: ${res.filePath}`);
        } else if (res?.canceled) {
          setExportStatus(null);
        } else {
          setExportStatus(`Hata oluştu: ${res?.error}`);
        }
      } else {
        window.print();
        setExportStatus('Yazdırma penceresi açıldı');
      }
    } catch (e: any) {
      setExportStatus(`Hata: ${e.message}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus(null), 4000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#080a0e] select-none print-container">
      {/* Top Composer Control Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 no-print">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
              {t.composerTitle}
            </span>
            <span className="px-1.5 py-0.2 bg-white/[0.05] border border-white/[0.1] text-2xs font-mono text-slate-300 rounded">
              {composerCharts.length} {t.block}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            {t.reportComposer}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddDefaultChart}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-2xs font-mono uppercase tracking-wider text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.addBlock}</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-2xs font-mono uppercase tracking-wider text-black font-semibold bg-cyan-400 hover:bg-cyan-300 rounded transition-colors disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Oluşturuluyor...' : t.exportPdf}</span>
          </button>
        </div>
      </div>

      {exportStatus && (
        <div className="bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs font-mono px-3 py-2 rounded no-print">
          {exportStatus}
        </div>
      )}

      {/* Editable Report Header Sheet */}
      <div className="bg-[#0f1219] border border-white/[0.08] rounded-md p-6 space-y-3 print-break-inside">
        <input
          type="text"
          value={reportTitle}
          onChange={(e) => onChangeReportTitle(e.target.value)}
          placeholder="Rapor Başlığı..."
          className="w-full bg-transparent border-b border-white/[0.1] text-lg font-bold text-white pb-1 font-mono focus:outline-none focus:border-cyan-500"
        />

        <textarea
          value={reportNotes}
          onChange={(e) => onChangeReportNotes(e.target.value)}
          placeholder={t.reportNotes}
          rows={2}
          className="w-full bg-[#141822] border border-white/[0.08] rounded text-xs text-slate-300 p-2 font-mono focus:outline-none focus:border-cyan-500"
        />

        <div className="flex items-center space-x-4 text-2xs font-mono text-slate-400 pt-1">
          <span>VERİ KÜMESİ: {dataset.name}</span>
          <span>•</span>
          <span>FİLTRELENMİŞ KAYIT: {filteredRows.length.toLocaleString()}</span>
          <span>•</span>
          <span>OLUŞTURULMA: {new Date().toLocaleDateString('tr-TR')}</span>
        </div>
      </div>

      {/* Report Chart Blocks */}
      <div className="space-y-6">
        {composerCharts.map((cfg, idx) => (
          <div
            key={cfg.id}
            className="bg-[#0f1219] border border-white/[0.08] rounded-md p-5 flex flex-col justify-between group print-break-inside"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xs font-mono text-slate-400 font-bold no-print">
                  {t.block} {idx + 1}
                </span>
                <input
                  type="text"
                  value={cfg.title}
                  onChange={(e) => {
                    const next = [...composerCharts];
                    next[idx].title = e.target.value;
                    onUpdateComposerCharts(next);
                  }}
                  className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-cyan-500 text-sm font-semibold text-slate-200 font-mono px-1 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-1 no-print">
                <button
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                  title="Yukarı Taşı"
                >
                  <MoveUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === composerCharts.length - 1}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                  title="Aşağı Taşı"
                >
                  <MoveDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRemove(cfg.id)}
                  className="p-1 text-slate-400 hover:text-rose-400"
                  title="Kaldır"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <ChartRenderer
              config={cfg}
              rows={filteredRows}
              columnMetaMap={columnMetaMap}
              height={320}
            />
          </div>
        ))}
      </div>

      {/* Embedded Raw Data Table for the Report Document */}
      <div className="pt-2">
        <CuratedDataTable
          dataset={dataset}
          filteredRows={filteredRows}
          onSelectRow={onSelectRow}
          title={t.curatedTableTitle}
        />
      </div>
    </div>
  );
};
