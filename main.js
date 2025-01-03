import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import logginglog from 'logginglog';
import { join } from 'path';
import { platform } from 'os';
import { spawn } from '@lydell/node-pty';

const dirname = import.meta.dirname;

const color = logginglog.colors();
const serverlog = logginglog.makeLogger('W-Shell', color.rainbow);

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
        const isWindows = platform() === 'win32' ? true : false; // Afhankelijk van het platform
        let outputBuffer = '';

        const terminal = spawn(shell, [], {
            name: 'xterm-256color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: process.env
        });

        terminal.on('data', (data) => {
            outputBuffer += data; // Buffer de uitvoer
            mainWindow.webContents.send('command-output', data);
    
            // Controleer of het script klaar is (bijvoorbeeld door te zoeken naar een prompt of specifiek bericht)
            if (data.includes('EINDE_SCRIPT')) { // Pas dit aan naar het einde van jouw script
                terminal.write('');
                mainWindow.webContents.send('starting'); // Nu pas versturen
            }
        });

        if (isWindows) {
            mainWindow.webContents.send('starting');
        } else {
            terminal.write(`sh -c "$(cat ${import.meta.dirname}/startup.sh)"\r`);
        }

        // Wanneer de terminal wordt gesloten, stuur dan een bericht terug
        terminal.on('exit', (code) => {
            mainWindow.webContents.send('command-output', `Process exited with code ${code}`);
            serverlog(`Process exited with code ${code}`);
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