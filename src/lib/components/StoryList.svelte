<script lang="ts">
	import StoryCard from './StoryCard.svelte';
	import type { StoryDTO } from '../../types';

	interface Props {
		stories: StoryDTO[];
		ondelete: (id: string) => void;
	}

	let { stories, ondelete }: Props = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
	{#each stories as story (story.id)}
		<StoryCard {story} {ondelete} />
	{/each}
</div>

{#if stories.length === 0}
	<div class="text-center py-12 opacity-60">
		<p>Brak historii do wyświetlenia</p>
	</div>
{/if}
