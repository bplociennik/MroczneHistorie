import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestHandlerEvent } from '@sveltejs/kit';
import { GET } from '../../../src/routes/api/stories/+server';
import { createMockLocals, createMockRequest } from '../../mocks/supabase.mock';
import { storiesListFixture } from '../../fixtures/stories.fixture';
import type { ErrorDTO, ListStoriesDTO } from '../../../src/types';

describe('GET /api/stories', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Authentication', () => {
		it('should return 401 when user is not authenticated', async () => {
			// Arrange
			const request = createMockRequest({ method: 'GET' });
			const locals = createMockLocals({ authenticated: false });

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(401);
			expect(body.error.code).toBe('AUTHENTICATION_ERROR');
			expect(body.error.message).toContain('Brakujący lub nieprawidłowy token');
		});
	});

	describe('Query Parameter Validation', () => {
		it('should use default values when no query params provided', async () => {
			// Arrange
			const request = createMockRequest({ method: 'GET' });
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database query
			const mockSupabase = locals.supabase;
			const rangeMock = vi.fn().mockResolvedValue({
				data: storiesListFixture,
				error: null
			});

			mockSupabase.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: rangeMock
			});

			// Act
			await GET({ request, locals, url: request.url } as unknown as RequestHandlerEvent);

			// Assert - Should use default limit=25, offset=0
			expect(rangeMock).toHaveBeenCalledWith(0, 24); // from=0, to=24 (25 items)
		});

		it('should return 400 when limit is 0', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'GET',
				searchParams: { limit: '0' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when limit exceeds 100', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'GET',
				searchParams: { limit: '101' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
			expect(body.error.message).toContain('100');
		});

		it('should return 400 when offset is negative', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'GET',
				searchParams: { offset: '-1' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when limit is not a number', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'GET',
				searchParams: { limit: 'abc' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});

		it('should return 400 when offset is not a number', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'GET',
				searchParams: { offset: 'xyz' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(400);
			expect(body.error.code).toBe('VALIDATION_ERROR');
		});
	});

	describe('Happy Path', () => {
		it('should return 200 with list of stories when valid request', async () => {
			// Arrange
			const request = createMockRequest({ method: 'GET' });
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database query
			const mockSupabase = locals.supabase;
			mockSupabase.from('stories').select().order().range = vi.fn().mockResolvedValue({
				data: storiesListFixture,
				error: null
			});

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);
			const body: ListStoriesDTO = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(body.stories).toEqual(storiesListFixture);
			expect(body.total).toBe(storiesListFixture.length);
		});

		it('should return empty array when user has no stories', async () => {
			// Arrange
			const request = createMockRequest({ method: 'GET' });
			const locals = createMockLocals({ authenticated: true });

			// Mock empty database query
			const mockSupabase = locals.supabase;
			mockSupabase.from('stories').select().order().range = vi.fn().mockResolvedValue({
				data: [],
				error: null
			});

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);
			const body: ListStoriesDTO = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(body.stories).toEqual([]);
			expect(body.total).toBe(0);
		});

		it('should handle custom limit parameter', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'GET',
				searchParams: { limit: '10' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database query
			const mockSupabase = locals.supabase;
			const rangeMock = vi.fn().mockResolvedValue({
				data: storiesListFixture.slice(0, 10),
				error: null
			});

			mockSupabase.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: rangeMock
			});

			// Act
			await GET({ request, locals, url: request.url } as unknown as RequestHandlerEvent);

			// Assert - Should use limit=10, offset=0
			expect(rangeMock).toHaveBeenCalledWith(0, 9); // from=0, to=9 (10 items)
		});

		it('should handle custom offset parameter', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'GET',
				searchParams: { offset: '25' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database query
			const mockSupabase = locals.supabase;
			const rangeMock = vi.fn().mockResolvedValue({
				data: [],
				error: null
			});

			mockSupabase.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: rangeMock
			});

			// Act
			await GET({ request, locals, url: request.url } as unknown as RequestHandlerEvent);

			// Assert - Should use default limit=25, offset=25
			expect(rangeMock).toHaveBeenCalledWith(25, 49); // from=25, to=49 (25 items)
		});

		it('should handle both limit and offset parameters', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'GET',
				searchParams: { limit: '50', offset: '100' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database query
			const mockSupabase = locals.supabase;
			const rangeMock = vi.fn().mockResolvedValue({
				data: [],
				error: null
			});

			mockSupabase.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: rangeMock
			});

			// Act
			await GET({ request, locals, url: request.url } as unknown as RequestHandlerEvent);

			// Assert - Should use limit=50, offset=100
			expect(rangeMock).toHaveBeenCalledWith(100, 149); // from=100, to=149 (50 items)
		});

		it('should order stories by created_at DESC', async () => {
			// Arrange
			const request = createMockRequest({ method: 'GET' });
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database query
			const mockSupabase = locals.supabase;
			const orderMock = vi.fn().mockReturnThis();
			const rangeMock = vi.fn().mockResolvedValue({
				data: storiesListFixture,
				error: null
			});

			mockSupabase.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				order: orderMock,
				range: rangeMock
			});

			orderMock.mockReturnValue({
				range: rangeMock
			});

			// Act
			await GET({ request, locals, url: request.url } as unknown as RequestHandlerEvent);

			// Assert
			expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
		});
	});

	describe('Database Error Handling', () => {
		it('should return 500 when database query fails', async () => {
			// Arrange
			const request = createMockRequest({ method: 'GET' });
			const locals = createMockLocals({ authenticated: true });

			// Mock database error
			const mockSupabase = locals.supabase;
			mockSupabase.from('stories').select().order().range = vi.fn().mockResolvedValue({
				data: null,
				error: {
					code: '42P01',
					message: 'Table does not exist',
					details: 'Relation "stories" does not exist'
				}
			});

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
			expect(body.error.message).toContain('Nie udało się pobrać historii');
		});

		it('should return 500 when unexpected error occurs', async () => {
			// Arrange
			const request = createMockRequest({ method: 'GET' });
			const locals = createMockLocals({ authenticated: true });

			// Mock unexpected error
			const mockSupabase = locals.supabase;
			mockSupabase.from = vi.fn().mockImplementation(() => {
				throw new Error('Unexpected error');
			});

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);
			const body: ErrorDTO = await response.json();

			// Assert
			expect(response.status).toBe(500);
			expect(body.error.code).toBe('INTERNAL_ERROR');
		});
	});

	describe('Edge Cases', () => {
		it('should handle maximum limit (100)', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'GET',
				searchParams: { limit: '100' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database query
			const mockSupabase = locals.supabase;
			const rangeMock = vi.fn().mockResolvedValue({
				data: [],
				error: null
			});

			mockSupabase.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: rangeMock
			});

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);

			// Assert
			expect(response.status).toBe(200);
			expect(rangeMock).toHaveBeenCalledWith(0, 99); // from=0, to=99 (100 items)
		});

		it('should handle large offset value', async () => {
			// Arrange
			const request = createMockRequest({
				method: 'GET',
				searchParams: { offset: '10000' }
			});
			const locals = createMockLocals({ authenticated: true });

			// Mock successful database query (empty result)
			const mockSupabase = locals.supabase;
			const rangeMock = vi.fn().mockResolvedValue({
				data: [],
				error: null
			});

			mockSupabase.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: rangeMock
			});

			// Act
			const response = await GET({
				request,
				locals,
				url: request.url
			} as unknown as RequestHandlerEvent);
			const body: ListStoriesDTO = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(body.stories).toEqual([]);
			expect(rangeMock).toHaveBeenCalledWith(10000, 10024);
		});
	});
});
