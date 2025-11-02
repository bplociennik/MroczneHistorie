<script lang="ts">
	import type { StoryDTO } from '../../types';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		story: StoryDTO;
	}

	let { story }: Props = $props();

	const dispatch = createEventDispatcher<{
		delete: string;
	}>();

	function handleDeleteClick() {
		dispatch('delete', story.id);
	}

	// Labels for difficulty and darkness
	const difficultyLabels: Record<1 | 2 | 3, string> = {
		1: 'Łatwa',
		2: 'Średnia',
		3: 'Trudna'
	};

	const darknessLabels: Record<1 | 2 | 3, string> = {
		1: 'Tajemnicza',
		2: 'Niepokojąca',
		3: 'Brutalna'
	};
</script>

<div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
	<div class="card-body">
		<!-- Subject -->
		<p class="text-sm opacity-60 mt-2">
			Temat: {story.subject}
		</p>

		<!-- Question as link -->
		<a
			href="/stories/{story.id}"
			class="card-title text-lg hover:text-primary transition-colors cursor-pointer line-clamp-3"
		>
			{story.question}
		</a>

		<!-- Metadata badges -->
		<div class="flex gap-2 mt-3">
			<div class="badge badge-outline" title="Trudność">
				T: {story.difficulty} - {difficultyLabels[story.difficulty]}
			</div>
			<div class="badge badge-outline" title="Mroczność">
				M: {story.darkness} - {darknessLabels[story.darkness]}
			</div>
		</div>

		<!-- Actions -->
		<div class="card-actions justify-end mt-4">
			<a href="/stories/{story.id}/edit" class="btn btn-sm btn-ghost" title="Edytuj historię">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
					/>
				</svg>
				Edytuj
			</a>

			<button
				class="btn btn-sm btn-ghost text-error"
				onclick={handleDeleteClick}
				title="Usuń historię"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
				Usuń
			</button>
		</div>

		<!-- Creation date -->
		<div class="text-xs opacity-40 mt-2">
			Utworzono: {new Date(story.created_at).toLocaleDateString('pl-PL')}
		</div>
	</div>
</div>
