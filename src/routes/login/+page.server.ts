import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Guard: logged in users → redirect to home
	if (locals.user) {
		throw redirect(303, '/');
	}

	return {};
};

export const actions: Actions = {
	login: async ({ request, locals }) => {
		try {
			// 1. Parse form data
			const formData = await request.formData();
			const email = formData.get('email') as string;
			const password = formData.get('password') as string;

			// 2. Basic validation
			if (!email || !email.includes('@')) {
				return fail(400, {
					email,
					error: undefined,
					errors: {
						email: 'Podaj prawidłowy adres email',
						password: undefined
					}
				});
			}

			if (!password || password.length < 6) {
				return fail(400, {
					email,
					error: undefined,
					errors: {
						email: undefined,
						password: 'Hasło musi mieć minimum 6 znaków'
					}
				});
			}

			// 3. Call Supabase Auth
			const { error } = await locals.supabase.auth.signInWithPassword({
				email,
				password
			});

			// 4. Handle errors
			if (error) {
				console.error('Login error:', {
					message: error.message,
					email,
					timestamp: new Date().toISOString()
				});

				// Map Supabase errors to Polish user-friendly messages
				const errorMessages: Record<string, string> = {
					'Invalid login credentials': 'Nieprawidłowy email lub hasło',
					'Email not confirmed': 'Email nie został potwierdzony. Sprawdź swoją skrzynkę',
					'User not found': 'Nie znaleziono użytkownika z tym adresem email',
					'Too many requests': 'Zbyt wiele prób logowania. Spróbuj za kilka minut'
				};

				return fail(401, {
					email,
					error: errorMessages[error.message] || 'Nie udało się zalogować. Spróbuj ponownie'
				});
			}

			// 5. Success - Supabase sets cookie automatically
			throw redirect(303, '/');
		} catch (error) {
			// Re-throw redirect (SvelteKit redirects have status and location properties)
			if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
				throw error;
			}

			console.error('Login action unexpected error:', error);
			return fail(500, {
				error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie'
			});
		}
	}
};
