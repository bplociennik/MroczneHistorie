import { z } from 'zod';

/**
 * Validation schema for POST /api/stories/generate
 *
 * Validates input parameters for story generation:
 * - subject: Required string, 1-150 characters
 * - difficulty: Required integer, 1-3
 * - darkness: Required integer, 1-3
 */
export const GenerateStorySchema = z.object({
	subject: z
		.string({ message: 'Temat musi być tekstem' })
		.min(1, { message: 'Temat jest wymagany i musi zawierać od 1 do 150 znaków' })
		.max(150, { message: 'Temat nie może przekraczać 150 znaków' })
		.trim(),

	difficulty: z
		.number({ message: 'Poziom trudności musi być liczbą' })
		.int({ message: 'Poziom trudności musi być liczbą całkowitą od 1 do 3' })
		.min(1, { message: 'Poziom trudności musi być od 1 do 3' })
		.max(3, { message: 'Poziom trudności musi być od 1 do 3' }),

	darkness: z
		.number({ message: 'Poziom mroczności musi być liczbą' })
		.int({ message: 'Poziom mroczności musi być liczbą całkowitą od 1 do 3' })
		.min(1, { message: 'Poziom mroczności musi być od 1 do 3' })
		.max(3, { message: 'Poziom mroczności musi być od 1 do 3' })
});

/**
 * TypeScript type inferred from Zod schema
 */
export type ValidatedGenerateStoryCommand = z.infer<typeof GenerateStorySchema>;

/**
 * Validation schema for POST /api/stories
 *
 * Extends GenerateStorySchema with additional fields for story creation:
 * - question: Required string, min 1 character
 * - answer: Required string, min 1 character
 *
 * This schema validates the complete story object before saving to database.
 */
export const CreateStorySchema = GenerateStorySchema.extend({
	question: z
		.string({ message: 'Pytanie musi być tekstem' })
		.min(1, { message: 'Pytanie jest wymagane i nie może być puste' })
		.trim(),

	answer: z
		.string({ message: 'Odpowiedź musi być tekstem' })
		.min(1, { message: 'Odpowiedź jest wymagana i nie może być pusta' })
		.trim()
});

/**
 * TypeScript type inferred from Zod schema
 */
export type ValidatedCreateStoryCommand = z.infer<typeof CreateStorySchema>;

/**
 * Validation schema for GET /api/stories query parameters
 *
 * Validates pagination parameters:
 * - limit: Optional integer, 1-100, default 25
 * - offset: Optional integer, >= 0, default 0
 */
export const ListStoriesQueryParamsSchema = z.object({
	limit: z
		.number({ message: 'Limit musi być liczbą' })
		.int({ message: 'Limit musi być liczbą całkowitą' })
		.min(1, { message: 'Limit musi być liczbą całkowitą od 1 do 100' })
		.max(100, { message: 'Limit musi być liczbą całkowitą od 1 do 100' })
		.default(25),

	offset: z
		.number({ message: 'Offset musi być liczbą' })
		.int({ message: 'Offset musi być liczbą całkowitą' })
		.min(0, { message: 'Offset musi być liczbą całkowitą większą lub równą 0' })
		.default(0)
});

/**
 * TypeScript type inferred from Zod schema
 */
export type ValidatedListStoriesQueryParams = z.infer<typeof ListStoriesQueryParamsSchema>;

/**
 * Validation schema for PATCH /api/stories/:id
 *
 * Validates update parameters for story content:
 * - question: Optional string, min 1 character after trim
 * - answer: Optional string, min 1 character after trim
 * - At least one field must be provided (validated separately)
 */
export const UpdateStorySchema = z.object({
	question: z
		.string({ message: 'Pytanie musi być tekstem' })
		.min(1, { message: 'Pytanie nie może być puste' })
		.trim()
		.optional(),

	answer: z
		.string({ message: 'Odpowiedź musi być tekstem' })
		.min(1, { message: 'Odpowiedź nie może być pusta' })
		.trim()
		.optional()
});

/**
 * TypeScript type inferred from Zod schema
 */
export type ValidatedUpdateStoryCommand = z.infer<typeof UpdateStorySchema>;