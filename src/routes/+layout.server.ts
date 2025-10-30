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
		// Get session from Supabase
		const {
			data: { session }
		} = await locals.supabase.auth.getSession();

		return {
			session
		};
	} catch (error) {
		console.error('Error loading session:', error);
		// Treat as unauthenticated if session fetch fails
		return {
			session: null
		};
	}
};
