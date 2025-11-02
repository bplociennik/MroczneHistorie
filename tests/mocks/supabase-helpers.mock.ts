import { vi } from 'vitest';
import type { StoryDTO } from '../../src/types';

/**
 * Helper to create a Supabase mock that returns success for SELECT operations
 */
export function mockSupabaseSelect(data: any) {
	const mock: any = {};

	mock.select = vi.fn(() => mock);
	mock.order = vi.fn(() => mock);
	mock.range = vi.fn(() => Promise.resolve({ data, error: null }));
	mock.eq = vi.fn(() => mock);
	mock.single = vi.fn(() => Promise.resolve({ data: data?.[0] || data, error: null }));

	return {
		from: vi.fn(() => mock)
	};
}

/**
 * Helper to create a Supabase mock that returns success for INSERT operations
 */
export function mockSupabaseInsert(returnData: StoryDTO) {
	const mock: any = {};

	mock.insert = vi.fn(() => mock);
	mock.select = vi.fn(() => mock);
	mock.single = vi.fn(() => Promise.resolve({ data: returnData, error: null }));

	return {
		from: vi.fn(() => mock)
	};
}

/**
 * Helper to create a Supabase mock that returns success for UPDATE operations
 */
export function mockSupabaseUpdate(returnData: StoryDTO) {
	const mock: any = {};

	mock.update = vi.fn(() => mock);
	mock.eq = vi.fn(() => mock);
	mock.select = vi.fn(() => mock);
	mock.single = vi.fn(() => Promise.resolve({ data: returnData, error: null }));

	return {
		from: vi.fn(() => mock)
	};
}

/**
 * Helper to create a Supabase mock that returns success for DELETE operations
 */
export function mockSupabaseDelete(count: number = 1) {
	const mock: any = {};

	mock.delete = vi.fn(() => mock);
	mock.eq = vi.fn(() => Promise.resolve({ error: null, count }));

	return {
		from: vi.fn(() => mock)
	};
}

/**
 * Helper to create a Supabase mock that returns an error
 */
export function mockSupabaseError(error: any) {
	const mock: any = {};

	mock.select = vi.fn(() => mock);
	mock.insert = vi.fn(() => mock);
	mock.update = vi.fn(() => mock);
	mock.delete = vi.fn(() => mock);
	mock.eq = vi.fn(() => mock);
	mock.order = vi.fn(() => mock);
	mock.range = vi.fn(() => Promise.resolve({ data: null, error }));
	mock.single = vi.fn(() => Promise.resolve({ data: null, error }));

	return {
		from: vi.fn(() => mock)
	};
}

/**
 * Helper to create a Supabase mock for RPC calls
 */
export function mockSupabaseRpc(data: any = null, error: any = null) {
	return {
		rpc: vi.fn(() => ({
			maybeSingle: vi.fn(() => Promise.resolve({ data, error }))
		}))
	};
}
