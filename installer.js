import { existsSync, mkdirSync, createWriteStream, unlinkSync, readdirSync, chmodSync, renameSync } from 'fs';
import { join } from 'path';
import logginglog from 'logginglog';
import { homedir } from 'os';
import { get } from 'https';
import AdmZip from 'adm-zip';

const color = logginglog.colors();
const wpmlog = logginglog.makeLogger('WPM', color.rainbow);

const INSTALL_DIR = join(homedir(), '.w-shell/bin');
const ZIP_FILE = join(INSTALL_DIR, 'wpm.zip');
const ZIP_URL = "https://raw.githubusercontent.com/computer-wilco/wshell-commands/master/wpm/wpm.zip";

// Bepaal het juiste platformbestand
const PLATFORM_FILES = {
    linux: 'wpm-linux',
    darwin: 'wpm-macos',
    win32: 'wpm-win.exe',
};

const TARGET_FILE = PLATFORM_FILES[process.platform];

if (!TARGET_FILE) {
    console.error('Unsupported platform:', process.platform);
    process.exit(1);
}

// Zorg dat de installatiemap bestaat
if (!existsSync(INSTALL_DIR)) {
    mkdirSync(INSTALL_DIR, { recursive: true });
}

async function downloadAndExtract() {
    return new Promise((resolve, reject) => {
        const url = ZIP_URL;

        wpmlog(`Downloading from ${url}...`);
        const file = createWriteStream(ZIP_FILE);

        get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    wpmlog('Download completed. Extracting...');
                    
                    const zip = new AdmZip(ZIP_FILE);
                    zip.extractAllTo(INSTALL_DIR, true);

                    wpmlog('Extraction completed.');
                    cleanUpFiles();
                    makeExecutable();
                    renameFile();
                    resolve();
                });
            });
        }).on('error', reject);
    });
}

function cleanUpFiles() {
    try {
        const files = readdirSync(INSTALL_DIR);

        files.forEach(file => {
            const filePath = join(INSTALL_DIR, file);
            if (file !== TARGET_FILE && file !== 'wpm.zip') {
                wpmlog(`Removing ${filePath}...`);
                unlinkSync(filePath);
            }
        });

        wpmlog(`Removing ${ZIP_FILE}...`);
        unlinkSync(ZIP_FILE); // Verwijder het zip-bestand
        wpmlog('Cleanup completed.');
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

function makeExecutable() {
    if (process.platform !== 'win32') {
        try {
            const execFilePath = join(INSTALL_DIR, TARGET_FILE);
            chmodSync(execFilePath, 0o755); // Geef uitvoerrechten
            wpmlog(`Made ${execFilePath} executable.`);
        } catch (error) {
            console.error('Error setting executable permission:', error);
        }
    }
}

function renameFile() {
    if (process.platform === 'win32') {
        renameSync(join(INSTALL_DIR, TARGET_FILE), join(INSTALL_DIR, "wpm.exe"));
        wpmlog(`Renamed ${join(INSTALL_DIR, TARGET_FILE)} to ${join(INSTALL_DIR, "wpm.exe")}`);
    }
    if (process.platform !== 'win32') {
        renameSync(join(INSTALL_DIR, TARGET_FILE), join(INSTALL_DIR, "wpm"));
        wpmlog(`Renamed ${join(INSTALL_DIR, TARGET_FILE)} to ${join(INSTALL_DIR, "wpm")}`);
    }
}

// Exporteer de functie als een ES module
export default downloadAndExtract;