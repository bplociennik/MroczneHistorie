import { test, expect } from '../../fixtures/test-fixtures';
import { SUCCESS_MESSAGES, E2E_USER } from '../../utils/test-data';
import { seedMultipleStories, cleanupUserStories, type Story } from '../../utils/db-helpers';

/**
 * E2E Tests for Story Edit functionality
 * Tests: TC-CRUD-008
 */

test.describe.configure({ mode: 'serial' });

test.describe('Story Edit', () => {
	let seededStories: Story[];

	test.beforeEach(async ({ homePage }) => {
		await cleanupUserStories(E2E_USER.id);
		seededStories = await seedMultipleStories(E2E_USER.id, 5);

		// Navigate once to bust cache and ensure auth is valid
		await homePage.navigate();
	});

	test.afterEach(async () => {
		await cleanupUserStories(E2E_USER.id);
	});

	test.fixme('TC-CRUD-008: Edit story (Happy Path)', async ({ storyEditPage, storyDetailPage }) => {
		const story = seededStories[0];

		// Navigate to edit page
		await storyEditPage.navigate(story.id);

		// Verify read-only fields are displayed and not editable
		const readOnlyValues = await storyEditPage.getReadOnlyValues();
		expect(readOnlyValues.subject).toContain(story.subject);

		// Verify current question and answer values
		const currentQuestion = await storyEditPage.getQuestionValue();
		const currentAnswer = await storyEditPage.getAnswerValue();
		expect(currentQuestion).toBe(story.question);
		expect(currentAnswer).toBe(story.answer);

		// Edit question and answer
		const newQuestion = 'Updated Test Question?';
		const newAnswer = 'Updated Test Answer.';

		await storyEditPage.editStory(newQuestion, newAnswer);

		// Verify redirect to detail page
		await expect(storyEditPage.page).toHaveURL(new RegExp(`/stories/${story.id}$`));

		// Verify new values are displayed on detail page
		const displayedQuestion = await storyDetailPage.getQuestion();
		expect(displayedQuestion).toContain(newQuestion);
	});
});
