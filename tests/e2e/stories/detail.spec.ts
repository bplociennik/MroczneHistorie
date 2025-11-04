import { test, expect } from '../../fixtures/test-fixtures';
import { E2E_USER } from '../../utils/test-data';
import { seedMultipleStories, cleanupUserStories, type Story } from '../../utils/db-helpers';

/**
 * E2E Tests for Story Detail page (game mode)
 * Tests: TC-CRUD-006
 */

test.describe.configure({ mode: 'serial' });

test.describe('Story Detail', () => {
	test.beforeEach(async () => {
		await cleanupUserStories(E2E_USER.id);
	});

	test.afterEach(async () => {
		await cleanupUserStories(E2E_USER.id);
	});

	test('TC-CRUD-006: Display story in game mode (Happy Path)', async ({ storyDetailPage }) => {
		const seededStories = await seedMultipleStories(E2E_USER.id, 5);
		const story = seededStories[0];

		// Navigate to story detail page
		await storyDetailPage.navigate(story.id);

		// Verify question is visible
		const questionText = await storyDetailPage.getQuestion();
		expect(questionText).toContain(story.question);
	});
});
