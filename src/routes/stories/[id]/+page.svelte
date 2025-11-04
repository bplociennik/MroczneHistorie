<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let showAnswer = $state(false);
</script>

<div class="min-h-screen flex flex-col items-center justify-start pt-16 p-6 gap-8">
	<!-- Question section -->
	<section class="w-full max-w-4xl text-center">
		<p
			class="text-2xl md:text-3xl lg:text-4xl font-bold leading-relaxed"
			data-testid="story-question"
		>
			{data.story.question}
		</p>
	</section>

	<!-- Toggle button -->
	<a
		class="btn btn-primary btn-lg w-full max-w-md"
		onclick={() => (showAnswer = !showAnswer)}
		aria-expanded={showAnswer}
	>
		{showAnswer ? 'Ukryj odpowiedź' : 'Odkryj odpowiedź'}
	</a>

	<!-- Answer section (conditional) -->
	{#if showAnswer}
		<section class="w-full max-w-4xl text-center" transition:fade={{ duration: 300 }}>
			<p
				class="text-lg md:text-xl lg:text-2xl leading-relaxed text-base-content/80"
				data-testid="story-answer"
			>
				{data.story.answer}
			</p>
		</section>
	{/if}
</div>
