/**
 * Script to add stories to existing user
 * Run with: npx tsx scripts/add-stories-to-user.ts test@mrocznehistorie.pl
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

// Test stories
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
		question:
			'Karzeł mieszkał na wysokim piętrze. Każdego dnia wracał z pracy i jechał windą. Dlaczego zawsze wysiadał kilka pięter wcześniej i resztę drogi szedł schodami?',
		answer:
			'Karzeł nie dosięgał do górnych przycisków w windzie. W deszczowe dni używał parasola do naciskania wyższych przycisków, więc mógł dojechać wyżej.'
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
		subject: 'Zagadka Romeo i Julii',
		difficulty: 2,
		darkness: 1,
		question: 'Romeo i Julia leżą martwi na podłodze. Wokół nich szkło i woda. Co się stało?',
		answer: 'Romeo i Julia to ryby w akwarium. Kot strącił akwarium, które rozbiło się na podłodze.'
	},
	{
		subject: 'Mroczny pokój hotelowy',
		difficulty: 2,
		darkness: 2,
		question:
			'Mężczyzna budzi się w pokoju hotelowym i od razu wie, że jego żona nie żyje, mimo że jest w innym pokoju. Skąd wie?',
		answer:
			'Mężczyzna jest niewidomy. Jego żona zawsze zostawiała światło włączone w jego pokoju. Gdy się obudził, czuł ciepło żarówki - wiedział, że światło świeci od wielu godzin, co oznaczało, że żona nie przyszła go wyłączyć.'
	},
	{
		subject: 'Zagadka samobójcy',
		difficulty: 3,
		darkness: 3,
		question:
			'Mężczyzna znaleziony martwy w zamkniętym od środka pokoju. Na podłodze kałuża wody i kawałki szkła. Co się stało?',
		answer:
			'Mężczyzna stanął na tafli lodu, zawiązał pętlę na szyi i powiązał ją z belką. Lód stopniał, powstała kałuża wody. Kawałki szkła to resztki tacki, na której był lód.'
	},
	{
		subject: 'Dziwna śmierć w lesie',
		difficulty: 2,
		darkness: 2,
		question:
			'W lesie znaleziono ciało mężczyzny z plecakiem. Nie było śladów walki. W plecaku tylko ubrania. Co się stało?',
		answer:
			'Mężczyzna skoczył ze spadochronem, ale główny spadochron się nie otworzył. W "plecaku" był zapasowy spadochron, który też zawiódł.'
	}
];

async function addStoriesToUser() {
	const userEmail = process.argv[2] || 'test@mrocznehistorie.pl';

	console.log(`🌱 Adding stories to user: ${userEmail}\n`);

	// 1. Find user by email
	const { data: authData, error: userError } = await supabase.auth.admin.listUsers();

	if (userError || !authData.users) {
		console.error('❌ Failed to fetch users:', userError?.message);
		process.exit(1);
	}

	const user = authData.users.find((u) => u.email === userEmail);

	if (!user) {
		console.error(`❌ User not found: ${userEmail}`);
		console.error('   Available users:');
		authData.users.forEach((u) => console.error(`   - ${u.email}`));
		process.exit(1);
	}

	console.log(`✅ Found user: ${user.email} (${user.id})\n`);

	// 2. Check existing stories
	const { data: existingStories, error: fetchError } = await supabase
		.from('stories')
		.select('id')
		.eq('user_id', user.id);

	if (fetchError) {
		console.error('❌ Failed to check existing stories:', fetchError.message);
	} else {
		console.log(`📊 Current stories count: ${existingStories?.length || 0}\n`);
	}

	// 3. Delete old stories
	console.log('🧹 Cleaning up old stories...');
	const { error: deleteError } = await supabase.from('stories').delete().eq('user_id', user.id);

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
			user_id: user.id,
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
	console.log('🎉 STORIES ADDED SUCCESSFULLY!');
	console.log('='.repeat(60));
	console.log(`\n📊 SUMMARY:\n`);
	console.log(`   👤 User:     ${user.email}`);
	console.log(`   ✅ Success:  ${successCount}`);
	console.log(`   ❌ Failed:   ${errorCount}`);
	console.log(`   📝 Total:    ${testStories.length}`);
	console.log('\n🌐 View your stories at:\n');
	console.log('   http://localhost:5174/');
	console.log('\n' + '='.repeat(60) + '\n');
}

// Run the function
addStoriesToUser().catch((error) => {
	console.error('❌ Unexpected error:', error);
	process.exit(1);
});
