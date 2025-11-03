import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidUUID, isValidUpdateStoryCommand } from '../../../../types';
import { UpdateStorySchema } from '$lib/validation/story.validation';
import { formatValidationError } from '$lib/utils/validation';
import { ApiErrors } from '$lib/server/utils/api-error';
import type { ErrorDTO, UpdateStoryCommand } from '../../../../types';

/**
 * Get Story API Endpoint
 *
 * @route GET /api/stories/:id
 * @auth Required (JWT Bearer token via Supabase)
 *
 * @param {string} id - Story UUID (URL parameter)
 * @returns {StoryDTO} Story with all fields
 *
 * @throws {400} VALIDATION_ERROR - Invalid UUID format
 * @throws {401} AUTHENTICATION_ERROR - Missing or invalid token
 * @throws {404} NOT_FOUND - Story not found or no access (RLS)
 * @throws {500} INTERNAL_ERROR - Database error
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
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
			console.warn('[VALIDATION_ERROR] Invalid UUID format in GET', {
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

		// 3. Fetch story from database
		const { data, error } = await locals.supabase
			.from('stories')
			.select('*')
			.eq('id', id)
			.single();

		// 4. Handle database errors
		if (error) {
			// Check if "not found" (PGRST116 = PostgREST not found)
			if (error.code === 'PGRST116') {
				console.warn('[NOT_FOUND] Story not found or no access during GET', {
					storyId: id,
					userId: locals.user.id,
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
			console.error('[DB_ERROR] GET failed', {
				code: error.code,
				message: error.message,
				storyId: id,
				userId: locals.user.id,
				timestamp: new Date().toISOString()
			});

			return json(
				{
					error: {
						code: 'INTERNAL_ERROR',
						message: 'Nie udało się pobrać historii. Spróbuj ponownie później'
					}
				} satisfies ErrorDTO,
				{ status: 500 }
			);
		}

		// 5. Check if data is null (RLS blocked or not found)
		if (!data) {
			console.warn('[NOT_FOUND] Story not found or no access (RLS) during GET', {
				storyId: id,
				userId: locals.user.id,
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

		// 6. Return success response (200 OK with story data)
		return json(data, { status: 200 });
	} catch (error: unknown) {
		// 7. Handle unexpected errors
		console.error('[API_ERROR] GET /api/stories/:id', {
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined,
			storyId: params.id,
			userId: locals.user?.id,
			timestamp: new Date().toISOString()
		});

		return json(
			{
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Nie udało się pobrać historii. Spróbuj ponownie później'
				}
			} satisfies ErrorDTO,
			{ status: 500 }
		);
	}
};

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
	} catch {
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

/**
 * Delete Story API Endpoint
 *
 * @route DELETE /api/stories/:id
 * @auth Required (JWT Bearer token via Supabase)
 *
 * @param {string} id - Story UUID (URL parameter)
 * @returns {void} 204 No Content on success
 *
 * @throws {400} VALIDATION_ERROR - Invalid UUID format
 * @throws {401} AUTHENTICATION_ERROR - Missing or invalid token
 * @throws {404} NOT_FOUND - Story not found or no access (RLS)
 * @throws {500} INTERNAL_ERROR - Database error
 *
 * @description
 * Permanently deletes a story from the database. This is an irreversible operation.
 * Users can only delete their own stories (enforced by RLS policy stories_delete_own).
 * Returns 404 for both non-existent stories and stories belonging to other users
 * (prevents data leakage).
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// 1. Authentication check (handled by hooks.server.ts)
		if (!locals.user) {
			console.warn('[AUTHENTICATION_ERROR] DELETE request without valid user', {
				timestamp: new Date().toISOString()
			});
			return ApiErrors.Unauthorized();
		}

		// 2. Validate UUID format
		const { id } = params;

		if (!isValidUUID(id)) {
			console.warn('[VALIDATION_ERROR] Invalid UUID format in DELETE', {
				providedId: id,
				userId: locals.user.id,
				timestamp: new Date().toISOString()
			});
			return ApiErrors.InvalidUUID();
		}

		// 3. Execute DELETE query
		// RLS policy stories_delete_own ensures user can only delete their own stories
		const { error, count } = await locals.supabase
			.from('stories')
			.delete({ count: 'exact' })
			.eq('id', id);

		// 4. Handle database errors
		if (error) {
			console.error('[DB_ERROR] DELETE failed', {
				code: error.code,
				message: error.message,
				storyId: id,
				userId: locals.user.id,
				timestamp: new Date().toISOString()
			});
			return ApiErrors.InternalError();
		}

		// 5. Check if anything was deleted
		// count === 0 means either:
		// - Story doesn't exist, OR
		// - Story belongs to another user (RLS blocked)
		// We return 404 for both cases (security: don't reveal if story exists)
		if (count === 0) {
			console.info('[NOT_FOUND] Story not found or no access during DELETE', {
				storyId: id,
				userId: locals.user.id,
				timestamp: new Date().toISOString()
			});
			return ApiErrors.NotFound();
		}

		// 6. Success - return 204 No Content
		console.info('[SUCCESS] Story deleted', {
			storyId: id,
			userId: locals.user.id,
			timestamp: new Date().toISOString()
		});

		return new Response(null, { status: 204 });
	} catch (error: unknown) {
		// 7. Handle unexpected errors
		console.error('[API_ERROR] DELETE /api/stories/:id', {
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined,
			storyId: params.id,
			userId: locals.user?.id,
			timestamp: new Date().toISOString()
		});
		return ApiErrors.InternalError();
	}
};
