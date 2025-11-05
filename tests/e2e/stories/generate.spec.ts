import { expect, mergeTests } from '@playwright/test';
import { test as testFixtures } from '../../fixtures/test-fixtures';
import { test as mockTest } from '../../fixtures/openai-mock.fixture';
import { SAMPLE_SUBJECTS, SUCCESS_MESSAGES } from '../../utils/test-data';

/**
 * E2E Tests for Story Generation
 * Tests: TC-GEN-001, TC-GEN-004
 * Uses OpenAI mocking for deterministic results
 */

// Merge fixtures
const test = mergeTests(testFixtures, mockTest);

test.describe.configure({ mode: 'serial' });

test.describe('Generate Story', () => {
	// Run tests serially to avoid database conflicts with seededStories fixture

	test.describe('Success scenarios', () => {
		test.use({ mockOpenAI: 'success' });

		test.fixme(
			'TC-GEN-001: Generate story successfully (Happy Path)',
			async ({ generatePage, homePage }) => {
				// Navigate to generate page
				await generatePage.navigate();

				// Fill form
				await generatePage.fillSubject(SAMPLE_SUBJECTS[0]);
				await generatePage.setDifficulty(2);
				await generatePage.setDarkness(2);

				// Click generate
				await generatePage.clickGenerate();

				// Wait for generation to complete (loader may be too fast to catch with mock)
				await generatePage.waitForGeneration();

				// Verify generated question and answer exist and have content
				// (this implicitly verifies that preview is visible)
				const question = await generatePage.getGeneratedQuestion();
				const answer = await generatePage.getGeneratedAnswer();

				expect(question.length).toBeGreaterThan(20);
				expect(answer.length).toBeGreaterThan(20);

				// Click save
				await generatePage.clickSave();

				// Verify redirect to home page
				await expect(generatePage.page).toHaveURL('/');

				// Verify success toast
				await generatePage.waitForToast('success', SUCCESS_MESSAGES.story.saved);

				// Verify story appears in list
				const storiesCount = await homePage.getStoriesCount();
				expect(storiesCount).toBe(1);
			}
		);
	});

	test.describe('Timeout scenarios', () => {
		test.use({ mockOpenAI: 'timeout' });

		test.fixme('TC-GEN-004: Generation timeout after 45s', async ({ generatePage }) => {
			test.setTimeout(70000); // Extended timeout for mock delay (46s) + buffer

			await generatePage.navigate();

			// Fill and submit form
			await generatePage.fillSubject('Test timeout scenario');
			await generatePage.setDifficulty(2);
			await generatePage.setDarkness(2);
			await generatePage.clickGenerate();

			// Wait for timeout error (should happen after 46s mock delay)
			// Extended timeout to accommodate mock delay
			const toastSelector = '.alert-error, [role="alert"].error';
			const toast = generatePage.page.locator(toastSelector).first();
			await toast.waitFor({ state: 'visible', timeout: 50000 });
			const toastText = await generatePage.getToastText();

			// Verify error message mentions timeout
			expect(toastText.toLowerCase()).toMatch(/timeout|limit czasu/i);

			// Verify form data is preserved
			const subjectValue = await generatePage.getSubjectValue();
			expect(subjectValue).toBe('Test timeout scenario');
		});
	});
});
