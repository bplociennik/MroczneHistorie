import { test, expect } from '../../fixtures/test-fixtures';

/**
 * E2E Tests for Logout functionality
 * Tests: TC-AUTH-005
 */

test.describe('Logout', () => {
	test('TC-AUTH-005: Logout successfully', async ({ homePage }) => {
		// Navigate to home page (user is already logged in via auth.setup.ts)
		await homePage.navigate();

		// Wait for logout button to be visible (indicates user is logged in)
		await homePage.page
			.locator('text=Wyloguj')
			.first()
			.waitFor({ state: 'visible', timeout: 5000 });

		// Verify user is logged in
		const isLoggedIn = await homePage.isLoggedIn();
		expect(isLoggedIn).toBe(true);

		// Perform logout
		await homePage.logout();

		// Verify redirect to home page (landing page for unauthenticated users)
		await expect(homePage.page).toHaveURL('/');

		// Wait for logout button to disappear
		await homePage.page.locator('text=Wyloguj').first().waitFor({ state: 'hidden', timeout: 5000 });

		// Verify user is logged out (navbar shows "Zaloguj się")
		const isStillLoggedIn = await homePage.isLoggedIn();
		expect(isStillLoggedIn).toBe(false);

		// Verify landing page is visible
		const isLandingVisible = await homePage.isLandingPageVisible();
		expect(isLandingVisible).toBe(true);
	});
});
