const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath("exe")
});

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
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);
