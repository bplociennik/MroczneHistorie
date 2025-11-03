import type { LayoutServerLoad } from './$types';

/**
 * Server-side load function for the root layout
 *
 * Fetches the user session from Supabase and makes it available
 * to all child routes through the data prop.
 *
 * @returns Object containing the user session (or null if not authenticated)
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	try {
		// Get verified user from Supabase
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		return {
			user
		};
	} catch (error) {
		console.error('Error loading user:', error);
		// Treat as unauthenticated if user fetch fails
		return {
			user: null
		};
	}
};
