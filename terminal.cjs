const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    startTerminal: () => ipcRenderer.send('start-terminal'),
    executeCommand: (command) => ipcRenderer.send('execute-command', command),
    onCommandOutput: (callback) => ipcRenderer.on('command-output', (event, output) => callback(output)),
    dirname: () => {return __dirname;}
});