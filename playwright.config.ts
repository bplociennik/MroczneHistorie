import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Environment variables are loaded via:
 * - `node --env-file=.env.e2e` flag in npm scripts (locally)
 * - GitHub secrets passed as env vars in workflow (CI)
 * We also try to load .env.e2e here as a fallback
 */

// Load .env.e2e if it exists and we're not in CI
if (!process.env.CI && process.env.NODE_ENV !== 'test') {
	const envPath = path.resolve('.env.e2e');
	if (fs.existsSync(envPath)) {
		const envContent = fs.readFileSync(envPath, 'utf-8');
		envContent.split('\n').forEach((line) => {
			const [key, ...valueParts] = line.split('=');
			const trimmedKey = key.trim();
			if (trimmedKey && !trimmedKey.startsWith('#') && !process.env[trimmedKey]) {
				process.env[trimmedKey] = valueParts.join('=').trim();
			}
		});
	}
}

/**
 * Playwright configuration for MroczneHistorie E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	// Look for test files in the "tests" directory
	testDir: './tests',

	// Maximum time one test can run (most tests should be faster)
	timeout: 20000,

	// Expect timeout for assertions
	expect: {
		timeout: 4000
	},

	// Run tests in parallel for faster execution on CI
	fullyParallel: false,
	workers: process.env.CI ? 5 : 4,

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
