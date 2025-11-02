import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { isValidUUID } from '../../../types';
import type { StoryDTO } from '../../../types';

/**
 * Story Details Page - Game Mode
 *
 * @description Ultra-minimalistic interface for Game Master
 * @route /stories/[id]
 * @auth Required
 *
 * @throws {400} Invalid UUID format
 * @throws {404} Story not found or no access (RLS)
 * @throws {500} Database error
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	// 1. Validate UUID format
	if (!isValidUUID(params.id)) {
		throw error(400, 'Nieprawidłowy format identyfikatora historii');
	}

	// 2. Fetch story from Supabase
	const { data: story, error: dbError } = await locals.supabase
		.from('stories')
		.select('*')
		.eq('id', params.id)
		.single();

	// 3. Handle errors
	if (dbError) {
		console.error('[DB_ERROR] GET story failed', {
			code: dbError.code,
			message: dbError.message,
			storyId: params.id,
			userId: locals.user?.id,
			timestamp: new Date().toISOString()
		});

		// PGRST116 = PostgREST "not found"
		if (dbError.code === 'PGRST116') {
			throw error(404, 'Nie znaleziono historii lub nie masz do niej dostępu');
		}

		throw error(500, 'Nie udało się pobrać historii');
	}

	// 4. Additional validation (in case RLS returns null)
	if (!story) {
		throw error(404, 'Nie znaleziono historii lub nie masz do niej dostępu');
	}

	// 5. Return data
	return {
		story: story as StoryDTO
	};
};
