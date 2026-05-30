import React, { useState } from 'react';
import { Folder, FolderPlus, Plus, X, Loader2, Library, Sparkles } from 'lucide-react';
import type { DriveFolder } from '../types';

interface FolderSelectorProps {
  folders: DriveFolder[];
  activeFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string) => Promise<string | undefined>;
  activeFolderName: string;
  onShareFolder?: (id: string, name: string) => Promise<void>;
  isSharingFolder?: boolean;
}

export default function FolderSelector({
  folders,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  activeFolderName,
  onShareFolder,
  isSharingFolder = false
}: FolderSelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      setErrorMsg('Nama folder tidak boleh kosong.');
      return;
    }
    
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const newId = await onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAdding(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat folder baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="folder-selector-widget" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase flex items-center space-x-2">
            <Library className="w-4 h-4 text-blue-600" />
            <span>Lokasi Unggah Google Drive</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            File akan diunggah ke folder: <span className="font-semibold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-md">{activeFolderName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end">
          {activeFolderId !== null && onShareFolder && (
            <button
              id="btn-share-folder-public"
              type="button"
              onClick={() => onShareFolder(activeFolderId, activeFolderName)}
              disabled={isSharingFolder}
              className="flex items-center justify-center space-x-1.5 text-xs font-bold px-4 py-2 bg-emerald-55 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-xl transition-colors duration-150 shadow-xs cursor-pointer disabled:opacity-50"
              title="Bagikan folder aktif beserta seluruh isinya ke galeri publik"
            >
              {isSharingFolder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Membagikan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>Jadikan Folder Publik</span>
                </>
              )}
            </button>
          )}

          {!isAdding ? (
            <button
              id="btn-show-add-folder"
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center space-x-2 text-xs font-semibold px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 transition-colors duration-150"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Folder Baru</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsAdding(false);
                setNewFolderName('');
                setErrorMsg('');
              }}
              className="flex items-center justify-center space-x-2 text-xs font-semibold px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200 transition-colors duration-150"
            >
              <X className="w-4 h-4" />
              <span>Batal</span>
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 animate-fadeIn">
          <label htmlFor="new-folder-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nama Folder Baru:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="new-folder-input"
              type="text"
              placeholder="Contoh: Dokumen Kerja, Foto Liburan..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              disabled={isSubmitting}
              className="flex-grow bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all duration-150 disabled:bg-slate-100"
            />
            <button
              id="btn-create-folder"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm rounded-xl transition-colors duration-150 flex items-center justify-center space-x-2 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Buat Folder</span>
                </>
              )}
            </button>
          </div>
          {errorMsg && <p className="text-xs text-rose-500 mt-2 font-medium">{errorMsg}</p>}
        </form>
      )}

      {/* Grid of folders */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 max-h-48 overflow-y-auto pr-1">
        
        {/* Google Drive Root option */}
        <button
          onClick={() => onSelectFolder(null)}
          className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl border text-left transition-all duration-150 select-none cursor-pointer ${
            activeFolderId === null
              ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-semibold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Folder className={`w-5 h-5 flex-shrink-0 ${activeFolderId === null ? 'text-white' : 'text-slate-400'}`} />
          <span className="text-xs truncate font-medium">Root Drive</span>
        </button>

        {/* Custom Folder Options */}
        {folders.map((folder) => {
          const isActive = activeFolderId === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl border text-left transition-all duration-150 select-none cursor-pointer ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-semibold'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Folder className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-blue-500'}`} />
              <span className="text-xs truncate font-medium">{folder.name}</span>
            </button>
          );
        })}

        {folders.length === 0 && (
          <div className="col-span-full py-4 text-center text-xs text-slate-400 font-medium">
            Belum ada folder khusus. Buat folder baru di atas untuk mengelompokkan unggahan Anda.
          </div>
        )}
      </div>
    </div>
  );
}
