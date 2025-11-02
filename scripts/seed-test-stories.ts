/**
 * Script to seed test stories for development
 * Run with: npx tsx scripts/seed-test-stories.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing required environment variables:');
	console.error('   - PUBLIC_SUPABASE_URL');
	console.error('   - SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

// Create Supabase admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test stories with different difficulty and darkness levels
const testStories = [
	{
		subject: 'Zaginiona kobieta w lesie',
		difficulty: 1,
		darkness: 1,
		question: 'Kobieta wchodzi do lasu i nigdy nie wraca. Co się stało?',
		answer:
			'Kobieta była grzybiarką, która znalazła rzadki okaz. Zaabsorbowana poszukiwaniami zgubiła się. Odnaleziono ją następnego dnia - zdrową, ale zawstydzoną.'
	},
	{
		subject: 'Mężczyzna na środku oceanu',
		difficulty: 2,
		darkness: 1,
		question:
			'Mężczyzna znajduje się na środku oceanu w szalupie ratunkowej. Obok niego leży martwy albatros. Co się wydarzyło?',
		answer:
			'Mężczyzna był pasażerem statku, który zatonął. Podczas rejsu jadł potrawę z "kurczaka", którą serwowano na pokładzie. Po rozbiciu znalazł albatrosa i próbował go ugotować - wtedy zdał sobie sprawę, że mięso smakuje inaczej niż to, które jadł na statku. To nie był kurczak.'
	},
	{
		subject: 'Tajemnicza śmierć w windzie',
		difficulty: 2,
		darkness: 2,
		question: 'Karła znajdowano codziennie martwego na dnie windy. Dlaczego?',
		answer:
			'To była pomyłka w tłumaczeniu zagadki. Poprawna wersja: Karzeł mieszkał na wysokim piętrze. Jadąc windą w górę, nie dosięgał do górnych przycisków, więc wysiadał wcześniej i szedł schodami. W deszczowe dni używał parasola do naciskania wyższych przycisków.'
	},
	{
		subject: 'Restauracja i płacz',
		difficulty: 2,
		darkness: 2,
		question: 'Dlaczego mężczyzna płakał po spróbowaniu zupy w restauracji?',
		answer:
			'Mężczyzna był niewidomy od urodzenia. Jego żona zmarła w wypadku. W restauracji zamówił zupę, którą przyrządzała jego żona. Po spróbowaniu zdał sobie sprawę, że smakuje inaczej - wtedy dotarło do niego, że naprawdę jej nie ma.'
	},
	{
		subject: 'Człowiek w barze',
		difficulty: 3,
		darkness: 2,
		question:
			'Mężczyzna wchodzi do baru, prosi o wodę. Barman wyciąga broń i celuje w niego. Mężczyzna dziękuje i wychodzi. Co się stało?',
		answer:
			'Mężczyzna miał czkawkę i prosił o wodę, żeby się jej pozbyć. Barman postanowił go przestraszyć - klasyczna metoda na czkawkę. Zadziałało, więc mężczyzna podziękował.'
	},
	{
		subject: 'Dzieci na strychu',
		difficulty: 3,
		darkness: 3,
		question:
			'Dzieci bawiły się na strychu. Jedno z nich znalazło skrzynię. Po otwarciu wszystkie zaczęły krzyczeć. Co było w środku?',
		answer:
			'W skrzyni było lustro. Dzieci nigdy wcześniej nie widziały luster - były więzione na strychu przez całe życie. Krzyczały ze strachu widząc własne odbicie po raz pierwszy.'
	},
	{
		subject: 'Samotny strażnik',
		difficulty: 3,
		darkness: 3,
		question:
			'Strażnik budzi się w nocy i widzi świecącą czerwoną kropkę na swojej piersi. Chwilę później jest martwy. Co się stało?',
		answer:
			'Na piersi świecił celownik laserowy snajpera. Został zastrzelony przez niewidzialnego napastnika, który przebił się przez okno pancerne.'
	},
	{
		subject: 'Koncert fortepianowy',
		difficulty: 1,
		darkness: 1,
		question:
			'Pianista kończy występ i wszyscy wstają z miejsc. Mimo świetnej gry, nikt nie klaszcze. Dlaczego?',
		answer:
			'To był koncert w filharmonii dla osób głuchych. Komunikacja odbywała się w języku migowym, a oklaski zastąpiono machaniem rękoma.'
	},
	{
		subject: 'Malarz i obraz',
		difficulty: 2,
		darkness: 1,
		question: 'Malarz namalował autoportret i popełnił samobójstwo następnego dnia. Dlaczego?',
		answer:
			'Malarz był niewidomy od urodzenia i odzyskał wzrok po operacji. Namalował autoportret po raz pierwszy widząc swoją twarz. Był tak załamany swoim wyglądem, że popełnił samobójstwo... To brzmi źle, ale to tylko zagadka!'
	}
];

async function seedTestStories() {
	console.log('🌱 Starting test stories seed...\n');

	// 1. Get first user from auth.users (through admin API)
	const { data: authData, error: userError } = await supabase.auth.admin.listUsers({
		page: 1,
		perPage: 1
	});

	if (userError || !authData.users || authData.users.length === 0) {
		console.error('❌ No users found in database. Please register a user first.');
		console.error('   Visit http://localhost:5174/register to create an account.');
		process.exit(1);
	}

	const testUser = authData.users[0];
	console.log(`👤 Using user: ${testUser.email} (${testUser.id})\n`);

	// 2. Insert test stories
	let successCount = 0;
	let errorCount = 0;

	for (const story of testStories) {
		const { error } = await supabase.from('stories').insert({
			user_id: testUser.id,
			subject: story.subject,
			difficulty: story.difficulty,
			darkness: story.darkness,
			question: story.question,
			answer: story.answer
		});

		if (error) {
			console.error(`❌ Failed to insert story: ${story.subject}`);
			console.error(`   Error: ${error.message}`);
			errorCount++;
		} else {
			console.log(`✅ Added: ${story.subject} (T:${story.difficulty}, M:${story.darkness})`);
			successCount++;
		}
	}

	// 3. Summary
	console.log(`\n📊 Summary:`);
	console.log(`   ✅ Success: ${successCount}`);
	console.log(`   ❌ Failed: ${errorCount}`);
	console.log(`   📝 Total: ${testStories.length}`);
	console.log(`\n🎉 Seed completed! Visit http://localhost:5174/ to see your stories.`);
}

// Run the seed function
seedTestStories().catch((error) => {
	console.error('❌ Unexpected error:', error);
	process.exit(1);
});
