<script lang="ts">
	import StoryCard from './StoryCard.svelte';
	import type { StoryDTO } from '../../types';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		stories: StoryDTO[];
	}

	let { stories }: Props = $props();

	const dispatch = createEventDispatcher<{
		delete: string; // story ID
	}>();

	function handleDelete(event: CustomEvent<string>) {
		dispatch('delete', event.detail);
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
	{#each stories as story (story.id)}
		<StoryCard {story} on:delete={handleDelete} />
	{/each}
</div>

{#if stories.length === 0}
	<div class="text-center py-12 opacity-60">
		<p>Brak historii do wyświetlenia</p>
	</div>
{/if}