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

    await expect(page.locator('.tab[data-route="home"]')).toBeVisible();
    await expect(page.locator('.tab[data-route="run"]')).toBeVisible();
    await expect(page.locator('.tab[data-route="skills"]')).toBeVisible();
    await expect(page.locator('.tab[data-route="governance"]')).toBeVisible();
    await expect(page.locator('.tab[data-route="activity"]')).toBeVisible();
    await expect(page.locator('.tab[data-route="reports"]')).toBeVisible();
    await expect(page.locator('.tab[data-route="settings"]')).toBeVisible();
    await expect(page.locator('#theme-select')).toBeHidden();

    await page.locator('.tab[data-route="skills"]').click();
    await expect(page.locator('#panel-skills')).toHaveClass(/active-panel/);
    await expect(page.locator('#intent-input')).toBeVisible();
    await expect(page.locator('[data-skill-tab="allRelevant"]')).toBeVisible();
    await expect(page.locator('#intent-output')).toBeVisible();

    await page.locator('.tab[data-route="governance"]').click();
    await expect(page.locator('#panel-governance')).toHaveClass(/active-panel/);
    await expect(page.locator('#sentinel-status')).toBeVisible();

    await page.locator('.tab[data-route="activity"]').click();
    await expect(page.locator('#panel-activity')).toHaveClass(/active-panel/);
    await expect(page.locator('#focus-toggle')).toBeVisible();

    await page.locator('.tab[data-route="settings"]').click();
    await expect(page.locator('#panel-settings')).toHaveClass(/active-panel/);
    await expect(page.locator('#theme-select')).toBeVisible();
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});
