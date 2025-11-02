import { type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES, BUTTON_LABELS } from '../utils/test-data';

/**
 * Page Object for Register page (/register)
 */
export class RegisterPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	// Locators
	readonly emailInput = this.page.locator('#email');
	readonly passwordInput = this.page.locator('#password');
	readonly confirmPasswordInput = this.page.locator('#confirmPassword');
	readonly submitButton = this.page.locator(`button[type="submit"]:has-text("${BUTTON_LABELS.register}")`);
	readonly loginLink = this.page.locator(`a:has-text("${BUTTON_LABELS.login}")`);

	/**
	 * Navigate to register page
	 */
	async navigate(): Promise<void> {
		await this.goto(ROUTES.register);
	}

	/**
	 * Perform registration with email and password
	 * @param email - User email
	 * @param password - User password
	 * @param confirmPassword - Password confirmation (defaults to password if not provided)
	 */
	async register(email: string, password: string, confirmPassword?: string): Promise<void> {
		// Click email field and wait for it to be fully ready
		await this.emailInput.click();
		await this.page.waitForTimeout(500);

		// Type email slowly to ensure Svelte processes each character
		await this.emailInput.pressSequentially(email, { delay: 100 });

		// Wait for Svelte to process
		await this.page.waitForTimeout(300);

		// Click password field and wait for it to be fully ready
		await this.passwordInput.click();
		await this.page.waitForTimeout(500);

		// Type password slowly
		await this.passwordInput.pressSequentially(password, { delay: 100 });

		// Wait for Svelte to process
		await this.page.waitForTimeout(300);

		// Click confirm password field and wait for it to be fully ready
		await this.confirmPasswordInput.click();
		await this.page.waitForTimeout(500);

		// Type confirm password slowly
		await this.confirmPasswordInput.pressSequentially(confirmPassword || password, { delay: 100 });

		// Wait for Svelte to process
		await this.page.waitForTimeout(300);

		await this.submitButton.click();
	}

	/**
	 * Perform registration and wait for navigation to home page
	 */
	async registerAndWaitForHome(email: string, password: string): Promise<void> {
		await this.register(email, password);
		await this.waitForUrl(ROUTES.home);
	}

	/**
	 * Get validation error message for a field
	 */
	async getValidationError(fieldName: string): Promise<string> {
		const errorLocator = this.page.locator(`text=/.*${fieldName}.*/i`).first();
		return (await errorLocator.textContent()) || '';
	}

	/**
	 * Check if submit button is disabled
	 */
	async isSubmitDisabled(): Promise<boolean> {
		return await this.submitButton.isDisabled();
	}

	/**
	 * Navigate to login page via link
	 */
	async goToLogin(): Promise<void> {
		await this.loginLink.click();
		await this.waitForUrl(ROUTES.login);
	}
}