/**
 * Script to create a test user with stories
 * Run with: npx tsx scripts/create-test-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing required environment variables');
	process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

// Test user credentials
const TEST_USER = {
	email: 'test@mrocznehistorie.pl',
	password: 'TestowyUser123!'
};

// Test stories
const testStories = [
	{
		subject: 'Zaginiona kobieta w lesie',
		difficulty: 1,
		darkness: 1,
		question: 'Kobieta wchodzi do lasu i nigdy nie wraca. Co się stało?',
		answer: 'Kobieta była grzybiarką, która znalazła rzadki okaz. Zaabsorbowana poszukiwaniami zgubiła się. Odnaleziono ją następnego dnia - zdrową, ale zawstydzoną.'
	},
	{
		subject: 'Mężczyzna na środku oceanu',
		difficulty: 2,
		darkness: 1,
		question: 'Mężczyzna znajduje się na środku oceanu w szalupie ratunkowej. Obok niego leży martwy albatros. Co się wydarzyło?',
		answer: 'Mężczyzna był pasażerem statku, który zatonął. Podczas rejsu jadł potrawę z "kurczaka", którą serwowano na pokładzie. Po rozbiciu znalazł albatrosa i próbował go ugotować - wtedy zdał sobie sprawę, że mięso smakuje inaczej niż to, które jadł na statku. To nie był kurczak.'
	},
	{
		subject: 'Tajemnicza śmierć w windzie',
		difficulty: 2,
		darkness: 2,
		question: 'Karzeł mieszkał na wysokim piętrze. Każdego dnia wracał z pracy i jechał windą. Dlaczego zawsze wysiadał kilka pięter wcześniej i resztę drogi szedł schodami?',
		answer: 'Karzeł nie dosięgał do górnych przycisków w windzie. W deszczowe dni używał parasola do naciskania wyższych przycisków, więc mógł dojechać wyżej.'
	},
	{
		subject: 'Restauracja i płacz',
		difficulty: 2,
		darkness: 2,
		question: 'Dlaczego mężczyzna płakał po spróbowaniu zupy w restauracji?',
		answer: 'Mężczyzna był niewidomy od urodzenia. Jego żona zmarła w wypadku. W restauracji zamówił zupę, którą przyrządzała jego żona. Po spróbowaniu zdał sobie sprawę, że smakuje inaczej - wtedy dotarło do niego, że naprawdę jej nie ma.'
	},
	{
		subject: 'Człowiek w barze',
		difficulty: 3,
		darkness: 2,
		question: 'Mężczyzna wchodzi do baru, prosi o wodę. Barman wyciąga broń i celuje w niego. Mężczyzna dziękuje i wychodzi. Co się stało?',
		answer: 'Mężczyzna miał czkawkę i prosił o wodę, żeby się jej pozbyć. Barman postanowił go przestraszyć - klasyczna metoda na czkawkę. Zadziałało, więc mężczyzna podziękował.'
	},
	{
		subject: 'Dzieci na strychu',
		difficulty: 3,
		darkness: 3,
		question: 'Dzieci bawiły się na strychu. Jedno z nich znalazło skrzynię. Po otwarciu wszystkie zaczęły krzyczeć. Co było w środku?',
		answer: 'W skrzyni było lustro. Dzieci nigdy wcześniej nie widziały luster - były więzione na strychu przez całe życie. Krzyczały ze strachu widząc własne odbicie po raz pierwszy.'
	},
	{
		subject: 'Samotny strażnik',
		difficulty: 3,
		darkness: 3,
		question: 'Strażnik budzi się w nocy i widzi świecącą czerwoną kropkę na swojej piersi. Chwilę później jest martwy. Co się stało?',
		answer: 'Na piersi świecił celownik laserowy snajpera. Został zastrzelony przez niewidzialnego napastnika, który przebił się przez okno pancerne.'
	},
	{
		subject: 'Koncert fortepianowy',
		difficulty: 1,
		darkness: 1,
		question: 'Pianista kończy występ i wszyscy wstają z miejsc. Mimo świetnej gry, nikt nie klaszcze. Dlaczego?',
		answer: 'To był koncert w filharmonii dla osób głuchych. Komunikacja odbywała się w języku migowym, a oklaski zastąpiono machaniem rękoma.'
	},
	{
		subject: 'Zagadka Romeo i Julii',
		difficulty: 2,
		darkness: 1,
		question: 'Romeo i Julia leżą martwi na podłodze. Wokół nich szkło i woda. Co się stało?',
		answer: 'Romeo i Julia to ryby w akwarium. Kot strącił akwarium, które rozbiło się na podłodze.'
	}
];

async function createTestUser() {
	console.log('🌱 Creating test user with stories...\n');

	// 1. Check if user already exists
	const { data: existingUsers } = await supabase.auth.admin.listUsers();
	const userExists = existingUsers?.users.some((u) => u.email === TEST_USER.email);

	let userId: string;

	if (userExists) {
		console.log('⚠️  User already exists, finding their ID...');
		const existingUser = existingUsers?.users.find((u) => u.email === TEST_USER.email);
		userId = existingUser!.id;
		console.log(`✅ Found existing user: ${TEST_USER.email} (${userId})\n`);
	} else {
		// 2. Create new user
		console.log('👤 Creating new user...');
		const { data: authData, error: authError } = await supabase.auth.admin.createUser({
			email: TEST_USER.email,
			password: TEST_USER.password,
			email_confirm: true // Auto-confirm email
		});

		if (authError || !authData.user) {
			console.error('❌ Failed to create user:', authError?.message);
			process.exit(1);
		}

		userId = authData.user.id;
		console.log(`✅ User created: ${TEST_USER.email} (${userId})\n`);
	}

	// 3. Delete existing stories for this user (clean slate)
	console.log('🧹 Cleaning up old stories...');
	const { error: deleteError } = await supabase.from('stories').delete().eq('user_id', userId);

	if (deleteError) {
		console.error('⚠️  Warning: Could not delete old stories:', deleteError.message);
	} else {
		console.log('✅ Old stories removed\n');
	}

	// 4. Insert test stories
	console.log('📝 Adding test stories...\n');
	let successCount = 0;
	let errorCount = 0;

	for (const story of testStories) {
		const { error } = await supabase.from('stories').insert({
			user_id: userId,
			subject: story.subject,
			difficulty: story.difficulty,
			darkness: story.darkness,
			question: story.question,
			answer: story.answer
		});

		if (error) {
			console.error(`❌ Failed: ${story.subject}`);
			console.error(`   Error: ${error.message}`);
			errorCount++;
		} else {
			console.log(`✅ Added: ${story.subject} (T:${story.difficulty}, M:${story.darkness})`);
			successCount++;
		}
	}

	// 5. Summary
	console.log(`\n${'='.repeat(60)}`);
	console.log('🎉 TEST USER CREATED SUCCESSFULLY!');
	console.log('='.repeat(60));
	console.log('\n📋 LOGIN CREDENTIALS:\n');
	console.log(`   Email:    ${TEST_USER.email}`);
	console.log(`   Password: ${TEST_USER.password}`);
	console.log('\n📊 STORIES SUMMARY:\n');
	console.log(`   ✅ Success: ${successCount}`);
	console.log(`   ❌ Failed:  ${errorCount}`);
	console.log(`   📝 Total:   ${testStories.length}`);
	console.log('\n🌐 LOGIN URL:\n');
	console.log('   http://localhost:5174/login');
	console.log('\n' + '='.repeat(60) + '\n');
}

// Run the function
createTestUser().catch((error) => {
	console.error('❌ Unexpected error:', error);
	process.exit(1);
});