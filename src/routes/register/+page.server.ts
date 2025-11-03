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
	default: async ({ request, locals }) => {
		try {
			// 1. Parse form data
			const formData = await request.formData();
			const email = formData.get('email') as string;
			const password = formData.get('password') as string;
			const confirmPassword = formData.get('confirmPassword') as string;

			// 2. Server-side validation
			if (!email || !password || !confirmPassword) {
				return fail(400, {
					email,
					error: 'Wszystkie pola są wymagane',
					errors: undefined
				});
			}

			// Email format validation
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return fail(400, {
					email,
					error: undefined,
					errors: {
						email: 'Podaj prawidłowy adres email',
						password: undefined
					}
				});
			}

			// Password length validation (minimum 8 characters as per plan)
			if (password.length < 8) {
				return fail(400, {
					email,
					error: undefined,
					errors: {
						email: undefined,
						password: 'Hasło musi mieć minimum 8 znaków'
					}
				});
			}

			// Password match validation
			if (password !== confirmPassword) {
				return fail(400, {
					email,
					error: 'Hasła nie pasują',
					errors: undefined
				});
			}

			// 3. Attempt registration with Supabase Auth
			const { data, error } = await locals.supabase.auth.signUp({
				email,
				password
			});

			// 4. Handle Supabase errors
			if (error) {
				console.error('[AUTH_ERROR] Registration failed', {
					code: error.status,
					message: error.message,
					email,
					timestamp: new Date().toISOString()
				});

				// Map Supabase errors to Polish user-friendly messages
				let errorMessage = 'Nie udało się zarejestrować. Spróbuj ponownie później';

				if (
					error.message.includes('already registered') ||
					error.message.includes('already exists')
				) {
					errorMessage = 'Ten adres email jest już zarejestrowany';
				} else if (error.message.includes('Password should be')) {
					errorMessage = 'Hasło jest zbyt słabe. Użyj silniejszego hasła';
				} else if (error.status === 429) {
					errorMessage = 'Zbyt wiele prób rejestracji. Spróbuj ponownie za kilka minut';
				}

				return fail(error.status || 400, {
					email,
					error: errorMessage,
					errors: undefined
				});
			}

			// 5. Check if user was created
			if (!data.user) {
				console.error('[AUTH_ERROR] No user returned after signUp', {
					email,
					timestamp: new Date().toISOString()
				});

				return fail(500, {
					email,
					error: 'Nie udało się utworzyć konta. Spróbuj ponownie później',
					errors: undefined
				});
			}

			// 6. Success - user is automatically logged in by Supabase
			console.info('[SUCCESS] User registered and logged in', {
				userId: data.user.id,
				email: data.user.email,
				timestamp: new Date().toISOString()
			});

			// 7. Redirect to home page (US 1.5)
			throw redirect(303, '/');
		} catch (error) {
			// Re-throw redirect (SvelteKit redirects have status and location properties)
			if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
				throw error;
			}

			// Handle unexpected errors
			console.error('[UNEXPECTED_ERROR] Registration process failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
				timestamp: new Date().toISOString()
			});

			return fail(500, {
				error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później',
				errors: undefined
			});
		}
	}
};
