import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  isElectron: boolean;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<boolean>;
  isMaximized: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  openFileDialog: () => Promise<{
    filePath: string;
    fileName: string;
    fileSize: number;
    lastModified: number;
    content: string;
    error?: string;
  } | null>;
  readFilePath: (path: string) => Promise<{
    filePath: string;
    fileName: string;
    fileSize: number;
    lastModified: number;
    content: string;
    error?: string;
  }>;
  getDesktopJira: () => Promise<{
    filePath: string;
    fileName: string;
    fileSize: number;
    lastModified: number;
    content: string;
  } | null>;
  saveFile: (payload: {
    defaultName: string;
    content: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{ success?: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  exportPdf: (options?: {
    fileName?: string;
    pageSize?: string;
    landscape?: boolean;
  }) => Promise<{ success?: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  listDatasets: () => Promise<any[]>;
  saveDataset: (dataset: any) => Promise<{ success?: boolean; error?: string }>;
  deleteDataset: (datasetId: string) => Promise<{ success?: boolean; error?: string }>;
}

const electronAPI: ElectronAPI = {
  isElectron: true,
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  openFileDialog: () => ipcRenderer.invoke('dialog:openCsvFile'),
  readFilePath: (targetPath: string) => ipcRenderer.invoke('file:readPath', targetPath),
  getDesktopJira: () => ipcRenderer.invoke('file:getDesktopJira'),
  saveFile: (payload) => ipcRenderer.invoke('dialog:saveFile', payload),
  exportPdf: (options) => ipcRenderer.invoke('export:pdf', options),
  listDatasets: () => ipcRenderer.invoke('storage:listDatasets'),
  saveDataset: (dataset) => ipcRenderer.invoke('storage:saveDataset', dataset),
  deleteDataset: (datasetId) => ipcRenderer.invoke('storage:deleteDataset', datasetId),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
