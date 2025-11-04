import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES, BUTTON_LABELS, PAGE_TITLES } from '../utils/test-data';

/**
 * Page Object for Home page (/)
 * Handles three states: Landing Page (unauthenticated), Empty State (no stories), Story List (with stories)
 */
export class HomePage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	// Locators for different page states
	readonly landingPage = this.page.locator(`text=${PAGE_TITLES.landing}`);
	readonly emptyState = this.page.locator(`text=${PAGE_TITLES.emptyState}`);
	readonly storyCards = this.page.locator('[data-testid="story-card"], .story-card');
	readonly generateButton = this.page.locator(
		`a:has-text("Wygeneruj"), button:has-text("Generuj")`
	);
	readonly randomButton = this.page.getByText(BUTTON_LABELS.random, { exact: false });
	readonly loginButton = this.page.locator(`a:has-text("${BUTTON_LABELS.login}")`);
	readonly registerButton = this.page.locator(`a:has-text("${BUTTON_LABELS.register}")`);

	/**
	 * Navigate to home page
	 */
	async navigate(): Promise<void> {
		await this.goto(ROUTES.home);
		// Wait for one of the possible page states to be visible
		await Promise.race([
			this.storyCards
				.first()
				.waitFor({ state: 'visible' })
				.catch(() => {}),
			this.emptyState.waitFor({ state: 'visible' }).catch(() => {}),
			this.landingPage.waitFor({ state: 'visible' }).catch(() => {})
		]);
	}

	/**
	 * Check if landing page is visible (unauthenticated state)
	 */
	async isLandingPageVisible(): Promise<boolean> {
		return await this.landingPage.isVisible();
	}

	/**
	 * Check if empty state is visible (authenticated but no stories)
	 */
	async isEmptyStateVisible(): Promise<boolean> {
		return await this.emptyState.isVisible();
	}

	/**
	 * Get count of story cards on the page
	 */
	async getStoriesCount(): Promise<number> {
		return await this.storyCards.count();
	}

	/**
	 * Get a specific story card by index
	 * @param index - Zero-based index
	 */
	getStoryCard(index: number): Locator {
		return this.storyCards.nth(index);
	}

	/**
	 * Click on a story card to view details
	 * @param index - Zero-based index
	 */
	async clickStory(index: number): Promise<void> {
		const card = this.getStoryCard(index);
		const link = card.locator('a.card-title');
		await link.click();
	}

	/**
	 * Click edit button on a story card
	 * @param index - Zero-based index
	 */
	async clickEditOnStory(index: number): Promise<void> {
		const card = this.getStoryCard(index);
		const editButton = card.locator(
			`button:has-text("${BUTTON_LABELS.edit}"), a:has-text("${BUTTON_LABELS.edit}")`
		);
		await editButton.click();
	}

	/**
	 * Click delete button on a story card (opens modal)
	 * @param index - Zero-based index
	 */
	async clickDeleteOnStory(index: number): Promise<void> {
		const card = this.getStoryCard(index);
		const deleteButton = card.locator(
			`button:has-text("${BUTTON_LABELS.delete}"), [data-testid="delete-button"]`
		);
		await deleteButton.click();
	}

	/**
	 * Get question text from a story card
	 * @param index - Zero-based index
	 */
	async getStoryQuestion(index: number): Promise<string> {
		const card = this.getStoryCard(index);
		return (await card.textContent()) || '';
	}

	/**
	 * Click Generate button to navigate to generate page
	 */
	async clickGenerate(): Promise<void> {
		await this.generateButton.click();
		await this.waitForUrl(ROUTES.generate);
	}

	/**
	 * Click Random button to navigate to random story
	 */
	async clickRandom(): Promise<void> {
		await this.randomButton.click();
		// Wait for navigation to /stories/[id]
		await this.page.waitForURL(/\/stories\/[a-f0-9-]+/);
	}

	/**
	 * Check if Random button is enabled
	 * Returns false if button doesn't exist (e.g., in empty state)
	 */
	async isRandomButtonEnabled(): Promise<boolean> {
		const count = await this.randomButton.count();
		if (count === 0) return false;
		return await this.randomButton.isEnabled();
	}

	/**
	 * Navigate to login page via button
	 */
	async goToLogin(): Promise<void> {
		await this.loginButton.click();
		await this.waitForUrl(ROUTES.login);
	}

	/**
	 * Navigate to register page via button
	 */
	async goToRegister(): Promise<void> {
		await this.registerButton.click();
		await this.waitForUrl(ROUTES.register);
	}

	// Modal methods

	/**
	 * Confirm deletion in modal
	 */
	async confirmDelete(): Promise<void> {
		const modal = this.page.locator('[role="dialog"], .modal');
		await modal.waitFor({ state: 'visible' });
		// Match any element containing "Usuń" text (button text may vary: "Usuń", "Usuń historię", etc.)
		const confirmButton = modal.getByText(BUTTON_LABELS.delete, { exact: false });
		await confirmButton.waitFor({ state: 'visible' });
		await confirmButton.click();
	}

	/**
	 * Cancel deletion in modal
	 */
	async cancelDelete(): Promise<void> {
		const modal = this.page.locator('[role="dialog"], .modal');
		await modal.waitFor({ state: 'visible' });
		const cancelButton = modal.getByText(BUTTON_LABELS.cancel, { exact: false });
		await cancelButton.waitFor({ state: 'visible' });
		await cancelButton.click();
	}

	/**
	 * Check if delete confirmation modal is visible
	 */
	async isDeleteModalVisible(): Promise<boolean> {
		const modal = this.page.locator('[role="dialog"], .modal');
		return await modal.isVisible();
	}
}
