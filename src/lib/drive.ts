import type { DriveFile, StorageQuota, DriveFolder } from '../types';

/**
 * Mendapatkan informasi kuota penyimpanan pengguna dari Google Drive API.
 */
export const fetchStorageQuota = async (accessToken: string): Promise<StorageQuota> => {
  const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error('Gagal mengambil kuota penyimpanan Google Drive');
  }
  const data = await response.json();
  const limit = parseInt(data.storageQuota.limit || '16106127360', 10);
  const usage = parseInt(data.storageQuota.usage || '0', 10);
  const percentage = limit > 0 ? (usage / limit) * 100 : 0;
  return {
    limit,
    usage,
    percentage: parseFloat(percentage.toFixed(2))
  };
};

/**
 * Mengambil daftar folder yang dibuat atau diakses oleh aplikasi ini.
 */
export const listFolders = async (accessToken: string): Promise<DriveFolder[]> => {
  const q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error('Gagal mengambil daftar folder dari Google Drive');
  }
  const data = await response.json();
  return data.files || [];
};

/**
 * Mengambil daftar file (dan folder) berdasarkan folder induk opsional.
 */
export const listFilesAndFolders = async (
  accessToken: string,
  folderId?: string
): Promise<DriveFile[]> => {
  const fields = 'files(id,name,mimeType,webViewLink,webContentLink,size,createdTime,iconLink)';
  let q = 'trashed = false';
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }
  
  // Ambil data, urutkan berdasarkan waktu pembuatan terbaru
  const url = `https://www.googleapis.com/drive/v3/files?fields=${fields}&orderBy=createdTime%20desc&q=${encodeURIComponent(q)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal mengambil daftar file di Google Drive');
  }
  const data = await response.json();
  return data.files || [];
};

/**
 * Membuat folder baru di Google Drive.
 */
export const createFolder = async (
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<DriveFolder> => {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }
  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal membuat folder baru di Google Drive');
  }
  return await response.json() as DriveFolder;
};

/**
 * Mengunggah file ke Google Drive menggunakan XMLHttpRequest untuk pelacakan progress persentase.
 */
export const uploadFileWithProgress = (
  accessToken: string,
  file: File,
  folderId?: string,
  onProgress?: (progress: number) => void
): Promise<DriveFile> => {
  return new Promise((resolve, reject) => {
    const metadata: any = {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = 'drive_uploader_boundary_multipart';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file lokal untuk diunggah.'));
    reader.onload = () => {
      const metadataPart = JSON.stringify(metadata);
      const fileContent = reader.result as ArrayBuffer;

      // Buat bagian tubuh multipart request
      const bodyParts: any[] = [
        delimiter,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        metadataPart,
        delimiter,
        `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
        fileContent,
        closeDelimiter
      ];

      const body = new Blob(bodyParts, { type: `multipart/related; boundary=${boundary}` });

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,size,createdTime,iconLink');
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 100);
            onProgress(percentage);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (err) {
            reject(new Error('Format respons Google Drive tidak valid.'));
          }
        } else {
          try {
            const errResponse = JSON.parse(xhr.responseText);
            reject(new Error(errResponse.error?.message || `Gagal mengunggah (${xhr.status})`));
          } catch {
            reject(new Error(`Gagal mengunggah, status: ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Terjadi kesalahan jaringan atau koneksi terputus saat mengunggah.'));
      };

      xhr.send(body);
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Menghapus file atau folder dari Google Drive.
 */
export const deleteFileOrFolder = async (accessToken: string, fileId: string): Promise<void> => {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal menghapus file/folder dari Google Drive');
  }
};

/**
 * Mengubah hak akses file di Google Drive agar menjadi publik bagi siapa saja yang memiliki link.
 */
export const makeFilePublic = async (accessToken: string, fileId: string): Promise<void> => {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone'
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal mengubah hak akses file menjadi publik');
  }
};
