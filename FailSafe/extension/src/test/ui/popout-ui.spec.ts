import fs from 'fs';
import http from 'http';
import path from 'path';
import { test, expect } from '@playwright/test';

test('popout UI shell renders required sections', async ({ page }) => {
  const root = path.resolve(__dirname, '../../roadmap/ui');
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = requestPath === '/' ? 'legacy-index.html' : requestPath.replace(/^\/+/, '');
    const filePath = path.join(root, relative);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    res.end(fs.readFileSync(filePath));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Failed to bind test server');
  }

  try {
    await page.goto(`http://127.0.0.1:${address.port}/legacy-index.html`);

    await expect(page.getByRole('button', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skills' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Governance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Activity' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reports' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(page.locator('#profile-select')).toBeVisible();

    await page.getByRole('button', { name: 'Skills' }).click();
    await expect(page.locator('#intent-input')).toBeVisible();
    await expect(page.getByText('All Relevant')).toHaveCount(1);
    await expect(page.locator('#intent-output')).toBeVisible();

    await page.getByRole('button', { name: 'Governance' }).click();
    await expect(page.locator('#sentinel-status')).toBeVisible();

    await page.getByRole('button', { name: 'Activity' }).click();
    await expect(page.locator('#focus-toggle')).toBeVisible();

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('#setting-theme')).toBeVisible();
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});
