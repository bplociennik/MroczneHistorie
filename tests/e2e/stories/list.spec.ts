import { test, expect } from '../../fixtures/test-fixtures';
import { PAGE_TITLES, BUTTON_LABELS } from '../../utils/test-data';

/**
 * E2E Tests for Stories List
 * Tests: TC-CRUD-001, TC-CRUD-002
 */

test.describe('Stories List', () => {
	test('TC-CRUD-001: Display empty state when no stories', async ({ homePage }) => {
		// Navigate to home page (database is clean)
		await homePage.navigate();

		// Verify empty state is visible
		const isEmptyVisible = await homePage.isEmptyStateVisible();
		expect(isEmptyVisible).toBe(true);

		// Verify empty state message
		await expect(homePage.emptyState).toBeVisible();
		await expect(homePage.emptyState).toContainText(PAGE_TITLES.emptyState);

		// Verify "Stwórz pierwszą historię" button exists
		await expect(homePage.generateButton).toBeVisible();

		// Verify Random button is disabled (no stories to randomize)
		const isRandomEnabled = await homePage.isRandomButtonEnabled();
		expect(isRandomEnabled).toBe(false);

		// Verify no story cards are displayed
		const storiesCount = await homePage.getStoriesCount();
		expect(storiesCount).toBe(0);
	});

	test('TC-CRUD-002: Display list of stories (Happy Path)', async ({ homePage }) => {
		// Navigate to home page (database has 5 seeded stories)
		await homePage.navigate();

		// Verify empty state is NOT visible
		const isEmptyVisible = await homePage.isEmptyStateVisible();
		expect(isEmptyVisible).toBe(false);

		// Verify story cards are displayed
		const storiesCount = await homePage.getStoriesCount();
		expect(storiesCount).toBe(5);

		// Verify Random button is enabled
		const isRandomEnabled = await homePage.isRandomButtonEnabled();
		expect(isRandomEnabled).toBe(true);

		// Verify first story card contains expected data
		const firstCard = homePage.getStoryCard(0);
		await expect(firstCard).toBeVisible();

		// Verify story card has action buttons (edit, delete)
		const editButton = firstCard.locator(
			`button:has-text("${BUTTON_LABELS.edit}"), a:has-text("${BUTTON_LABELS.edit}")`
		);
		const deleteButton = firstCard.locator(
			`button:has-text("${BUTTON_LABELS.delete}"), [data-testid="delete-button"]`
		);

		await expect(editButton).toBeVisible();
		await expect(deleteButton).toBeVisible();

		// Verify stories are sorted by created_at DESC (newest first)
		// First seeded story should be "#5" (last created)
		const firstCardText = await homePage.getStoryQuestion(0);
		expect(firstCardText).toContain('#5');
	});

	test('TC-CRUD-002: Navigate to story detail by clicking card', async ({ homePage }) => {
		await homePage.navigate();

		// Click on first story card
		await homePage.clickStory(0);

		// Verify navigation to story detail page
		await homePage.page.waitForURL(/\/stories\/[a-f0-9-]+/);
	});

	test('TC-CRUD-002: Navigate to edit page via edit button', async ({ homePage }) => {
		await homePage.navigate();

		// Click edit button on first story
		await homePage.clickEditOnStory(0);

		// Verify navigation to edit page
		await homePage.page.waitForURL(/\/stories\/[a-f0-9-]+\/edit/);
	});
});
