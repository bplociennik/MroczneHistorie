import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GenerateStorySchema } from '$lib/validation/story.validation';
import { formatValidationError } from '$lib/utils/validation';
import { openaiService } from '$lib/services/ai/openai.service';
import type { ErrorDTO } from '../../../../types';

/**
 * Generate Story API Endpoint
 *
 * @route POST /api/stories/generate
 * @auth Required (JWT Bearer token via Supabase)
 * @timeout 45 seconds
 *
 * @param {GenerateStoryCommand} body - Story generation parameters
 * @returns {GeneratedStoryDTO} Generated question and answer
 *
 * @throws {400} VALIDATION_ERROR - Invalid input parameters
 * @throws {401} AUTHENTICATION_ERROR - Missing or invalid token
 * @throws {408} TIMEOUT_ERROR - OpenAI API timeout
 * @throws {500} INTERNAL_ERROR - Unexpected server error
 * @throws {503} EXTERNAL_API_ERROR - OpenAI API unavailable
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
	const validation = GenerateStorySchema.safeParse(body);
	if (!validation.success) {
		return json(formatValidationError(validation.error), { status: 400 });
	}

	const { subject, difficulty, darkness } = validation.data;

	// 4. Generate story using OpenAI Service
	try {
		const generated = await openaiService.generateStory(subject, difficulty, darkness);

		// 5. Return success response
		return json(generated, { status: 200 });
	} catch (error: unknown) {
		// 6. Handle errors with detailed logging
		console.error('[API ERROR] /api/stories/generate', {
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined,
			userId: locals.user.id,
			subject,
			difficulty,
			darkness,
			timestamp: new Date().toISOString()
		});

		// Handle timeout error (408)
		if (error instanceof Error && error.name === 'TimeoutError') {
			return json(
				{
					error: {
						code: 'TIMEOUT_ERROR',
						message: 'Upłynął limit czasu generowania historii. Spróbuj ponownie'
					}
				} satisfies ErrorDTO,
				{ status: 408 }
			);
		}

		// Handle rate limit and API downtime errors (503)
		if (
			error instanceof Error &&
			(error.name === 'RateLimitError' || error.name === 'ExternalApiError')
		) {
			return json(
				{
					error: {
						code: 'EXTERNAL_API_ERROR',
						message:
							'Usługa generowania historii jest tymczasowo niedostępna. Spróbuj ponownie za chwilę'
					}
				} satisfies ErrorDTO,
				{ status: 503 }
			);
		}

		// Generic internal error (500)
		return json(
			{
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Nie udało się wygenerować historii. Spróbuj ponownie później'
				}
			} satisfies ErrorDTO,
			{ status: 500 }
		);
	}
};
