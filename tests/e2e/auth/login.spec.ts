import { test, expect } from '../../fixtures/test-fixtures';
import { E2E_USER, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../utils/test-data';

/**
 * E2E Tests for Login functionality
 * Tests: TC-AUTH-003, TC-AUTH-004
 */

test.describe('Login', () => {
	test.use({ storageState: { cookies: [], origins: [] } }); // Use guest (unauthenticated) state

	test('TC-AUTH-003: Login with valid credentials (Happy Path)', async ({ loginPage, homePage }) => {
		// Navigate to login page
		await loginPage.navigate();

		// Perform login
		await loginPage.loginAndWaitForHome(E2E_USER.email, E2E_USER.password);

		// Verify redirect to home page
		await expect(loginPage.page).toHaveURL('/');

		// Note: Login doesn't show a toast in the app, so we skip toast verification

		// Wait for authentication state to update in UI (navbar changes from "Zaloguj się" to "Wyloguj")
		await loginPage.page.locator('text=Wyloguj').first().waitFor({ state: 'visible', timeout: 5000 });

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
		await loginPage.submitButton.click();

		// Verify form validation prevents submission or shows error
		// This might be browser validation or custom validation
		const isDisabled = await loginPage.isSubmitDisabled();
		if (!isDisabled) {
			// If submit is allowed, check for validation error
			const errorText = await loginPage.getValidationError('email');
			expect(errorText.toLowerCase()).toContain('email');
		}
	});

	test('TC-AUTH-004: Login with empty password', async ({ loginPage }) => {
		await loginPage.navigate();

		// Try to submit with empty password
		await loginPage.emailInput.fill(E2E_USER.email);
		await loginPage.submitButton.click();

		// Verify form validation
		const isDisabled = await loginPage.isSubmitDisabled();
		if (!isDisabled) {
			const errorText = await loginPage.getValidationError('password');
			expect(errorText.toLowerCase()).toContain('password');
		}
	});
});