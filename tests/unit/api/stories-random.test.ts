import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestHandlerEvent } from '@sveltejs/kit';
import { GET } from '../../../src/routes/api/stories/random/+server';
import { createMockLocals } from '../../mocks/supabase.mock';
import { validStoryFixture } from '../../fixtures/stories.fixture';
import type { ErrorDTO, StoryDTO } from '../../../src/types';

describe('GET /api/stories/random', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Authentication', () => {
		it('should return 401 when user is not authenticated', async () => {
			// Arrange
			const locals = createMockLocals({ authenticated: false });

			// Act
			const response = await GET({ locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(401);
			expect(body.error.code).toBe('AUTHENTICATION_ERROR');
			expect(body.error.message).toContain('Brakujący lub nieprawidłowy token');
		});
	});

	describe('Happy Path', () => {
		it('should return 200 with random story when user has stories', async () => {
			// Arrange
			const locals = createMockLocals({ authenticated: true });

			// Mock successful RPC call
			const mockSupabase = locals.supabase;
			mockSupabase.rpc = vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({
					data: validStoryFixture,
					error: null
				})
			});

			// Act
			const response = await GET({ locals } as unknown as RequestHandlerEvent);
			const body: StoryDTO = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(body).toMatchObject({
				id: validStoryFixture.id,
				user_id: validStoryFixture.user_id,
				subject: validStoryFixture.subject,
				difficulty: validStoryFixture.difficulty,
				darkness: validStoryFixture.darkness,
				question: validStoryFixture.question,
				answer: validStoryFixture.answer,
				created_at: validStoryFixture.created_at
			});
		});

		it('should call get_random_story RPC function', async () => {
			// Arrange
			const locals = createMockLocals({ authenticated: true });

			// Mock successful RPC call
			const mockSupabase = locals.supabase;
			const rpcMock = vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({
					data: validStoryFixture,
					error: null
				})
			});
			mockSupabase.rpc = rpcMock;

			// Act
			await GET({ locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(rpcMock).toHaveBeenCalledWith('get_random_story');
		});

		it('should return Content-Type application/json header', async () => {
			// Arrange
			const locals = createMockLocals({ authenticated: true });

			// Mock successful RPC call
			const mockSupabase = locals.supabase;
			mockSupabase.rpc = vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({
					data: validStoryFixture,
					error: null
				})
			});

			// Act
			const response = await GET({ locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});
	});

	describe('Empty Collection', () => {
		it('should return 404 when user has no stories', async () => {
			// Arrange
			const locals = createMockLocals({ authenticated: true });

			// Mock RPC call returning null (no stories)
			const mockSupabase = locals.supabase;
			mockSupabase.rpc = vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({
					data: null,
					error: null
				})
			});

			// Act
			const response = await GET({ locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(404);
			expect(body.error.code).toBe('NOT_FOUND');
			expect(body.error.message).toContain('Nie masz jeszcze żadnych historii w kolekcji');
		});
	});

	describe('Database Error Handling', () => {
		it('should return 500 when RPC function fails', async () => {
			// Arrange
			const locals = createMockLocals({ authenticated: true });

			// Mock RPC error
			const mockSupabase = locals.supabase;
			mockSupabase.rpc = vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({
					data: null,
					error: {
						code: '42883',
						message: 'Function does not exist',
						details: 'Function get_random_story() does not exist',
						hint: 'No function matches the given name and argument types'
					}
				})
			});

			// Act
			const response = await GET({ locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
		});

		it('should return 500 when unexpected error occurs', async () => {
			// Arrange
			const locals = createMockLocals({ authenticated: true });

			// Mock unexpected error
			const mockSupabase = locals.supabase;
			mockSupabase.rpc = vi.fn().mockImplementation(() => {
				throw new Error('Unexpected database error');
			});

			// Act
			const response = await GET({ locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
		});

		it('should log errors with user context', async () => {
			// Arrange
			const userId = '00000000-0000-0000-0000-000000000123';
			const locals = createMockLocals({ authenticated: true, userId });

			// Spy on console.error
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Mock RPC error
			const mockSupabase = locals.supabase;
			mockSupabase.rpc = vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({
					data: null,
					error: {
						code: 'TEST_ERROR',
						message: 'Test error message',
						details: 'Test details',
						hint: 'Test hint'
					}
				})
			});

			// Act
			await GET({ locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[API ERROR] GET /api/stories/random - Supabase error',
				expect.objectContaining({
					userId: userId,
					error: 'Test error message',
					code: 'TEST_ERROR'
				})
			);

			// Cleanup
			consoleErrorSpy.mockRestore();
		});
	});

	describe('RLS Security', () => {
		it('should only return stories belonging to authenticated user', async () => {
			// Arrange
			const userId = '00000000-0000-0000-0000-000000000001';
			const locals = createMockLocals({ authenticated: true, userId });

			// Mock successful RPC call
			const mockSupabase = locals.supabase;
			mockSupabase.rpc = vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({
					data: { ...validStoryFixture, user_id: userId },
					error: null
				})
			});

			// Act
			const response = await GET({ locals } as unknown as RequestHandlerEvent);
			const body: StoryDTO = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(body.user_id).toBe(userId);
		});
	});

	describe('Response Structure', () => {
		it('should return complete StoryDTO with all required fields', async () => {
			// Arrange
			const locals = createMockLocals({ authenticated: true });

			// Mock successful RPC call
			const mockSupabase = locals.supabase;
			mockSupabase.rpc = vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({
					data: validStoryFixture,
					error: null
				})
			});

			// Act
			const response = await GET({ locals } as unknown as RequestHandlerEvent);
			const body: StoryDTO = await response.json();

			// Assert
			expect(body).toHaveProperty('id');
			expect(body).toHaveProperty('user_id');
			expect(body).toHaveProperty('subject');
			expect(body).toHaveProperty('difficulty');
			expect(body).toHaveProperty('darkness');
			expect(body).toHaveProperty('question');
			expect(body).toHaveProperty('answer');
			expect(body).toHaveProperty('created_at');
		});
	});
});
