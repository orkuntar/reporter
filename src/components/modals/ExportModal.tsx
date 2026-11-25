import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileJson, Layers, Table } from 'lucide-react';
import Papa from 'papaparse';
import { Dataset, DataRow } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { generateXlsxBytes } from '../../core/xlsxExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  filteredRows: DataRow[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  dataset,
  filteredRows,
}) => {
  const { t } = useLanguage();
  const electronAPI = (window as any).electronAPI;
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const exportableColumns = dataset.columns.filter(c => !c.key.startsWith('_derived_'));
  const activeKeySet = new Set(exportableColumns.map(c => c.key));

  const formatCell = (val: any): string => {
    if (val === undefined || val === null) return '';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  const getActiveCuratedSpecs = () => {
    const jFields = dataset.jiraFields || {};
    const descKey = activeKeySet.has('Açıklama')
      ? 'Açıklama'
      : activeKeySet.has('Description')
      ? 'Description'
      : undefined;
    const envMergedKey = '_merged_Özel alan (Ortam)';
    const envKey = activeKeySet.has(envMergedKey)
      ? envMergedKey
      : jFields.environmentCol && activeKeySet.has(jFields.environmentCol)
      ? jFields.environmentCol
      : undefined;

    const specs: { label: string; key: string; isEnv?: boolean }[] = [];
    if (jFields.keyCol && activeKeySet.has(jFields.keyCol)) specs.push({ label: 'Jira Key', key: jFields.keyCol });
    if (jFields.summaryCol && activeKeySet.has(jFields.summaryCol)) specs.push({ label: 'Başlık', key: jFields.summaryCol });
    if (jFields.statusCol && activeKeySet.has(jFields.statusCol)) specs.push({ label: 'Durum', key: jFields.statusCol });
    if (jFields.departmentCol && activeKeySet.has(jFields.departmentCol)) specs.push({ label: 'Departman', key: jFields.departmentCol });
    if (jFields.requesterCol && activeKeySet.has(jFields.requesterCol)) specs.push({ label: 'Talep Sahibi', key: jFields.requesterCol });
    if (descKey) specs.push({ label: 'Açıklama', key: descKey });
    if (envKey) specs.push({ label: 'Ortam', key: envKey, isEnv: true });
    if (jFields.assigneeCol && activeKeySet.has(jFields.assigneeCol)) specs.push({ label: 'Yazılımcı', key: jFields.assigneeCol });
    if (jFields.startDateCol && activeKeySet.has(jFields.startDateCol)) specs.push({ label: 'Başlangıç Tarihi', key: jFields.startDateCol });
    if (jFields.workStartDateCol && activeKeySet.has(jFields.workStartDateCol)) specs.push({ label: 'Yapıma Başlama', key: jFields.workStartDateCol });
    if (jFields.dueCol && activeKeySet.has(jFields.dueCol)) specs.push({ label: 'Bitiş Tarihi', key: jFields.dueCol });

    if (specs.length >= 2) return specs;
    return exportableColumns.slice(0, 12).map(c => ({ label: c.label, key: c.key }));
  };

  const curatedSpecs = getActiveCuratedSpecs();

  const buildCuratedRows = () => {
    return filteredRows.map(r => {
      const obj: Record<string, any> = {};
      curatedSpecs.forEach(spec => {
        obj[spec.label] = formatCell(r[spec.key]);
      });
      return obj;
    });
  };

  // Export Curated 11-Column Excel (.xlsx)
  const handleExportCuratedXLSX = async () => {
    try {
      const curatedData = buildCuratedRows();
      const xlsxBytes = generateXlsxBytes(curatedData, 'Rapor Ozeti');

      if (electronAPI?.saveBinaryFile) {
        const res = await electronAPI.saveBinaryFile({
          defaultName: `${dataset.name}-Ozet-Rapor.xlsx`,
          data: Array.from(xlsxBytes),
          filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
        });
        if (res?.success) {
          setStatusMessage(`Excel (.xlsx) kaydedildi: ${res.filePath}`);
        }
      } else {
        const blob = new Blob([xlsxBytes.slice().buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${dataset.name}-Ozet-Rapor.xlsx`;
        link.click();
        setStatusMessage('Excel (.xlsx) indirildi');
      }
    } catch (e: any) {
      setStatusMessage(`Hata: ${e.message}`);
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Export the Curated 11-column table with UTF-8 BOM for Turkish Excel compatibility
  const handleExportCuratedCSV = async () => {
    try {
      const curatedData = buildCuratedRows();
      const csvContent = '\uFEFF' + Papa.unparse(curatedData);

      if (electronAPI?.saveFile) {
        const res = await electronAPI.saveFile({
          defaultName: `${dataset.name}-Ozet-Rapor-Tablosu.csv`,
          content: csvContent,
          filters: [{ name: 'CSV File', extensions: ['csv'] }],
        });
        if (res?.success) {
          setStatusMessage(`Özet tablo CSV olarak kaydedildi: ${res.filePath}`);
        }
      } else {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${dataset.name}-Ozet-Rapor-Tablosu.csv`;
        link.click();
        setStatusMessage('CSV dosyası indirildi');
      }
    } catch (e: any) {
      setStatusMessage(`Hata: ${e.message}`);
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Export Selected Active Columns with UTF-8 BOM
  const handleExportAllCSV = async () => {
    try {
      const cleanRows = filteredRows.map(row => {
        const obj: Record<string, any> = {};
        exportableColumns.forEach(col => {
          obj[col.label !== col.key ? `${col.label} (${col.key})` : col.key] = formatCell(row[col.key]);
        });
        return obj;
      });

      const csvContent = '\uFEFF' + Papa.unparse(cleanRows);

      if (electronAPI?.saveFile) {
        const res = await electronAPI.saveFile({
          defaultName: `${dataset.name}-Secili-Kolonlar-Export.csv`,
          content: csvContent,
          filters: [{ name: 'CSV File', extensions: ['csv'] }],
        });
        if (res?.success) {
          setStatusMessage(`Seçili kolonlar CSV olarak kaydedildi: ${res.filePath}`);
        }
      } else {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${dataset.name}-Secili-Kolonlar-Export.csv`;
        link.click();
        setStatusMessage('CSV dosyası indirildi');
      }
    } catch (e: any) {
      setStatusMessage(`Hata: ${e.message}`);
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleExportJSON = async () => {
    try {
      const filteredObjRows = filteredRows.map(row => {
        const obj: Record<string, any> = {};
        exportableColumns.forEach(col => {
          obj[col.key] = row[col.key];
        });
        return obj;
      });
      const jsonContent = JSON.stringify(filteredObjRows, null, 2);

      if (electronAPI?.saveFile) {
        const res = await electronAPI.saveFile({
          defaultName: `${dataset.name}-Veri-Export.json`,
          content: jsonContent,
          filters: [{ name: 'JSON Document', extensions: ['json'] }],
        });
        if (res?.success) {
          setStatusMessage(`JSON dosyası kaydedildi: ${res.filePath}`);
        }
      } else {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${dataset.name}-Veri-Export.json`;
        link.click();
        setStatusMessage('JSON dosyası indirildi');
      }
    } catch (e: any) {
      setStatusMessage(`Hata: ${e.message}`);
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6 select-none">
      <div className="bg-[#0f1219] border border-white/[0.12] rounded-lg w-full max-w-lg flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0b0e14]">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white font-mono">
              {t.exportModalTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 font-mono">
          <div className="text-2xs text-slate-400">
            Aktif filtrelenmiş kapsamı aktar (<span className="text-cyan-300 font-bold">{filteredRows.length.toLocaleString()}</span> / {dataset.rows.length.toLocaleString()} {t.records.toLowerCase()} · {exportableColumns.length} seçili kolon).
          </div>

          {statusMessage && (
            <div className="bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs p-2.5 rounded">
              {statusMessage}
            </div>
          )}

          <div className="space-y-2.5">
            {/* Option 1: Curated Excel (.xlsx) */}
            <button
              onClick={handleExportCuratedXLSX}
              className="w-full flex items-center justify-between p-3.5 rounded bg-emerald-950/20 border border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-900/30 transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <Table className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-white font-semibold flex items-center space-x-1.5">
                    <span>Excel Çalışma Kitabı (.xlsx) Olarak Aktar</span>
                    <span className="text-2xs bg-emerald-500/20 text-emerald-300 px-1.5 rounded">{curatedSpecs.length} Özet Kolon</span>
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">{t.exportCuratedDesc}</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 flex-shrink-0" />
            </button>

            {/* Option 2: Curated CSV (UTF-8 BOM) */}
            <button
              onClick={handleExportCuratedCSV}
              className="w-full flex items-center justify-between p-3.5 rounded bg-cyan-950/20 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-900/30 transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-white font-semibold flex items-center space-x-1.5">
                    <span>Özet Rapor Tablosu CSV ({curatedSpecs.length} Kolon)</span>
                    <span className="text-2xs bg-cyan-500/20 text-cyan-300 px-1.5 rounded">UTF-8 BOM</span>
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">{t.exportCuratedDesc}</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 flex-shrink-0" />
            </button>

            {/* Option 3: All Selected Columns CSV (UTF-8 BOM) */}
            <button
              onClick={handleExportAllCSV}
              className="w-full flex items-center justify-between p-3.5 rounded bg-[#141822] border border-white/[0.08] hover:border-white/20 hover:bg-[#181d2a] transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <Layers className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-white font-semibold">
                    Seçili Tüm Kolonları Aktar ({exportableColumns.length} Kolon CSV)
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">{t.exportAllDesc}</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 flex-shrink-0" />
            </button>

            {/* Option 4: JSON Export */}
            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-between p-3.5 rounded bg-[#141822] border border-white/[0.08] hover:border-white/20 hover:bg-[#181d2a] transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <FileJson className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-white font-semibold">{t.exportJsonOption}</div>
                  <div className="text-2xs text-slate-400 mt-0.5">{t.exportJsonDesc}</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 flex-shrink-0" />
            </button>
          </div>
        </div>

        <div className="p-3 border-t border-white/[0.06] bg-[#0b0e14] flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-2xs font-mono text-slate-400 hover:text-white rounded"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
