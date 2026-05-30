export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
  createdTime: string;
  iconLink?: string;
}

export interface StorageQuota {
  limit: number;
  usage: number;
  percentage: number;
}

export interface UploadQueueItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'queued' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  url?: string;
  folderId?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
}
