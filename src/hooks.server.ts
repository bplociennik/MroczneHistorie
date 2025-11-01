import type { Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

/**
 * Global SvelteKit handle for server-side authentication
 *
 * This middleware runs on every request and:
 * 1. Initializes Supabase client with cookie handling
 * 2. Retrieves the authenticated user session
 * 3. Makes user and supabase client available in event.locals
 *
 * The authenticated user (or null) is then accessible in:
 * - API routes via locals.user
 * - Server-side load functions via locals.user
 * - Form actions via locals.user
 *
 * IMPORTANT: For API routes, we use TWO separate clients:
 * 1. Service Role client - ONLY for auth.getUser() verification
 * 2. Authenticated client (ANON_KEY + user token) - for ALL database queries (RLS enforced!)
 *
 * This ensures Row Level Security is ALWAYS enforced on database operations.
 *
 * @see src/app.d.ts for type definitions
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Check if this is an API route
	const isApiRoute = event.url.pathname.startsWith('/api/');

	if (isApiRoute) {
		// Create Supabase client with cookie handling (works for both Bearer and cookie auth)
		event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			cookies: {
				get: (key) => event.cookies.get(key),
				set: (key, value, options) => {
					event.cookies.set(key, value, { ...options, path: '/' });
				},
				remove: (key, options) => {
					event.cookies.delete(key, { ...options, path: '/' });
				}
			}
		});

		// Extract Bearer token from Authorization header
		const authHeader = event.request.headers.get('authorization');
		const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

		if (token) {
			// External API call with Bearer token - verify using Service Role client
			const serviceRoleClient = createServerClient(
				PUBLIC_SUPABASE_URL,
				SUPABASE_SERVICE_ROLE_KEY,
				{
					cookies: {
						get: (key) => event.cookies.get(key),
						set: (key, value, options) => {
							event.cookies.set(key, value, { ...options, path: '/' });
						},
						remove: (key, options) => {
							event.cookies.delete(key, { ...options, path: '/' });
						}
					}
				}
			);
			const { data } = await serviceRoleClient.auth.getUser(token);
			event.locals.user = data.user ?? null;
		} else {
			// Internal server-side fetch - use cookie-based session from ANON client
			const {
				data: { session }
			} = await event.locals.supabase.auth.getSession();
			event.locals.user = session?.user ?? null;
		}
	} else {
		// For browser routes: Use Anon client with cookie-based auth
		event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			cookies: {
				get: (key) => event.cookies.get(key),
				set: (key, value, options) => {
					event.cookies.set(key, value, { ...options, path: '/' });
				},
				remove: (key, options) => {
					event.cookies.delete(key, { ...options, path: '/' });
				}
			}
		});

		// Get user from session
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		event.locals.user = session?.user ?? null;
	}

	return resolve(event);
};