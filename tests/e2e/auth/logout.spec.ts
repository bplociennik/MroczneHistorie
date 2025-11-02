import { test, expect } from '../../fixtures/test-fixtures';

/**
 * E2E Tests for Logout functionality
 * Tests: TC-AUTH-005
 */

test.describe('Logout', () => {
	test('TC-AUTH-005: Logout successfully', async ({ homePage }) => {
		// Navigate to home page (user is already logged in via auth.setup.ts)
		await homePage.navigate();

		// Verify user is logged in
		const isLoggedIn = await homePage.isLoggedIn();
		expect(isLoggedIn).toBe(true);

		// Perform logout
		await homePage.logout();

		// Verify redirect to home page (landing page for unauthenticated users)
		await expect(homePage.page).toHaveURL('/');

		// Verify user is logged out (navbar shows "Zaloguj się")
		const isStillLoggedIn = await homePage.isLoggedIn();
		expect(isStillLoggedIn).toBe(false);

		// Verify landing page is visible
		const isLandingVisible = await homePage.isLandingPageVisible();
		expect(isLandingVisible).toBe(true);

		// Verify navbar shows login/register buttons
		await expect(homePage.loginButton).toBeVisible();
		await expect(homePage.registerButton).toBeVisible();
	});
});
