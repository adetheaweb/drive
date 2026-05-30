import React, { useState } from 'react';
import { 
  Search, Grid, List, ExternalLink, Download, Trash, Copy, Check, FileText, 
  FileImage, FileVideo, FileAudio, FileCode, Archive, HelpCircle, RefreshCw, FolderOpen, Folder
} from 'lucide-react';
import { formatBytes, formatDate } from '../lib/utils';
import type { DriveFile } from '../types';

interface FileExplorerProps {
  files: DriveFile[];
  onDeleteFile: (id: string, name: string) => Promise<void>;
  isLoading: boolean;
  onRefresh: () => void;
  currentFolderId: string | null;
  activeFolderName: string;
  onSelectFolder: (id: string | null) => void;
  isPublicView?: boolean;
}

export default function FileExplorer({
  files,
  onDeleteFile,
  isLoading,
  onRefresh,
  currentFolderId,
  activeFolderName,
  onSelectFolder,
  isPublicView = false
}: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Helper untuk menentukan icon file berdasarkan MIME type
  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-8 h-8 text-amber-400 fill-amber-300" />;
    }
    if (mimeType.startsWith('image/')) {
      return <FileImage className="w-8 h-8 text-blue-500" />;
    }
    if (mimeType.startsWith('video/')) {
      return <FileVideo className="w-8 h-8 text-rose-500" />;
    }
    if (mimeType.startsWith('audio/')) {
      return <FileAudio className="w-8 h-8 text-purple-500" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar') || mimeType.includes('7z')) {
      return <Archive className="w-8 h-8 text-yellow-600" />;
    }
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('html') || mimeType.includes('json') || mimeType.includes('css')) {
      return <FileCode className="w-8 h-8 text-slate-700" />;
    }
    
    // Mime types Google Docs/Sheets/Slides/Forms
    if (mimeType === 'application/vnd.google-apps.document') {
      return <FileText className="w-8 h-8 text-blue-600" />;
    }
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      return <FileText className="w-8 h-8 text-emerald-600" />;
    }
    if (mimeType === 'application/vnd.google-apps.presentation') {
      return <FileText className="w-8 h-8 text-amber-600" />;
    }

    return <HelpCircle className="w-8 h-8 text-slate-400" />;
  };

  const handleCopyLink = (event: React.MouseEvent, id: string, linkString?: string) => {
    event.stopPropagation();
    if (!linkString) return;
    
    navigator.clipboard.writeText(linkString);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteClick = async (event: React.MouseEvent, id: string, name: string) => {
    event.stopPropagation();
    
    let confirmed = false;
    if (isPublicView) {
      confirmed = window.confirm(
        `Apakah Anda yakin ingin menghapus "${name}" dari Galeri Publik?`
      );
    } else {
      confirmed = window.confirm(
        `Apakah Anda yakin ingin menghapus "${name}"? Tindakan ini akan menghapus file dari Google Drive secara permanen dan tidak dapat dibatalkan.`
      );
    }
    if (!confirmed) return;

    setIsDeletingId(id);
    try {
      await onDeleteFile(id, name);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Filter file berdasarkan pencarian dan tipe
  const filteredFiles = files.filter((file) => {
    // Jika dalam tampilan publik, filter berdasarkan struktur folder publik
    if (isPublicView) {
      const fileParent = (file as any).parentFolderId;
      if (currentFolderId === null) {
        // Tampilkan item di root publik (yang tidak mempunyai parent atau parent-nya null/undefined)
        if (fileParent && fileParent !== 'root') {
          return false;
        }
      } else {
        // Tampilkan item yang berada dalam folder publik aktif
        if (fileParent !== currentFolderId) {
          return false;
        }
      }
    }

    // Pencarian text
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter Berdasarkan tipe file
    if (!matchesSearch) return false;
    if (filterType === 'all') return true;
    
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    
    if (filterType === 'folder') {
      return isFolder;
    }
    if (filterType === 'image') {
      return file.mimeType.startsWith('image/');
    }
    if (filterType === 'document') {
      return (
        file.mimeType.includes('pdf') ||
        file.mimeType.includes('word') ||
        file.mimeType.includes('excel') ||
        file.mimeType.includes('powerpoint') ||
        file.mimeType === 'application/vnd.google-apps.document' ||
        file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
        file.mimeType.startsWith('text/')
      );
    }
    if (filterType === 'media') {
      return file.mimeType.startsWith('video/') || file.mimeType.startsWith('audio/');
    }
    
    return true;
  });

  return (
    <div id="file-explorer-widget" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <span>{isPublicView ? 'Galeri Berkas Publik' : 'File Explorer Saya'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isPublicView 
              ? `Menampilkan berkas publik dalam folder: ${activeFolderName}`
              : `Menampilkan file yang dibuat/diakses oleh aplikasi ini dalam folder ${activeFolderName}`
            }
          </p>
        </div>

        <div className="flex items-center gap-2 self-end">
          {isPublicView && currentFolderId !== null && (
            <button
              onClick={() => onSelectFolder(null)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-bold text-xs rounded-xl transition-all border border-slate-200 cursor-pointer hover:scale-[1.01]"
            >
              <span>← Beranda Publik</span>
            </button>
          )}

          <button
            id="btn-refresh-explorer"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-colors duration-150 disabled:opacity-50"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-100'
              }`}
              title="Tampilan Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-100'
              }`}
              title="Tampilan Daftar"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="explorer-search-input"
            type="text"
            placeholder="Cari file berdasarkan nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all duration-150"
          />
        </div>

        <div className="flex-shrink-0 flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'folder', label: 'Folder' },
            { id: 'image', label: 'Gambar' },
            { id: 'document', label: 'Dokumen' },
            { id: 'media', label: 'Media' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 select-none cursor-pointer ${
                filterType === type.id
                  ? 'bg-blue-55 hover:bg-blue-100 border-blue-200 text-blue-700 bg-blue-50'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Files Display */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 flex flex-col justify-center items-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-semibold">Menghubungi Google Drive...</p>
          <p className="text-xs text-slate-400 mt-1">Mengambil file dan direktori tersimpan</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 flex flex-col items-center justify-center">
          <Folder className="w-12 h-12 text-slate-300 stroke-[1.5] mb-2.5" />
          <p className="text-sm font-semibold text-slate-700">Tidak ada file ditemukan</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            {searchQuery 
              ? `Tidak ada hasil untuk kata kunci "${searchQuery}"` 
              : `Belum mengunggah file apa pun ke folder "${activeFolderName}". Mulai unggah file di panel sebelah kanan!`
            }
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* Grid Layout */
        <div id="explorer-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            return (
              <div
                key={file.id}
                onClick={() => isFolder && onSelectFolder(file.id)}
                className={`bg-white border border-slate-200 p-4 rounded-2xl hover:border-blue-500 hover:ring-4 hover:ring-blue-500/5 transition-all duration-150 flex flex-col justify-between h-[155px] ${isFolder ? 'cursor-pointer' : ''}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      {getFileIcon(file.mimeType)}
                    </div>
                    
                    {/* Action buttons on top right */}
                    <div className="flex space-x-1">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent"
                          title="Buka di Drive"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      
                      {file.webViewLink && (
                        <button
                          onClick={(e) => handleCopyLink(e, file.id, file.webViewLink)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Salin Tautan"
                        >
                          {copiedId === file.id ? <Check className="w-4 h-4 text-blue-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}

                      <button
                        onClick={(e) => handleDeleteClick(e, file.id, file.name)}
                        disabled={isDeletingId === file.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus File"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-slate-800 line-clamp-1" title={file.name}>
                    {file.name}
                  </h3>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>
                    {isFolder ? 'Folder' : file.size ? formatBytes(parseInt(file.size, 10)) : '0 Bytes'}
                  </span>
                  <span>{formatDate(file.createdTime)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        /* List Layout */
        <div id="explorer-list" className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama</th>
                <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ukuran</th>
                <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Dibuat Pada</th>
                <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 divide-solid">
              {filteredFiles.map((file) => {
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                return (
                  <tr
                    key={file.id}
                    onClick={() => isFolder && onSelectFolder(file.id)}
                    className={`hover:bg-slate-50/50 transition-colors ${isFolder ? 'cursor-pointer' : ''}`}
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-3 max-w-xs sm:max-w-md">
                        <div className="p-1 px-1.5 bg-slate-50 border border-slate-100 rounded-lg flex-shrink-0">
                          {getFileIcon(file.mimeType)}
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                      {isFolder ? 'Folder' : file.size ? formatBytes(parseInt(file.size, 10)) : '0 Bytes'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 hidden sm:table-cell">
                      {formatDate(file.createdTime)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
                      <div className="flex justify-end space-x-1.5">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-700 p-1.5 rounded-lg border border-slate-200 transition-colors"
                            title="Buka File"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        
                        {file.webViewLink && (
                          <button
                            onClick={(e) => handleCopyLink(e, file.id, file.webViewLink)}
                            className="bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-700 p-1.5 rounded-lg border border-slate-200 transition-colors"
                            title="Salin Link"
                          >
                            {copiedId === file.id ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDeleteClick(e, file.id, file.name)}
                          disabled={isDeletingId === file.id}
                          className="bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-700 p-1.5 rounded-lg border border-slate-200 transition-colors"
                          title="Hapus"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
