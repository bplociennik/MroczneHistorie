#!/usr/bin/env tsx
/**
 * Script to verify E2E user credentials
 * Run: npx tsx tests/utils/verify-e2e-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load E2E environment variables
dotenv.config({ path: '.env.e2e' });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY!;
const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL!;
const E2E_USER_PASS = process.env.E2E_USER_PASS!;

async function verifyE2EUser() {
	console.log('🔍 Verifying E2E user credentials...');
	console.log(`📧 Email: ${E2E_USER_EMAIL}`);
	console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);

	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

	try {
		// Try to login
		const { data, error } = await supabase.auth.signInWithPassword({
			email: E2E_USER_EMAIL,
			password: E2E_USER_PASS
		});

		if (error) {
			console.error('❌ Login failed:', error.message);
			console.error('\n💡 Possible issues:');
			console.error('  1. User does not exist in staging database');
			console.error('  2. Password in .env.e2e is incorrect');
			console.error('  3. Email confirmation required');
			process.exit(1);
		}

		console.log('✅ Login successful!');
		console.log(`👤 User ID: ${data.user?.id}`);
		console.log(`📧 Email: ${data.user?.email}`);
		console.log(`✉️  Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`);

		// Check if user ID matches
		if (data.user?.id !== process.env.E2E_USER_ID) {
			console.log(
				`⚠️  Warning: User ID in .env.e2e (${process.env.E2E_USER_ID}) doesn't match logged in user (${data.user?.id})`
			);
			console.log(`💡 Update E2E_USER_ID in .env.e2e to: ${data.user?.id}`);
		} else {
			console.log('✅ User ID matches .env.e2e');
		}

		console.log('\n✨ E2E user is ready for testing!');
	} catch (err) {
		console.error('❌ Unexpected error:', err);
		process.exit(1);
	}
}

verifyE2EUser();
