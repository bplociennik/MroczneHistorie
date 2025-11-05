import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { isValidUUID } from '../../../../types';
import type { StoryDTO, UpdateStoryCommand, ErrorDTO } from '../../../../types';

/**
 * Edit Story Page - Load Function
 *
 * @description Loads story data for editing
 * @route /stories/[id]/edit
 * @auth Required - redirects to /login if not authenticated
 *
 * @throws {302} Redirect to /login if not authenticated
 * @throws {400} Invalid UUID format
 * @throws {404} Story not found or no access (RLS)
 * @throws {500} Database error
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	// 1. Check authentication
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// 2. Validate UUID format
	if (!isValidUUID(params.id)) {
		throw error(400, 'Nieprawidłowy format identyfikatora historii');
	}

	// 3. Fetch story from database
	const { data: story, error: dbError } = await locals.supabase
		.from('stories')
		.select('*')
		.eq('id', params.id)
		.single();

	// 4. Handle errors
	if (dbError) {
		console.error('[DB_ERROR] GET story for edit failed', {
			code: dbError.code,
			message: dbError.message,
			storyId: params.id,
			userId: locals.user.id,
			timestamp: new Date().toISOString()
		});

		// PGRST116 = PostgREST "not found"
		if (dbError.code === 'PGRST116') {
			throw error(404, 'Nie znaleziono historii lub nie masz do niej dostępu');
		}

		throw error(500, 'Nie udało się załadować historii. Spróbuj ponownie później');
	}

	// 5. Additional validation (in case RLS returns null)
	if (!story) {
		throw error(404, 'Nie znaleziono historii lub nie masz do niej dostępu');
	}

	// 6. Return data
	return {
		story: story as StoryDTO
	};
};

/**
 * Edit Story Page - Server Action
 *
 * @description Handles form submission for updating a story
 * @route POST /stories/[id]/edit
 * @auth Required
 *
 * @returns {EditStoryActionData} Success or error response
 * @throws {303} Redirect to / on success
 */
export const actions: Actions = {
	default: async ({ params, request, locals, fetch }) => {
		// 1. Check authentication
		if (!locals.user) {
			return {
				success: false,
				error: {
					code: 'AUTHENTICATION_ERROR',
					message: 'Brakujący lub nieprawidłowy token uwierzytelniający'
				}
			};
		}

		// 2. Get form data
		const formData = await request.formData();
		const question = formData.get('question')?.toString().trim();
		const answer = formData.get('answer')?.toString().trim();

		// 3. Server-side validation
		// At least one field must be provided
		if (!question && !answer) {
			return {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Musisz podać przynajmniej jedno pole do aktualizacji'
				}
			};
		}

		// Validate question length if provided
		if (question !== undefined && question.length < 1) {
			return {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Pytanie musi mieć przynajmniej 1 znak',
					field: 'question'
				}
			};
		}

		// Validate answer length if provided
		if (answer !== undefined && answer.length < 1) {
			return {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Odpowiedź musi mieć przynajmniej 1 znak',
					field: 'answer'
				}
			};
		}

		// 4. Prepare payload
		const updatePayload: UpdateStoryCommand = {};
		if (question) updatePayload.question = question;
		if (answer) updatePayload.answer = answer;

		// 5. Call API endpoint
		const response = await fetch(`/api/stories/${params.id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(updatePayload)
		});

		// 6. Handle response
		if (!response.ok) {
			const errorData: ErrorDTO = await response.json();
			console.error('[API_ERROR] PATCH story failed', {
				code: errorData.error.code,
				message: errorData.error.message,
				storyId: params.id,
				userId: locals.user.id,
				timestamp: new Date().toISOString()
			});

			return {
				success: false,
				error: errorData.error
			};
		}

		// 7. Success - redirect to story detail page
		throw redirect(303, `/stories/${params.id}`);
	}
};
