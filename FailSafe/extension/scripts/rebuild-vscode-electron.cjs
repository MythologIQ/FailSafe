const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { downloadAndUnzipVSCode } = require('@vscode/test-electron');

async function resolveAppRoot() {
  const localTestDir = path.join(__dirname, '..', '.vscode-test');
  if (fs.existsSync(localTestDir)) {
    const entries = fs.readdirSync(localTestDir, { withFileTypes: true });
    const vscodeDir = entries.find(
      (entry) => entry.isDirectory() && entry.name.startsWith('vscode-')
    );
    if (vscodeDir) {
      const directRoot = path.join(localTestDir, vscodeDir.name, 'resources', 'app');
      if (fs.existsSync(path.join(directRoot, 'package.json'))) {
        return directRoot;
      }

      // VS Code archives may include a nested commit directory
      // (for example, vscode-.../<commit>/resources/app).
      const nestedEntries = fs.readdirSync(path.join(localTestDir, vscodeDir.name), { withFileTypes: true });
      for (const nested of nestedEntries) {
        if (!nested.isDirectory()) {
          continue;
        }
        const candidate = path.join(localTestDir, vscodeDir.name, nested.name, 'resources', 'app');
        if (fs.existsSync(path.join(candidate, 'package.json'))) {
          return candidate;
        }
      }
    }
  }

  const vscodePath = await downloadAndUnzipVSCode();
  const vscodeDir = path.dirname(vscodePath);
  return path.join(vscodeDir, 'resources', 'app');
}

function readElectronVersion(appRoot) {
  const packagePath = path.join(appRoot, 'package.json');
  if (!fs.existsSync(packagePath)) {
    throw new Error(`VS Code package.json not found at ${packagePath}`);
  }
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  if (pkg.electron) {
    return pkg.electron;
  }

  const bootstrapPath = path.join(appRoot, 'out', 'bootstrap-fork.js');
  if (fs.existsSync(bootstrapPath)) {
    const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
    const match = bootstrap.match(/\"electron\":\"([0-9.]+)\"/);
    if (match) {
      return match[1];
    }
  }

  throw new Error('Electron version not found in VS Code package.json or bootstrap-fork.js');
}

function rebuildBetterSqlite3(electronVersion) {
  const npmExecPath = process.env.npm_execpath;
  const npmCmd = npmExecPath
    ? process.execPath
    : process.platform === 'win32'
      ? 'npm.cmd'
      : 'npm';
  const args = [
    'rebuild',
    'better-sqlite3',
    '--runtime=electron',
    `--target=${electronVersion}`,
    '--dist-url=https://electronjs.org/headers'
  ];
  const npmArgs = npmExecPath ? [npmExecPath, ...args] : args;
  const result = spawnSync(npmCmd, npmArgs, { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`better-sqlite3 rebuild failed with exit code ${result.status}`);
  }
}

async function main() {
  const appRoot = await resolveAppRoot();
  const electronVersion = readElectronVersion(appRoot);
  rebuildBetterSqlite3(electronVersion);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
