import { test as setup } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

/**
 * Authentication setup for E2E tests
 * Runs once before all tests to establish authenticated session
 * Saves session state to .auth/user.json for reuse in tests
 */

const authFile = '.auth/user.json';

setup('authenticate as E2E user', async ({ page }) => {
	const email = process.env.E2E_USER_EMAIL!;
	const password = process.env.E2E_USER_PASS!;

	console.log(`Logging in as: ${email}`);

	const loginPage = new LoginPage(page);

	// Navigate to login page
	await loginPage.navigate();

	// Perform login
	await loginPage.loginAndWaitForHome(email, password);

	// Verify login was successful by checking we're on home page
	await page.waitForURL('/');

	// Save signed-in state to reuse in tests
	await page.context().storageState({ path: authFile });

	console.log(`Authentication successful. Session saved to ${authFile}`);
});
