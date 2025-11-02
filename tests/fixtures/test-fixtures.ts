import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { HomePage } from '../pages/HomePage';
import { GeneratePage } from '../pages/GeneratePage';
import { StoryDetailPage } from '../pages/StoryDetailPage';
import { StoryEditPage } from '../pages/StoryEditPage';
import { cleanupUserStories, seedMultipleStories, type Story } from '../utils/db-helpers';
import { E2E_USER } from '../utils/test-data';

/**
 * Custom fixtures for E2E tests
 * Provides Page Objects and database helpers
 */

type TestFixtures = {
	loginPage: LoginPage;
	registerPage: RegisterPage;
	homePage: HomePage;
	generatePage: GeneratePage;
	storyDetailPage: StoryDetailPage;
	storyEditPage: StoryEditPage;
	cleanDatabase: void;
	seededStories: Story[];
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
	// Page Object fixtures
	loginPage: async ({ page }, use) => {
		await use(new LoginPage(page));
	},

	registerPage: async ({ page }, use) => {
		await use(new RegisterPage(page));
	},

	homePage: async ({ page }, use) => {
		await use(new HomePage(page));
	},

	generatePage: async ({ page }, use) => {
		await use(new GeneratePage(page));
	},

	storyDetailPage: async ({ page }, use) => {
		await use(new StoryDetailPage(page));
	},

	storyEditPage: async ({ page }, use) => {
		await use(new StoryEditPage(page));
	},

	/**
	 * Fixture that cleans up E2E user's stories before AND after test
	 * Use this for tests that create/modify data
	 */
	cleanDatabase: [
		async ({}, use) => {
			// Clean before test
			await cleanupUserStories(E2E_USER.id);

			// Run test
			await use();

			// Clean after test
			await cleanupUserStories(E2E_USER.id);
		},
		{ auto: false } // Not auto, must be explicitly requested
	],

	/**
	 * Fixture that seeds multiple stories before test and cleans up after
	 * Creates 5 test stories by default
	 */
	seededStories: [
		async ({}, use) => {
			// Clean first
			await cleanupUserStories(E2E_USER.id);

			// Seed stories
			const stories = await seedMultipleStories(E2E_USER.id, 5);

			// Run test with seeded stories
			await use(stories);

			// Cleanup after test
			await cleanupUserStories(E2E_USER.id);
		},
		{ auto: false } // Not auto, must be explicitly requested
	]
});

export { expect } from '@playwright/test';