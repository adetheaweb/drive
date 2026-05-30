import React, { useState, useRef } from 'react';
import { UploadCloud, File, Trash, RefreshCw, Layers, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { formatBytes } from '../lib/utils';
import type { UploadQueueItem } from '../types';

interface UploadQueueProps {
  queue: UploadQueueItem[];
  onAddFiles: (files: FileList) => void;
  onRemoveQueueItem: (id: string) => void;
  onClearQueue: () => void;
  onStartUpload: () => Promise<void>;
  isUploading: boolean;
  activeFolderName: string;
}

export default function UploadQueue({
  queue,
  onAddFiles,
  onRemoveQueueItem,
  onClearQueue,
  onStartUpload,
  isUploading,
  activeFolderName
}: UploadQueueProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const totalFiles = queue.length;
  const uploadedFiles = queue.filter(item => item.status === 'success').length;
  const isQueueEmpty = totalFiles === 0;

  return (
    <div id="upload-queue-widget" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Antrean Unggahan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target folder: <span className="font-semibold text-blue-600">{activeFolderName}</span>
          </p>
        </div>
        {!isQueueEmpty && !isUploading && (
          <button
            id="btn-clear-queue"
            onClick={onClearQueue}
            className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-200 transition-colors duration-150 flex items-center space-x-1.5"
          >
            <Trash className="w-3.5 h-3.5" />
            <span>Bersihkan</span>
          </button>
        )}
      </div>

      {/* Drag & Drop Zone */}
      <div
        id="drag-file-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`relative group flex-shrink-0 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 flex flex-col justify-center items-center select-none ${
          dragActive
            ? 'border-blue-500 bg-blue-50/40'
            : 'border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/10'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />
        
        <div className={`p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-105 transition-transform duration-150 mb-3 ${dragActive ? 'text-blue-500 ring-4 ring-blue-50' : 'text-slate-400'}`}>
          <UploadCloud className="w-7 h-7 text-blue-500" />
        </div>
        
        <p className="text-sm font-semibold text-slate-900">
          {dragActive ? "Lepaskan file untuk menambahkan!" : "Seret & lepas file Anda di sini"}
        </p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
          Atau <span className="text-blue-600 font-medium underline">telusuri komputer</span> Anda
        </p>
      </div>

      {/* Queue list container */}
      <div className="flex-grow mt-5 overflow-y-auto max-h-[320px] min-h-[140px] pr-1 border border-slate-100 rounded-xl bg-slate-50/30 p-2.5">
        {isQueueEmpty ? (
          <div className="h-full flex flex-col justify-center items-center py-8 text-center text-slate-400">
            <File className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2" />
            <p className="text-xs font-medium">Antrean kosong.</p>
            <p className="text-[10px] mt-0.5">Silakan pilih atau seret file ke atas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 relative shadow-xs"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start space-x-3 max-w-[85%]">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500 flex-shrink-0 mt-0.5">
                      <File className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {formatBytes(item.size)}
                      </p>
                    </div>
                  </div>

                  {/* Remove action button or status badges */}
                  {!isUploading && item.status === 'queued' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveQueueItem(item.id);
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="flex-shrink-0">
                      {item.status === 'success' && (
                        <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
                      )}
                      {item.status === 'error' && (
                        <div className="flex items-center space-x-1 text-rose-500" title={item.error}>
                          <AlertCircle className="w-4.5 h-4.5" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress bar info */}
                {item.status === 'uploading' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>Mengunggah...</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-150"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {item.status === 'error' && item.error && (
                  <p className="text-[10px] text-rose-500 bg-rose-50/50 px-2.5 py-1 rounded-md border border-rose-100 font-medium leading-normal animate-fadeIn">
                    Error: {item.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload button controls */}
      {!isQueueEmpty && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex justify-between text-xs text-slate-500 font-medium mb-3">
            <span>Progress Antrean:</span>
            <span>{uploadedFiles} / {totalFiles} File Sukses</span>
          </div>
          
          <button
            id="btn-trigger-upload"
            onClick={onStartUpload}
            disabled={isUploading || uploadedFiles === totalFiles}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-sm rounded-xl transition-colors duration-150 flex items-center justify-center space-x-2 shadow-md shadow-blue-600/10"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                <span>Mengunggah {queue.filter(i => i.status === 'uploading' || i.status === 'queued').length} File...</span>
              </>
            ) : uploadedFiles === totalFiles ? (
              <>
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span>Semua Sukses Diunggah</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4.5 h-4.5" />
                <span>Unggah Antrean Ke Google Drive</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
