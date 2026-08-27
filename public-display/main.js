const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

// Avtomatik audio ijro etishga ruxsat berish
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

try {
    app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath("exe")
    });
} catch (e) {
    // Muhit bo'yicha e'tiborsiz qoldirish
}

function createWindow() {
    let displays = screen.getAllDisplays();
    let externalDisplay = displays.find((display) => {
        return display.bounds.x !== 0 || display.bounds.y !== 0;
    });

    let x = 0;
    let y = 0;

    if (externalDisplay) {
        x = externalDisplay.bounds.x;
        y = externalDisplay.bounds.y;
    }

    const win = new BrowserWindow({
        x: x,
        y: y,
        width: 1280,
        height: 720,
        fullscreen: true,
        autoHideMenuBar: true,
        backgroundColor: '#1e1e2f',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false, // API so'rovlar uchun CORS to'siqlarini olib tashlash
            nodeIntegration: false,
            contextIsolation: true,
            allowRunningInsecureContent: true
        }
    });

    win.loadFile('index.html');

    // Tugmalar: F11 - to'liq ekran, F5 - yangilash, F12 - dasturchi konsoli
    win.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11' && input.type === 'keyDown') {
            win.setFullScreen(!win.isFullScreen());
        } else if (input.key === 'F5' && input.type === 'keyDown') {
            win.reload();
        } else if (input.key === 'F12' && input.type === 'keyDown') {
            win.webContents.toggleDevTools();
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
