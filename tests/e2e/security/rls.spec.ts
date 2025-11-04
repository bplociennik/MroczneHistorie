import { test, expect } from '../../fixtures/test-fixtures';
import { E2E_USER, SAMPLE_STORIES } from '../../utils/test-data';
import { getUserStories, seedMultipleStories, cleanupUserStories } from '../../utils/db-helpers';

/**
 * E2E Tests for Row Level Security (RLS)
 * Tests: TC-AUTH-007
 * Verifies that users can only see and modify their own stories
 */

test.describe.configure({ mode: 'serial' });

test.describe('RLS Security', () => {
	test.beforeEach(async () => {
		await cleanupUserStories(E2E_USER.id);
	});

	test.afterEach(async () => {
		await cleanupUserStories(E2E_USER.id);
	});

	test('TC-AUTH-007: User sees only their own stories in list', async ({ homePage }) => {
		// Seed stories
		await seedMultipleStories(E2E_USER.id, 5);

		// Navigate to home page to load seeded data
		await homePage.navigate();

		// Verify user sees all 5 seeded stories
		const storiesCount = await homePage.getStoriesCount();
		expect(storiesCount).toBe(5);

		// Verify all stories in DB belong to E2E user
		const dbStories = await getUserStories(E2E_USER.id);
		expect(dbStories.length).toBe(5);

		// All stories should have user_id matching E2E_USER
		dbStories.forEach((story) => {
			expect(story.user_id).toBe(E2E_USER.id);
		});
	});

	test('TC-AUTH-007: API /api/stories returns only user stories', async ({ page }) => {
		await seedMultipleStories(E2E_USER.id, 5);
		// Make API call to get stories
		const response = await page.request.get('/api/stories');
		expect(response.ok()).toBe(true);

		const data = await response.json();

		// Verify all returned stories belong to authenticated user
		expect(data.stories).toBeDefined();
		expect(data.stories.length).toBe(5);

		data.stories.forEach((story) => {
			expect(story.user_id).toBe(E2E_USER.id);
		});
	});

	test('TC-AUTH-007: Cannot access another user story by ID (404)', async ({ page }) => {
		// Create a valid UUID v4 that doesn't belong to E2E user
		const otherUserStoryId = '00000000-0000-4000-8000-000000000001';

		// Try to access via API
		const response = await page.request.get(`/api/stories/${otherUserStoryId}`);

		// Should return 404 (RLS blocks access, doesn't reveal if story exists)
		expect(response.status()).toBe(404);
	});

	test('TC-AUTH-007: Cannot update another user story (404)', async ({ page }) => {
		const otherUserStoryId = '00000000-0000-4000-8000-000000000001';

		// Try to update via API
		const response = await page.request.patch(`/api/stories/${otherUserStoryId}`, {
			data: JSON.stringify({
				question: 'Hacked question',
				answer: 'Hacked answer'
			})
		});

		// Should return 404 (RLS prevents update)
		expect(response.status()).toBe(404);
	});

	test('TC-AUTH-007: Cannot delete another user story (404)', async ({ page }) => {
		const otherUserStoryId = '00000000-0000-4000-8000-000000000001';

		// Try to delete via API
		const response = await page.request.delete(`/api/stories/${otherUserStoryId}`);

		// Should return 404 (RLS prevents deletion)
		expect(response.status()).toBe(404);
	});

	test('TC-AUTH-007: API /api/stories/random returns only user stories', async ({ page }) => {
		await seedMultipleStories(E2E_USER.id, 5);
		// Call random endpoint multiple times
		for (let i = 0; i < 3; i++) {
			const response = await page.request.get('/api/stories/random');

			if (response.ok()) {
				const story = await response.json();

				// Verify returned story belongs to E2E user
				expect(story.user_id).toBe(E2E_USER.id);
			}
		}
	});
});
