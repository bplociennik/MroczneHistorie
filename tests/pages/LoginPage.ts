import { type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES, FORM_LABELS, BUTTON_LABELS } from '../utils/test-data';

/**
 * Page Object for Login page (/login)
 */
export class LoginPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	// Locators
	readonly emailInput = this.page.locator('#email');
	readonly passwordInput = this.page.locator('#password');
	readonly submitButton = this.page.locator(
		`button[type="submit"]:has-text("${BUTTON_LABELS.login}")`
	);
	readonly registerLink = this.page.locator(`a:has-text("${BUTTON_LABELS.register}")`);

	/**
	 * Navigate to login page
	 */
	async navigate(): Promise<void> {
		await this.goto(ROUTES.login);
	}

	/**
	 * Perform login with email and password (without waiting for navigation)
	 * @param email - User email
	 * @param password - User password
	 */
	async login(email: string, password: string): Promise<void> {
		// Click email field and wait for it to be fully ready
		await this.emailInput.click();
		await this.page.waitForTimeout(500);

		// Type email slowly to ensure Svelte processes each character
		await this.emailInput.pressSequentially(email, { delay: 100 });

		// Wait for Svelte to process the email
		await this.page.waitForTimeout(300);

		// Click password field and wait for it to be fully ready
		await this.passwordInput.click();
		await this.page.waitForTimeout(500);

		// Type password slowly
		await this.passwordInput.pressSequentially(password, { delay: 100 });

		// Wait for Svelte to process the password
		await this.page.waitForTimeout(300);

		await this.submitButton.click();
	}

	/**
	 * Perform login and wait for navigation to home page
	 */
	async loginAndWaitForHome(email: string, password: string): Promise<void> {
		// Click email field and wait for it to be fully ready
		await this.emailInput.click();
		await this.page.waitForTimeout(500);

		// Type email slowly to ensure Svelte processes each character
		await this.emailInput.pressSequentially(email, { delay: 100 });

		// Wait for Svelte to process the email
		await this.page.waitForTimeout(300);

		// Click password field and wait for it to be fully ready
		await this.passwordInput.click();
		await this.page.waitForTimeout(500);

		// Type password slowly
		await this.passwordInput.pressSequentially(password, { delay: 100 });

		// Wait for Svelte to process the password
		await this.page.waitForTimeout(300);

		// Submit the form and wait for navigation
		await Promise.all([
			this.page.waitForURL(ROUTES.home, { timeout: 10000 }),
			this.submitButton.click()
		]);
	}

	/**
	 * Get validation error message for a field
	 */
	async getValidationError(fieldName: string): Promise<string> {
		const errorLocator = this.page.locator(`text=/.*${fieldName}.*wymagany.*/i`).first();
		return (await errorLocator.textContent()) || '';
	}

	/**
	 * Check if submit button is disabled
	 */
	async isSubmitDisabled(): Promise<boolean> {
		return await this.submitButton.isDisabled();
	}

	/**
	 * Navigate to register page via link
	 */
	async goToRegister(): Promise<void> {
		await this.registerLink.click();
		await this.waitForUrl(ROUTES.register);
	}
}
