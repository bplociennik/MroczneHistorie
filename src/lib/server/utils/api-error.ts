import type { ErrorCode, ErrorDTO } from '../../../types';

/**
 * Creates a standardized error response for API endpoints
 *
 * @param code - Machine-readable error code
 * @param message - Human-readable error message (Polish)
 * @param status - HTTP status code
 * @param field - Optional field name for validation errors
 * @returns Response object with error details
 *
 * @example
 * ```typescript
 * return createErrorResponse('VALIDATION_ERROR', 'Invalid UUID format', 400, 'id');
 * ```
 */
export function createErrorResponse(
	code: ErrorCode,
	message: string,
	status: number,
	field?: string
): Response {
	const body: ErrorDTO = {
		error: {
			code,
			message,
			...(field && { field })
		}
	};

	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

/**
 * Pre-defined API error responses
 *
 * Usage:
 * ```typescript
 * if (!isValidUUID(id)) {
 *   return ApiErrors.InvalidUUID();
 * }
 * ```
 */
export const ApiErrors = {
	/**
	 * 400 Bad Request - Invalid UUID format
	 */
	InvalidUUID: () =>
		createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format ID historii', 400, 'id'),

	/**
	 * 401 Unauthorized - Missing or invalid JWT token
	 */
	Unauthorized: () =>
		createErrorResponse(
			'AUTHENTICATION_ERROR',
			'Brakujący lub nieprawidłowy token uwierzytelniający',
			401
		),

	/**
	 * 404 Not Found - Story doesn't exist or user has no access
	 * (Returns same message for both cases to prevent data leakage)
	 */
	NotFound: () =>
		createErrorResponse('NOT_FOUND', 'Nie znaleziono historii lub nie masz do niej dostępu', 404),

	/**
	 * 404 Not Found - User has no stories in collection
	 * (Used specifically for /api/stories/random when collection is empty)
	 */
	NoStoriesFound: () =>
		createErrorResponse('NOT_FOUND', 'Nie masz jeszcze żadnych historii w kolekcji', 404),

	/**
	 * 500 Internal Server Error - Database error or unexpected exception
	 */
	InternalError: () =>
		createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd serwera', 500)
};