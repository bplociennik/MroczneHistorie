import { test, expect } from '../../fixtures/test-fixtures';

/**
 * E2E Tests for Story Detail page (game mode)
 * Tests: TC-CRUD-006
 */

test.describe('Story Detail', () => {
	test('TC-CRUD-006: Display story in game mode (Happy Path)', async ({
		storyDetailPage,
		seededStories
	}) => {
		const story = seededStories[0];

		// Navigate to story detail page
		await storyDetailPage.navigate(story.id);

		// Verify question is visible
		const questionText = await storyDetailPage.getQuestion();
		expect(questionText).toContain(story.question);

		// Verify answer is hidden by default
		const isAnswerVisible = await storyDetailPage.isAnswerVisible();
		expect(isAnswerVisible).toBe(false);

		// Verify "Odkryj odpowiedź" button is visible
		await expect(storyDetailPage.revealButton).toBeVisible();
	});

	test('TC-CRUD-006: Reveal and hide answer toggle', async ({ storyDetailPage, seededStories }) => {
		const story = seededStories[0];
		await storyDetailPage.navigate(story.id);

		// Verify answer is hidden initially
		let isAnswerVisible = await storyDetailPage.isAnswerVisible();
		expect(isAnswerVisible).toBe(false);

		// Reveal answer
		await storyDetailPage.revealAnswer();

		// Verify answer is now visible
		isAnswerVisible = await storyDetailPage.isAnswerVisible();
		expect(isAnswerVisible).toBe(true);

		// Verify answer text matches
		const answerText = await storyDetailPage.getAnswer();
		expect(answerText).toContain(story.answer);

		// Verify button changed to "Ukryj odpowiedź"
		await expect(storyDetailPage.hideButton).toBeVisible();

		// Hide answer
		await storyDetailPage.hideAnswer();

		// Verify answer is hidden again
		isAnswerVisible = await storyDetailPage.isAnswerVisible();
		expect(isAnswerVisible).toBe(false);

		// Verify button changed back to "Odkryj odpowiedź"
		await expect(storyDetailPage.revealButton).toBeVisible();
	});

	test('TC-CRUD-006: Navigate to edit page', async ({ storyDetailPage, seededStories }) => {
		const story = seededStories[0];
		await storyDetailPage.navigate(story.id);

		// Click edit button
		await storyDetailPage.clickEdit();

		// Verify navigation to edit page
		await expect(storyDetailPage.page).toHaveURL(new RegExp(`/stories/${story.id}/edit`));
	});

	test('TC-CRUD-006: Navigate back to list', async ({ storyDetailPage, seededStories }) => {
		const story = seededStories[0];
		await storyDetailPage.navigate(story.id);

		// Click back button
		await storyDetailPage.clickBack();

		// Verify navigation to home page
		await expect(storyDetailPage.page).toHaveURL('/');
	});
});
