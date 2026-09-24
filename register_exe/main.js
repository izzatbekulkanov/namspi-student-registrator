const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { autoUpdater } = require('electron-updater');

// AutoUpdater sozlamalari
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const logFilePath = path.join(app.getPath('userData'), 'app.log');

async function logToFile(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [${level}] ${message}\n`;
    try {
        await fs.appendFile(logFilePath, logMessage);
        console.log(logMessage.trim());
    } catch (err) {
        console.error(`Failed to write to log file: ${err.message}`);
    }
}

function setupAutoUpdater(mainWindow) {
    try {
        autoUpdater.setFeedURL({
            provider: "generic",
            url: "https://raw.githubusercontent.com/izzatbekulkanov/NamSPI_REGISTRATOR/main/releases/register-exe/"
        });
    } catch (e) {
        logToFile(`setFeedURL xatosi: ${e.message}`, 'WARNING');
    }

    autoUpdater.on('update-available', (info) => {
        logToFile(`Yangi versiya mavjud: ${info.version}`);
        mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        mainWindow.webContents.send('update-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
        logToFile(`Yangi versiya yuklab olindi: ${info.version}`);
        mainWindow.webContents.send('update-downloaded', info);
    });

    autoUpdater.on('error', (err) => {
        logToFile(`AutoUpdater xatosi: ${err ? err.message : 'Noma‘lum xato'}`, 'ERROR');
        mainWindow.webContents.send('update-error', err ? err.message : 'Yangilanishda xatolik yuz berdi');
    });

    // Dastur ishga tushgach 5 soniyadan keyin yangilanish tekshiriladi
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
            logToFile(`Yangilanish tekshirishda xato: ${err.message}`, 'WARNING');
        });
    }, 5000);

    // Har 15 daqiqada yangi versiyani tekshirib turish
    setInterval(() => {
        autoUpdater.checkForUpdates().catch(err => {
            logToFile(`Davriy yangilanish tekshirishda xato: ${err.message}`, 'WARNING');
        });
    }, 15 * 60 * 1000);
}

app.whenReady().then(async () => {
    app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath("exe")
    });

    await logToFile('Ilova ishga tushmoqda');

    const userDataPath = path.join(app.getPath('userData'), 'CustomCache', 'namdpi-queue-app');
    const cachePath = path.join(app.getPath('userData'), 'CustomCache');
    app.setPath('userData', userDataPath);
    app.setPath('cache', cachePath);

    await logToFile(`Kesh yo‘li o‘zgartirildi: ${cachePath}`);
    await logToFile(`User Data Path: ${userDataPath}`);
    await logToFile(`Cache Path: ${cachePath}`);

    const mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        fullscreen: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    await logToFile('Ilova oynasi va menyu yaratildi');

    setupAutoUpdater(mainWindow);

    const menu = Menu.buildFromTemplate([
        {
            label: 'Fayl',
            submenu: [
                {
                    label: 'Printer sozlamalari',
                    click: () => {
                        mainWindow.webContents.send('show-printer-modal');
                        logToFile('Printer tanlash oynasi ochildi');
                    },
                },
                {
                    label: 'Yangilash ma\'lumotlar',
                    click: () => {
                        mainWindow.webContents.send('refresh-data');
                        logToFile('Ma\'lumotlar yangilandi');
                    },
                },
                {
                    label: 'Loglarni ko\'rish',
                    click: async () => {
                        try {
                            await shell.openPath(logFilePath);
                            await logToFile('Log fayli ochildi');
                        } catch (err) {
                            await logToFile(`Log faylini ochishda xato: ${err.message}`, 'ERROR');
                        }
                    },
                },
                {
                    label: 'Oxirgi chiptani qayta chop etish',
                    click: () => {
                        mainWindow.webContents.send('reprint-ticket');
                        logToFile('Oxirgi chipta qayta chop etish so\'raldi');
                    },
                },
                {
                    label: 'Ilovani qayta ishga tushirish',
                    click: () => {
                        mainWindow.webContents.send('restart-app');
                        logToFile('Ilova qayta ishga tushirish so\'raldi');
                    },
                },
                { type: 'separator' },
                {
                    label: 'Yordam',
                    click: async () => {
                        await shell.openExternal('https://www.namspi.uz');
                        await logToFile('Yordam sahifasi ochildi: https://www.namspi.uz');
                    },
                },
                { type: 'separator' },
                { role: 'quit', label: 'Chiqish' },
            ],
        },
    ]);
    Menu.setApplicationMenu(menu);

    await logToFile('Ilova muvaffaqiyatli ishga tushdi');

    // Auto-update IPC handlers
    ipcMain.handle('start-download-update', async () => {
        try {
            await autoUpdater.downloadUpdate();
            return { success: true };
        } catch (error) {
            logToFile(`Update download error: ${error.message}`, 'ERROR');
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('install-update', () => {
        autoUpdater.quitAndInstall(false, true);
    });

    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    // Printer va boshqa mavjud handlerlar
    ipcMain.handle('get-printers', async () => {
        try {
            const printers = await mainWindow.webContents.getPrintersAsync();
            await logToFile(`Printerlar ro‘yxati olindi: ${printers.map(p => p.name).join(', ')}`);
            return printers;
        } catch (err) {
            await logToFile(`Printerlarni olishda xato: ${err.message}`, 'ERROR');
            throw err;
        }
    });

    ipcMain.handle('get-saved-printer', async () => {
        try {
            const configPath = path.join(app.getPath('userData'), 'printer-config.json');
            const data = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(data);
            await logToFile(`Saqlangan printer so‘raldi: ${config.printerName || 'yo‘q'}`);
            return config.printerName;
        } catch (err) {
            await logToFile(`Saqlangan printerni olishda xato: ${err.message}`, 'ERROR');
            return null;
        }
    });

    ipcMain.handle('save-selected-printer', async (event, printerName) => {
        try {
            const configPath = path.join(app.getPath('userData'), 'printer-config.json');
            await fs.writeFile(configPath, JSON.stringify({ printerName }));
            await logToFile(`Tanlangan printer saqlandi: ${printerName}`);
            return true;
        } catch (err) {
            await logToFile(`Printerni saqlashda xato: ${err.message}`, 'ERROR');
            throw err;
        }
    });

    ipcMain.handle('print-ticket', async (event, html, options) => {
        try {
            await logToFile('print-ticket handler chaqirildi');
            const printer = await mainWindow.webContents.getPrintersAsync();
            const selectedPrinter = printer.find(p => p.name === (options.deviceName || ''));

            if (!selectedPrinter) {
                await logToFile(`Printer topilmadi: ${options.deviceName}`, 'ERROR');
                throw new Error(`Printer topilmadi: ${options.deviceName}`);
            }

            await logToFile(`Saqlangan printer: ${options.deviceName}`);

            const printWindow = new BrowserWindow({
                show: false,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                },
            });

            const htmlContent = `data:text/html;charset=UTF-8,${encodeURIComponent(html)}`;
            await printWindow.loadURL(htmlContent);
            await logToFile('Chop etish uchun HTML oynaga yuklandi');

            const printSettings = {
                silent: options.silent || true,
                deviceName: options.deviceName,
                pageSize: options.pageSize || { width: 58000, height: 80000 },
                margins: options.margins || { marginType: 'none' },
            };

            await logToFile(`Chop etish uchun sozlamalar: ${JSON.stringify(printSettings)}`);

            printWindow.webContents.print(printSettings, (success, errorType) => {
                if (!success) {
                    logToFile(`Chop etishda xato: ${errorType}`, 'ERROR');
                } else {
                    logToFile('Chop etish muvaffaqiyatli yakunlandi');
                }
                printWindow.destroy();
            });

            return true;
        } catch (err) {
            await logToFile(`Chop etishda xato: ${err.message}`, 'ERROR');
            throw err;
        }
    });

    ipcMain.handle('log-to-file', async (event, message, level) => {
        await logToFile(message, level);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});