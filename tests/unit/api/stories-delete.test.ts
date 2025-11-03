import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestHandlerEvent } from '@sveltejs/kit';
import { DELETE } from '../../../src/routes/api/stories/[id]/+server';
import { createMockLocals } from '../../mocks/supabase.mock';
import { validStoryFixture, invalidUUIDs, nonExistentUUID } from '../../fixtures/stories.fixture';
import type { ErrorDTO } from '../../../src/types';

describe('DELETE /api/stories/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Authentication', () => {
		it('should return 401 when user is not authenticated', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const locals = createMockLocals({ authenticated: false });

			// Act
			const response = await DELETE({ params, locals } as unknown as RequestHandlerEvent);
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
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await DELETE({ params, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
			expect(body.error.message).toContain('Nieprawidłowy format');
		});
	});

	describe('Happy Path', () => {
		it('should return 204 No Content when story is successfully deleted', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database delete
			const mockSupabase = locals.supabase;

			mockSupabase.from = vi.fn().mockReturnValue({
				delete: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: null,
						count: 1
					})
				})
			});

			// Act
			const response = await DELETE({ params, locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(response.status).toBe(204);
			expect(response.body).toBeNull();
		});

		it('should call delete with count: exact', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database delete
			const mockSupabase = locals.supabase;
			const deleteMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					error: null,
					count: 1
				})
			});

			mockSupabase.from = vi.fn().mockReturnValue({
				delete: deleteMock
			});

			// Act
			await DELETE({ params, locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(deleteMock).toHaveBeenCalledWith({ count: 'exact' });
		});

		it('should filter by story id', async () => {
			// Arrange
			const storyId = validStoryFixture.id;
			const params = { id: storyId };
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database delete
			const mockSupabase = locals.supabase;
			const eqMock = vi.fn().mockResolvedValue({
				error: null,
				count: 1
			});

			const deleteMock = vi.fn().mockReturnValue({
				eq: eqMock
			});

			mockSupabase.from = vi.fn().mockReturnValue({
				delete: deleteMock
			});

			// Act
			await DELETE({ params, locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(eqMock).toHaveBeenCalledWith('id', storyId);
		});
	});

	describe('Not Found / RLS', () => {
		it('should return 404 when story does not exist', async () => {
			// Arrange
			const params = { id: nonExistentUUID };
			const locals = createMockLocals({ authenticated: true });

			// Mock delete with count 0 (not found)
			const mockSupabase = locals.supabase;
			mockSupabase.from = vi.fn().mockReturnValue({
				delete: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: null,
						count: 0
					})
				})
			});

			// Act
			const response = await DELETE({ params, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(404);
			expect(body.error.code).toBe('NOT_FOUND');
			expect(body.error.message).toContain('Nie znaleziono historii');
		});

		it('should return 404 when RLS blocks delete (story belongs to another user)', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const locals = createMockLocals({ authenticated: true });

			// Mock delete with count 0 (RLS blocked)
			const mockSupabase = locals.supabase;
			mockSupabase.from = vi.fn().mockReturnValue({
				delete: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: null,
						count: 0
					})
				})
			});

			// Act
			const response = await DELETE({ params, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(404);
			expect(body.error.code).toBe('NOT_FOUND');
		});
	});

	describe('Database Error Handling', () => {
		it('should return 500 when database delete fails', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const locals = createMockLocals({ authenticated: true });

			// Mock database error
			const mockSupabase = locals.supabase;
			mockSupabase.from = vi.fn().mockReturnValue({
				delete: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: {
							code: '23503',
							message: 'Foreign key violation'
						},
						count: null
					})
				})
			});

			// Act
			const response = await DELETE({ params, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
		});

		it('should return 500 when unexpected error occurs', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const locals = createMockLocals({ authenticated: true });

			// Mock unexpected error
			const mockSupabase = locals.supabase;
			mockSupabase.from = vi.fn().mockImplementation(() => {
				throw new Error('Unexpected database error');
			});

			// Act
			const response = await DELETE({ params, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
		});
	});

	describe('Logging', () => {
		it('should log success when story is deleted', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const userId = '00000000-0000-0000-0000-000000000123';
			const locals = createMockLocals({ authenticated: true, userId });

			// Spy on console.info
			const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

			// Mock successful database delete
			const mockSupabase = locals.supabase;
			mockSupabase.from = vi.fn().mockReturnValue({
				delete: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: null,
						count: 1
					})
				})
			});

			// Act
			await DELETE({ params, locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(consoleInfoSpy).toHaveBeenCalledWith(
				'[SUCCESS] Story deleted',
				expect.objectContaining({
					storyId: validStoryFixture.id,
					userId: userId
				})
			);

			// Cleanup
			consoleInfoSpy.mockRestore();
		});

		it('should log not found when story does not exist', async () => {
			// Arrange
			const params = { id: nonExistentUUID };
			const userId = '00000000-0000-0000-0000-000000000123';
			const locals = createMockLocals({ authenticated: true, userId });

			// Spy on console.info
			const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

			// Mock delete with count 0
			const mockSupabase = locals.supabase;
			mockSupabase.from = vi.fn().mockReturnValue({
				delete: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: null,
						count: 0
					})
				})
			});

			// Act
			await DELETE({ params, locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(consoleInfoSpy).toHaveBeenCalledWith(
				'[NOT_FOUND] Story not found or no access during DELETE',
				expect.objectContaining({
					storyId: nonExistentUUID,
					userId: userId
				})
			);

			// Cleanup
			consoleInfoSpy.mockRestore();
		});

		it('should log error when database delete fails', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const userId = '00000000-0000-0000-0000-000000000123';
			const locals = createMockLocals({ authenticated: true, userId });

			// Spy on console.error
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Mock database error
			const mockSupabase = locals.supabase;
			mockSupabase.from = vi.fn().mockReturnValue({
				delete: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: {
							code: '23503',
							message: 'Foreign key violation'
						},
						count: null
					})
				})
			});

			// Act
			await DELETE({ params, locals } as unknown as RequestHandlerEvent);

			// Assert
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[DB_ERROR] DELETE failed',
				expect.objectContaining({
					code: '23503',
					storyId: validStoryFixture.id,
					userId: userId
				})
			);

			// Cleanup
			consoleErrorSpy.mockRestore();
		});
	});

	describe('RLS Security', () => {
		it('should not reveal if story exists when user has no access', async () => {
			// Arrange
			const params = { id: validStoryFixture.id };
			const locals = createMockLocals({ authenticated: true, userId: 'different-user-id' });

			// Mock delete with count 0 (RLS blocked)
			const mockSupabase = locals.supabase;
			mockSupabase.from = vi.fn().mockReturnValue({
				delete: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: null,
						count: 0
					})
				})
			});

			// Act
			const response = await DELETE({ params, locals } as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			// Should return same 404 message for both "doesn't exist" and "no access"
			// to prevent data leakage
			expect(response.status).toBe(404);
			expect(body.error.code).toBe('NOT_FOUND');
			expect(body.error.message).toContain('Nie znaleziono historii');
		});
	});
});
