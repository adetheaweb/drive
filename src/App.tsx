import React, { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { 
  Cloud, Lock, RefreshCw, Folder, Sparkles, FolderUp, CheckCircle, ShieldAlert, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { initAuth, googleSignIn, logout, savePublicFile, deletePublicFile, fetchPublicFiles } from './lib/firebase';
import { 
  fetchStorageQuota, listFolders, listFilesAndFolders, createFolder, uploadFileWithProgress, deleteFileOrFolder, makeFilePublic
} from './lib/drive';
import type { DriveFile, StorageQuota, UploadQueueItem, DriveFolder } from './types';
import Navbar from './components/Navbar';
import FolderSelector from './components/FolderSelector';
import UploadQueue from './components/UploadQueue';
import FileExplorer from './components/FileExplorer';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isDomainError, setIsDomainError] = useState(false);

  // Storage / Drive Data
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Loading States
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Queue state for Uploads
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Public Shared Files States
  const [isPublicView, setIsPublicView] = useState(false);
  const [publicFiles, setPublicFiles] = useState<any[]>([]);
  const [isLoadingPublicFiles, setIsLoadingPublicFiles] = useState(false);
  const [isSharingFolder, setIsSharingFolder] = useState(false);

  // Store actual files in Ref Map to prevent React re-render lag & non-serializable warning
  const localFilesRef = useRef<Map<string, File>>(new Map());

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        refreshAllData(accessToken, activeFolderId);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch drive data when active folder alters
  useEffect(() => {
    if (token) {
      refreshFiles(token, activeFolderId);
    }
  }, [activeFolderId]);

  const refreshAllData = async (accessToken: string, folderId: string | null) => {
    refreshQuota(accessToken);
    refreshFolders(accessToken);
    refreshFiles(accessToken, folderId);
  };

  const refreshQuota = async (accessToken: string) => {
    setIsLoadingQuota(true);
    try {
      const q = await fetchStorageQuota(accessToken);
      setQuota(q);
    } catch (err) {
      console.error('Error fetching quota:', err);
    } finally {
      setIsLoadingQuota(false);
    }
  };

  const refreshFolders = async (accessToken: string) => {
    setIsLoadingFolders(true);
    try {
      const list = await listFolders(accessToken);
      setFolders(list);
    } catch (err) {
      console.error('Error fetching folders:', err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const refreshFiles = async (accessToken: string, folderId: string | null) => {
    setIsLoadingFiles(true);
    try {
      const list = await listFilesAndFolders(accessToken, folderId || undefined);
      setFiles(list);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const refreshPublicViewFiles = async () => {
    setIsLoadingPublicFiles(true);
    try {
      const list = await fetchPublicFiles();
      setPublicFiles(list);
    } catch (err) {
      console.error('Error fetching public files:', err);
    } finally {
      setIsLoadingPublicFiles(false);
    }
  };

  const handleEnterAsGuest = () => {
    setIsPublicView(true);
    setNeedsAuth(false);
    refreshPublicViewFiles();
  };

  // Google Login click trigger
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError('');
    setIsDomainError(false);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        refreshAllData(result.accessToken, activeFolderId);
      }
    } catch (err: any) {
      console.error('Login action error:', err);
      // Detailed human friendly error message
      const errMsg = err.message || '';
      const errCode = err.code || '';
      if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain') || errMsg.includes('authorized-domain')) {
        setIsDomainError(true);
        setAuthError('Firebase Error: Domain aplikasi belum diotorisasi untuk otentikasi (auth/unauthorized-domain).');
      } else {
        setAuthError(err.message || 'Terjadi kesalahan saat otentikasi Google Account.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout action
  const handleLogoutClick = async () => {
    const confirmOut = window.confirm('Apakah Anda ingin keluar dari akun Google?');
    if (!confirmOut) return;
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setFolders([]);
      setFiles([]);
      setQuota(null);
      setQueue([]);
      localFilesRef.current.clear();
      setActiveFolderId(null);
    } catch (error) {
      console.error('Gagal keluar:', error);
    }
  };

  // Folder selector handlers
  const handleSelectFolder = (id: string | null) => {
    setActiveFolderId(id);
  };

  const handleCreateFolder = async (folderName: string): Promise<string | undefined> => {
    if (!token) return;
    setIsCreatingFolder(true);
    try {
      const newFolder = await createFolder(token, folderName);
      // Reload folders list
      await refreshFolders(token);
      // Select newly made folder automatically
      setActiveFolderId(newFolder.id);
      return newFolder.id;
    } catch (err: any) {
      console.error(err);
      throw err;
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleShareFolder = async (folderId: string, folderName: string) => {
    if (!token) return;
    const confirmShare = window.confirm(
      `Apakah Anda yakin ingin membagikan folder "${folderName}" dan seluruh file di dalamnya ke Galeri Publik?`
    );
    if (!confirmShare) return;

    setIsSharingFolder(true);
    try {
      // 1. Jadikan folder itu sendiri publik di Google Drive
      await makeFilePublic(token, folderId);

      // 2. Simpan metadata folder ke Firestore
      await savePublicFile({
        id: folderId,
        name: folderName,
        size: 0,
        mimeType: 'application/vnd.google-apps.folder',
        webViewLink: `https://drive.google.com/drive/folders/${folderId}`,
        createdTime: new Date().toISOString(),
        uploadedBy: user?.displayName || user?.email || 'Pemilik Drive',
        parentFolderId: null
      });

      // 3. Iterasi dan publikasikan seluruh berkas yang ada di dalam folder aktif saat ini
      let successCount = 0;
      for (const file of files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') continue; // skip nested subfolders
        try {
          await makeFilePublic(token, file.id);
          await savePublicFile({
            id: file.id,
            name: file.name,
            size: file.size ? parseInt(file.size as any, 10) : 0,
            mimeType: file.mimeType || 'application/octet-stream',
            webViewLink: file.webViewLink || `https://drive.google.com/open?id=${file.id}`,
            webContentLink: file.webContentLink,
            createdTime: file.createdTime || new Date().toISOString(),
            uploadedBy: user?.displayName || user?.email || 'Pemilik Drive',
            parentFolderId: folderId
          });
          successCount++;
        } catch (fileErr) {
          console.warn(`Gagal mempublikasikan berkas ${file.name}:`, fileErr);
        }
      }

      alert(
        `Folder "${folderName}" berhasil dijadikan publik!\n` +
        `Metadata folder dan ${successCount} file di dalamnya telah disimpan ke sistem publik.`
      );
      
      // Sinkronkan daftar file publik
      await refreshPublicViewFiles();
    } catch (err: any) {
      console.error('Gagal membagikan folder:', err);
      alert(`Gagal membagikan folder: ${err.message || err}`);
    } finally {
      setIsSharingFolder(false);
    }
  };

  // File Upload Handlers
  const handleAddFilesToQueue = (fileList: FileList) => {
    const newItems: UploadQueueItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Save real file object to our MapRef
      localFilesRef.current.set(id, file);

      newItems.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'queued',
        progress: 0,
        folderId: activeFolderId || undefined
      });
    }

    setQueue(prev => [...prev, ...newItems]);
  };

  const handleRemoveQueueItem = (id: string) => {
    localFilesRef.current.delete(id);
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleClearQueue = () => {
    localFilesRef.current.clear();
    setQueue([]);
  };

  // Sequential high-performance upload queue execution
  const handleStartUpload = async () => {
    if (!token || queue.length === 0 || isUploading) return;

    setIsUploading(true);
    const pendingItems = queue.filter(item => item.status === 'queued' || item.status === 'error');

    for (const item of pendingItems) {
      // Transition status to uploading
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading', progress: 0, error: undefined } : q));

      try {
        const fileObj = localFilesRef.current.get(item.id);
        if (!fileObj) throw new Error('File tidak ditemukan di memori lokal.');

        // Pass active upload target folder at the moment it was queued or general active
        const targetFolder = item.folderId;

        const uploadedFile = await uploadFileWithProgress(
          token,
          fileObj,
          targetFolder,
          (progress) => {
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress } : q));
          }
        );

        // Ubah hak akses file menjadi publik di Google Drive
        try {
          await makeFilePublic(token, uploadedFile.id);
        } catch (permErr: any) {
          console.warn('Gagal mengatur akses publik Google Drive:', permErr);
        }

        // Simpan metadata ke Firestore di koleksi public_files
        try {
          await savePublicFile({
            id: uploadedFile.id,
            name: uploadedFile.name,
            size: uploadedFile.size ? parseInt(uploadedFile.size as any, 10) : fileObj.size,
            mimeType: uploadedFile.mimeType || fileObj.type,
            webViewLink: uploadedFile.webViewLink,
            webContentLink: uploadedFile.webContentLink,
            createdTime: uploadedFile.createdTime || new Date().toISOString(),
            uploadedBy: user?.displayName || user?.email || 'Pemilik Drive',
            parentFolderId: targetFolder || null
          });
        } catch (dbErr: any) {
          console.warn('Gagal menyimpan metadata file ke Firestore:', dbErr);
        }

        // Update item status on queue to success
        setQueue(prev => prev.map(q => q.id === item.id ? { 
          ...q, 
          status: 'success', 
          progress: 100, 
          url: uploadedFile.webViewLink 
        } : q));

        // Delete from local file map cache to release memory
        localFilesRef.current.delete(item.id);

      } catch (err: any) {
        console.error('Upload item failure:', err);
        setQueue(prev => prev.map(q => q.id === item.id ? { 
          ...q, 
          status: 'error', 
          error: err.message || 'Gagal mengunggah file' 
        } : q));
      }
    }

    // Post-completion data sync
    await refreshQuota(token);
    await refreshFiles(token, activeFolderId);
    setIsUploading(false);
  };

  // Delete file action with drive synchronization
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (isPublicView) {
      try {
        await deletePublicFile(fileId);
        // Sync public files view
        await refreshPublicViewFiles();
      } catch (err: any) {
        alert(`Gagal menghapus file dari galeri publik: ${err.message || err}`);
      }
      return;
    }

    if (!token) return;
    try {
      await deleteFileOrFolder(token, fileId);
      try {
        await deletePublicFile(fileId);
      } catch (dbErr: any) {
        console.warn('Gagal menghapus metadata file di Firestore:', dbErr);
      }
      // Sync drive
      await refreshQuota(token);
      await refreshFiles(token, activeFolderId);
    } catch (err: any) {
      alert(`Gagal menghapus file: ${err.message || err}`);
    }
  };

  const activeFolderName = activeFolderId === null 
    ? 'Root Drive' 
    : folders.find(f => f.id === activeFolderId)?.name || 'Subfolder';

  // LOGIN PAGE rendering
  if (needsAuth) {
    const isInsideIframe = window.self !== window.top;

    return (
      <div id="login-layout" className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center flex-col items-center">
            
            {/* App logo large */}
            <div className="bg-blue-600 text-white p-5 rounded-3xl mx-auto shadow-xl shadow-blue-500/10 mb-6 flex items-center justify-center">
              <Cloud className="w-12 h-12 stroke-[1.75]" />
            </div>

            <h2 className="font-display font-extrabold text-3xl text-center text-slate-800 tracking-tight">
              Drive<span className="text-blue-600">Sync</span>
            </h2>
            <p className="mt-2 text-center text-sm font-semibold text-slate-400 uppercase tracking-widest">
              Google Workspace Cloud Client
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          {isInsideIframe && (
            <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-amber-800 text-xs shadow-sm shadow-amber-100 flex flex-col items-start gap-3 animate-fadeIn">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold text-[13px] text-amber-900 mb-1">
                    ⚠️ PENTING: BUKA DI TAB BARU AGAR LOGIN TIDAK MENUTUP
                  </p>
                  <p className="leading-relaxed text-amber-800 text-[11px]">
                    Anda sedang membuka aplikasi ini di dalam <strong>panel pratinjau (iframe)</strong>. Peramban modern (seperti Chrome, Edge, Safari, Brave) memblokir transfer data login di dalam iframe demi privasi.
                  </p>
                </div>
              </div>
              <div className="mt-1 flex flex-col gap-2 w-full">
                <div className="text-amber-900 font-semibold bg-amber-100/70 p-2.5 rounded-xl border border-amber-200 text-[11px] leading-relaxed">
                  <strong>👉 Solusi Mudah:</strong> Silakan klik tombol <span className="bg-amber-200 border border-amber-300 px-1.5 py-0.5 rounded font-extrabold text-amber-950 text-[10px]">Open in New Tab</span> yang berada di <strong>ujung kanan atas layar pratinjau Google AI Studio</strong> Anda untuk membuka aplikasi di tab penuh, lalu masuk kembali dengan Google.
                </div>
              </div>
            </div>
          )}

          <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-md shadow-slate-100 flex flex-col items-center">
            <h3 className="text-center font-bold text-slate-700 text-base mb-2">
              Sambungkan Google Drive
            </h3>
            <p className="text-center text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
              Silakan login untuk mengunggah file, membuat sub-direktori, dan melihat sisa kapasitas penyimpanan Google Drive Anda secara langsung.
            </p>

            {authError && (
              <div className="mb-5 w-full bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-slate-700 flex flex-col items-start gap-3.5 animate-fadeIn">
                <div className="flex items-start space-x-2.5 text-rose-600">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
                  <span className="font-bold text-[12px]">{authError}</span>
                </div>
                
                <div className="pt-3.5 border-t border-rose-100 w-full">
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5 text-rose-700">
                    💡 UPDATE TERBARU: OAUTH AKTIF SECARA OTOMATIS
                  </p>
                  <p className="mb-3 leading-relaxed text-slate-600 text-[11px]">
                    Kami telah berhasil melakukan konfigurasi dan mengotorisasi Google Drive OAuth client Anda di backend secara otomatis! <strong>Anda tidak perlu menambahkan domain secara manual di panel Firebase Console lagi.</strong>
                  </p>
                  
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-[11px] leading-relaxed mb-3 space-y-2">
                    <p className="font-bold">Mengapa jendela login menutup kembali atau masih gagal?</p>
                    <ol className="list-decimal pl-4 space-y-1 text-[10.5px]">
                      <li>
                        <strong>Terjebak di Panel Pratinjau (iFrame):</strong> Tombol login popup di dalam tab kecil Google AI Studio sering diblokir oleh sistem keamanan privasi peramban (browser).
                      </li>
                      <li>
                        <strong>Popup Blocker / AdBlocker aktif:</strong> Browser menghentikan komunikasi popup setelah masuk dengan Google.
                      </li>
                    </ol>
                  </div>

                  <p className="font-bold text-slate-800 text-[11px] mb-2">👉 LANGKAH PENYELESAIAN:</p>
                  <ul className="space-y-2 text-[11px] text-slate-600 list-disc pl-4 font-sans mb-3">
                    <li>
                      Pastikan Anda telah mengeklik tombol <span className="bg-blue-1050 text-blue-700 font-bold px-1 py-0.5 rounded border border-blue-200 bg-blue-50">Open in New Tab</span> yang berkilat biru di pojok kanan atas tampilan pratinjau ini.
                    </li>
                    <li>
                      Jika ada ikon "Popup Blocked" di bar alamat browser Anda (dekat tombol bintang bookmark), klik ikon tersebut dan piih <strong>"Always allow pop-ups from this site"</strong>.
                    </li>
                    <li>
                      Matikan sementara ekstensi AdBlocker jika ada, lalu segarkan (refresh) halaman tab baru tersebut dan silakan klik tombol gabung di bawah ini kembali.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <button
              id="google-signin-btn"
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button w-full hover:scale-[1.01] transition-transform shadow-xs"
            >
              <div className="gsi-material-button-content-wrapper">
                {isLoggingIn ? (
                  <div className="flex items-center space-x-2 text-slate-600 font-medium">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Menghubungkan...</span>
                  </div>
                ) : (
                  <>
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">Sign in with Google</span>
                  </>
                )}
              </div>
            </button>

            <div className="relative flex py-4 items-center w-full">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Atau</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <button
              id="guest-public-btn"
              onClick={handleEnterAsGuest}
              className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl border border-blue-100 transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.01]"
            >
              <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>Akses Galeri Berkas Publik (Mode Baca Saja)</span>
            </button>

            <div className="mt-8 border-t border-slate-100 pt-5 w-full flex items-center justify-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>Otorisasi drive.file Aman</span>
            </div>
          </div>
          
          <p className="text-center text-[11px] text-slate-400 mt-5 px-6 leading-relaxed">
            Aplikasi ini mendesain batasan izin ruang lingkup terkecil (<code className="bg-slate-100 px-1 py-0.5 rounded text-rose-500 font-mono">drive.file</code>) yang hanya mengizinkan aplikasi ini membaca dan mengubah file yang diunggah melaluinya. File pribadi Google Drive Anda yang lain tetap aman rahasia secara penuh.
          </p>
        </div>
      </div>
    );
  }

  // LOGGED IN DASHBOARD / PUBLIC DASHBOARD rendering
  return (
    <div id="dashboard-layout" className="min-h-screen bg-[#F8F9FA] pb-12">
      {isPublicView ? (
        <header id="app-navbar" className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md shadow-blue-500/10">
                  <Cloud className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-lg leading-tight tracking-tight text-slate-900 sm:text-xl flex items-center gap-2">
                    Drive<span className="text-blue-600">Sync</span> 
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100 select-none uppercase tracking-wide">Galeri Publik</span>
                  </h1>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mt-1">
                    Mode Baca-Saja
                  </p>
                </div>
              </div>
              
              <button
                id="btn-back-login"
                onClick={() => {
                  setIsPublicView(false);
                  setNeedsAuth(true);
                }}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer transition-colors hover:scale-[1.01]"
              >
                Masuk Sebagai Pemilik
              </button>
            </div>
          </div>
        </header>
      ) : (
        user && (
          <Navbar
            user={user}
            onLogout={handleLogoutClick}
            quota={quota}
            isLoadingQuota={isLoadingQuota}
          />
        )
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Dynamic Welcome bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-slate-800 relative overflow-hidden shadow-xs mb-8">
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 text-blue-50/20">
            <Cloud className="w-72 h-72" />
          </div>
          
          <div className="relative z-10 max-w-2xl">
            <span className="bg-blue-50 text-blue-700 font-semibold text-xs px-3.5 py-1.5 rounded-full inline-flex items-center space-x-1 mb-3 select-none border border-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>{isPublicView ? "Daftar Berkas Terbuka" : "Drive Cloud Sinkron"}</span>
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl leading-tight text-slate-800">
              {isPublicView ? "Selamat Datang di Galeri Publik!" : `Halo, ${user?.displayName || 'Pengguna'}!`}
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              {isPublicView 
                ? "Telusuri katalog file yang dibagikan secara terbuka oleh pemilik sistem. Di sini Anda dapat menyalin tautan akses langsung atau membuka file di Google Drive dengan aman." 
                : "Mulai unggah berkas Anda ke Google Drive dengan mudah. Buat folder baru, kelola antrean unggahan secara simultan, dan akses berkas Anda dengan sekali klik."}
            </p>
          </div>
        </div>

        {/* Folder Selection block - Hidden on Public guest view */}
        {!isPublicView && (
          <div className="mb-8">
            <FolderSelector
              folders={folders}
              activeFolderId={activeFolderId}
              onSelectFolder={handleSelectFolder}
              onCreateFolder={handleCreateFolder}
              activeFolderName={activeFolderName}
              onShareFolder={handleShareFolder}
              isSharingFolder={isSharingFolder}
            />
          </div>
        )}

        {/* Dashboard Grid split panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* File explorer panel left - spans full width in public mode, hides upload queue columns */}
          <div className={isPublicView ? "lg:col-span-12 w-full" : "lg:col-span-7 xl:col-span-8"}>
            <FileExplorer
              files={isPublicView ? publicFiles : files}
              onDeleteFile={handleDeleteFile}
              isLoading={isPublicView ? isLoadingPublicFiles : isLoadingFiles}
              onRefresh={isPublicView ? refreshPublicViewFiles : () => token && refreshFiles(token, activeFolderId)}
              currentFolderId={isPublicView ? null : activeFolderId}
              activeFolderName={isPublicView ? 'Semua Berkas Publik' : activeFolderName}
              onSelectFolder={handleSelectFolder}
              isPublicView={isPublicView}
            />
          </div>

          {/* Interactive Upload slots uploader panel right - Hidden completely on Public view */}
          {!isPublicView && (
            <div className="lg:col-span-5 xl:col-span-4 h-full">
              <UploadQueue
                queue={queue}
                onAddFiles={handleAddFilesToQueue}
                onRemoveQueueItem={handleRemoveQueueItem}
                onClearQueue={handleClearQueue}
                onStartUpload={handleStartUpload}
                isUploading={isUploading}
                activeFolderName={activeFolderName}
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
