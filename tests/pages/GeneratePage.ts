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
	readonly difficultySlider = this.page.locator('select[name="difficulty"]');
	readonly darknessSlider = this.page.locator('select[name="darkness"]');
	readonly generateButton = this.page.getByRole('button', { name: /generuj.*histori/i });
	readonly regenerateButton = this.page.getByText(/wygeneruj.*ponownie/i);
	readonly saveButton = this.page.getByText(/zapisz.*na.*mojej.*liście/i);

	// Preview fields (shown after generation)
	// Use "Twoja Nowa Historia" heading as marker that we're on preview page
	readonly previewHeading = this.page.getByRole('heading', { name: /twoja nowa historia/i });
	// Find paragraphs with substantial text (story question/answer will be long)
	// Index 0: instruction text "Przejrzyj wygenerowaną zagadkę..."
	// Index 1: actual question paragraph (after "❓ Pytanie:" heading)
	readonly previewQuestion = this.page
		.locator('p')
		.filter({ hasText: /.{50,}/ })
		.nth(1);
	// Index 2: actual answer paragraph (revealed after clicking "Odkryj odpowiedź")
	readonly previewAnswer = this.page
		.locator('p')
		.filter({ hasText: /.{50,}/ })
		.nth(2);

	/**
	 * Navigate to generate page
	 */
	async navigate(): Promise<void> {
		await this.goto(ROUTES.generate);
		// Wait for form to be visible
		await this.subjectInput.waitFor({ state: 'visible' });
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
		await this.difficultySlider.selectOption(value.toString());
	}

	/**
	 * Set darkness value (1-3)
	 */
	async setDarkness(value: number): Promise<void> {
		await this.darknessSlider.selectOption(value.toString());
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
		return (await this.previewQuestion.textContent()) || '';
	}

	/**
	 * Get generated answer from preview
	 * Clicks "Odkryj odpowiedź" if answer is not visible yet
	 */
	async getGeneratedAnswer(): Promise<string> {
		// Check if answer is already visible
		const isAnswerVisible = await this.previewAnswer.isVisible().catch(() => false);

		if (!isAnswerVisible) {
			// Click "Odkryj odpowiedź" to reveal the answer
			const revealButton = this.page.getByText(/odkryj.*odpowied/i);
			await revealButton.click();
		}

		await this.previewAnswer.waitFor({ state: 'visible' });
		return (await this.previewAnswer.textContent()) || '';
	}

	/**
	 * Check if preview is visible (story was generated)
	 */
	async isPreviewVisible(): Promise<boolean> {
		// Check if "Twoja Nowa Historia" heading is visible as indicator
		return await this.previewHeading.isVisible();
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
		return (await errorLocator.textContent()) || '';
	}
}
