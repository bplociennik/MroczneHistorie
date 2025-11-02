import { type Page, type Locator } from '@playwright/test';
import { TIMEOUTS } from '../utils/test-data';

/**
 * Base Page Object containing common functionality for all pages
 * Provides reusable methods for navigation, waiting, and interacting with global components
 */
export class BasePage {
	constructor(public readonly page: Page) {}

	// Global components (available on all pages)
	readonly navbar = this.page.locator('nav');
	readonly toastContainer = this.page.locator('[role="alert"], .alert');
	readonly globalLoader = this.page.locator('[data-testid="global-loader"], .loading');

	/**
	 * Navigate to a specific path
	 */
	async goto(path: string): Promise<void> {
		await this.page.goto(path);
	}

	/**
	 * Wait for page to navigate to a specific URL
	 */
	async waitForUrl(url: string | RegExp, timeout = TIMEOUTS.navigation): Promise<void> {
		await this.page.waitForURL(url, { timeout });
	}

	/**
	 * Wait for a toast notification to appear
	 * @param type - Toast type: 'success' or 'error'
	 * @param message - Expected message (optional, for verification)
	 * @returns Toast locator
	 */
	async waitForToast(
		type: 'success' | 'error',
		message?: string
	): Promise<Locator> {
		const toastSelector = type === 'success'
			? '.alert-success, [role="alert"].success'
			: '.alert-error, [role="alert"].error';

		const toast = this.page.locator(toastSelector).first();
		await toast.waitFor({ state: 'visible', timeout: TIMEOUTS.toast });

		// If message is provided, verify it's present using a more flexible approach
		if (message) {
			// Wait for the toast to contain the message text
			const toastText = await toast.textContent();
			// If message not found in toast, throw error with actual toast content
			if (!toastText?.includes(message)) {
				throw new Error(`Toast does not contain expected message. Expected: "${message}", Got: "${toastText}"`);
			}
		}

		return toast;
	}

	/**
	 * Get text content from a toast notification
	 */
	async getToastText(): Promise<string> {
		const toast = this.toastContainer.first();
		await toast.waitFor({ state: 'visible', timeout: TIMEOUTS.toast });
		return (await toast.textContent()) || '';
	}

	/**
	 * Wait for global loader to disappear
	 */
	async waitForLoaderToDisappear(timeout = TIMEOUTS.generation): Promise<void> {
		await this.globalLoader.waitFor({ state: 'hidden', timeout });
	}

	/**
	 * Check if global loader is visible
	 */
	async isLoaderVisible(): Promise<boolean> {
		return await this.globalLoader.isVisible();
	}

	/**
	 * Fill an input field
	 */
	async fillInput(selector: string | Locator, value: string): Promise<void> {
		const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
		await locator.fill(value);
	}

	/**
	 * Click a button
	 */
	async clickButton(selector: string | Locator): Promise<void> {
		const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
		await locator.click();
	}

	/**
	 * Get text content from an element
	 */
	async getTextContent(selector: string | Locator): Promise<string> {
		const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
		return (await locator.textContent()) || '';
	}

	/**
	 * Check if element is visible
	 */
	async isVisible(selector: string | Locator): Promise<boolean> {
		const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
		return await locator.isVisible();
	}

	/**
	 * Wait for navigation after an action (e.g., form submit)
	 */
	async waitForNavigation(action: () => Promise<void>): Promise<void> {
		await Promise.all([
			this.page.waitForNavigation({ timeout: TIMEOUTS.navigation }),
			action()
		]);
	}

	// Navbar methods

	/**
	 * Check if user is logged in (by checking navbar links)
	 */
	async isLoggedIn(): Promise<boolean> {
		return await this.page.locator('text=Wyloguj').first().isVisible();
	}

	/**
	 * Logout user via navbar
	 */
	async logout(): Promise<void> {
		await this.clickButton('text=Wyloguj');
		await this.waitForUrl('/');
	}

	/**
	 * Navigate to Generate page via navbar
	 */
	async navigateToGenerate(): Promise<void> {
		await this.clickButton('text=Generuj');
		await this.waitForUrl('/generate');
	}

	/**
	 * Navigate to Home page via navbar
	 */
	async navigateToHome(): Promise<void> {
		await this.clickButton('text=Moje Historie');
		await this.waitForUrl('/');
	}
}