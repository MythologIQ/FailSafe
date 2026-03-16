import fs from 'fs';
import http from 'http';
import path from 'path';
import { test, expect } from '@playwright/test';

test('popout UI shell renders required sections', async ({ page }) => {
  const root = path.resolve(__dirname, '../../roadmap/ui');
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = requestPath === '/' ? 'command-center.html' : requestPath.replace(/^\/+/, '');
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
    await page.goto(`http://127.0.0.1:${address.port}/command-center.html`);

    await expect(page.locator('.tab-btn[data-target="overview"]')).toBeVisible();
    await expect(page.locator('.tab-btn[data-target="skills"]')).toBeVisible();
    await expect(page.locator('.tab-btn[data-target="governance"]')).toBeVisible();
    await expect(page.locator('.tab-btn[data-target="operations"]')).toBeVisible();
    await expect(page.locator('.tab-btn[data-target="settings"]')).toBeVisible();
    await expect(page.locator('#theme-select')).toBeHidden();

    await page.locator('.tab-btn[data-target="skills"]').click();
    await expect(page.locator('#skills')).toHaveClass(/active/);
    await expect(page.locator('.cc-intent-input')).toBeVisible();
    await expect(page.locator('.cc-skill-tab[data-tab="Recommended"]')).toBeVisible();
    await expect(page.locator('.cc-skill-grid')).toBeVisible();

    await page.locator('.tab-btn[data-target="governance"]').click();
    await expect(page.locator('#governance')).toHaveClass(/active/);

    await page.locator('.tab-btn[data-target="settings"]').click();
    await expect(page.locator('#settings')).toHaveClass(/active/);
    await expect(page.locator('.cc-theme-select')).toHaveCount(6);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});
