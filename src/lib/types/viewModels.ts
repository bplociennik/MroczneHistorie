import type { StoryDTO } from '../../types';

// ============================================================================
// Edit Story View Types
// ============================================================================

/**
 * Data returned by load function for Edit Story page
 * @route /stories/[id]/edit
 */
export interface EditStoryPageData {
	story: StoryDTO;
}

/**
 * Result of server action for Edit Story page
 * Success or error response from form submission
 */
export type EditStoryActionData =
	| { success: true }
	| {
			success: false;
			error: {
				code: string;
				message: string;
				field?: string;
			};
	  };

/**
 * Select option configuration for dropdowns
 * Used for Difficulty and Darkness selects
 */
export interface SelectOption {
	value: number;
	label: string;
}

/**
 * Form field configuration for textarea fields
 * Defines structure for question and answer inputs
 */
export interface FormFieldConfig {
	name: 'question' | 'answer';
	label: string;
	placeholder: string;
	rows: number;
}

/**
 * Form state during editing
 * Tracks current values and submission status
 */
export interface EditFormState {
	question: string;
	answer: string;
	isSubmitting: boolean;
	isDirty: boolean; // Whether form has been modified
}
