import type { PageServerLoad } from './$types';
import type { ListStoriesDTO, StoryDTO } from '../types';

export const load: PageServerLoad = async ({ locals }) => {
	// 1. Check session (available from +layout.server.ts)
	if (!locals.user) {
		// User not logged in - return empty list
		return {
			stories: [] as StoryDTO[],
			total: 0
		};
	}

	// 2. Fetch user's stories directly from Supabase
	try {
		const { data, error } = await locals.supabase
			.from('stories')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(100);

		if (error) {
			console.error('[DB_ERROR] SELECT failed', {
				code: error.code,
				message: error.message,
				details: error.details,
				userId: locals.user.id
			});

			// Return empty list in case of error
			return {
				stories: [] as StoryDTO[],
				total: 0,
				error: 'Nie udało się pobrać historii'
			};
		}

		return {
			stories: (data || []) as StoryDTO[],
			total: (data || []).length
		};
	} catch (error) {
		console.error('Error fetching stories', {
			error: error instanceof Error ? error.message : 'Unknown error',
			userId: locals.user.id
		});

		return {
			stories: [] as StoryDTO[],
			total: 0,
			error: 'Wystąpił błąd podczas ładowania historii'
		};
	}
};
