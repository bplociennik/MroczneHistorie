import { vi } from 'vitest';
import type { GeneratedStoryDTO } from '../../src/types';
import { generatedStoryFixture } from '../fixtures/stories.fixture';

/**
 * Creates a mock OpenAI service for testing
 *
 * Usage in tests:
 * vi.mock('$lib/services/ai/openai.service', () => ({
 *   openaiService: createMockOpenAIService()
 * }));
 */
export function createMockOpenAIService() {
	return {
		generateStory: vi.fn().mockResolvedValue(generatedStoryFixture)
	};
}

/**
 * Mock OpenAI service that throws timeout error
 */
export function createTimeoutOpenAIService() {
	return {
		generateStory: vi.fn().mockRejectedValue({
			name: 'TimeoutError',
			message: 'OpenAI API request timed out'
		})
	};
}

/**
 * Mock OpenAI service that throws rate limit error
 */
export function createRateLimitOpenAIService() {
	return {
		generateStory: vi.fn().mockRejectedValue({
			name: 'RateLimitError',
			message: 'OpenAI API rate limit exceeded'
		})
	};
}

/**
 * Mock OpenAI service that throws external API error
 */
export function createExternalApiErrorService() {
	return {
		generateStory: vi.fn().mockRejectedValue({
			name: 'ExternalApiError',
			message: 'OpenAI API is temporarily unavailable'
		})
	};
}

/**
 * Mock OpenAI service that throws generic error
 */
export function createGenericErrorService() {
	return {
		generateStory: vi.fn().mockRejectedValue(new Error('Generic error'))
	};
}
