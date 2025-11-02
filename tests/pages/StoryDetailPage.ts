import { type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES, BUTTON_LABELS } from '../utils/test-data';

/**
 * Page Object for Story Detail page (/stories/[id])
 * Game mode: shows question, answer can be revealed/hidden
 */
export class StoryDetailPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	// Locators
	readonly questionText = this.page.locator('[data-testid="story-question"], .story-question');
	readonly answerText = this.page.locator('[data-testid="story-answer"], .story-answer');
	readonly revealButton = this.page.locator(`button:has-text("${BUTTON_LABELS.revealAnswer}")`);
	readonly hideButton = this.page.locator(`button:has-text("${BUTTON_LABELS.hideAnswer}")`);
	readonly editButton = this.page.locator(
		`a:has-text("${BUTTON_LABELS.edit}"), button:has-text("${BUTTON_LABELS.edit}")`
	);
	readonly deleteButton = this.page.locator(`button:has-text("${BUTTON_LABELS.delete}")`);
	readonly backButton = this.page.locator(
		`a:has-text("${BUTTON_LABELS.back}"), button:has-text("${BUTTON_LABELS.back}")`
	);

	/**
	 * Navigate to story detail page
	 */
	async navigate(storyId: string): Promise<void> {
		await this.goto(ROUTES.stories(storyId));
	}

	/**
	 * Get question text
	 */
	async getQuestion(): Promise<string> {
		await this.questionText.waitFor({ state: 'visible' });
		return (await this.questionText.textContent()) || '';
	}

	/**
	 * Get answer text (if visible)
	 */
	async getAnswer(): Promise<string> {
		await this.answerText.waitFor({ state: 'visible' });
		return (await this.answerText.textContent()) || '';
	}

	/**
	 * Check if answer is visible
	 */
	async isAnswerVisible(): Promise<boolean> {
		return await this.answerText.isVisible();
	}

	/**
	 * Click reveal answer button
	 */
	async revealAnswer(): Promise<void> {
		await this.revealButton.click();
		await this.answerText.waitFor({ state: 'visible' });
	}

	/**
	 * Click hide answer button
	 */
	async hideAnswer(): Promise<void> {
		await this.hideButton.click();
		await this.answerText.waitFor({ state: 'hidden' });
	}

	/**
	 * Navigate to edit page
	 */
	async clickEdit(): Promise<void> {
		await this.editButton.click();
		await this.page.waitForURL(/\/stories\/[a-f0-9-]+\/edit/);
	}

	/**
	 * Click delete button (opens confirmation modal)
	 */
	async clickDelete(): Promise<void> {
		await this.deleteButton.click();
	}

	/**
	 * Click back button to return to list
	 */
	async clickBack(): Promise<void> {
		await this.backButton.click();
		await this.waitForUrl(ROUTES.home);
	}

	/**
	 * Confirm deletion in modal
	 */
	async confirmDelete(): Promise<void> {
		const modal = this.page.locator('[role="dialog"], .modal');
		const confirmButton = modal.locator(`button:has-text("${BUTTON_LABELS.delete}")`);
		await confirmButton.click();
		await this.waitForUrl(ROUTES.home);
	}

	/**
	 * Cancel deletion in modal
	 */
	async cancelDelete(): Promise<void> {
		const modal = this.page.locator('[role="dialog"], .modal');
		const cancelButton = modal.locator(`button:has-text("${BUTTON_LABELS.cancel}")`);
		await cancelButton.click();
	}
}
