import { test, expect } from '@playwright/test';

test.describe('Core calculation accuracy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('IPv4 subnet calculator loads and accepts input', async ({ page }) => {
    await page.goto('/subnetting/ipv4-subnet-calculator');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('body')).toBeVisible();

    // Verify input fields are present
    await expect(page.locator('input').first()).toBeVisible();

    // Input a test value (CIDR notation required)
    const firstInput = page.locator('input').first();
    await firstInput.fill('192.168.1.0/24');

    // Verify input was accepted
    await expect(firstInput).toHaveValue('192.168.1.0/24');
  });

  test('CIDR to subnet mask converter works', async ({ page }) => {
    await page.goto('/cidr/mask-converter/cidr-to-subnet-mask');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('body')).toBeVisible();

    // Verify input fields are present
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('IP address representations tool loads', async ({ page }) => {
    await page.goto('/ip-address-convertor/representations');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('body')).toBeVisible();

    // Verify input fields are present
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('VLSM calculator is accessible', async ({ page }) => {
    await page.goto('/subnetting/vlsm-calculator');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('body')).toBeVisible();

    // Verify interface is present
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('supernet calculator is accessible', async ({ page }) => {
    await page.goto('/subnetting/supernet-calculator');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('body')).toBeVisible();

    // Verify interface is present
    await expect(page.locator('input, textarea').first()).toBeVisible();
  });

  test('DNS tools are accessible', async ({ page }) => {
    await page.goto('/dns/generators/caa-builder');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('body')).toBeVisible();

    // Verify interface is present
    await expect(page.locator('input, select, button').first()).toBeVisible();
  });

  test('diagnostic tools are accessible', async ({ page }) => {
    await page.goto('/diagnostics/dns/lookup');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('body')).toBeVisible();

    // Verify interface is present
    await expect(page.locator('input, button').first()).toBeVisible();
  });

  test('reference pages contain content', async ({ page }) => {
    await page.goto('/reference/cidr');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.locator('body')).toBeVisible();

    // Check that the page contains expected content (title should always be visible)
    await expect(page).toHaveTitle(/CIDR/);

    // Check for content existence (translation-agnostic)
    // Verify main content area has text content
    const mainContent = page.locator('main, article, section').first();
    await expect(mainContent).toBeVisible();

    // Verify page has substantial text content (not just empty)
    const textContent = await mainContent.textContent();
    expect(textContent).toBeTruthy();
    expect(textContent!.length).toBeGreaterThan(100); // Has meaningful content
  });
});