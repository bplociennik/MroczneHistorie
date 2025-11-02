import { type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ROUTES, BUTTON_LABELS } from '../utils/test-data';

/**
 * Page Object for Story Edit page (/stories/[id]/edit)
 */
export class StoryEditPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	// Locators - Read-only fields (non-editable)
	readonly readOnlySubject = this.page.locator(
		'[data-testid="readonly-subject"], input[name="subject"][readonly]'
	);
	readonly readOnlyDifficulty = this.page.locator('[data-testid="readonly-difficulty"]');
	readonly readOnlyDarkness = this.page.locator('[data-testid="readonly-darkness"]');

	// Locators - Editable fields
	readonly questionInput = this.page.locator('textarea[name="question"], input[name="question"]');
	readonly answerInput = this.page.locator('textarea[name="answer"], input[name="answer"]');
	readonly saveButton = this.page.locator(
		`button[type="submit"]:has-text("${BUTTON_LABELS.saveChanges}"), button[type="submit"]:has-text("${BUTTON_LABELS.save}")`
	);
	readonly cancelButton = this.page.locator(
		`a:has-text("${BUTTON_LABELS.cancel}"), button:has-text("${BUTTON_LABELS.cancel}")`
	);

	/**
	 * Navigate to edit page
	 */
	async navigate(storyId: string): Promise<void> {
		await this.goto(ROUTES.editStory(storyId));
	}

	/**
	 * Get read-only values (subject, difficulty, darkness)
	 */
	async getReadOnlyValues(): Promise<{ subject: string; difficulty: string; darkness: string }> {
		return {
			subject: await this.readOnlySubject
				.inputValue()
				.catch(() => this.readOnlySubject.textContent() || ''),
			difficulty: (await this.readOnlyDifficulty.textContent()) || '',
			darkness: (await this.readOnlyDarkness.textContent()) || ''
		};
	}

	/**
	 * Get current question value
	 */
	async getQuestionValue(): Promise<string> {
		return await this.questionInput.inputValue();
	}

	/**
	 * Get current answer value
	 */
	async getAnswerValue(): Promise<string> {
		return await this.answerInput.inputValue();
	}

	/**
	 * Edit question field
	 */
	async editQuestion(newQuestion: string): Promise<void> {
		await this.questionInput.fill(newQuestion);
	}

	/**
	 * Edit answer field
	 */
	async editAnswer(newAnswer: string): Promise<void> {
		await this.answerInput.fill(newAnswer);
	}

	/**
	 * Click save button
	 */
	async clickSave(): Promise<void> {
		await this.saveButton.click();
	}

	/**
	 * Save changes and wait for navigation to detail page
	 */
	async saveAndWaitForDetail(): Promise<void> {
		await this.clickSave();
		await this.page.waitForURL(/\/stories\/[a-f0-9-]+$/);
	}

	/**
	 * Full flow: edit both fields and save
	 */
	async editStory(newQuestion: string, newAnswer: string): Promise<void> {
		await this.editQuestion(newQuestion);
		await this.editAnswer(newAnswer);
		await this.saveAndWaitForDetail();
	}

	/**
	 * Click cancel button
	 */
	async clickCancel(): Promise<void> {
		await this.cancelButton.click();
		await this.page.waitForURL(/\/stories\/[a-f0-9-]+$/);
	}

	/**
	 * Check if save button is disabled
	 */
	async isSaveButtonDisabled(): Promise<boolean> {
		return await this.saveButton.isDisabled();
	}

	/**
	 * Get validation error message
	 */
	async getValidationError(): Promise<string> {
		const errorLocator = this.page.locator('.error, [role="alert"]').first();
		return (await errorLocator.textContent()) || '';
	}
}
