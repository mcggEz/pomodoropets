const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

let mainWindow;
let tray;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    frame: false,
    transparent: true,
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

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon);
  tray.setToolTip('PomadoroCat');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
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
    sessionsBeforeLongBreak: store.get('sessionsBeforeLongBreak', 4)
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('workTime', settings.workTime);
  store.set('breakTime', settings.breakTime);
  store.set('longBreakTime', settings.longBreakTime);
  store.set('sessionsBeforeLongBreak', settings.sessionsBeforeLongBreak);
  return true;
});

ipcMain.on('timer-complete', () => {
  if (tray) {
    tray.displayBalloon({
      title: 'PomadoroCat',
      content: 'Time is up! Take a break! 🐱',
      icon: path.join(__dirname, 'assets', 'icon.png')
    });
  }
}); 