import { expect, mergeTests } from '@playwright/test';
import { test as testFixtures } from '../../fixtures/test-fixtures';
import { test as mockTest } from '../../fixtures/openai-mock.fixture';
import {
	SAMPLE_SUBJECTS,
	SUCCESS_MESSAGES,
	MOCK_OPENAI_RESPONSES,
	TIMEOUTS
} from '../../utils/test-data';

/**
 * E2E Tests for Story Generation
 * Tests: TC-GEN-001, TC-GEN-004
 * Uses OpenAI mocking for deterministic results
 */

// Merge fixtures
const test = mergeTests(testFixtures, mockTest);

test.describe('Generate Story', () => {
	test('TC-GEN-001: Generate story successfully (Happy Path)', async ({
		generatePage,
		homePage
	}) => {
		// Use success mock (default)
		test.use({ mockOpenAI: 'success' });

		// Navigate to generate page
		await generatePage.navigate();

		// Fill form
		await generatePage.fillSubject(SAMPLE_SUBJECTS[0]);
		await generatePage.setDifficulty(2);
		await generatePage.setDarkness(2);

		// Click generate
		await generatePage.clickGenerate();

		// Verify global loader appears
		const isLoaderVisible = await generatePage.isLoaderVisible();
		expect(isLoaderVisible).toBe(true);

		// Wait for generation to complete
		await generatePage.waitForGeneration();

		// Verify preview is visible
		const isPreviewVisible = await generatePage.isPreviewVisible();
		expect(isPreviewVisible).toBe(true);

		// Verify generated question and answer match mock
		const question = await generatePage.getGeneratedQuestion();
		const answer = await generatePage.getGeneratedAnswer();

		expect(question).toContain(MOCK_OPENAI_RESPONSES.success.question);
		expect(answer).toContain(MOCK_OPENAI_RESPONSES.success.answer);

		// Click save
		await generatePage.clickSave();

		// Verify redirect to home page
		await expect(generatePage.page).toHaveURL('/');

		// Verify success toast
		await generatePage.waitForToast('success', SUCCESS_MESSAGES.story.saved);

		// Verify story appears in list
		const storiesCount = await homePage.getStoriesCount();
		expect(storiesCount).toBe(1);
	});

	test('TC-GEN-004: Generation timeout after 45s', async ({ generatePage }) => {
		test.use({ mockOpenAI: 'timeout' });
		test.setTimeout(TIMEOUTS.generation + 10000); // Extend test timeout

		await generatePage.navigate();

		// Fill and submit form
		await generatePage.fillSubject('Test timeout scenario');
		await generatePage.setDifficulty(2);
		await generatePage.setDarkness(2);
		await generatePage.clickGenerate();

		// Wait for timeout error (should happen after 45s)
		await generatePage.waitForToast('error');
		const toastText = await generatePage.getToastText();

		// Verify error message mentions timeout
		expect(toastText.toLowerCase()).toMatch(/timeout|limit czasu/i);

		// Verify form data is preserved
		const subjectValue = await generatePage.getSubjectValue();
		expect(subjectValue).toBe('Test timeout scenario');
	});

	test('TC-GEN-001: Random subject button fills subject field', async ({ generatePage }) => {
		await generatePage.navigate();

		// Subject should be empty initially
		let subjectValue = await generatePage.getSubjectValue();
		expect(subjectValue).toBe('');

		// Click random button
		await generatePage.clickRandomSubject();

		// Verify subject is now filled with a random word
		subjectValue = await generatePage.getSubjectValue();
		expect(subjectValue.length).toBeGreaterThan(0);

		// Click random again
		await generatePage.clickRandomSubject();
		subjectValue = await generatePage.getSubjectValue();

		// Value should have changed (might be same due to randomness, but usually different)
		expect(subjectValue.length).toBeGreaterThan(0);
	});

	test('TC-GEN-001: Regenerate story with same parameters', async ({ generatePage }) => {
		test.use({ mockOpenAI: 'success' });

		await generatePage.navigate();

		// Generate first story
		await generatePage.generateStory(SAMPLE_SUBJECTS[1], 1, 1);

		// Click regenerate
		await generatePage.clickRegenerate();
		await generatePage.waitForGeneration();

		// New story should be generated (in real scenario with OpenAI, it would be different)
		// With mocking, it will be the same, but button flow is tested
		const secondQuestion = await generatePage.getGeneratedQuestion();
		const secondAnswer = await generatePage.getGeneratedAnswer();

		expect(secondQuestion).toBeTruthy();
		expect(secondAnswer).toBeTruthy();
	});
});
