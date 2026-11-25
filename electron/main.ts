import { app, BrowserWindow, ipcMain, dialog, nativeImage, Menu, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
const isMac = process.platform === 'darwin';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

function getWindowStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function isBoundsVisibleOnAnyDisplay(x: number, y: number, width: number, height: number): boolean {
  try {
    const displays = screen.getAllDisplays();
    return displays.some((d) => {
      const wa = d.workArea;
      const overlapX = Math.max(0, Math.min(x + width, wa.x + wa.width) - Math.max(x, wa.x));
      const overlapY = Math.max(0, Math.min(y + height, wa.y + wa.height) - Math.max(y, wa.y));
      return overlapX >= 100 && overlapY >= 80;
    });
  } catch {
    return true;
  }
}

function loadWindowState(): WindowState {
  try {
    const p = getWindowStatePath();
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        const width = Math.max(1080, parsed.width);
        const height = Math.max(700, parsed.height);
        const hasCoords = typeof parsed.x === 'number' && typeof parsed.y === 'number';
        const coordsValid = hasCoords && isBoundsVisibleOnAnyDisplay(parsed.x, parsed.y, width, height);
        return {
          width,
          height,
          x: coordsValid ? parsed.x : undefined,
          y: coordsValid ? parsed.y : undefined,
          isMaximized: Boolean(parsed.isMaximized),
        };
      }
    }
  } catch {
    // fallback default
  }
  return { width: 1440, height: 920 };
}

function saveWindowState(win: BrowserWindow) {
  try {
    if (win.isMinimized() || win.isFullScreen()) return;
    const isMax = win.isMaximized();
    const bounds = isMax ? loadWindowState() : win.getBounds();
    const state: WindowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: isMax,
    };
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state), 'utf-8');
  } catch {
    // ignore
  }
}

/**
 * Decodes raw CSV buffer cleanly: handles UTF-8 BOM, UTF-16 LE/BE BOM,
 * strict UTF-8, and falls back to Windows-1254 (Turkish ANSI) for Excel CSVs.
 */
function decodeCsvBuffer(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString('utf-8');
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString('utf16le');
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    try {
      return new TextDecoder('utf-16be').decode(buf.subarray(2));
    } catch {
      // fall through
    }
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    try {
      return new TextDecoder('windows-1254').decode(buf);
    } catch {
      return buf.toString('utf-8');
    }
  }
}

function setupApplicationMenu() {
  if (!isMac) {
    Menu.setApplicationMenu(null);
    return;
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: 'Reporter Hakkında' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Reporter Uygulamasını Gizle' },
        { role: 'hideOthers', label: 'Diğerlerini Gizle' },
        { role: 'unhide', label: 'Tümünü Göster' },
        { type: 'separator' },
        { role: 'quit', label: 'Reporter Uygulamasından Çık' },
      ],
    },
    {
      label: 'Düzen',
      submenu: [
        { role: 'undo', label: 'Geri Al' },
        { role: 'redo', label: 'Yinele' },
        { type: 'separator' },
        { role: 'cut', label: 'Kes' },
        { role: 'copy', label: 'Kopyala' },
        { role: 'paste', label: 'Yapıştır' },
        { role: 'selectAll', label: 'Tümünü Seç' },
      ],
    },
    {
      label: 'Görünüm',
      submenu: [
        { role: 'reload', label: 'Yenile' },
        { role: 'forceReload', label: 'Zorla Yenile' },
        ...(!app.isPackaged ? [{ role: 'toggleDevTools' as const }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam Ekran' },
      ],
    },
    {
      label: 'Pencere',
      submenu: [
        { role: 'minimize', label: 'Küçült' },
        { role: 'zoom', label: 'Büyüt' },
        { type: 'separator' },
        { role: 'front', label: 'Tümünü Öne Getir' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function resolveAppIcon() {
  const candidates = [
    path.join(__dirname, '../assets/icon.png'),
    path.join(app.getAppPath(), 'assets/icon.png'),
    ...(process.resourcesPath ? [path.join(process.resourcesPath, 'assets/icon.png')] : []),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const img = nativeImage.createFromPath(p);
      if (!img.isEmpty()) return img;
    }
  }
  return undefined;
}

function createWindow() {
  const winState = loadWindowState();
  const appIcon = resolveAppIcon();

  mainWindow = new BrowserWindow({
    width: winState.width,
    height: winState.height,
    x: winState.x,
    y: winState.y,
    minWidth: 1080,
    minHeight: 700,
    frame: isMac,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac ? { trafficLightPosition: { x: 14, y: 13 } } : {}),
    backgroundColor: '#0a0c10',
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    if (winState.isMaximized) {
      mainWindow?.maximize();
    }
    mainWindow?.show();
  });

  let saveTimer: NodeJS.Timeout | null = null;
  const scheduleSaveState = () => {
    if (!mainWindow) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        saveWindowState(mainWindow);
      }
    }, 350);
  };

  mainWindow.on('resize', scheduleSaveState);
  mainWindow.on('move', scheduleSaveState);
  mainWindow.on('maximize', scheduleSaveState);
  mainWindow.on('unmaximize', scheduleSaveState);
  mainWindow.on('close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      saveWindowState(mainWindow);
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupApplicationMenu();
  if (isMac) {
    const dockIcon = resolveAppIcon();
    if (dockIcon && app.dock) {
      app.dock.setIcon(dockIcon);
    }
    app.setAboutPanelOptions({
      applicationName: 'Reporter',
      applicationVersion: app.getVersion(),
      copyright: 'Reporter Precision Analytical Engine',
    });
  }

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
  if (!mainWindow) return false;
  if (isMac && mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false);
    return false;
  }
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  }
  mainWindow.maximize();
  return true;
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
    title: 'CSV / Delimited Veri Dosyası Seç',
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
    const rawBuf = fs.readFileSync(filePath);
    const content = decodeCsvBuffer(rawBuf);
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
    const rawBuf = fs.readFileSync(targetPath);
    const content = decodeCsvBuffer(rawBuf);
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
    path.join(__dirname, '../dist/sample-data/Jira(2).csv'),
    path.join(__dirname, '../sample-data/Jira(2).csv'),
    path.join(app.getAppPath(), 'dist/sample-data/Jira(2).csv'),
    ...(process.resourcesPath ? [path.join(process.resourcesPath, 'sample-data/Jira(2).csv')] : []),
    path.join(process.cwd(), 'sample-data/Jira(2).csv'),
  ];

  for (const p of desktopPaths) {
    if (fs.existsSync(p)) {
      try {
        const rawBuf = fs.readFileSync(p);
        const content = decodeCsvBuffer(rawBuf);
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

ipcMain.handle('dialog:saveBinaryFile', async (_event, { defaultName, data, filters }) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters || [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  try {
    const buf = Buffer.from(data);
    fs.writeFileSync(result.filePath, buf);
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
      title: 'Raporu PDF Olarak Kaydet',
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
  } catch {
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
