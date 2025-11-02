/**
 * Test data constants and generators for E2E tests
 * All user-facing messages are in Polish (as per application requirements)
 */

import dotenv from 'dotenv';

// Load E2E environment variables
dotenv.config({ path: '.env.e2e' });

// E2E Test User Credentials (from .env.e2e)
export const E2E_USER = {
	id: process.env.E2E_USER_ID!,
	email: process.env.E2E_USER_EMAIL!,
	password: process.env.E2E_USER_PASS!
};

// Sample subjects for story generation
export const SAMPLE_SUBJECTS = [
	'Tajemnicza śmierć w bibliotece',
	'Zaginiony klucz',
	'Mroczny portret',
	'Stary zegar',
	'Dziwny zapach'
];

// Sample story data for seeding
export const SAMPLE_STORIES = {
	easy: {
		subject: 'Zaginiony klucz',
		difficulty: 1,
		darkness: 1,
		question: 'Znalazłem klucz w ogrodzie. Dlaczego wszyscy patrzą na mnie ze strachem?',
		answer: 'Klucz był do bramy cmentarza, która była zamknięta od 100 lat.'
	},
	medium: {
		subject: 'Stary zegar',
		difficulty: 2,
		darkness: 2,
		question: 'Zegar w salonie zaczął bić 13 razy. Co się stało?',
		answer: 'Zegar oznajmiał śmierć właściciela domu - biło 13 razy dla każdej ofiary.'
	},
	hard: {
		subject: 'Tajemnicze zdjęcie',
		difficulty: 3,
		darkness: 3,
		question: 'Na starym zdjęciu rodzinnym jest osoba, której nikt nie rozpoznaje. Kto to?',
		answer:
			'To przyszła ofiara rodziny. Zdjęcie zrobiono dzień przed jej śmiercią, ale oni jeszcze nie wiedzieli, że ją zabiją.'
	}
};

// Validation error messages (Polish)
export const ERROR_MESSAGES = {
	auth: {
		emailRequired: 'Email jest wymagany',
		emailInvalid: 'Niepoprawny format email',
		passwordTooShort: 'Hasło musi mieć min 6 znaków',
		passwordsMismatch: 'Hasła muszą być identyczne',
		invalidCredentials: 'Nieprawidłowy email lub hasło'
	},
	generate: {
		subjectRequired: 'Subject jest wymagany',
		subjectTooLong: 'Maksymalnie 150 znaków',
		difficultyRequired: 'Difficulty jest wymagane',
		difficultyOutOfRange: 'Difficulty musi być 1-3'
	},
	edit: {
		questionEmpty: 'Pytanie nie może być puste',
		answerEmpty: 'Odpowiedź nie może być pusta',
		atLeastOneField: 'Przynajmniej jedno pole musi być wypełnione'
	}
};

// Success messages (Polish)
export const SUCCESS_MESSAGES = {
	auth: {
		registered: 'Rejestracja zakończona sukcesem',
		loggedIn: 'Zalogowano pomyślnie'
	},
	story: {
		saved: 'Historia zapisana pomyślnie',
		updated: 'Historia zaktualizowana pomyślnie',
		deleted: 'Historia usunięta pomyślnie'
	}
};

// Form field labels (Polish)
export const FORM_LABELS = {
	email: 'Email',
	password: 'Hasło',
	confirmPassword: 'Potwierdź hasło',
	subject: 'Temat historii',
	difficulty: 'Trudność',
	darkness: 'Mroczność',
	question: 'Pytanie',
	answer: 'Odpowiedź'
};

// Button labels (Polish)
export const BUTTON_LABELS = {
	login: 'Zaloguj się',
	register: 'Zarejestruj się',
	logout: 'Wyloguj się',
	generate: 'Wygeneruj historię',
	regenerate: 'Wygeneruj ponownie',
	save: 'Zapisz',
	saveChanges: 'Zapisz zmiany',
	delete: 'Usuń',
	cancel: 'Anuluj',
	edit: 'Edytuj',
	revealAnswer: 'Odkryj odpowiedź',
	hideAnswer: 'Ukryj odpowiedź',
	random: 'Losuj',
	back: 'Powrót'
};

// Page titles and headings (Polish)
export const PAGE_TITLES = {
	landing: 'Zostań Mistrzem Mrocznych Historii',
	emptyState: 'Twoja księga mrocznych historii jest jeszcze pusta',
	login: 'Logowanie',
	register: 'Rejestracja',
	generate: 'Generuj Nową Historię',
	myStories: 'Moje Historie'
};

// Routes
export const ROUTES = {
	home: '/',
	login: '/login',
	register: '/register',
	generate: '/generate',
	stories: (id: string) => `/stories/${id}`,
	editStory: (id: string) => `/stories/${id}/edit`,
	randomStory: '/api/stories/random'
};

// Mock OpenAI responses for testing
export const MOCK_OPENAI_RESPONSES = {
	success: {
		question: 'Czy widziałeś moją żonę? Została w lesie.',
		answer: 'Jego żona zmarła 10 lat temu. Ciało wciąż leży w lesie.'
	},
	timeout: {
		// Will be used to simulate timeout scenario
		delay: 46000 // > 45s timeout
	},
	rateLimit: {
		status: 429,
		message: 'Rate limit exceeded'
	},
	serverError: {
		status: 503,
		message: 'Service unavailable'
	}
};

// Test timeouts
export const TIMEOUTS = {
	default: 5000,
	generation: 60000, // OpenAI generation can take up to 45s + buffer
	navigation: 3000,
	toast: 6000 // Toast auto-dismiss is 5s + buffer
};

/**
 * Generate random email for new user registration tests
 * Using .test domain to avoid Supabase rejecting @example.com emails
 */
export function generateRandomEmail(): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(7);
	return `test-${timestamp}-${random}@test.io`;
}

/**
 * Generate random password (min 6 chars)
 */
export function generateRandomPassword(): string {
	return `TestPass${Math.random().toString(36).substring(2, 10)}!`;
}

/**
 * Generate random subject for story generation
 */
export function generateRandomSubject(): string {
	return SAMPLE_SUBJECTS[Math.floor(Math.random() * SAMPLE_SUBJECTS.length)];
}
