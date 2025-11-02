import { test, expect } from '../../fixtures/test-fixtures';
import {
	generateRandomEmail,
	generateRandomPassword,
	ERROR_MESSAGES,
	SUCCESS_MESSAGES
} from '../../utils/test-data';

/**
 * E2E Tests for Registration functionality
 * Tests: TC-AUTH-001, TC-AUTH-002
 */

test.describe('Registration', () => {
	test.use({ storageState: { cookies: [], origins: [] } }); // Use guest (unauthenticated) state

	test('TC-AUTH-001: Register new user (Happy Path)', async ({ registerPage, homePage }) => {
		const email = generateRandomEmail();
		const password = generateRandomPassword();

		// Navigate to register page
		await registerPage.navigate();

		// Perform registration
		await registerPage.registerAndWaitForHome(email, password);

		// Verify redirect to home page
		await expect(registerPage.page).toHaveURL('/');

		// Verify success toast
		await registerPage.waitForToast('success', SUCCESS_MESSAGES.auth.registered);

		// Verify user is logged in
		const isLoggedIn = await homePage.isLoggedIn();
		expect(isLoggedIn).toBe(true);

		// Verify navbar shows "Wyloguj się"
		await expect(registerPage.navbar.locator('text=Wyloguj się')).toBeVisible();
	});

	test('TC-AUTH-002: Register with empty email', async ({ registerPage }) => {
		await registerPage.navigate();

		const password = generateRandomPassword();

		// Try to submit with empty email
		await registerPage.passwordInput.fill(password);
		await registerPage.confirmPasswordInput.fill(password);
		await registerPage.submitButton.click();

		// Verify validation error or disabled button
		const isDisabled = await registerPage.isSubmitDisabled();
		if (!isDisabled) {
			const errorText = await registerPage.getValidationError('email');
			expect(errorText).toContain(ERROR_MESSAGES.auth.emailRequired || 'email');
		}
	});

	test('TC-AUTH-002: Register with invalid email format', async ({ registerPage }) => {
		await registerPage.navigate();

		const password = generateRandomPassword();

		// Try to register with invalid email
		await registerPage.register('invalid-email', password);

		// Verify validation error
		const errorText = await registerPage.getValidationError('email');
		expect(errorText.toLowerCase()).toContain('email');
	});

	test('TC-AUTH-002: Register with password too short', async ({ registerPage }) => {
		await registerPage.navigate();

		const email = generateRandomEmail();

		// Try to register with short password (< 6 characters)
		await registerPage.register(email, '123');

		// Verify validation error
		await registerPage.waitForToast('error');
		const toastText = await registerPage.getToastText();
		expect(toastText.toLowerCase()).toContain('hasło' || 'password');
	});

	test('TC-AUTH-002: Register with mismatching passwords', async ({ registerPage }) => {
		await registerPage.navigate();

		const email = generateRandomEmail();

		// Try to register with passwords that don't match
		await registerPage.register(email, 'Password1!', 'Password2!');

		// Verify validation error
		await registerPage.waitForToast('error');
		const toastText = await registerPage.getToastText();
		expect(toastText.toLowerCase()).toContain('hasła' || 'password');
	});

	test('TC-AUTH-002: Register with already existing email', async ({ registerPage }) => {
		await registerPage.navigate();

		const password = generateRandomPassword();

		// Try to register with the same email twice
		const email = generateRandomEmail();

		// First registration
		await registerPage.register(email, password);
		await registerPage.waitForUrl('/');

		// Logout
		await registerPage.logout();

		// Try to register again with same email
		await registerPage.navigate();
		await registerPage.register(email, password);

		// Verify error
		await registerPage.waitForToast('error');
	});
});
