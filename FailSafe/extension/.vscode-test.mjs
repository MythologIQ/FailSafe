import { defineConfig } from '@vscode/test-cli';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  files: 'out/test/**/*.test.js',
  extensionDevelopmentPath: __dirname,
  workspaceFolder: path.join(__dirname, 'src', 'test', 'test-workspace')
});
