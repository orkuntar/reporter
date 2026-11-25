import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  BarChart3,
  GitBranch,
  ClipboardCheck,
  Table,
  Grid,
  FileText,
  Database,
  Sun,
  UploadCloud,
  RotateCcw,
  Download,
  CornerDownLeft,
  FileSpreadsheet,
  Columns,
  CheckSquare
} from 'lucide-react';
import { AppView, Dataset, DataRow } from '../../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset | null;
  datasets: Dataset[];
  onNavigateView: (view: AppView) => void;
  onSelectDataset: (id: string) => void;
  onSelectRow: (row: DataRow) => void;
  onToggleTheme: () => void;
  onImportCsv: () => void;
  onOpenExport: () => void;
  onOpenColumnSelection: () => void;
  onClearAllFilters: () => void;
}

interface PaletteItem {
  id: string;
  category: 'Kayıt' | 'Sayfa' | 'Veri Seti' | 'Eylem';
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  dataset,
  datasets,
  onNavigateView,
  onSelectDataset,
  onSelectRow,
  onToggleTheme,
  onImportCsv,
  onOpenExport,
  onOpenColumnSelection,
  onClearAllFilters,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const items: PaletteItem[] = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    const list: PaletteItem[] = [];

    // 1. Matching Rows strictly within active/selected columns
    if (dataset && q.length >= 1) {
      const activeColKeys = dataset.columns.filter(c => !c.key.startsWith('_derived_')).map(c => c.key);
      const activeKeySet = new Set(activeColKeys);
      const keyCol = dataset.jiraFields?.keyCol && activeKeySet.has(dataset.jiraFields.keyCol)
        ? dataset.jiraFields.keyCol
        : activeColKeys[0];
      const summaryCol = dataset.jiraFields?.summaryCol && activeKeySet.has(dataset.jiraFields.summaryCol)
        ? dataset.jiraFields.summaryCol
        : activeColKeys[1] || activeColKeys[0];
      const statusCol = dataset.jiraFields?.statusCol && activeKeySet.has(dataset.jiraFields.statusCol)
        ? dataset.jiraFields.statusCol
        : undefined;

      let matchedCount = 0;
      for (const row of dataset.rows) {
        if (matchedCount >= 8) break;
        const k = keyCol ? String(row[keyCol] || '') : '';
        const s = summaryCol && summaryCol !== keyCol ? String(row[summaryCol] || '') : '';
        const st = statusCol ? String(row[statusCol] || '') : '';
        const matches = activeColKeys.some(colKey => {
          const v = row[colKey];
          if (v === undefined || v === null) return false;
          const str = Array.isArray(v) ? v.join(' ') : String(v);
          return str.toLocaleLowerCase('tr-TR').includes(q);
        });
        if (matches) {
          list.push({
            id: `row_${row._id}`,
            category: 'Kayıt',
            title: k && s ? `${k} — ${s}` : k || s || row._id,
            subtitle: st || undefined,
            icon: FileText,
            action: () => {
              onSelectRow(row);
              onClose();
            },
          });
          matchedCount++;
        }
      }
    }

    // 2. Views
    const views: { id: AppView; label: string; icon: any }[] = [
      { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard },
      { id: 'charts', label: 'Grafik Stüdyosu', icon: BarChart3 },
      ...(dataset?.sourceType === 'jira'
        ? [
            { id: 'jira_analytics' as AppView, label: 'Jira Analitiği', icon: GitBranch },
            { id: 'audit_report' as AppView, label: 'Tarih Eksiklik Raporu', icon: ClipboardCheck },
          ]
        : []),
      ...(dataset?.sourceType === 'jira' || dataset?.jiraFields?.statusCol
        ? [{ id: 'completed_report' as AppView, label: 'Tamamlananlar Raporu (Durum = Tamam)', icon: CheckSquare }]
        : []),
      { id: 'grid', label: 'Veri Tablosu', icon: Table },
      { id: 'pivot', label: 'Çapraz Tablo (Pivot)', icon: Grid },
      { id: 'composer', label: 'Rapor Oluşturucu (PDF)', icon: FileText },
      { id: 'schema', label: 'Şema & Veri Sağlığı', icon: Database },
    ];

