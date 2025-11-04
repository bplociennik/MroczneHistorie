import { test, expect } from '../../fixtures/test-fixtures';
import { SUCCESS_MESSAGES, E2E_USER } from '../../utils/test-data';
import { seedMultipleStories, cleanupUserStories, type Story } from '../../utils/db-helpers';

/**
 * E2E Tests for Story Edit functionality
 * Tests: TC-CRUD-008, TC-CRUD-009
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

	test('TC-CRUD-008: Edit story (Happy Path)', async ({ storyEditPage, storyDetailPage }) => {
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

		// Verify success toast
		await storyEditPage.waitForToast('success', SUCCESS_MESSAGES.story.updated);

		// Verify new values are displayed on detail page
		const displayedQuestion = await storyDetailPage.getQuestion();
		expect(displayedQuestion).toContain(newQuestion);

		// Reveal answer to verify
		await storyDetailPage.revealAnswer();
		const displayedAnswer = await storyDetailPage.getAnswer();
		expect(displayedAnswer).toContain(newAnswer);
	});

	test('TC-CRUD-008: Read-only fields cannot be modified', async ({ storyEditPage }) => {
		const story = seededStories[0];
		await storyEditPage.navigate(story.id);

		// Verify subject field is read-only
		const isSubjectReadonly = await storyEditPage.readOnlySubject.getAttribute('readonly');
		expect(isSubjectReadonly).not.toBeNull();

		// Verify difficulty and darkness are displayed as read-only
		const readOnlyValues = await storyEditPage.getReadOnlyValues();
		expect(readOnlyValues.difficulty).toBeTruthy();
		expect(readOnlyValues.darkness).toBeTruthy();
	});

	test('TC-CRUD-009: Edit only question field', async ({
		storyEditPage,
		storyDetailPage
	}) => {
		const story = seededStories[0];
		await storyEditPage.navigate(story.id);

		const newQuestion = 'Only question updated?';

		// Edit only question, leave answer unchanged
		await storyEditPage.editQuestion(newQuestion);
		await storyEditPage.saveAndWaitForDetail();

		// Verify success
		await storyEditPage.waitForToast('success');

		// Verify question was updated
		const displayedQuestion = await storyDetailPage.getQuestion();
		expect(displayedQuestion).toContain(newQuestion);

		// Verify answer remained unchanged
		await storyDetailPage.revealAnswer();
		const displayedAnswer = await storyDetailPage.getAnswer();
		expect(displayedAnswer).toContain(story.answer);
	});

	test('TC-CRUD-009: Edit only answer field', async ({
		storyEditPage,
		storyDetailPage
	}) => {
		const story = seededStories[0];
		await storyEditPage.navigate(story.id);

		const newAnswer = 'Only answer updated.';

		// Edit only answer, leave question unchanged
		await storyEditPage.editAnswer(newAnswer);
		await storyEditPage.saveAndWaitForDetail();

		// Verify success
		await storyEditPage.waitForToast('success');

		// Verify question remained unchanged
		const displayedQuestion = await storyDetailPage.getQuestion();
		expect(displayedQuestion).toContain(story.question);

		// Verify answer was updated
		await storyDetailPage.revealAnswer();
		const displayedAnswer = await storyDetailPage.getAnswer();
		expect(displayedAnswer).toContain(newAnswer);
	});

	test('TC-CRUD-009: Cannot save with empty question', async ({ storyEditPage }) => {
		const story = seededStories[0];
		await storyEditPage.navigate(story.id);

		// Try to clear question
		await storyEditPage.editQuestion('');
		await storyEditPage.clickSave();

		// Verify error toast or validation
		await storyEditPage.waitForToast('error');
		const toastText = await storyEditPage.getToastText();
		expect(toastText.toLowerCase()).toMatch(/(pytanie|question)/i);
	});

	test('TC-CRUD-009: Cannot save with empty answer', async ({ storyEditPage }) => {
		const story = seededStories[0];
		await storyEditPage.navigate(story.id);

		// Try to clear answer
		await storyEditPage.editAnswer('');
		await storyEditPage.clickSave();

		// Verify error toast or validation
		await storyEditPage.waitForToast('error');
		const toastText = await storyEditPage.getToastText();
		expect(toastText.toLowerCase()).toMatch(/(odpowiedź|answer)/i);
	});

	test('TC-CRUD-008: Cancel edit returns to detail page', async ({
		storyEditPage
	}) => {
		const story = seededStories[0];
		await storyEditPage.navigate(story.id);

		// Make some changes
		await storyEditPage.editQuestion('This should be discarded');

		// Click cancel
		await storyEditPage.clickCancel();

		// Verify redirect to detail page
		await expect(storyEditPage.page).toHaveURL(new RegExp(`/stories/${story.id}$`));

		// Verify no changes were saved (question is still original)
		const displayedQuestion = await storyEditPage.page.textContent(
			'[data-testid="story-question"], .story-question'
		);
		expect(displayedQuestion).toContain(story.question);
	});
});
