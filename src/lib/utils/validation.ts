import { z } from 'zod';
import type { ErrorDTO } from '../../types';

/**
 * Formats Zod validation errors into standardized ErrorDTO format
 *
 * Takes the first error from the Zod error array and converts it
 * into a user-friendly error response.
 *
 * @param error - Zod validation error
 * @returns ErrorDTO with code, message, and optional field name
 *
 * @example
 * const validation = GenerateStorySchema.safeParse(body);
 * if (!validation.success) {
 *   return json(formatValidationError(validation.error), { status: 400 });
 * }
 */
export function formatValidationError(error: z.ZodError<unknown>): ErrorDTO {
	const firstError = error.issues[0];

	return {
		error: {
			code: 'VALIDATION_ERROR',
			message: firstError.message,
			field: firstError.path[0] as string
		}
	};
}