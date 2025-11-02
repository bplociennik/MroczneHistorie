import type { StoryDTO, GeneratedStoryDTO } from '../../src/types';

/**
 * Valid test story data
 * Using proper UUID v4 format (with '4' in third group and '8-b' in fourth group)
 */
export const validStoryFixture: StoryDTO = {
	id: '550e8400-e29b-41d4-a716-446655440001',
	user_id: '550e8400-e29b-41d4-a716-446655440000',
	subject: 'Tajemnicza śmierć w bibliotece',
	difficulty: 2,
	darkness: 2,
	question: 'Znaleziono ciało w zamkniętej bibliotece. Dlaczego nikt nie słyszał strzału?',
	answer: 'Ofiara została zabita w czasie burzy, gdy grzmot zagłuszył huk strzału.',
	created_at: '2025-01-01T00:00:00Z'
};

/**
 * Second test story (different user)
 */
export const anotherUserStoryFixture: StoryDTO = {
	id: '550e8400-e29b-41d4-a716-446655440002',
	user_id: '550e8400-e29b-41d4-a716-446655440099',
	subject: 'Zagubiony klucz',
	difficulty: 1,
	darkness: 1,
	question: 'Znalazłem klucz w ogrodzie. Dlaczego wszyscy patrzą na mnie ze strachem?',
	answer: 'Klucz był do bramy cmentarza, która była zamknięta od 100 lat.',
	created_at: '2025-01-02T00:00:00Z'
};

/**
 * Array of multiple stories for list tests
 */
export const storiesListFixture: StoryDTO[] = [
	validStoryFixture,
	{
		...validStoryFixture,
		id: '550e8400-e29b-41d4-a716-446655440003',
		subject: 'Drugi temat',
		created_at: '2024-12-31T00:00:00Z'
	},
	{
		...validStoryFixture,
		id: '550e8400-e29b-41d4-a716-446655440004',
		subject: 'Trzeci temat',
		created_at: '2024-12-30T00:00:00Z'
	}
];

/**
 * Mock OpenAI generated story response
 */
export const generatedStoryFixture: GeneratedStoryDTO = {
	question: 'Wygenerowane pytanie testowe',
	answer: 'Wygenerowana odpowiedź testowa'
};

/**
 * Valid generate story command
 */
export const validGenerateCommand = {
	subject: 'Tajemnicza śmierć',
	difficulty: 2,
	darkness: 2
};

/**
 * Valid create story command
 */
export const validCreateCommand = {
	subject: 'Tajemnicza śmierć',
	difficulty: 2,
	darkness: 2,
	question: 'Pytanie testowe',
	answer: 'Odpowiedź testowa'
};

/**
 * Valid update story command
 */
export const validUpdateCommand = {
	question: 'Zaktualizowane pytanie',
	answer: 'Zaktualizowana odpowiedź'
};

/**
 * Invalid UUIDs for testing
 */
export const invalidUUIDs = [
	'invalid-uuid',
	'123',
	'00000000-0000-0000-0000-00000000000G', // Invalid character
	'not-a-uuid-at-all'
];

/**
 * Valid UUID that doesn't exist
 */
export const nonExistentUUID = '550e8400-e29b-41d4-a716-446655440999';
