import type { RequestHandler } from './$types';
import type { StoryDTO } from '../../../../types';
import { ApiErrors } from '$lib/server/utils/api-error';

/**
 * Get Random Story API Endpoint
 *
 * @route GET /api/stories/random
 * @auth Required (JWT Bearer token via Supabase)
 *
 * @returns {200} StoryDTO - Random story from user's collection
 *
 * @throws {401} AUTHENTICATION_ERROR - Missing or invalid token
 * @throws {404} NOT_FOUND - User has no stories in collection
 * @throws {500} INTERNAL_ERROR - Database error or unexpected exception
 *
 * Security:
 * - Protected by RLS policy 'stories_select_own' (user can only read their own stories)
 * - PostgreSQL function `get_random_story()` uses auth.uid() for filtering
 * - Returns 404 when user has empty collection (no data leakage)
 */
export const GET: RequestHandler = async ({ locals }) => {
	try {
		// 1. Authentication check (handled by hooks.server.ts)
		if (!locals.user) {
			return ApiErrors.Unauthorized();
		}

		// 2. Call PostgreSQL function for random story selection
		// This function uses ORDER BY RANDOM() with RLS enforcement
		const { data, error } = await locals.supabase.rpc('get_random_story').maybeSingle();

		// 3. Handle database errors
		if (error) {
			// Log unexpected database errors
			console.error('[API ERROR] GET /api/stories/random - Supabase error', {
				error: error.message,
				code: error.code,
				details: error.details,
				hint: error.hint,
				userId: locals.user.id,
				timestamp: new Date().toISOString()
			});
			return ApiErrors.InternalError();
		}

		// 4. Check if user has any stories
		// data will be null if get_random_story() returned 0 rows
		if (!data) {
			return ApiErrors.NoStoriesFound();
		}

		// 5. Success - return random story as StoryDTO
		const story: StoryDTO = {
			id: data.id,
			user_id: data.user_id,
			subject: data.subject,
			difficulty: data.difficulty,
			darkness: data.darkness,
			question: data.question,
			answer: data.answer,
			created_at: data.created_at
		};

		return new Response(JSON.stringify(story), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		// Unexpected error - log and return 500
		console.error('[API ERROR] GET /api/stories/random - Unexpected error', {
			error: err instanceof Error ? err.message : 'Unknown error',
			stack: err instanceof Error ? err.stack : undefined,
			userId: locals.user?.id,
			timestamp: new Date().toISOString()
		});
		return ApiErrors.InternalError();
	}
};
