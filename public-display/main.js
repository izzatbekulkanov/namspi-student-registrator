const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const { autoUpdater } = require('electron-updater');

app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath("exe")
});

// AutoUpdater sozlamalari
autoUpdater.autoDownload = false; // Yangilashni tasdiqlash uchun
autoUpdater.autoInstallOnAppQuit = true;

// MsEdgeTTS boshqaruvi
let ttsInstance = null;
let currentVoice = 'uz-UZ-MadinaNeural';

async function getTTS(voice = 'uz-UZ-MadinaNeural') {
    if (!ttsInstance || currentVoice !== voice) {
        ttsInstance = new MsEdgeTTS();
        await ttsInstance.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        currentVoice = voice;
    }
    return ttsInstance;
}

async function synthesizeText(text, voice = 'uz-UZ-MadinaNeural') {
    const doSynthesize = async (ttsObj) => {
        return new Promise((resolve, reject) => {
            const { audioStream } = ttsObj.toStream(text);
            const chunks = [];
            audioStream.on('data', chunk => chunks.push(chunk));
            audioStream.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve('data:audio/mp3;base64,' + buffer.toString('base64'));
            });
            audioStream.on('error', err => reject(err));
        });
    };

    try {
        const tts = await getTTS(voice);
        return await doSynthesize(tts);
    } catch (err) {
        console.warn('⚠️ Edge TTS qayta ulanmoqda...', err.message);
        ttsInstance = null;
        const freshTts = await getTTS(voice);
        return await doSynthesize(freshTts);
    }
}

// IPC orqali Renderer dan kelgan TTS so'rovini qabul qilish
ipcMain.handle('get-tts-audio', async (event, { text, voice }) => {
    try {
        const selectedVoice = voice || 'uz-UZ-MadinaNeural';
        return await synthesizeText(text, selectedVoice);
    } catch (error) {
        console.error('❌ Edge TTS xatolik:', error);
        throw error;
    }
});

// Auto-updater IPC amallari
ipcMain.handle('start-download-update', async () => {
    try {
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (error) {
        console.error('Update download error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

function setupAutoUpdater(win) {
    try {
        autoUpdater.setFeedURL({
            provider: "generic",
            url: "https://raw.githubusercontent.com/izzatbekulkanov/NamSPI_REGISTRATOR/main/releases/public-display/"
        });
    } catch (e) {
        console.warn('setFeedURL xatosi:', e.message);
    }

    autoUpdater.on('update-available', (info) => {
        console.log('Yangi versiya mavjud:', info.version);
        win.webContents.send('update-available', info);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        win.webContents.send('update-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('Yangi versiya yuklab olindi:', info.version);
        win.webContents.send('update-downloaded', info);
    });

    autoUpdater.on('error', (err) => {
        console.warn('AutoUpdater xatosi:', err == null ? 'unknown' : (err.stack || err).toString());
        win.webContents.send('update-error', err ? err.message : 'Yangilanishda xatolik yuz berdi');
    });

    // Dastur ochilgach 5 soniyadan keyin yangilanish tekshiriladi
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
            console.log('Initial update check:', err.message);
        });
    }, 5000);

    // Har 10 daqiqada yangi versiyani tekshirib turish
    setInterval(() => {
        autoUpdater.checkForUpdates().catch(err => {
            console.log('Periodic update check:', err.message);
        });
    }, 10 * 60 * 1000);
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
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile(path.join(__dirname, 'index.html'));
    
    // AutoUpdater ulanadi
    setupAutoUpdater(win);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
