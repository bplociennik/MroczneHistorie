import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';

// Load E2E environment variables only locally and only if not already loaded
// In CI (GitHub Actions), variables come from GitHub secrets via workflow env vars
// If using `node --env-file=.env.e2e`, variables are already loaded in process.env
if (
	!process.env.CI &&
	!process.env.E2E_USER_EMAIL && // Check if variables are already loaded
	fs.existsSync('.env.e2e')
) {
	dotenv.config({ path: '.env.e2e' });
}

/**
 * Playwright configuration for MroczneHistorie E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	// Look for test files in the "tests" directory
	testDir: './tests',

	// Maximum time one test can run (most tests should be faster)
	timeout: 30000,

	// Expect timeout for assertions
	expect: {
		timeout: 5000
	},

	// Run tests in parallel for faster execution on CI
	fullyParallel: false,
	workers: process.env.CI ? 5 : 1,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 1 : 0,

	// Reporter to use
	reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

	// Shared settings for all projects
	use: {
		// Base URL for navigation (local dev server)
		baseURL: 'http://localhost:5173',

		// Collect trace on first retry
		trace: 'on-first-retry',

		// Screenshot only on failure
		screenshot: 'only-on-failure',

		// Video only on failure
		video: 'retain-on-failure',

		// Default viewport (mobile-first)
		viewport: { width: 375, height: 667 }
	},

	// Configure projects for browsers and setup
	projects: [
		// Setup project - runs authentication and saves session state
		{
			name: 'setup',
			testMatch: '**/auth.setup.ts'
		},

		// Main E2E tests with authenticated user
		{
			name: 'chromium',
			testMatch: '**/e2e/**/*.spec.ts',
			testIgnore: [
				'**/e2e/auth/login.spec.ts',
				'**/e2e/auth/register.spec.ts',
				'**/e2e/auth/route-protection.spec.ts'
			],
			use: {
				...devices['Desktop Chrome'],
				// Use saved authentication state
				storageState: '.auth/user.json'
			},
			dependencies: ['setup']
		},

		// Tests that require unauthenticated state (landing page, login, register)
		{
			name: 'chromium-guest',
			testMatch: [
				'**/e2e/auth/login.spec.ts',
				'**/e2e/auth/register.spec.ts',
				'**/e2e/auth/route-protection.spec.ts'
			],
			use: {
				...devices['Desktop Chrome'],
				// No authentication state
				storageState: { cookies: [], origins: [] }
			}
		}
	],

	// Folder for test artifacts such as screenshots, videos, traces, etc.
	outputDir: 'test-results/'
});
