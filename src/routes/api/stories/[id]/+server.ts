import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidUUID, isValidUpdateStoryCommand } from '../../../../types';
import { UpdateStorySchema } from '$lib/validation/story.validation';
import { formatValidationError } from '$lib/utils/validation';
import type { ErrorDTO, StoryDTO, UpdateStoryCommand } from '../../../../types';

/**
 * Update Story API Endpoint
 *
 * @route PATCH /api/stories/:id
 * @auth Required (JWT Bearer token via Supabase)
 *
 * @param {string} id - Story UUID (URL parameter)
 * @param {UpdateStoryCommand} body - Update data (question and/or answer)
 * @returns {StoryDTO} Updated story with all fields
 *
 * @throws {400} VALIDATION_ERROR - Invalid UUID, empty fields, no fields, or read-only field included
 * @throws {401} AUTHENTICATION_ERROR - Missing or invalid token
 * @throws {404} NOT_FOUND - Story not found or no access (RLS)
 * @throws {500} INTERNAL_ERROR - Database error
 */
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	// 1. Authentication check (handled by hooks.server.ts)
	if (!locals.user) {
		return json(
			{
				error: {
					code: 'AUTHENTICATION_ERROR',
					message: 'Brakujący lub nieprawidłowy token uwierzytelniający'
				}
			} satisfies ErrorDTO,
			{ status: 401 }
		);
	}

	// 2. Validate UUID format
	const { id } = params;

	if (!isValidUUID(id)) {
		console.warn('[VALIDATION_ERROR] Invalid UUID format', {
			providedId: id,
			userId: locals.user.id,
			timestamp: new Date().toISOString()
		});

		return json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Nieprawidłowy format identyfikatora historii',
					field: 'id'
				}
			} satisfies ErrorDTO,
			{ status: 400 }
		);
	}

	// 3. Parse request body
	let body: unknown;
	try {
		body = await request.json();
	} catch (error) {
		return json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Nieprawidłowy format JSON'
				}
			} satisfies ErrorDTO,
			{ status: 400 }
		);
	}

	// 4. Check for read-only fields
	const readOnlyFields = ['subject', 'difficulty', 'darkness', 'user_id', 'created_at', 'id'];
	const bodyKeys = Object.keys(body as object);

	for (const field of bodyKeys) {
		if (readOnlyFields.includes(field)) {
			console.warn('[SECURITY] Attempt to update read-only field', {
				field,
				userId: locals.user.id,
				storyId: id,
				timestamp: new Date().toISOString()
			});

			return json(
				{
					error: {
						code: 'VALIDATION_ERROR',
						message: `Pole '${field}' jest tylko do odczytu i nie może być aktualizowane`,
						field
					}
				} satisfies ErrorDTO,
				{ status: 400 }
			);
		}
	}

	// 5. Validate with Zod schema
	const validation = UpdateStorySchema.safeParse(body);
	if (!validation.success) {
		return json(formatValidationError(validation.error), { status: 400 });
	}

	// 6. Check at least one field provided
	if (!isValidUpdateStoryCommand(validation.data)) {
		return json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Musisz podać przynajmniej jedno pole do aktualizacji (question lub answer)'
				}
			} satisfies ErrorDTO,
			{ status: 400 }
		);
	}

	// 7. Build update object (only provided fields)
	const updateData: Partial<UpdateStoryCommand> = {};
	if (validation.data.question !== undefined) {
		updateData.question = validation.data.question;
	}
	if (validation.data.answer !== undefined) {
		updateData.answer = validation.data.answer;
	}

	// 8. Update story in database
	try {
		const { data, error } = await locals.supabase
			.from('stories')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			// Check if "not found" (PGRST116 = PostgREST not found)
			if (error.code === 'PGRST116') {
				console.warn('[NOT_FOUND] Story not found or no access during UPDATE', {
					storyId: id,
					userId: locals.user.id,
					updateFields: Object.keys(updateData),
					timestamp: new Date().toISOString()
				});

				return json(
					{
						error: {
							code: 'NOT_FOUND',
							message: 'Nie znaleziono historii lub nie masz do niej dostępu'
						}
					} satisfies ErrorDTO,
					{ status: 404 }
				);
			}

			// Other database errors
			console.error('[DB_ERROR] UPDATE failed', {
				code: error.code,
				message: error.message,
				storyId: id,
				userId: locals.user.id,
				updateData,
				timestamp: new Date().toISOString()
			});

			return json(
				{
					error: {
						code: 'INTERNAL_ERROR',
						message: 'Nie udało się zaktualizować historii. Spróbuj ponownie później'
					}
				} satisfies ErrorDTO,
				{ status: 500 }
			);
		}

		// 9. Check if data is null (RLS blocked or not found)
		if (!data) {
			console.warn('[NOT_FOUND] Story not found or no access (RLS) during UPDATE', {
				storyId: id,
				userId: locals.user.id,
				updateFields: Object.keys(updateData),
				timestamp: new Date().toISOString()
			});

			return json(
				{
					error: {
						code: 'NOT_FOUND',
						message: 'Nie znaleziono historii lub nie masz do niej dostępu'
					}
				} satisfies ErrorDTO,
				{ status: 404 }
			);
		}

		// 10. Return success response (200 OK with full StoryDTO)
		return json(data, { status: 200 });
	} catch (error: unknown) {
		// 11. Handle unexpected errors
		console.error('[API_ERROR] PATCH /api/stories/:id', {
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined,
			storyId: id,
			userId: locals.user.id,
			updateData,
			timestamp: new Date().toISOString()
		});

		return json(
			{
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Nie udało się zaktualizować historii. Spróbuj ponownie później'
				}
			} satisfies ErrorDTO,
			{ status: 500 }
		);
	}
};
