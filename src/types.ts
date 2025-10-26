import type { Tables, TablesInsert, TablesUpdate } from './db/database.types';

// ============================================================================
// Story Entity Types
// ============================================================================

/**
 * Complete story object as returned from database
 * Used in: GET /api/stories/:id, GET /api/stories/random, and in story lists
 */
export type StoryDTO = Tables<'stories'>;

// ============================================================================
// Command Models (Request DTOs)
// ============================================================================

/**
 * Command to generate a new story using AI
 * POST /api/stories/generate
 *
 * Validation:
 * - subject: Required, 1-150 characters
 * - difficulty: Required, integer 1-3
 * - darkness: Required, integer 1-3
 */
export type GenerateStoryCommand = Pick<
  TablesInsert<'stories'>,
  'subject' | 'difficulty' | 'darkness'
>;

/**
 * Command to create and save a story to database
 * POST /api/stories
 *
 * Typically used after generating a story and previewing it.
 * Combines generation parameters with the AI-generated content.
 *
 * Validation:
 * - subject: Required, 1-150 characters
 * - difficulty: Required, integer 1-3
 * - darkness: Required, integer 1-3
 * - question: Required, min 1 character
 * - answer: Required, min 1 character
 */
export type CreateStoryCommand = Pick<
  TablesInsert<'stories'>,
  'subject' | 'difficulty' | 'darkness' | 'question' | 'answer'
>;

/**
 * Command to update an existing story
 * PATCH /api/stories/:id
 *
 * Only question and answer can be updated (subject, difficulty, darkness are read-only).
 * At least one field must be provided.
 *
 * Validation:
 * - question (optional): Min 1 character if provided
 * - answer (optional): Min 1 character if provided
 * - At least one field must be present
 */
export type UpdateStoryCommand = Pick<
  TablesUpdate<'stories'>,
  'question' | 'answer'
>;

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * AI-generated story content (without metadata)
 * Response from POST /api/stories/generate
 *
 * Contains only the generated question and answer, without saving to database.
 */
export type GeneratedStoryDTO = Pick<Tables<'stories'>, 'question' | 'answer'>;

/**
 * Paginated list of stories
 * Response from GET /api/stories
 */
export interface ListStoriesDTO {
  /**
   * Array of user's stories, sorted by created_at DESC
   */
  stories: StoryDTO[];

  /**
   * Total number of stories returned
   * (In MVP, this equals stories.length since there's no pagination limit)
   */
  total: number;
}

// ============================================================================
// Error Handling Types
// ============================================================================

/**
 * Standardized error codes used across the API
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'      // Input validation failure
  | 'AUTHENTICATION_ERROR'  // Missing or invalid token
  | 'AUTHORIZATION_ERROR'   // User lacks permission for resource
  | 'NOT_FOUND'            // Resource does not exist
  | 'TIMEOUT_ERROR'        // Request exceeded time limit (e.g., OpenAI timeout)
  | 'EXTERNAL_API_ERROR'   // OpenAI API failure
  | 'INTERNAL_ERROR';      // Unexpected server error

/**
 * Error response structure
 * Used for all API error responses (4xx, 5xx)
 */
export interface ErrorDTO {
  error: {
    /**
     * Machine-readable error code
     */
    code: ErrorCode;

    /**
     * Human-readable error message (localized in Polish for MVP)
     */
    message: string;

    /**
     * Optional field name for validation errors
     * e.g., "subject", "difficulty", "question"
     */
    field?: string;
  };
}

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Query parameters for listing stories
 * GET /api/stories?limit=25&offset=0
 */
export interface ListStoriesQueryParams {
  /**
   * Maximum number of stories to return
   * @default 25
   */
  limit?: number;

  /**
   * Number of stories to skip (for pagination)
   * @default 0
   */
  offset?: number;
}

// ============================================================================
// Type Guards and Validators
// ============================================================================

/**
 * Type guard to check if UpdateStoryCommand has at least one field
 * Required by PATCH /api/stories/:id validation rules
 */
export function isValidUpdateStoryCommand(
  cmd: UpdateStoryCommand
): cmd is Required<Pick<UpdateStoryCommand, 'question'>> | Required<Pick<UpdateStoryCommand, 'answer'>> | Required<UpdateStoryCommand> {
  return cmd.question !== undefined || cmd.answer !== undefined;
}

/**
 * Type guard to validate UUID v4 format
 * Used for story ID validation in API routes
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Story difficulty levels
 * 1 = Easy (simple, obvious clues)
 * 2 = Medium (requires multiple questions, contains red herrings)
 * 3 = Hard (non-obvious, multi-threaded, requires "outside the box" thinking)
 */
export type StoryDifficulty = 1 | 2 | 3;

/**
 * Story darkness levels
 * 1 = Mystery (atmospheric, no explicit violence)
 * 2 = Disturbing (implied violence, unsettling tone)
 * 3 = Brutal (explicit violence, gore, strong impact)
 */
export type StoryDarkness = 1 | 2 | 3;

/**
 * Helper type to ensure difficulty and darkness are within valid ranges
 */
export interface StoryParameters {
  difficulty: StoryDifficulty;
  darkness: StoryDarkness;
}