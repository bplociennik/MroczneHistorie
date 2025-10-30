// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/**
			 * Supabase client instance for server-side operations
			 * Initialized in hooks.server.ts with cookie handling
			 */
			supabase: SupabaseClient;

			/**
			 * Authenticated user or null if not logged in
			 * Set by hooks.server.ts after session verification
			 */
			user: User | null;
		}
		interface PageData {
			/**
			 * User session from Supabase
			 * Available in all pages via +layout.server.ts
			 */
			session: Session | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
