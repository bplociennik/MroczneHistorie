import { test, expect } from '../../fixtures/test-fixtures';
import { ROUTES } from '../../utils/test-data';

/**
 * E2E Tests for Route Protection
 * Tests: TC-AUTH-006
 * Verifies that protected routes redirect unauthenticated users to login
 */

test.describe('Route Protection', () => {
	test.use({ storageState: { cookies: [], origins: [] } }); // Use guest (unauthenticated) state

	test('TC-AUTH-006: Protected route /generate redirects to /login', async ({ page }) => {
		// Try to access generate page without authentication
		await page.goto(ROUTES.generate);

		// Verify redirect to login page
		await page.waitForURL('/login');
		await expect(page).toHaveURL('/login');
	});

	test('TC-AUTH-006: Protected route /stories redirects to /login', async ({ page }) => {
		// Try to access stories list without authentication
		await page.goto('/stories');

		// Verify redirect to login page
		await page.waitForURL('/login');
		await expect(page).toHaveURL('/login');
	});

	test('TC-AUTH-006: Protected route /stories/[id] redirects to /login', async ({ page }) => {
		// Try to access story detail without authentication
		const dummyId = '00000000-0000-0000-0000-000000000000';
		await page.goto(ROUTES.stories(dummyId));

		// Verify redirect to login page
		await page.waitForURL('/login');
		await expect(page).toHaveURL('/login');
	});

	test('TC-AUTH-006: Protected route /stories/[id]/edit redirects to /login', async ({ page }) => {
		// Try to access edit page without authentication
		const dummyId = '00000000-0000-0000-0000-000000000000';
		await page.goto(ROUTES.editStory(dummyId));

		// Verify redirect to login page
		await page.waitForURL('/login');
		await expect(page).toHaveURL('/login');
	});

	test('TC-AUTH-006: Public routes accessible without authentication', async ({ page }) => {
		// Verify login page is accessible
		await page.goto(ROUTES.login);
		await expect(page).toHaveURL('/login');

		// Verify register page is accessible
		await page.goto(ROUTES.register);
		await expect(page).toHaveURL('/register');

		// Verify home page (landing page) is accessible
		await page.goto(ROUTES.home);
		await expect(page).toHaveURL('/');
	});
});