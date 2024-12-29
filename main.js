import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import { join } from 'path';
import { platform } from 'os';
import pty from '@lydell/node-pty';

const dirname = import.meta.dirname;

let mainWindow;

app.on('ready', () => {
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

    mainWindow.on('ready-to-show', () => mainWindow.show());

    globalShortcut.register("F12", () => mainWindow.webContents.openDevTools({ mode: 'detach' }));

    ipcMain.on('start-terminal', (event) => {
        const shell = platform() === 'win32' ? 'cmd.exe' : 'bash'; // Afhankelijk van het platform

        const terminal = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: process.env
        });

        terminal.write('sh -c "$(cat ' + import.meta.dirname + '/doedingen.sh)"\r');

        // Verstuur de uitvoer van de terminal naar de renderer
        terminal.on('data', (data) => {
            mainWindow.webContents.send('command-output', data);
        });

        // Wanneer de terminal wordt gesloten, stuur dan een bericht terug
        terminal.on('exit', (code) => {
            mainWindow.webContents.send('command-output', `Process exited with code ${code}`);
            mainWindow.destroy();
        });

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