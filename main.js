const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Disable disk cache to prevent permission errors
app.commandLine.appendSwitch('disable-http-cache');

const store = new Store();

let mainWindow;
let catOverlayWindow;
let tray;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    resizable: false,
    frame: false,
    transparent: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createCatOverlay() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  catOverlayWindow = new BrowserWindow({
    width: 150,
    height: 150,
    x: width - 200,
    y: height - 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false
  });

  catOverlayWindow.loadFile('cat-overlay.html');

  catOverlayWindow.once('ready-to-show', () => {
    catOverlayWindow.show();
  });

  catOverlayWindow.on('closed', () => {
    catOverlayWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon);
  tray.setToolTip('PomadoroCats');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Timer',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Show/Hide Pet',
      click: () => {
        if (catOverlayWindow && catOverlayWindow.isVisible()) {
          catOverlayWindow.hide();
        } else if (catOverlayWindow) {
          catOverlayWindow.show();
        } else {
          createCatOverlay();
        }
      }
    },
    {
      label: 'Start Timer',
      click: () => {
        mainWindow.webContents.send('start-timer');
      }
    },
    {
      label: 'Pause Timer',
      click: () => {
        mainWindow.webContents.send('pause-timer');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  
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

// IPC handlers
ipcMain.handle('get-settings', () => {
  return {
    workTime: store.get('workTime', 25),
    breakTime: store.get('breakTime', 5),
    longBreakTime: store.get('longBreakTime', 15),
    sessionsBeforeLongBreak: store.get('sessionsBeforeLongBreak', 4),
    catTheme: store.get('catTheme', 'chubby-gray'),
    petType: store.get('petType', 'cat')
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('workTime', settings.workTime);
  store.set('breakTime', settings.breakTime);
  store.set('longBreakTime', settings.longBreakTime);
  store.set('sessionsBeforeLongBreak', settings.sessionsBeforeLongBreak);
  store.set('catTheme', settings.catTheme);
  store.set('petType', settings.petType);
  
  // Notify overlay of the theme change
  if (catOverlayWindow) {
    catOverlayWindow.webContents.send('update-cat-theme', settings.catTheme);
  }

  // Also notify the main window to reload settings and apply theme
  if (mainWindow) {
      mainWindow.webContents.send('settings-updated');
  }

  return true;
});

ipcMain.on('timer-complete', () => {
  if (tray) {
    tray.displayBalloon({
      title: 'PomadoroCats',
      content: 'Time is up! Take a break! 🐱',
      icon: path.join(__dirname, 'assets', 'icon.png')
    });
  }
});

ipcMain.on('show-cat-overlay', () => {
  if (!catOverlayWindow) {
    createCatOverlay();
  } else if (!catOverlayWindow.isVisible()) {
    catOverlayWindow.show();
  }
});

ipcMain.on('hide-cat-overlay', () => {
  if (catOverlayWindow && catOverlayWindow.isVisible()) {
    catOverlayWindow.hide();
  }
});

ipcMain.on('update-cat-state', (event, state) => {
  if (catOverlayWindow) {
    catOverlayWindow.webContents.send('update-cat-state', state);
  }
});

ipcMain.on('update-overlay-time', (event, timeString) => {
    if (catOverlayWindow) {
        catOverlayWindow.webContents.send('update-overlay-time', timeString);
    }
}); 