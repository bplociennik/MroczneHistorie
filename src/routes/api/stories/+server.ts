import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CreateStorySchema, ListStoriesQueryParamsSchema } from '$lib/validation/story.validation';
import { formatValidationError } from '$lib/utils/validation';
import type { ErrorDTO, StoryDTO, ListStoriesDTO } from '../../../types';

/**
 * List Stories API Endpoint
 *
 * @route GET /api/stories
 * @auth Required (JWT Bearer token via Supabase)
 *
 * @param {number} limit - Optional query param, max number of stories (1-100, default: 25)
 * @param {number} offset - Optional query param, number of stories to skip (>= 0, default: 0)
 * @returns {ListStoriesDTO} Array of user's stories with total count
 *
 * @throws {400} VALIDATION_ERROR - Invalid query parameters
 * @throws {401} AUTHENTICATION_ERROR - Missing or invalid token
 * @throws {500} INTERNAL_ERROR - Database error
 */
export const GET: RequestHandler = async ({ locals, url }) => {
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

	// 2. Parse query parameters
	const limitParam = url.searchParams.get('limit');
	const offsetParam = url.searchParams.get('offset');

	// Convert to integers (or use defaults)
	const limitRaw = limitParam ? parseInt(limitParam, 10) : 25;
	const offsetRaw = offsetParam ? parseInt(offsetParam, 10) : 0;

	// 3. Validate query params
	const validation = ListStoriesQueryParamsSchema.safeParse({
		limit: limitRaw,
		offset: offsetRaw
	});

	if (!validation.success) {
		return json(formatValidationError(validation.error), { status: 400 });
	}

	const { limit, offset } = validation.data;

	// 4. Fetch stories from database
	try {
		// Supabase uses .range(from, to) instead of .limit().offset()
		const from = offset;
		const to = offset + limit - 1;

		const { data, error } = await locals.supabase
			.from('stories')
			.select('*')
			.order('created_at', { ascending: false })
			.range(from, to);

		if (error) {
			console.error('[DB_ERROR] SELECT failed', {
				code: error.code,
				message: error.message,
				details: error.details,
				userId: locals.user.id,
				queryParams: { limit, offset },
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

		// 5. Return success response
		const response: ListStoriesDTO = {
			stories: data || [],
			total: (data || []).length
		};

		return json(response, { status: 200 });
	} catch (error: unknown) {
		// 6. Handle unexpected errors
		console.error('[API_ERROR] GET /api/stories', {
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined,
			userId: locals.user.id,
			queryParams: { limit, offset },
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
 * Create Story API Endpoint
 *
 * @route POST /api/stories
 * @auth Required (JWT Bearer token via Supabase)
 *
 * @param {CreateStoryCommand} body - Story data to save
 * @returns {StoryDTO} Created story with generated id and timestamp
 *
 * @throws {400} VALIDATION_ERROR - Invalid input parameters
 * @throws {401} AUTHENTICATION_ERROR - Missing or invalid token
 * @throws {500} INTERNAL_ERROR - Database error
 */
export const POST: RequestHandler = async ({ request, locals }) => {
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

	// 2. Parse request body
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

	// 3. Validate input using Zod schema
	const validation = CreateStorySchema.safeParse(body);
	if (!validation.success) {
		return json(formatValidationError(validation.error), { status: 400 });
	}

	const { subject, difficulty, darkness, question, answer } = validation.data;

	// 4. Insert story into database
	try {
		const { data, error } = await locals.supabase
			.from('stories')
			.insert({
				user_id: locals.user.id,
				subject,
				difficulty,
				darkness,
				question,
				answer
			})
			.select()
			.single();

		if (error) {
			console.error('[DB_ERROR] INSERT failed', {
				code: error.code,
				message: error.message,
				details: error.details,
				hint: error.hint,
				userId: locals.user.id,
				timestamp: new Date().toISOString()
			});

			// Handle specific error codes
			if (error.code === '42501') {
				// RLS policy blocked (should never happen)
				console.error('[CRITICAL] RLS policy blocked INSERT for authenticated user');
			}

			return json(
				{
					error: {
						code: 'INTERNAL_ERROR',
						message: 'Nie udało się zapisać historii. Spróbuj ponownie później'
					}
				} satisfies ErrorDTO,
				{ status: 500 }
			);
		}

		// 5. Return created story with 201 Created status
		return json(data, {
			status: 201,
			headers: {
				Location: `/api/stories/${data.id}`
			}
		});
	} catch (error: unknown) {
		// 6. Handle unexpected errors
		console.error('[API_ERROR] POST /api/stories', {
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined,
			userId: locals.user.id,
			request: {
				subject: subject.substring(0, 50),
				difficulty,
				darkness,
				questionLength: question.length,
				answerLength: answer.length
			},
			timestamp: new Date().toISOString()
		});

		return json(
			{
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Nie udało się zapisać historii. Spróbuj ponownie później'
				}
			} satisfies ErrorDTO,
			{ status: 500 }
		);
	}
};