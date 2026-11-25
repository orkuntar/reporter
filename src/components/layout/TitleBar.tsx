import React, { useState } from 'react';
import { Minus, Square, X, UploadCloud, FileSpreadsheet, HardDrive, Database, Sun, Moon, Edit3, Check } from 'lucide-react';
import { Dataset } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';

interface TitleBarProps {
  currentDataset: Dataset | null;
  datasets: Dataset[];
  onSelectDataset: (id: string) => void;
  onRenameDataset: (id: string, newName: string) => void;
  onOpenDatasetManager: () => void;
  onImportClick: () => void;
  onLoadDesktopJira: () => void;
  loading: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentDataset,
  datasets,
  onSelectDataset,
  onRenameDataset,
  onOpenDatasetManager,
  onImportClick,
  onLoadDesktopJira,
  loading
}) => {
  const electronAPI = (window as any).electronAPI;
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const startRename = () => {
    if (!currentDataset) return;
    setRenameValue(currentDataset.name);
    setIsRenaming(true);
  };

  const confirmRename = () => {
    if (currentDataset && renameValue.trim()) {
      onRenameDataset(currentDataset.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleMinimize = () => {
    electronAPI?.minimizeWindow?.();
  };

  const handleMaximize = () => {
    electronAPI?.maximizeWindow?.();
  };

  const handleClose = () => {
    electronAPI?.closeWindow?.();
  };

  return (
    <div className="h-10 w-full bg-[#07080b] border-b border-white/[0.06] flex items-center justify-between px-3 window-drag-region select-none z-50">
      {/* Brand & Active Dataset Switcher */}
      <div className="flex items-center space-x-3 window-no-drag">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-sm bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-2xs" />
          </div>
          <span className="text-xs font-sans tracking-wider font-semibold uppercase text-slate-200">
            {t.appTitle} <span className="text-cyan-400 font-normal">v1.2</span>
          </span>
        </div>

        {/* Dataset Switcher & Inline Rename + Manager Button */}
        <div className="flex items-center space-x-1.5 border-l border-white/10 pl-3">
          {datasets.length > 0 && currentDataset && (
            isRenaming ? (
              <div className="flex items-center space-x-1 bg-white/[0.06] border border-cyan-500/50 px-2 py-0.5 rounded-sm">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                  className="bg-transparent text-xs text-white font-mono focus:outline-none w-40"
                  autoFocus
                />
                <button
                  onClick={confirmRename}
                  className="text-emerald-400 hover:text-emerald-300 p-0.5"
                  title="İsmi Kaydet"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-sm">
                <FileSpreadsheet className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                <select
                  value={currentDataset.id}
                  onChange={(e) => onSelectDataset(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 font-mono font-medium focus:outline-none cursor-pointer max-w-[190px] truncate"
                  title={`Dosya: ${currentDataset.sourceFile} | Yüklenme: ${new Date(currentDataset.importedAt).toLocaleString('tr-TR')}`}
                >
                  {datasets.map(ds => (
                    <option key={ds.id} value={ds.id} className="bg-[#0f1219] text-slate-200">
                      {ds.name} ({ds.rows.length.toLocaleString()} {t.rowsCount})
                    </option>
                  ))}
                </select>
                <button
                  onClick={startRename}
                  className="text-slate-400 hover:text-cyan-400 p-0.5 transition-colors"
                  title="Veri Setine İsim Ver / Yeniden Adlandır"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )
          )}

          <button
            onClick={onOpenDatasetManager}
            className="flex items-center space-x-1 px-2 py-0.5 text-2xs font-mono text-slate-300 hover:text-cyan-300 bg-white/[0.03] hover:bg-cyan-950/30 border border-white/[0.08] hover:border-cyan-500/30 rounded transition-colors"
            title="Kayıtlı Veri Setlerini Yönet / Filtreden Yeni Veri Seti Oluştur"
          >
            <Database className="w-3 h-3 text-cyan-400" />
            <span>Veri Setleri ({datasets.length})</span>
          </button>
        </div>
      </div>

      {/* Center Actions */}
      <div className="flex items-center space-x-2 window-no-drag">
        <button
          onClick={onImportClick}
          disabled={loading}
          className="flex items-center space-x-1.5 px-2.5 py-1 text-2xs font-mono uppercase tracking-wider text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded transition-all duration-150 disabled:opacity-50"
          title={t.importCsv}
        >
          <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t.importCsv}</span>
        </button>

        <button
          onClick={onLoadDesktopJira}
          disabled={loading}
          className="flex items-center space-x-1.5 px-2.5 py-1 text-2xs font-mono uppercase tracking-wider text-cyan-300 hover:text-cyan-100 bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/30 rounded transition-all duration-150 disabled:opacity-50"
          title={t.loadDesktopJira}
        >
          <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t.loadDesktopJira}</span>
        </button>

        {/* Theme Mode Toggle (Light / Dark) */}
        <button
          onClick={toggleTheme}
          className="flex items-center space-x-1 px-2 py-1 text-2xs font-mono uppercase tracking-wider text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded transition-colors"
          title={theme === 'dark' ? 'Açık Tema (Light Mode)' : 'Koyu Tema (Dark Mode)'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dark</span>
            </>
          )}
        </button>

        {/* Language Switcher */}
        <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded p-0.5 ml-2">
          <button
            onClick={() => setLanguage('tr')}
            className={`px-1.5 py-0.5 text-2xs font-mono font-semibold rounded transition-colors ${
              language === 'tr'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Türkçe"
          >
            TR
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-1.5 py-0.5 text-2xs font-mono font-semibold rounded transition-colors ${
              language === 'en'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="English"
          >
            EN
          </button>
        </div>
      </div>

      {/* Native-style Window Controls */}
      <div className="flex items-center window-no-drag space-x-1">
        <button
          onClick={handleMinimize}
          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] rounded transition-colors"
          title={t.minimize}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] rounded transition-colors"
          title={t.maximize}
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
          title={t.close}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
