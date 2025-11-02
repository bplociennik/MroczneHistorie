import { type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES, BUTTON_LABELS, TIMEOUTS } from '../utils/test-data';

/**
 * Page Object for Generate Story page (/generate)
 */
export class GeneratePage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	// Locators
	readonly subjectInput = this.page.locator('input[name="subject"], textarea[name="subject"]');
	readonly randomSubjectButton = this.page.locator(`button:has-text("${BUTTON_LABELS.random}")`);
	readonly difficultySlider = this.page.locator('input[name="difficulty"]');
	readonly darknessSlider = this.page.locator('input[name="darkness"]');
	readonly generateButton = this.page.locator(`button[type="submit"]:has-text("${BUTTON_LABELS.generate}")`);
	readonly regenerateButton = this.page.locator(`button:has-text("${BUTTON_LABELS.regenerate}")`);
	readonly saveButton = this.page.locator(`button:has-text("${BUTTON_LABELS.save}")`);

	// Preview fields (shown after generation)
	readonly previewQuestion = this.page.locator('[data-testid="preview-question"], .preview-question');
	readonly previewAnswer = this.page.locator('[data-testid="preview-answer"], .preview-answer');

	/**
	 * Navigate to generate page
	 */
	async navigate(): Promise<void> {
		await this.goto(ROUTES.generate);
	}

	/**
	 * Fill subject field
	 */
	async fillSubject(subject: string): Promise<void> {
		await this.subjectInput.fill(subject);
	}

	/**
	 * Click random subject button
	 */
	async clickRandomSubject(): Promise<void> {
		await this.randomSubjectButton.click();
	}

	/**
	 * Get current value of subject field
	 */
	async getSubjectValue(): Promise<string> {
		return await this.subjectInput.inputValue();
	}

	/**
	 * Set difficulty value (1-3)
	 */
	async setDifficulty(value: number): Promise<void> {
		await this.difficultySlider.fill(value.toString());
	}

	/**
	 * Set darkness value (1-3)
	 */
	async setDarkness(value: number): Promise<void> {
		await this.darknessSlider.fill(value.toString());
	}

	/**
	 * Click generate button
	 */
	async clickGenerate(): Promise<void> {
		await this.generateButton.click();
	}

	/**
	 * Wait for story generation to complete
	 * (waits for GlobalLoader to disappear)
	 */
	async waitForGeneration(): Promise<void> {
		await this.waitForLoaderToDisappear(TIMEOUTS.generation);
	}

	/**
	 * Full flow: fill form and generate story
	 */
	async generateStory(subject: string, difficulty: number, darkness: number): Promise<void> {
		await this.fillSubject(subject);
		await this.setDifficulty(difficulty);
		await this.setDarkness(darkness);
		await this.clickGenerate();
		await this.waitForGeneration();
	}

	/**
	 * Get generated question from preview
	 */
	async getGeneratedQuestion(): Promise<string> {
		await this.previewQuestion.waitFor({ state: 'visible' });
		return await this.previewQuestion.textContent() || '';
	}

	/**
	 * Get generated answer from preview
	 */
	async getGeneratedAnswer(): Promise<string> {
		await this.previewAnswer.waitFor({ state: 'visible' });
		return await this.previewAnswer.textContent() || '';
	}

	/**
	 * Check if preview is visible (story was generated)
	 */
	async isPreviewVisible(): Promise<boolean> {
		return await this.previewQuestion.isVisible();
	}

	/**
	 * Click regenerate button to generate a new story with same parameters
	 */
	async clickRegenerate(): Promise<void> {
		await this.regenerateButton.click();
		await this.waitForGeneration();
	}

	/**
	 * Click save button to save generated story
	 */
	async clickSave(): Promise<void> {
		await this.saveButton.click();
		await this.waitForUrl(ROUTES.home);
	}

	/**
	 * Check if submit button is disabled
	 */
	async isGenerateButtonDisabled(): Promise<boolean> {
		return await this.generateButton.isDisabled();
	}

	/**
	 * Get validation error message
	 */
	async getValidationError(): Promise<string> {
		const errorLocator = this.page.locator('.error, [role="alert"]').first();
		return await errorLocator.textContent() || '';
	}
}