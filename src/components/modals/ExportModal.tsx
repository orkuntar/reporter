import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileJson, Layers, Check } from 'lucide-react';
import Papa from 'papaparse';
import { Dataset, DataRow } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

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

  // Export the Curated 10-column table
  const handleExportCuratedCSV = async () => {
    try {
      const jFields = dataset.jiraFields || {};
      const keyCol = jFields.keyCol || 'Konu anahtarı';
      const summaryCol = jFields.summaryCol || 'Özet';
      const statusCol = jFields.statusCol || 'Durum';
      const deptCol = jFields.departmentCol || 'Özel alan (Talep Eden Departman)';
      const requesterCol = jFields.requesterCol || 'Özel alan (Talep Sahibi)';
      const descCol = 'Açıklama';
      const envCol = jFields.environmentCol || 'Özel alan (Ortam)';
      const devCol = jFields.assigneeCol || 'Atanan Kişi';
      const startCol = jFields.startDateCol || 'Özel alan (Başlangıç tarihi)';
      const workStartCol = jFields.workStartDateCol || 'Özel alan (Yapım Başlama Tarihi)';
      const dueCol = jFields.dueCol || 'Bitiş tarihi';

      const curatedData = filteredRows.map(r => ({
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

      const csvContent = Papa.unparse(curatedData);

      if (electronAPI?.saveFile) {
        const res = await electronAPI.saveFile({
          defaultName: `${dataset.name}-Ozet-Rapor-Tablosu.csv`,
          content: csvContent,
          filters: [{ name: 'CSV File', extensions: ['csv'] }],
        });
        if (res.success) {
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

  // Export All Columns
  const handleExportAllCSV = async () => {
    try {
      const cleanRows = filteredRows.map(row => {
        const obj: Record<string, any> = {};
        Object.keys(row).forEach(k => {
          if (!k.startsWith('_derived_') && !k.startsWith('_merged_') && k !== '_id') {
            obj[k] = row[k];
          }
        });
        return obj;
      });

      const csvContent = Papa.unparse(cleanRows);

      if (electronAPI?.saveFile) {
        const res = await electronAPI.saveFile({
          defaultName: `${dataset.name}-Tum-Veri-Export.csv`,
          content: csvContent,
          filters: [{ name: 'CSV File', extensions: ['csv'] }],
        });
        if (res.success) {
          setStatusMessage(`Tüm veriler CSV olarak kaydedildi: ${res.filePath}`);
        }
      } else {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${dataset.name}-Tum-Veri-Export.csv`;
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
      const jsonContent = JSON.stringify(filteredRows, null, 2);

      if (electronAPI?.saveFile) {
        const res = await electronAPI.saveFile({
          defaultName: `${dataset.name}-Veri-Export.json`,
          content: jsonContent,
          filters: [{ name: 'JSON Document', extensions: ['json'] }],
        });
        if (res.success) {
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
            Aktif filtrelenmiş kapsamı aktar (<span className="text-cyan-300 font-bold">{filteredRows.length.toLocaleString()}</span> / {dataset.rows.length.toLocaleString()} {t.records.toLowerCase()}).
          </div>

          {statusMessage && (
            <div className="bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs p-2.5 rounded">
              {statusMessage}
            </div>
          )}

          <div className="space-y-2.5">
            {/* Option 1: Curated 10-Column Table Export */}
            <button
              onClick={handleExportCuratedCSV}
              className="w-full flex items-center justify-between p-3.5 rounded bg-cyan-950/20 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-900/30 transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-xs text-white font-semibold flex items-center space-x-1.5">
                    <span>{t.exportCuratedOption}</span>
                    <span className="text-2xs bg-cyan-500/20 text-cyan-300 px-1.5 rounded">Önerilen</span>
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">{t.exportCuratedDesc}</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
            </button>

            {/* Option 2: All 101 Columns CSV */}
            <button
              onClick={handleExportAllCSV}
              className="w-full flex items-center justify-between p-3.5 rounded bg-[#141822] border border-white/[0.08] hover:border-white/20 hover:bg-[#181d2a] transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <Layers className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs text-white font-semibold">{t.exportAllOption}</div>
                  <div className="text-2xs text-slate-400 mt-0.5">{t.exportAllDesc}</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
            </button>

            {/* Option 3: JSON Export */}
            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-between p-3.5 rounded bg-[#141822] border border-white/[0.08] hover:border-white/20 hover:bg-[#181d2a] transition-all text-left group"
            >
              <div className="flex items-center space-x-3">
                <FileJson className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-xs text-white font-semibold">{t.exportJsonOption}</div>
                  <div className="text-2xs text-slate-400 mt-0.5">{t.exportJsonDesc}</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
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
