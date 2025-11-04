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
	readonly revealButton = this.page.locator(`a:has-text("${BUTTON_LABELS.revealAnswer}"), button:has-text("${BUTTON_LABELS.revealAnswer}")`);
	readonly hideButton = this.page.locator(`a:has-text("${BUTTON_LABELS.hideAnswer}"), button:has-text("${BUTTON_LABELS.hideAnswer}")`);
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
		// Wait for question to be visible
		await this.questionText.waitFor({ state: 'visible' });
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
		// Check if answer is already visible (no need to click)
		if (await this.answerText.isVisible()) {
			return;
		}

		await this.revealButton.click();

		// Wait for answer to become visible with timeout
		await this.answerText.waitFor({ state: 'visible', timeout: 5000 });
	}

	/**
	 * Click hide answer button
	 */
	async hideAnswer(): Promise<void> {
		// Check if answer is already hidden
		if (!(await this.answerText.isVisible())) {
			return;
		}

		await this.hideButton.click();

		// Wait for answer to become hidden
		await this.answerText.waitFor({ state: 'hidden', timeout: 5000 });
	}
}