    views.forEach(v => {
      if (!q || v.label.toLocaleLowerCase('tr-TR').includes(q)) {
        list.push({
          id: `view_${v.id}`,
          category: 'Sayfa',
          title: v.label,
          subtitle: 'Görünüme Git',
          icon: v.icon,
          action: () => {
            onNavigateView(v.id);
            onClose();
          },
        });
      }
    });

    // 3. Saved Datasets
    datasets.forEach(ds => {
      if (!q || ds.name.toLocaleLowerCase('tr-TR').includes(q) || ds.sourceFile.toLocaleLowerCase('tr-TR').includes(q)) {
        list.push({
          id: `ds_${ds.id}`,
          category: 'Veri Seti',
          title: ds.name,
          subtitle: `${ds.rows.length.toLocaleString()} satır · ${ds.sourceFile}`,
          icon: FileSpreadsheet,
          action: () => {
            onSelectDataset(ds.id);
            onClose();
          },
        });
      }
    });

    // 4. Actions
    const actions: { id: string; title: string; subtitle: string; icon: any; action: () => void }[] = [
      {
        id: 'act_theme',
        title: 'Temayı Değiştir (Dark / Light)',
        subtitle: 'Görünüm Modu',
        icon: Sun,
        action: () => {
          onToggleTheme();
          onClose();
        },
      },
      {
        id: 'act_import',
        title: 'Yeni CSV İçe Aktar',
        subtitle: 'Dosya Seçici',
        icon: UploadCloud,
        action: () => {
          onClose();
          onImportCsv();
        },
      },
      ...(dataset
        ? [
            {
              id: 'act_columns',
              title: 'Kullanılacak Kolonları Seç / Düzenle',
              subtitle: 'Kolon Yapılandırması',
              icon: Columns,
              action: () => {
                onClose();
                onOpenColumnSelection();
              },
            },
          ]
        : []),
      {
        id: 'act_export',
        title: 'Dışa Aktarma Merkezini Aç (.xlsx / .csv / .json)',
        subtitle: 'Dışa Aktar',
        icon: Download,
        action: () => {
          onClose();
          onOpenExport();
        },
      },
      {
        id: 'act_clear',
        title: 'Tüm Filtreleri Temizle',
        subtitle: 'Filtre Sıfırla',
        icon: RotateCcw,
        action: () => {
          onClearAllFilters();
          onClose();
        },
      },
    ];

    actions.forEach(a => {
      if (!q || a.title.toLocaleLowerCase('tr-TR').includes(q)) {
        list.push({
          id: a.id,
          category: 'Eylem',
          title: a.title,
          subtitle: a.subtitle,
          icon: a.icon,
          action: a.action,
        });
      }
    });

    return list;
  }, [query, dataset, datasets, onClose, onNavigateView, onSelectDataset, onSelectRow, onToggleTheme, onImportCsv, onOpenExport, onClearAllFilters]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      items[selectedIndex].action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120] flex items-start justify-center pt-20 p-4 select-none no-print"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f1219] border border-white/[0.14] rounded-lg w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Search Bar */}
        <div className="p-3.5 border-b border-white/[0.08] bg-[#0b0e14] flex items-center space-x-2.5">
          <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jira Key (DUP-383), görev başlığı, veri seti, sayfa veya komut ara..."
            className="w-full bg-transparent text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none"
          />
          <span className="px-1.5 py-0.5 text-2xs font-mono bg-white/[0.05] border border-white/[0.1] text-slate-400 rounded">
            ESC
          </span>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto divide-y divide-white/[0.03] py-1">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIndex;

            return (
              <button
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                  isSelected ? 'bg-cyan-950/40 text-cyan-200' : 'text-slate-300 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 pr-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-medium truncate">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-2xs font-mono text-slate-500 truncate">{item.subtitle}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] text-[9px] font-mono uppercase text-slate-400 rounded">
                    {item.category}
                  </span>
                  {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
              </button>
            );
          })}

          {items.length === 0 && (
            <div className="py-10 text-center text-xs font-mono text-slate-500">
              "{query}" ile eşleşen kayıt, sayfa veya komut bulunamadı.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
