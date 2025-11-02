import { test as base, type Page } from '@playwright/test';
import { MOCK_OPENAI_RESPONSES } from '../utils/test-data';

/**
 * OpenAI API Mock Fixture
 * Provides different mock scenarios for OpenAI API responses
 */

type OpenAIMockType = 'success' | 'timeout' | 'rateLimit' | 'serverError' | 'none';

type OpenAIMockFixtures = {
	mockOpenAI: OpenAIMockType;
};

/**
 * Setup OpenAI API mocking
 */
async function setupOpenAIMock(page: Page, mockType: OpenAIMockType): Promise<void> {
	if (mockType === 'none') {
		return; // No mocking, use real API (not recommended for E2E)
	}

	await page.route('**/api.openai.com/v1/chat/completions', async (route) => {
		switch (mockType) {
			case 'success':
				// Mock successful response
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						id: 'chatcmpl-mock',
						object: 'chat.completion',
						created: Date.now(),
						model: 'gpt-4o',
						choices: [
							{
								index: 0,
								message: {
									role: 'assistant',
									content: JSON.stringify(MOCK_OPENAI_RESPONSES.success)
								},
								finish_reason: 'stop'
							}
						]
					})
				});
				break;

			case 'timeout':
				// Simulate timeout by aborting the request after delay
				await new Promise((resolve) => setTimeout(resolve, MOCK_OPENAI_RESPONSES.timeout.delay));
				await route.abort('timedout');
				break;

			case 'rateLimit':
				// Mock rate limit error (HTTP 429)
				await route.fulfill({
					status: 429,
					contentType: 'application/json',
					body: JSON.stringify({
						error: {
							message: MOCK_OPENAI_RESPONSES.rateLimit.message,
							type: 'rate_limit_error',
							code: 'rate_limit_exceeded'
						}
					})
				});
				break;

			case 'serverError':
				// Mock server error (HTTP 503)
				await route.fulfill({
					status: 503,
					contentType: 'application/json',
					body: JSON.stringify({
						error: {
							message: MOCK_OPENAI_RESPONSES.serverError.message,
							type: 'server_error'
						}
					})
				});
				break;

			default:
				await route.continue();
		}
	});
}

/**
 * Extended test with OpenAI mock fixture
 */
export const test = base.extend<OpenAIMockFixtures>({
	mockOpenAI: [
		'success', // Default to success scenario
		{ option: true }
	]
});

// Add beforeEach hook to setup mocking based on fixture value
test.beforeEach(async ({ page, mockOpenAI }) => {
	await setupOpenAIMock(page, mockOpenAI);
});

export { expect } from '@playwright/test';