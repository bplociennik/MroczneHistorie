import type { FormFieldConfig } from '../types/viewModels';

// ============================================================================
// Difficulty Level Labels
// ============================================================================

/**
 * Human-readable labels for story difficulty levels
 * 1 = Easy (simple, obvious clues)
 * 2 = Medium (requires multiple questions, contains red herrings)
 * 3 = Hard (non-obvious, multi-threaded, requires "outside the box" thinking)
 */
export const DIFFICULTY_LABELS: Record<1 | 2 | 3, string> = {
	1: '1 - Łatwa',
	2: '2 - Średnia',
	3: '3 - Trudna'
};

// ============================================================================
// Darkness Level Labels
// ============================================================================

/**
 * Human-readable labels for story darkness levels
 * 1 = Mystery (atmospheric, no explicit violence)
 * 2 = Disturbing (implied violence, unsettling tone)
 * 3 = Brutal (explicit violence, gore, strong impact)
 */
export const DARKNESS_LABELS: Record<1 | 2 | 3, string> = {
	1: '1 - Tajemnicza',
	2: '2 - Niepokojąca',
	3: '3 - Brutalna'
};

// ============================================================================
// Form Field Configuration
// ============================================================================

/**
 * Configuration for form fields in Edit Story view
 * Defines labels, placeholders, and rows for textarea inputs
 */
export const FORM_FIELDS: FormFieldConfig[] = [
	{
		name: 'question',
		label: 'Pytanie',
		placeholder: 'Wpisz pytanie historii...',
		rows: 6
	},
	{
		name: 'answer',
		label: 'Odpowiedź',
		placeholder: 'Wpisz odpowiedź historii...',
		rows: 8
	}
];
