import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import logginglog from 'logginglog';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { platform, homedir } from 'os';
import { spawn } from '@lydell/node-pty';
import downloadWPM from './installer.js';

const dirname = import.meta.dirname;

const color = logginglog.colors();
const serverlog = logginglog.makeLogger('W-Shell', color.rainbow);

// Configuratie voor shell
const shell = platform() === 'win32' ? 'powershell.exe' : process.env.SHELL;
const pathSeparator = platform() === 'win32' ? ';' : ':';
const homeDir = platform() === 'win32' ? process.env.USERPROFILE : process.env.HOME;
const hiddenBinDir = join(homeDir, '.w-shell/bin');


let mainWindow;

async function installWPM() {
    if (platform() === "win32") {
        if (!existsSync(join(homedir(), `.w-shell/bin/wpm.exe`))) {
            try {
                serverlog('WPM wordt geïnstalleerd!');
                await downloadWPM();
                serverlog('WPM is gedownload en geïnstalleerd!');
            } catch (error) {
                console.error('Fout bij installatie:', error);
            }
        }
    } else {
        if (!existsSync(join(homedir(), `.w-shell/bin/wpm`))) {
            try {
                serverlog('WPM wordt geïnstalleerd!');
                await downloadWPM();
                serverlog('WPM is gedownload en geïnstalleerd!');
            } catch (error) {
                console.error('Fout bij installatie:', error);
            }
        }
    }
}

app.on('ready', async () => {
    const env = { ...process.env, PATH: `${hiddenBinDir}${pathSeparator}${process.env.PATH}` };

    if (!existsSync(hiddenBinDir)) {
        mkdirSync(hiddenBinDir, { recursive: true });
    }

    mainWindow = new BrowserWindow({
        alwaysOnTop: true,
        autoHideMenuBar: true,
        title: app.name,
        show: false,
        webPreferences: {
            preload: join(dirname, "terminal.mjs"),
            nodeIntegration: true,
            sandbox: false,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(join(dirname, 'index.html'));

    mainWindow.on('ready-to-show', async () => {
        await installWPM();
        mainWindow.show();
    });

    globalShortcut.register("F12", () => mainWindow.webContents.openDevTools({ mode: 'detach' }));

    ipcMain.on('start-terminal', (event) => {
        const terminal = spawn(shell, [], {
            name: 'xterm-256color',
            cols: 80,
            rows: 30,
            cwd: homeDir,
            env: env
        });

        terminal.on('data', (data) => {
            mainWindow.webContents.send('command-output', data);
        });

        // Wanneer de terminal wordt gesloten, stuur dan een bericht terug
        terminal.on('exit', (code) => {
            mainWindow.webContents.send('command-output', `Process exited with code ${code}`);
            serverlog(`Process exited with code ${code}`);
            mainWindow.destroy();
        });

        mainWindow.webContents.send("starting");

        // Sla het terminal object op in een globale variabele om later toegang te krijgen
        global.terminal = terminal;
    });

    // Luister naar commando's die uitgevoerd moeten worden
    ipcMain.on('execute-command', (event, command) => {
        if (global.terminal) {
            global.terminal.write(`${command}`); // Voer het commando pas uit na Enter
        }
    });
});
