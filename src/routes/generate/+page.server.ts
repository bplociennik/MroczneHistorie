import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import type { ErrorDTO } from '../../types';

export const load: PageServerLoad = async ({ locals }) => {
	// Guard: only authenticated users can access this page
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {};
};

/**
 * Helper function to map API error status codes to user-friendly messages
 */
function mapErrorMessage(status: number, errorData: ErrorDTO): string {
	const errorMessages: Record<number, string> = {
		400: 'Nieprawidłowe dane formularza',
		401: 'Sesja wygasła. Zaloguj się ponownie',
		408: 'Przekroczono limit czasu (45s). Spróbuj ponownie',
		500: 'Błąd serwera. Spróbuj ponownie później',
		503: 'Usługa AI jest tymczasowo niedostępna. Spróbuj za chwilę'
	};

	return errorMessages[status] || errorData.error.message;
}

export const actions: Actions = {
	/**
	 * Action: Generate a new story using AI
	 * POST /generate?/generate
	 */
	generate: async ({ request, locals, fetch }) => {
		if (!locals.user) {
			return fail(401, {
				error: 'Musisz być zalogowany aby generować historie'
			});
		}

		try {
			const formData = await request.formData();
			const subject = formData.get('subject') as string;
			const difficulty = parseInt(formData.get('difficulty') as string, 10);
			const darkness = parseInt(formData.get('darkness') as string, 10);

			// Basic validation (backend also validates)
			if (!subject || subject.length > 150 || subject.length < 1) {
				return fail(400, {
					formData: { subject, difficulty, darkness },
					errors: {
						subject: 'Temat jest wymagany i musi mieć od 1 do 150 znaków'
					}
				});
			}

			if (![1, 2, 3].includes(difficulty) || ![1, 2, 3].includes(darkness)) {
				return fail(400, {
					formData: { subject, difficulty, darkness },
					error: 'Nieprawidłowe wartości trudności lub mroczności'
				});
			}

			// Call API with 45s timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 45000);

			try {
				const response = await fetch('/api/stories/generate', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						subject,
						difficulty,
						darkness
					}),
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					const errorData: ErrorDTO = await response.json();

					return fail(response.status, {
						formData: { subject, difficulty, darkness },
						error: mapErrorMessage(response.status, errorData)
					});
				}

				const generatedStory = await response.json();

				// Success - return generated story and form data
				return {
					generatedStory,
					formData: { subject, difficulty, darkness }
				};
			} catch (fetchError) {
				clearTimeout(timeoutId);

				// Timeout error
				if (fetchError instanceof Error && fetchError.name === 'AbortError') {
					return fail(408, {
						formData: { subject, difficulty, darkness },
						error: 'Przekroczono limit czasu (45s). Spróbuj ponownie'
					});
				}

				throw fetchError;
			}
		} catch (error) {
			console.error('Generate action error:', error);
			return fail(500, {
				error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie'
			});
		}
	},

	/**
	 * Action: Save generated story to database
	 * POST /generate?/save
	 */
	save: async ({ request, locals, fetch }) => {
		if (!locals.user) {
			return fail(401, {
				error: 'Musisz być zalogowany aby zapisać historię'
			});
		}

		try {
			const formData = await request.formData();
			const subject = formData.get('subject') as string;
			const difficulty = parseInt(formData.get('difficulty') as string, 10);
			const darkness = parseInt(formData.get('darkness') as string, 10);
			const question = formData.get('question') as string;
			const answer = formData.get('answer') as string;

			console.log('[SAVE ACTION] Received data:', {
				subject: subject?.substring(0, 50),
				difficulty,
				darkness,
				questionLength: question?.length,
				answerLength: answer?.length,
				hasUser: !!locals.user
			});

			// Basic validation
			if (!subject || !question || !answer) {
				return fail(400, {
					error: 'Brakujące dane historii'
				});
			}

			// Call API
			const response = await fetch('/api/stories', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					subject,
					difficulty,
					darkness,
					question,
					answer
				})
			});

			console.log('[SAVE ACTION] API Response:', {
				status: response.status,
				ok: response.ok
			});

			if (!response.ok) {
				const errorData: ErrorDTO = await response.json();
				console.error('[SAVE ACTION] API Error:', errorData);

				return fail(response.status, {
					error: errorData.error.message || 'Nie udało się zapisać historii'
				});
			}

			// Success - redirect to story list
			throw redirect(303, '/');
		} catch (error) {
			// Re-throw redirect (SvelteKit redirects have status property in range 300-399)
			if (
				error &&
				typeof error === 'object' &&
				'status' in error &&
				typeof error.status === 'number' &&
				error.status >= 300 &&
				error.status < 400
			) {
				throw error;
			}

			console.error('[SAVE ACTION] Unexpected error:', error);
			console.error('[SAVE ACTION] Error details:', {
				message: error instanceof Error ? error.message : 'Unknown',
				stack: error instanceof Error ? error.stack : undefined
			});
			return fail(500, {
				error: 'Wystąpił nieoczekiwany błąd podczas zapisywania'
			});
		}
	}
};
