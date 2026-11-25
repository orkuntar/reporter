import React, { useState } from 'react';
import {
  X,
  Database,
  Plus,
  Trash2,
  Edit3,
  Check,
  FileSpreadsheet,
  ArrowRightCircle
} from 'lucide-react';
import { Dataset } from '../../types';

interface DatasetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: Dataset[];
  activeDatasetId: string | null;
  filteredCount: number;
  onSelectDataset: (id: string) => void;
  onRenameDataset: (id: string, newName: string) => void;
  onDeleteDataset: (id: string) => void;
  onSaveFilteredAsNewDataset: (name: string) => void;
  onImportNewCsv: () => void;
}

export const DatasetManagerModal: React.FC<DatasetManagerModalProps> = ({
  isOpen,
  onClose,
  datasets,
  activeDatasetId,
  filteredCount,
  onSelectDataset,
  onRenameDataset,
  onDeleteDataset,
  onSaveFilteredAsNewDataset,
  onImportNewCsv,
}) => {
  const [newDatasetName, setNewDatasetName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  const handleCreateFromFiltered = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDatasetName.trim()) {
      onSaveFilteredAsNewDataset(newDatasetName.trim());
      setNewDatasetName('');
    }
  };

  const startEdit = (ds: Dataset) => {
    setEditingId(ds.id);
    setEditName(ds.name);
  };

  const confirmEdit = (id: string) => {
    if (editName.trim()) {
      onRenameDataset(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6 select-none">
      <div className="bg-[#0f1219] border border-white/[0.12] rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0b0e14]">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white font-mono">
              Kayıtlı Veri Setleri Yöneticisi ({datasets.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create New Dataset from Active Filtered Data */}
        {activeDatasetId && (
          <div className="p-4 bg-[#0c0f16] border-b border-white/[0.06] space-y-2 font-mono">
            <div className="text-2xs uppercase tracking-wider text-cyan-400 font-semibold">
              Aktif Filtrelenmiş Veriden Yeni Veri Seti Oluştur ({filteredCount.toLocaleString()} kayıt)
            </div>
            <form onSubmit={handleCreateFromFiltered} className="flex items-center space-x-2">
              <input
                type="text"
                value={newDatasetName}
                onChange={(e) => setNewDatasetName(e.target.value)}
                placeholder="Örn: Kasım Ayı Tamamlananlar..."
                className="flex-1 bg-[#141822] border border-white/[0.1] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!newDatasetName.trim() || filteredCount === 0}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs rounded transition-colors disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Veri Seti Kaydet</span>
              </button>
            </form>
          </div>
        )}

        {/* Saved Datasets List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono">
          {datasets.map((ds) => {
            const isActive = ds.id === activeDatasetId;
            const isEditing = editingId === ds.id;

            return (
              <div
                key={ds.id}
                className={`p-3 rounded border transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-cyan-950/25 border-cyan-500/50'
                    : 'bg-[#141822] border-white/[0.07] hover:border-white/[0.15]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <FileSpreadsheet className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmEdit(ds.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="bg-[#0a0c10] border border-cyan-500 text-xs text-white px-2 py-0.5 rounded focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => confirmEdit(ds.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white truncate">{ds.name}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-2xs rounded">
                            AKTİF
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-2xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <span>{ds.rows.length.toLocaleString()} satır · {ds.columns.length} kolon</span>
                      <span>•</span>
                      <span className="truncate max-w-[180px]" title={ds.sourceFile}>Dosya: {ds.sourceFile}</span>
                      <span>•</span>
                      <span>Yüklenme: {ds.importedAt ? new Date(ds.importedAt).toLocaleString('tr-TR') : '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 ml-3 flex-shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => {
                        onSelectDataset(ds.id);
                        onClose();
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-white/[0.05] hover:bg-cyan-500/20 border border-white/[0.1] hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 text-2xs rounded transition-colors"
                    >
                      <ArrowRightCircle className="w-3 h-3" />
                      <span>Aç</span>
                    </button>
                  )}

                  <button
                    onClick={() => startEdit(ds)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
                    title="Yeniden Adlandır"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteDataset(ds.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                    title="Veri Setini Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {datasets.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-white/[0.08] rounded">
              Henüz kayıtlı veri seti bulunmuyor. Yeni bir CSV dosyası içe aktarın.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.06] bg-[#0b0e14] flex items-center justify-between font-mono">
          <button
            onClick={() => {
              onClose();
              onImportNewCsv();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-200 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Yeni CSV İçe Aktar</span>
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 text-2xs text-slate-400 hover:text-white rounded"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
