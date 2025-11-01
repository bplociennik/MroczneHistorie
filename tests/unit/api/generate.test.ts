import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../src/routes/api/stories/generate/+server';
import { createMockLocals, createMockRequest } from '../../mocks/supabase.mock';
import { validGenerateCommand } from '../../fixtures/stories.fixture';
import type { ErrorDTO, GeneratedStoryDTO } from '../../../src/types';

// Mock the OpenAI service - inline implementation to avoid hoisting issues
vi.mock('$lib/services/ai/openai.service', () => ({
	openaiService: {
		generateStory: vi.fn().mockResolvedValue({
			question: 'Wygenerowane pytanie testowe',
			answer: 'Wygenerowana odpowiedź testowa'
		})
	}
}));

describe('POST /api/stories/generate', () => {
	beforeEach(async () => {
		// Clear call history and restore default implementation
		const { openaiService } = await import('$lib/services/ai/openai.service');
		vi.mocked(openaiService.generateStory).mockClear();
		vi.mocked(openaiService.generateStory).mockResolvedValue({
			question: 'Wygenerowane pytanie testowe',
			answer: 'Wygenerowana odpowiedź testowa'
		});
	});

	describe('Authentication', () => {
		it('should return 401 when user is not authenticated', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'POST',
				body: validGenerateCommand
			});
			const locals = createMockLocals({ authenticated: false });

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(401);
			expect(body.error.code).toBe('AUTHENTICATION_ERROR');
			expect(body.error.message).toContain('Brakujący lub nieprawidłowy token');
		});
	});

	describe('Request Body Parsing', () => {
		it('should return 400 when JSON is invalid', async () => {
			// Arrange
			const request = createMockRequest({ method: 'POST' });
			request.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
			expect(body.error.message).toBe('Nieprawidłowy format JSON');
		});
	});

	describe('Validation', () => {
		it('should return 400 when subject is missing', async () => {
			// Arrange
			const invalidData = { difficulty: 2, darkness: 2 };
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when subject is empty string', async () => {
			// Arrange
			const invalidData = { subject: '', difficulty: 2, darkness: 2 };
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when subject exceeds 150 characters', async () => {
			// Arrange
			const invalidData = {
				subject: 'a'.repeat(151),
				difficulty: 2,
				darkness: 2
			};
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
			expect(body.error.message).toContain('150');
		});

		it('should return 400 when difficulty is missing', async () => {
			// Arrange
			const invalidData = { subject: 'Test', darkness: 2 };
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when difficulty is out of range (0)', async () => {
			// Arrange
			const invalidData = { subject: 'Test', difficulty: 0, darkness: 2 };
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when difficulty is out of range (4)', async () => {
			// Arrange
			const invalidData = { subject: 'Test', difficulty: 4, darkness: 2 };
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when darkness is missing', async () => {
			// Arrange
			const invalidData = { subject: 'Test', difficulty: 2 };
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when darkness is out of range', async () => {
			// Arrange
			const invalidData = { subject: 'Test', difficulty: 2, darkness: 4 };
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});
	});

	describe('Happy Path', () => {
		it('should return 200 with generated story when valid data provided', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'POST',
				body: validGenerateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: GeneratedStoryDTO = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(body).toEqual({
				question: 'Wygenerowane pytanie testowe',
				answer: 'Wygenerowana odpowiedź testowa'
			});
			expect(body.question).toBeDefined();
			expect(body.answer).toBeDefined();
		});

		it('should handle subject with maximum length (150 characters)', async () => {
			// Arrange
			const validData = {
				subject: 'a'.repeat(150),
				difficulty: 2,
				darkness: 2
			};
			const request = createMockRequest({ method: 'POST', body: validData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: GeneratedStoryDTO = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(body.question).toBeDefined();
			expect(body.answer).toBeDefined();
		});

		it('should handle subject with special characters', async () => {
			// Arrange
			const validData = {
				subject: 'Tajemnica łąćźńó <script>alert("XSS")</script>',
				difficulty: 2,
				darkness: 2
			};
			const request = createMockRequest({ method: 'POST', body: validData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as any);
			const body: GeneratedStoryDTO = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(body.question).toBeDefined();
		});

		it('should handle all difficulty levels (1, 2, 3)', async () => {
			// Test difficulty 1
			const request1 = createMockRequest({
				method: 'POST',
				body: { ...validGenerateCommand, difficulty: 1 }
			});
			const locals1 = createMockLocals({ authenticated: true });
			const response1 = await POST({ request: request1, locals: locals1 } as any);
			expect(response1.status).toBe(200);

			// Test difficulty 2
			const request2 = createMockRequest({
				method: 'POST',
				body: { ...validGenerateCommand, difficulty: 2 }
			});
			const locals2 = createMockLocals({ authenticated: true });
			const response2 = await POST({ request: request2, locals: locals2 } as any);
			expect(response2.status).toBe(200);

			// Test difficulty 3
			const request3 = createMockRequest({
				method: 'POST',
				body: { ...validGenerateCommand, difficulty: 3 }
			});
			const locals3 = createMockLocals({ authenticated: true });
			const response3 = await POST({ request: request3, locals: locals3 } as any);
			expect(response3.status).toBe(200);
		});
	});

	describe('OpenAI Error Handling', () => {
		it('should return 408 when OpenAI timeout occurs', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'POST',
				body: validGenerateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock the openaiService to throw timeout error
			const { openaiService } = await import('$lib/services/ai/openai.service');
			const timeoutError = new Error('OpenAI API request timed out');
			timeoutError.name = 'TimeoutError';
			vi.mocked(openaiService.generateStory).mockRejectedValueOnce(timeoutError);

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(408);
			expect(body.error.code).toBe('TIMEOUT_ERROR');
			expect(body.error.message).toContain('limit czasu');
		});

		it('should return 503 when OpenAI rate limit is exceeded', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'POST',
				body: validGenerateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock the openaiService to throw rate limit error
			const { openaiService } = await import('$lib/services/ai/openai.service');
			const rateLimitError = new Error('OpenAI API rate limit exceeded');
			rateLimitError.name = 'RateLimitError';
			vi.mocked(openaiService.generateStory).mockRejectedValueOnce(rateLimitError);

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(503);
			expect(body.error.code).toBe('EXTERNAL_API_ERROR');
			expect(body.error.message).toContain('niedostępna');
		});

		it('should return 503 when OpenAI external API error occurs', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'POST',
				body: validGenerateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock the openaiService to throw external API error
			const { openaiService } = await import('$lib/services/ai/openai.service');
			const externalApiError = new Error('OpenAI API is temporarily unavailable');
			externalApiError.name = 'ExternalApiError';
			vi.mocked(openaiService.generateStory).mockRejectedValueOnce(externalApiError);

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(503);
			expect(body.error.code).toBe('EXTERNAL_API_ERROR');
		});

		it('should return 500 when generic error occurs', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'POST',
				body: validGenerateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock the openaiService to throw generic error
			const { openaiService } = await import('$lib/services/ai/openai.service');
			vi.mocked(openaiService.generateStory).mockRejectedValueOnce(
				new Error('Generic error')
			);

			// Act
			const response = await POST({ request, locals } as any);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
			expect(body.error.message).toContain('Nie udało się wygenerować historii');
		});
	});
});