import { vi } from 'vitest';
import type { StoryDTO } from '../../src/types';

/**
 * Creates a mock Supabase client for testing with full chainable support
 */
export function createMockSupabaseClient() {
	const mock: any = {
		from: vi.fn(() => mock),
		select: vi.fn(() => mock),
		insert: vi.fn(() => mock),
		update: vi.fn(() => mock),
		delete: vi.fn(() => mock),
		eq: vi.fn(() => mock),
		order: vi.fn(() => mock),
		range: vi.fn(() => Promise.resolve({ data: [], error: null })),
		single: vi.fn(() => Promise.resolve({ data: null, error: null })),
		maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
		rpc: vi.fn(() => ({
			maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
		}))
	};

	return mock;
}

/**
 * Creates mock locals object (authenticated user + Supabase client)
 */
export function createMockLocals(options?: {
	authenticated?: boolean;
	userId?: string;
	supabase?: ReturnType<typeof createMockSupabaseClient>;
}) {
	const userId = options?.userId || '550e8400-e29b-41d4-a716-446655440000';
	const authenticated = options?.authenticated !== false;

	return {
		user: authenticated ? { id: userId, email: 'test@example.com' } : null,
		supabase: options?.supabase || createMockSupabaseClient()
	};
}

/**
 * Creates a mock Request object
 */
export function createMockRequest(options?: {
	method?: string;
	body?: unknown;
	url?: string;
	searchParams?: Record<string, string>;
}) {
	const url = new URL(options?.url || 'http://localhost:5173/api/stories');

	if (options?.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	return {
		method: options?.method || 'GET',
		url,
		json: vi.fn().mockResolvedValue(options?.body || {}),
		headers: new Headers({ 'Content-Type': 'application/json' })
	} as unknown as Request;
}
