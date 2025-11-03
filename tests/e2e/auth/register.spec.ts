import { test, expect } from '../../fixtures/test-fixtures';
import { generateRandomEmail, generateRandomPassword, E2E_USER } from '../../utils/test-data';

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

		// Perform registration (with extra wait for Svelte reactivity)
		await registerPage.register(email, password);

		// Wait for Svelte to process and enable the button
		await registerPage.page.waitForTimeout(500);

		// Wait for navigation to home
		await registerPage.waitForUrl('/', 10000);

		// Verify redirect to home page
		await expect(registerPage.page).toHaveURL('/');

		// Note: Registration doesn't show a success toast, just redirects

		// Verify user is logged in (check navbar for logout button)
		await registerPage.page
			.locator('text=Wyloguj')
			.first()
			.waitFor({ state: 'visible', timeout: 5000 });
		const isLoggedIn = await homePage.isLoggedIn();
		expect(isLoggedIn).toBe(true);
	});

	test('TC-AUTH-002: Register with empty email', async ({ registerPage }) => {
		await registerPage.navigate();

		const password = generateRandomPassword();

		// Try to submit with empty email - fill only password fields
		await registerPage.passwordInput.click();
		await registerPage.page.waitForTimeout(300);
		await registerPage.passwordInput.pressSequentially(password, { delay: 50 });
		await registerPage.page.waitForTimeout(300);

		await registerPage.confirmPasswordInput.click();
		await registerPage.page.waitForTimeout(300);
		await registerPage.confirmPasswordInput.pressSequentially(password, { delay: 50 });
		await registerPage.page.waitForTimeout(300);

		// Button should be disabled due to client-side validation (canSubmit = false)
		const isDisabled = await registerPage.isSubmitDisabled();
		expect(isDisabled).toBe(true);

		// Verify we stay on register page
		await expect(registerPage.page).toHaveURL(/\/register/);
	});

	test('TC-AUTH-002: Register with invalid email format', async ({ registerPage }) => {
		await registerPage.navigate();

		const password = generateRandomPassword();

		// Try to register with invalid email
		await registerPage.register('invalid-email', password);

		// Wait for validation
		await registerPage.page.waitForTimeout(500);

		// Verify validation error from HTML5 or backend
		const errorText = await registerPage.getValidationError('email');
		expect(errorText.toLowerCase()).toContain('email');
	});

	test('TC-AUTH-002: Register with password too short', async ({ registerPage }) => {
		await registerPage.navigate();

		const email = generateRandomEmail();
		const shortPassword = '123'; // Less than 8 characters

		// Fill all fields with short password
		await registerPage.emailInput.click();
		await registerPage.page.waitForTimeout(300);
		await registerPage.emailInput.pressSequentially(email, { delay: 50 });
		await registerPage.page.waitForTimeout(300);

		await registerPage.passwordInput.click();
		await registerPage.page.waitForTimeout(300);
		await registerPage.passwordInput.pressSequentially(shortPassword, { delay: 50 });
		await registerPage.page.waitForTimeout(300);

		await registerPage.confirmPasswordInput.click();
		await registerPage.page.waitForTimeout(300);
		await registerPage.confirmPasswordInput.pressSequentially(shortPassword, { delay: 50 });
		await registerPage.page.waitForTimeout(300);

		// HTML5 minlength="8" validation should prevent submission
		// Button might still be enabled if all fields match, but form won't submit
		const currentUrl = registerPage.page.url();

		// Try to click submit
		await registerPage.submitButton.click();
		await registerPage.page.waitForTimeout(1000);

		// Should stay on register page due to HTML5 validation
		await expect(registerPage.page).toHaveURL(/\/register/);
		expect(registerPage.page.url()).toBe(currentUrl);
	});

	test('TC-AUTH-002: Register with mismatching passwords', async ({ registerPage }) => {
		await registerPage.navigate();

		const email = generateRandomEmail();

		// Fill fields with mismatching passwords
		await registerPage.emailInput.click();
		await registerPage.page.waitForTimeout(300);
		await registerPage.emailInput.pressSequentially(email, { delay: 50 });
		await registerPage.page.waitForTimeout(300);

		await registerPage.passwordInput.click();
		await registerPage.page.waitForTimeout(300);
		await registerPage.passwordInput.pressSequentially('Password1!', { delay: 50 });
		await registerPage.page.waitForTimeout(300);

		await registerPage.confirmPasswordInput.click();
		await registerPage.page.waitForTimeout(300);
		await registerPage.confirmPasswordInput.pressSequentially('Password2!', { delay: 50 });
		await registerPage.page.waitForTimeout(500);

		// Client-side validation should show inline error and disable button
		const inlineError = await registerPage.page.locator('text=Hasła nie pasują').first();
		await expect(inlineError).toBeVisible();

		// Button should be disabled
		const isDisabled = await registerPage.isSubmitDisabled();
		expect(isDisabled).toBe(true);

		// Verify we stay on register page
		await expect(registerPage.page).toHaveURL(/\/register/);
	});

	test('TC-AUTH-002: Register with already existing email', async ({ registerPage }) => {
		await registerPage.navigate();

		const password = generateRandomPassword();
		// Use pre-existing E2E user email instead of creating new user
		const email = E2E_USER.email;

		// Try to register with already existing email
		await registerPage.register(email, password);
		await registerPage.page.waitForTimeout(500);

		// Should show error toast (backend validation)
		await registerPage.waitForToast('error');

		// Verify error message contains info about existing email
		const toastText = await registerPage.getToastText();
		expect(toastText.toLowerCase()).toMatch(/email|zarejestrowany|istnieje/);
	});
});
