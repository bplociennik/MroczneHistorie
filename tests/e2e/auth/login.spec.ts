import { test, expect } from '../../fixtures/test-fixtures';
import { ERROR_MESSAGES } from '../../utils/test-data';

/**
 * E2E Tests for Login functionality
 * Tests: TC-AUTH-003, TC-AUTH-004
 */

test.describe('Login', () => {
	test.use({ storageState: { cookies: [], origins: [] } }); // Use guest (unauthenticated) state

	test('TC-AUTH-003: Login with valid credentials (Happy Path)', async ({
		loginPage,
		homePage
	}) => {
		// Navigate to login page
		await loginPage.navigate();

		// Perform login
		await loginPage.loginAndWaitForHome(E2E_USER.email, E2E_USER.password);

		// Verify redirect to home page
		await expect(loginPage.page).toHaveURL('/');

		// Note: Login doesn't show a toast in the app, so we skip toast verification

		// Wait for authentication state to update in UI (navbar changes from "Zaloguj się" to "Wyloguj")
		await loginPage.page
			.locator('text=Wyloguj')
			.first()
			.waitFor({ state: 'visible', timeout: 5000 });

		// Verify user is logged in (navbar shows logout)
		const isLoggedIn = await homePage.isLoggedIn();
		expect(isLoggedIn).toBe(true);
	});

	test('TC-AUTH-004: Login with incorrect password', async ({ loginPage }) => {
		await loginPage.navigate();

		// Attempt login with wrong password
		await loginPage.login(E2E_USER.email, 'WrongPassword123!');

		// Verify error toast
		await loginPage.waitForToast('error', ERROR_MESSAGES.auth.invalidCredentials);

		// Verify still on login page
		await expect(loginPage.page).toHaveURL('/login');
	});

	test('TC-AUTH-004: Login with non-existent user', async ({ loginPage }) => {
		await loginPage.navigate();

		// Attempt login with non-existent email
		await loginPage.login('nonexistent@example.com', 'SomePassword123!');

		// Verify error toast
		await loginPage.waitForToast('error', ERROR_MESSAGES.auth.invalidCredentials);

		// Verify still on login page
		await expect(loginPage.page).toHaveURL('/login');
	});

	test('TC-AUTH-004: Login with empty email', async ({ loginPage }) => {
		await loginPage.navigate();

		// Try to submit with empty email
		await loginPage.passwordInput.fill('Password123!');

		// HTML5 required attribute prevents submission
		// Verify we stay on the login page after attempted submit
		const currentUrl = loginPage.page.url();
		await loginPage.submitButton.click();

		// Wait a bit to ensure no navigation happens
		await loginPage.page.waitForTimeout(1000);

		// Verify still on login page (form didn't submit)
		await expect(loginPage.page).toHaveURL(/\/login/);
		expect(loginPage.page.url()).toBe(currentUrl);
	});

	test('TC-AUTH-004: Login with empty password', async ({ loginPage }) => {
		await loginPage.navigate();

		// Try to submit with empty password
		await loginPage.emailInput.click();
		await loginPage.page.waitForTimeout(500);
		await loginPage.emailInput.pressSequentially(E2E_USER.email, { delay: 100 });
		await loginPage.page.waitForTimeout(300);

		// HTML5 required attribute prevents submission
		// Verify we stay on the login page after attempted submit
		const currentUrl = loginPage.page.url();
		await loginPage.submitButton.click();

		// Wait a bit to ensure no navigation happens
		await loginPage.page.waitForTimeout(1000);

		// Verify still on login page (form didn't submit)
		await expect(loginPage.page).toHaveURL(/\/login/);
		expect(loginPage.page.url()).toBe(currentUrl);
	});
});
