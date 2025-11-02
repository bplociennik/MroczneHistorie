import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestHandlerEvent } from '@sveltejs/kit';
import { PATCH } from '../../../src/routes/api/stories/[id]/+server';
import { createMockLocals, createMockRequest } from '../../mocks/supabase.mock';
import {
	validUpdateCommand,
	validStoryFixture,
	invalidUUIDs,
	nonExistentUUID
} from '../../fixtures/stories.fixture';
import type { ErrorDTO, StoryDTO } from '../../../src/types';

describe('PATCH /api/stories/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Authentication', () => {
		it('should return 401 when user is not authenticated', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const request = createMockRequest({
				method: 'PATCH',
				body: validUpdateCommand
			});
			const locals = createMockLocals({ authenticated: false });

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(401);
			expect(body.error.code).toBe('AUTHENTICATION_ERROR');
			expect(body.error.message).toContain('Brakujący lub nieprawidłowy token');
		});
	});

	describe('UUID Validation', () => {
		it.each(invalidUUIDs)('should return 400 when UUID is invalid: %s', async (invalidUUID) => {
			// Arrange
			const params = { id: invalidUUID };
			const request = createMockRequest({
				method: 'PATCH',
				body: validUpdateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
			expect(body.error.message).toContain('Nieprawidłowy format');
			expect(body.error.field).toBe('id');
		});
	});

	describe('Request Body Parsing', () => {
		it('should return 400 when JSON is invalid', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const request = createMockRequest({ method: 'PATCH' });
			request.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
			expect(body.error.message).toBe('Nieprawidłowy format JSON');
		});
	});

	describe('Read-Only Fields Protection', () => {
		const readOnlyFields = ['subject', 'difficulty', 'darkness', 'user_id', 'created_at', 'id'];

		it.each(readOnlyFields)(
			'should return 400 when trying to update read-only field: %s',
			async (field) => {
				// Arrange
				const params = { id: validStoryFixture.id };
				const invalidData = { [field]: 'new value' };
				const request = createMockRequest({
					method: 'PATCH',
					body: invalidData
				});
				const locals = createMockLocals({ authenticated: true });

				// Act
				const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
				const body: ErrorDTO = await response.json();

				// Assert
				expect(response.status).toBe(400);
				expect(body.error.code).toBe('VALIDATION_ERROR');
				expect(body.error.message).toContain('tylko do odczytu');
				expect(body.error.field).toBe(field);
			}
		);
	});

	describe('Validation', () => {
		it('should return 400 when no fields are provided', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const request = createMockRequest({
				method: 'PATCH',
				body: {}
			});
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
			expect(body.error.message).toContain('przynajmniej jedno pole');
		});

		it('should return 400 when question is empty string', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const request = createMockRequest({
				method: 'PATCH',
				body: { question: '' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when answer is empty string', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const request = createMockRequest({
				method: 'PATCH',
				body: { answer: '' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should trim whitespace from question', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const request = createMockRequest({
				method: 'PATCH',
				body: { question: '  Test question  ' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database update
			const mockSupabase = locals.supabase;
			mockSupabase.from('stories').update().eq().select().single = vi
				.fn()
				.mockResolvedValue({ data: validStoryFixture, error: null });

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(response.status).toBe(200);
		});
	});

	describe('Happy Path', () => {
		it('should return 200 with updated story when updating question only', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const updateData = { question: 'Updated question' };
			const request = createMockRequest({
				method: 'PATCH',
				body: updateData
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database update
			const updatedStory = { ...validStoryFixture, question: 'Updated question' };
			const mockSupabase = locals.supabase;
			const singleMock = vi.fn().mockResolvedValue({ data: updatedStory, error: null });
			const selectMock = vi.fn().mockReturnValue({ single: singleMock });
			const eqMock = vi.fn().mockReturnValue({ select: selectMock });
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

			mockSupabase.from = vi.fn().mockReturnValue({
				update: updateMock
			});

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: StoryDTO = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(body.question).toBe('Updated question');
			expect(updateMock).toHaveBeenCalledWith({ question: 'Updated question' });
		});

		it('should return 200 with updated story when updating answer only', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const updateData = { answer: 'Updated answer' };
			const request = createMockRequest({
				method: 'PATCH',
				body: updateData
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database update
			const updatedStory = { ...validStoryFixture, answer: 'Updated answer' };
			const mockSupabase = locals.supabase;
			const singleMock = vi.fn().mockResolvedValue({ data: updatedStory, error: null });
			const selectMock = vi.fn().mockReturnValue({ single: singleMock });
			const eqMock = vi.fn().mockReturnValue({ select: selectMock });
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

			mockSupabase.from = vi.fn().mockReturnValue({
				update: updateMock
			});

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: StoryDTO = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(body.answer).toBe('Updated answer');
			expect(updateMock).toHaveBeenCalledWith({ answer: 'Updated answer' });
		});

		it('should return 200 with updated story when updating both question and answer', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const request = createMockRequest({
				method: 'PATCH',
				body: validUpdateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database update
			const updatedStory = {
				...validStoryFixture,
				question: validUpdateCommand.question,
				answer: validUpdateCommand.answer
			};
			const mockSupabase = locals.supabase;
			const singleMock = vi.fn().mockResolvedValue({ data: updatedStory, error: null });
			const selectMock = vi.fn().mockReturnValue({ single: singleMock });
			const eqMock = vi.fn().mockReturnValue({ select: selectMock });
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

			mockSupabase.from = vi.fn().mockReturnValue({
				update: updateMock
			});

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: StoryDTO = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(body.question).toBe(validUpdateCommand.question);
			expect(body.answer).toBe(validUpdateCommand.answer);
		});
	});

	describe('Not Found / RLS', () => {
		it('should return 404 when story does not exist', async () => {
			// Arrange
			const params = { id: nonExistentUUID };
			const request = createMockRequest({
				method: 'PATCH',
				body: validUpdateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock PGRST116 error (not found)
			const mockSupabase = locals.supabase;
			mockSupabase.from('stories').update().eq().select().single = vi.fn().mockResolvedValue({
				data: null,
				error: {
					code: 'PGRST116',
					message: 'Not found'
				}
			});

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(404);
			expect(body.error.code).toBe('NOT_FOUND');
			expect(body.error.message).toContain('Nie znaleziono historii');
		});

		it('should return 404 when data is null (RLS blocked)', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const request = createMockRequest({
				method: 'PATCH',
				body: validUpdateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful query but null data (RLS)
			const mockSupabase = locals.supabase;
			const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });
			const selectMock = vi.fn().mockReturnValue({ single: singleMock });
			const eqMock = vi.fn().mockReturnValue({ select: selectMock });
			const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

			mockSupabase.from = vi.fn().mockReturnValue({
				update: updateMock
			});

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(404);
			expect(body.error.code).toBe('NOT_FOUND');
		});
	});

	describe('Database Error Handling', () => {
		it('should return 500 when database update fails', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const request = createMockRequest({
				method: 'PATCH',
				body: validUpdateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock database error
			const mockSupabase = locals.supabase;
			mockSupabase.from('stories').update().eq().select().single = vi.fn().mockResolvedValue({
				data: null,
				error: {
					code: '23505',
					message: 'Database error'
				}
			});

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
			expect(body.error.message).toContain('Nie udało się zaktualizować historii');
		});

		it('should return 500 when unexpected error occurs', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const request = createMockRequest({
				method: 'PATCH',
				body: validUpdateCommand
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock unexpected error
			const mockSupabase = locals.supabase;
			mockSupabase.from = vi.fn().mockImplementation(() => {
				throw new Error('Unexpected error');
			});

			// Act
			const response = await PATCH({ params, request, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
		});
	});
});
