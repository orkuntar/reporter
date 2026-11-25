import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    frame: false, // Clean minimal frameless design
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0c10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      // Fallback dev url if dist doesn't exist yet
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: Window Controls
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow?.maximize();
    return true;
  }
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

// IPC: File Dialogs & System I/O
ipcMain.handle('dialog:openCsvFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select CSV / Delimited Data File',
    filters: [
      { name: 'CSV & Delimited Files', extensions: ['csv', 'tsv', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);
    return {
      filePath,
      fileName: path.basename(filePath),
      fileSize: stats.size,
      lastModified: stats.mtimeMs,
      content,
    };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('file:readPath', async (_event, targetPath: string) => {
  try {
    if (!fs.existsSync(targetPath)) {
      return { error: `File not found: ${targetPath}` };
    }
    const content = fs.readFileSync(targetPath, 'utf-8');
    const stats = fs.statSync(targetPath);
    return {
      filePath: targetPath,
      fileName: path.basename(targetPath),
      fileSize: stats.size,
      lastModified: stats.mtimeMs,
      content,
    };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('file:getDesktopJira', async () => {
  const desktopPaths = [
    path.join(app.getPath('desktop'), 'Jira (2).csv'),
    path.join(app.getPath('desktop'), 'Jira(2).csv'),
    path.join(__dirname, '../sample-data/Jira(2).csv'),
    path.join(process.cwd(), 'sample-data/Jira(2).csv')
  ];

  for (const p of desktopPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8');
        const stats = fs.statSync(p);
        return {
          filePath: p,
          fileName: path.basename(p),
          fileSize: stats.size,
          lastModified: stats.mtimeMs,
          content,
        };
      } catch {
        // try next
      }
    }
  }
  return null;
});

ipcMain.handle('dialog:saveFile', async (_event, { defaultName, content, filters }) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters || [{ name: 'CSV File', extensions: ['csv'] }]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('export:pdf', async (_event, options) => {
  if (!mainWindow) return null;
  try {
    const pdfBuffer = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: options?.pageSize || 'A4',
      landscape: options?.landscape ?? true,
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    });

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Report as PDF',
      defaultPath: options?.fileName || 'Reporter-Analytics-Report.pdf',
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(result.filePath, pdfBuffer);
    return { success: true, filePath: result.filePath };
  } catch (err: any) {
    return { error: err.message };
  }
});

// IPC: Persistent Dataset Storage
function getDatasetsDir(): string {
  const dir = path.join(app.getPath('userData'), 'datasets');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitizeDatasetId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

ipcMain.handle('storage:listDatasets', async () => {
  try {
    const dir = getDatasetsDir();
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const datasets: any[] = [];
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
        datasets.push(JSON.parse(raw));
      } catch {
        // skip corrupted dataset file
      }
    }
    return datasets.sort((a, b) => (b.importedAt || '').localeCompare(a.importedAt || ''));
  } catch (err: any) {
    return [];
  }
});

ipcMain.handle('storage:saveDataset', async (_event, datasetObj: any) => {
  try {
    const dir = getDatasetsDir();
    const safeId = sanitizeDatasetId(String(datasetObj.id || Date.now()));
    const targetPath = path.join(dir, `${safeId}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(datasetObj), 'utf-8');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('storage:deleteDataset', async (_event, datasetId: string) => {
  try {
    const dir = getDatasetsDir();
    const safeId = sanitizeDatasetId(String(datasetId));
    const targetPath = path.join(dir, `${safeId}.json`);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
});
