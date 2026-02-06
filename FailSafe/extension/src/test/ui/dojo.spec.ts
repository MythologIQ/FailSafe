import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'url';
import * as path from 'path';

test('dojo smoke page renders key sections', async ({ page }) => {
  const filePath = path.resolve(__dirname, 'dojo-smoke.html');
  await page.goto(pathToFileURL(filePath).toString());

  await expect(page.getByText('Sentinel Status')).toBeVisible();
  await expect(page.getByText('L3 Queue')).toBeVisible();
  await expect(page.getByText('Trust Summary')).toBeVisible();
  await expect(page.getByText('Dojo Workflow')).toBeVisible();
  await expect(page.getByText('Protocol')).toBeVisible();

  await expect(page.getByTestId('l3-queue')).toHaveText('No pending approvals');
});
