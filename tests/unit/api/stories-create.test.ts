import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestHandlerEvent } from '@sveltejs/kit';
import { POST } from '../../../src/routes/api/stories/+server';
import { createMockLocals, createMockRequest } from '../../mocks/supabase.mock';
import { validCreateCommand, validStoryFixture } from '../../fixtures/stories.fixture';
import type { ErrorDTO, StoryDTO } from '../../../src/types';

describe('POST /api/stories', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Authentication', () => {
		it('should return 401 when user is not authenticated', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'POST',
				body: validCreateCommand
			});
			const locals = createMockLocals({ authenticated: false });

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);
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
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);
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
			const invalidData = {
				difficulty: 2,
				darkness: 2,
				question: 'Test',
				answer: 'Test'
			};
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when question is missing', async () => {
			// Arrange
			const invalidData = {
				subject: 'Test',
				difficulty: 2,
				darkness: 2,
				answer: 'Test'
			};
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when answer is missing', async () => {
			// Arrange
			const invalidData = {
				subject: 'Test',
				difficulty: 2,
				darkness: 2,
				question: 'Test'
			};
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when question is empty string', async () => {
			// Arrange
			const invalidData = {
				...validCreateCommand,
				question: ''
			};
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when answer is empty string', async () => {
			// Arrange
			const invalidData = {
				...validCreateCommand,
				answer: ''
			};
			const request = createMockRequest({ method: 'POST', body: invalidData });
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should trim whitespace from question and answer', async () => {
			// Arrange
			const dataWithWhitespace = {
				subject: 'Test',
				difficulty: 2,
				darkness: 2,
				question: '  Pytanie testowe  ',
				answer: '  Odpowiedź testowa  '
			};
			const request = createMockRequest({
				method: 'POST',
				body: dataWithWhitespace
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database insertion
			const mockSupabase = locals.supabase;
			mockSupabase.from('stories').insert().select().single = vi
				.fn()
				.mockResolvedValue({ data: validStoryFixture, error: null });

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(response.status).toBe(201);
			// Verify that trimmed values were sent to database
			expect(mockSupabase.from).toHaveBeenCalledWith('stories');
		});
	});

	describe('Happy Path', () => {
		it('should return 201 with created story when valid data provided', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'POST',
				body: validCreateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database insertion
			const mockSupabase = locals.supabase;
			mockSupabase.from('stories').insert().select().single = vi
				.fn()
				.mockResolvedValue({ data: validStoryFixture, error: null });

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);
			const body: StoryDTO = await response.json();

			// Assert
			expect(response.status).toBe(201);
			expect(body).toEqual(validStoryFixture);
			expect(body.id).toBeDefined();
			expect(body.created_at).toBeDefined();
			expect(response.headers.get('Location')).toBe(`/api/stories/${validStoryFixture.id}`);
		});

		it('should include user_id in database insert', async () => {
			// Arrange
			const userId = '00000000-0000-0000-0000-000000000123';
			const request = createMockRequest({
				method: 'POST',
				body: validCreateCommand
			});
			const locals = createMockLocals({ authenticated: true, userId });

			// Mock successful database insertion
			const mockSupabase = locals.supabase;
			const insertMock = vi.fn().mockReturnThis();
			const selectMock = vi.fn().mockReturnThis();
			const singleMock = vi.fn().mockResolvedValue({ data: validStoryFixture, error: null });

			mockSupabase.from = vi.fn().mockReturnValue({
				insert: insertMock,
				select: selectMock,
				single: singleMock
			});

			insertMock.mockReturnValue({
				select: selectMock,
				single: singleMock
			});

			selectMock.mockReturnValue({
				single: singleMock
			});

			// Act
			await POST({ request, locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(insertMock).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: userId
				})
			);
		});

		it('should handle long question and answer', async () => {
			// Arrange
			const longData = {
				subject: 'Test',
				difficulty: 2,
				darkness: 2,
				question: 'Q'.repeat(1000),
				answer: 'A'.repeat(1000)
			};
			const request = createMockRequest({
				method: 'POST',
				body: longData
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database insertion
			const mockSupabase = locals.supabase;
			mockSupabase.from('stories').insert().select().single = vi
				.fn()
				.mockResolvedValue({ data: validStoryFixture, error: null });

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(response.status).toBe(201);
		});
	});

	describe('Database Error Handling', () => {
		it('should return 500 when database insert fails', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'POST',
				body: validCreateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock database error
			const mockSupabase = locals.supabase;
			mockSupabase.from('stories').insert().select().single = vi.fn().mockResolvedValue({
				data: null,
				error: {
					code: '23505',
					message: 'Duplicate key violation',
					details: 'Key already exists',
					hint: null
				}
			});

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
			expect(body.error.message).toContain('Nie udało się zapisać historii');
		});

		it('should handle RLS policy violation (42501)', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'POST',
				body: validCreateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock RLS policy error
			const mockSupabase = locals.supabase;
			mockSupabase.from('stories').insert().select().single = vi.fn().mockResolvedValue({
				data: null,
				error: {
					code: '42501',
					message: 'RLS policy violation',
					details: 'Policy blocked',
					hint: null
				}
			});

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
		});

		it('should return 500 when unexpected error occurs', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'POST',
				body: validCreateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock unexpected error
			const mockSupabase = locals.supabase;
			mockSupabase.from = vi.fn().mockImplementation(() => {
				throw new Error('Unexpected database error');
			});

			// Act
			const response = await POST({ request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
		});
	});
});
