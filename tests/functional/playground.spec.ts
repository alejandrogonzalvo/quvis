import { test, expect } from '@playwright/test';


test('Create GHZ circuit', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'GHZ' }).click();
  await page.locator('div').filter({ hasText: /^CircuitGHZQFTQAOALogical Qubits$/ }).getByRole('spinbutton').fill('100');
  await page.getByRole('heading', { name: 'Quvis' }).click();
  await page.getByRole('button', { name: 'Full' }).click();
  await page.getByRole('combobox').selectOption('0');
  await page.getByRole('button', { name: 'Visualize' }).click();
  await expect(page.getByRole('button', { name: 'logical GHZ (Logical) 100Q' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'compiled GHZ (Compiled) 100Q' })).toBeVisible();
  await expect(page.locator('#root')).toContainText('Slice: 0 / 99');
  await page.getByRole('button', { name: 'compiled GHZ (Compiled) 100Q' }).click();
  await expect(page.locator('#root')).toContainText('Slice: 0 / 101');
});
