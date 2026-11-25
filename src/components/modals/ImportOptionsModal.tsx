import React, { useState, useEffect } from 'react';
import { X, GitMerge, RefreshCw, PlusSquare, ShieldCheck, Calendar, FileSpreadsheet } from 'lucide-react';
import { Dataset } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface ImportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDataset: Dataset;
  incomingDataset: Dataset;
  onConfirmAddNew: (customName?: string) => void;
  onConfirmMerge: () => void;
  onConfirmReplace: (customName?: string) => void;
}

export const ImportOptionsModal: React.FC<ImportOptionsModalProps> = ({
  isOpen,
  onClose,
  activeDataset,
  incomingDataset,
  onConfirmAddNew,
  onConfirmMerge,
  onConfirmReplace,
}) => {
  const { t } = useLanguage();
  const [customName, setCustomName] = useState(incomingDataset.name);

  useEffect(() => {
    setCustomName(incomingDataset.name);
  }, [incomingDataset]);

  if (!isOpen) return null;

  const resolvedName = customName.trim() || incomingDataset.name;
  const formattedImportDate = new Date(incomingDataset.importedAt).toLocaleString('tr-TR');

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6 select-none">
      <div className="bg-[#0f1219] border border-white/[0.12] rounded-lg w-full max-w-lg flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0b0e14]">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white font-mono">
              {t.keyControllerTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 font-mono">
          <p className="text-xs text-slate-300 leading-relaxed">
            {t.keyControllerPrompt}
          </p>

          {/* Editable Dataset Name + Preserved File Metadata */}
          <div className="bg-[#141822] border border-white/[0.08] rounded p-3 space-y-2.5">
            <div>
              <label className="text-2xs uppercase tracking-wider text-cyan-400 font-semibold block mb-1">
                Veri Setine Verilecek İsim
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Veri seti ismi giriniz..."
                className="w-full bg-[#0a0c10] border border-white/[0.12] focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="pt-1.5 border-t border-white/[0.06] text-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center space-x-1">
                  <FileSpreadsheet className="w-3 h-3 text-slate-500" />
                  <span>Kaynak Dosya Adı:</span>
                </span>
                <span className="text-slate-200 font-semibold">{incomingDataset.sourceFile} ({incomingDataset.rows.length.toLocaleString()} kayıt)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>Yüklenme Tarihi:</span>
                </span>
                <span className="text-slate-200">{formattedImportDate}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Mevcut Aktif Veri Seti:</span>
                <span className="text-slate-300">{activeDataset.name} ({activeDataset.rows.length.toLocaleString()} kayıt)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* Option 1: Save as New Dataset & Switch */}
            <div
              onClick={() => onConfirmAddNew(resolvedName)}
              className="p-3.5 rounded bg-cyan-950/25 border border-cyan-500/45 hover:border-cyan-400 hover:bg-cyan-900/35 cursor-pointer transition-all group"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-white font-semibold flex items-center space-x-2">
                    <span>Yeni Veri Seti Olarak Kaydet ve Geçiş Yap</span>
                    <span className="text-2xs bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30">
                      Ayrı Veri Seti
                    </span>
                  </div>
                  <p className="text-2xs text-slate-400 mt-1 leading-relaxed">
                    "{resolvedName}" adıyla yeni bir veri seti oluşturur (dosya adı ve yüklenme tarihi saklanır) ve geçiş yapar.
                  </p>
                </div>
              </div>
            </div>

            {/* Option 2: Merge & Upsert by Key into Active Dataset */}
            <div
              onClick={onConfirmMerge}
              className="p-3.5 rounded bg-emerald-950/15 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/25 cursor-pointer transition-all group"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mt-0.5">
                  <GitMerge className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-white font-semibold flex items-center space-x-2">
                    <span>"{activeDataset.name}" Üzerine Birleştir (Upsert)</span>
                  </div>
                  <p className="text-2xs text-slate-400 mt-1 leading-relaxed">
                    {t.keyUpsertDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* Option 3: Replace Current Dataset */}
            <div
              onClick={() => onConfirmReplace(resolvedName)}
              className="p-3.5 rounded bg-[#141822] border border-white/[0.08] hover:border-white/20 hover:bg-[#181d2a] cursor-pointer transition-all group"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded bg-white/[0.04] border border-white/[0.08] text-slate-400 mt-0.5">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-white font-semibold">
                    Mevcut Veri Setini Değiştir (Üzerine Yaz)
                  </div>
                  <p className="text-2xs text-slate-400 mt-1 leading-relaxed">
                    "{activeDataset.name}" veri setini kaldırır ve yerine "{resolvedName}" veri setini açar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-white/[0.06] bg-[#0b0e14] flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-2xs font-mono text-slate-400 hover:text-white rounded"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
