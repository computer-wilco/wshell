import { ipcRenderer } from 'electron';
import fitaddon from '@xterm/addon-fit';
import xterm from '@xterm/xterm';
import { platform } from 'os';
const { FitAddon } = fitaddon;
const { Terminal } = xterm;

function loadTerminal() {
    var theme = {
        foreground: '#F8F8F8',
        background: '#2D2E2C',
        selection: '#5DA5D533',
        black: '#1E1E1D',
        brightBlack: '#262625',
        red: '#CE5C5C',
        brightRed: '#FF7272',
        green: '#5BCC5B',
        brightGreen: '#72FF72',
        yellow: '#CCCC5B',
        brightYellow: '#FFFF72',
        blue: '#5D5DD3',
        brightBlue: '#7279FF',
        magenta: '#BC5ED1',
        brightMagenta: '#E572FF',
        cyan: '#5DA5D5',
        brightCyan: '#72F0FF',
        white: '#F8F8F8',
        brightWhite: '#FFFFFF'
    };

    var fitAddon = new FitAddon();

    var term = new Terminal({
        fontFamily: '"Cascadia Code", Menlo, monospace',
        fontWeight: 'bold',
        fontSize: 15,
        theme: theme,
        cursorBlink: true,
        allowProposedApi: true
    });

    term.loadAddon(fitAddon);

    term.open(document.getElementById('xterminal'));

    fitAddon.fit();

    window.addEventListener('resize', () => {
        fitAddon.fit();
    });

    term._initialized = true;

    ipcRenderer.send('start-terminal');

    ipcRenderer.on('command-output', (event, output) => {
        term.write(output);
    });

    function executeCommand(command) {
        ipcRenderer.send('execute-command', command);
    }

    term.reset();
    ipcRenderer.on('starting', () => {
        const shell = platform() === 'win32' ? 'powershell.exe' : process.env.SHELL;
        term.reset();
        term.write('\x1b[31;1mWelkom \x1b[33;1mbij \x1b[34mde \x1b[32m\x1b[3mW-shell\x1b[0m\x1b[0m\r\n');
        term.write(`\r\nExecute command: \x1b[3m${shell}\x1b[0m\r\n\r\n`);
    });

    term.onData((data) => {
        if (data === '\r') { // Als Enter wordt ingedrukt, voer het commando uit
            executeCommand('\r'); // Ga naar de volgende regel
        } else if (data === '\u007f') {  // Backspace wordt ingedrukt
            // Verwijder het laatste karakter van de invoer
            executeCommand('\b \b');  // Verwijder het laatste karakter in de terminal
        } else if (data === '\u0003') {
            executeCommand('\u0003');
        } else {
            // Voeg de geklikte toets toe aan de invoer
            executeCommand(data);  // Schrijf het in de terminal
        }
    });
}

addEventListener("DOMContentLoaded", loadTerminal);
