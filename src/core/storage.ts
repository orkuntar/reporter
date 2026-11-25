import { Dataset } from '../types';

const DB_NAME = 'reporter_desktop_db';
const STORE_NAME = 'datasets';
const DB_VERSION = 1;

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadSavedDatasets(): Promise<Dataset[]> {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI?.listDatasets) {
    try {
      const list = await electronAPI.listDatasets();
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const res = (req.result || []) as Dataset[];
        res.sort((a, b) => (b.importedAt || '').localeCompare(a.importedAt || ''));
        resolve(res);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function persistDataset(dataset: Dataset): Promise<void> {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI?.saveDataset) {
    await electronAPI.saveDataset(dataset);
    return;
  }

  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataset);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore storage fallback error
  }
}

export async function removeSavedDataset(datasetId: string): Promise<void> {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI?.deleteDataset) {
    await electronAPI.deleteDataset(datasetId);
    return;
  }

  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(datasetId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}
