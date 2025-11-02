import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load E2E environment variables
dotenv.config({ path: '.env.e2e' });

/**
 * Database helper utilities for E2E tests
 * Uses Supabase Service Role to bypass RLS for cleanup operations
 */

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	}
);

export interface Story {
	id: string;
	user_id: string;
	subject: string;
	difficulty: number;
	darkness: number;
	question: string;
	answer: string;
	created_at?: string;
	updated_at?: string;
}

/**
 * Delete all stories for a specific user
 * Used for cleanup after tests
 * @param userId - User ID to cleanup stories for
 */
export async function cleanupUserStories(userId: string): Promise<void> {
	const { error } = await supabase.from('stories').delete().eq('user_id', userId);

	if (error) {
		console.error(`Failed to cleanup stories for user ${userId}:`, error);
		throw error;
	}
}

/**
 * Create a test story in the database
 * @param userId - User ID who owns the story
 * @param storyData - Partial story data (subject, difficulty, darkness, question, answer)
 * @returns Created story with full data including ID
 */
export async function seedStory(
	userId: string,
	storyData: Partial<Omit<Story, 'id' | 'user_id'>>
): Promise<Story> {
	const defaultStory = {
		subject: 'Test Subject',
		difficulty: 2,
		darkness: 2,
		question: 'Test Question?',
		answer: 'Test Answer.',
		...storyData
	};

	const { data, error } = await supabase
		.from('stories')
		.insert({
			user_id: userId,
			...defaultStory
		})
		.select()
		.single();

	if (error) {
		console.error('Failed to seed story:', error);
		throw error;
	}

	return data as Story;
}

/**
 * Create multiple test stories
 * @param userId - User ID who owns the stories
 * @param count - Number of stories to create
 * @param baseData - Base data for all stories (will be numbered)
 * @returns Array of created stories
 */
export async function seedMultipleStories(
	userId: string,
	count: number,
	baseData?: Partial<Omit<Story, 'id' | 'user_id'>>
): Promise<Story[]> {
	const stories: Story[] = [];

	for (let i = 0; i < count; i++) {
		const story = await seedStory(userId, {
			subject: `${baseData?.subject || 'Test Subject'} #${i + 1}`,
			difficulty: baseData?.difficulty || 2,
			darkness: baseData?.darkness || 2,
			question: `${baseData?.question || 'Test Question'} #${i + 1}?`,
			answer: `${baseData?.answer || 'Test Answer'} #${i + 1}.`
		});
		stories.push(story);
	}

	return stories;
}

/**
 * Get count of stories for a user
 * @param userId - User ID to count stories for
 * @returns Number of stories
 */
export async function getStoriesCount(userId: string): Promise<number> {
	const { count, error } = await supabase
		.from('stories')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', userId);

	if (error) {
		console.error(`Failed to get stories count for user ${userId}:`, error);
		throw error;
	}

	return count || 0;
}

/**
 * Delete a specific story by ID
 * @param storyId - Story ID to delete
 */
export async function deleteStory(storyId: string): Promise<void> {
	const { error } = await supabase.from('stories').delete().eq('id', storyId);

	if (error) {
		console.error(`Failed to delete story ${storyId}:`, error);
		throw error;
	}
}

/**
 * Get a story by ID
 * @param storyId - Story ID to retrieve
 * @returns Story or null if not found
 */
export async function getStory(storyId: string): Promise<Story | null> {
	const { data, error } = await supabase.from('stories').select('*').eq('id', storyId).single();

	if (error) {
		if (error.code === 'PGRST116') {
			// Not found
			return null;
		}
		console.error(`Failed to get story ${storyId}:`, error);
		throw error;
	}

	return data as Story;
}

/**
 * Get all stories for a user
 * @param userId - User ID to get stories for
 * @returns Array of stories
 */
export async function getUserStories(userId: string): Promise<Story[]> {
	const { data, error } = await supabase
		.from('stories')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (error) {
		console.error(`Failed to get stories for user ${userId}:`, error);
		throw error;
	}

	return (data as Story[]) || [];
}
