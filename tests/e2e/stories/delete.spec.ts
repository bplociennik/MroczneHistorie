import { test, expect } from '../../fixtures/test-fixtures';
import { SUCCESS_MESSAGES } from '../../utils/test-data';
import {
	getStoriesCount,
	seedMultipleStories,
	cleanupUserStories,
	type Story
} from '../../utils/db-helpers';
import { E2E_USER } from '../../utils/test-data';

/**
 * E2E Tests for Story Delete functionality
 * Tests: TC-CRUD-010, TC-CRUD-011
 */

test.describe.configure({ mode: 'serial' });

test.describe('Story Delete', () => {
	test.beforeEach(async () => {
		await cleanupUserStories(E2E_USER.id);
	});

	test.afterEach(async () => {
		await cleanupUserStories(E2E_USER.id);
	});

	test('TC-CRUD-010: Delete story from list (Happy Path)', async ({ homePage }) => {
		await seedMultipleStories(E2E_USER.id, 5);
		await homePage.navigate();

		// Get initial count (should be 5 from seededStories fixture)
		const initialCount = await homePage.getStoriesCount();
		expect(initialCount).toBe(5);

		// Click delete on first story
		await homePage.clickDeleteOnStory(0);

		// Verify delete confirmation modal appears
		const isModalVisible = await homePage.isDeleteModalVisible();
		expect(isModalVisible).toBe(true);

		// Confirm deletion
		await homePage.confirmDelete();

		// Verify success toast
		await homePage.waitForToast('success', SUCCESS_MESSAGES.story.deleted);

		// Wait for story card to be removed from DOM
		await homePage.page.waitForFunction(
			(expectedCount) => {
				const cards = document.querySelectorAll('[data-testid="story-card"], .story-card');
				return cards.length === expectedCount;
			},
			initialCount - 1,
			{ timeout: 5000 }
		);

		// Verify story was removed from list (without page reload)
		const newCount = await homePage.getStoriesCount();
		expect(newCount).toBe(initialCount - 1);

		// Verify in database
		const dbCount = await getStoriesCount(E2E_USER.id);
		expect(dbCount).toBe(4);
	});

	test('TC-CRUD-011: Cancel deletion keeps story', async ({ homePage }) => {
		await seedMultipleStories(E2E_USER.id, 5);
		await homePage.navigate();

		const initialCount = await homePage.getStoriesCount();

		// Click delete on first story
		await homePage.clickDeleteOnStory(0);

		// Verify modal appears
		const isModalVisible = await homePage.isDeleteModalVisible();
		expect(isModalVisible).toBe(true);

		// Cancel deletion
		await homePage.cancelDelete();

		// Verify story count unchanged
		const newCount = await homePage.getStoriesCount();
		expect(newCount).toBe(initialCount);

		// Verify in database
		const dbCount = await getStoriesCount(E2E_USER.id);
		expect(dbCount).toBe(5);
	});

	test('TC-CRUD-012: Close modal with Escape key', async ({ homePage }) => {
		await seedMultipleStories(E2E_USER.id, 5);
		await homePage.navigate();

		const initialCount = await homePage.getStoriesCount();

		// Click delete
		await homePage.clickDeleteOnStory(0);

		// Press Escape key to close modal
		await homePage.page.keyboard.press('Escape');

		// Verify modal closed and story not deleted
		const newCount = await homePage.getStoriesCount();
		expect(newCount).toBe(initialCount);
	});
});
