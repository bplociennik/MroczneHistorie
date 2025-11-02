<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toastStore } from '$lib/stores/toasts';
	import LandingPage from '$lib/components/LandingPage.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import StoryList from '$lib/components/StoryList.svelte';
	import ModalConfirmDelete from '$lib/components/ModalConfirmDelete.svelte';
	import type { StoryDTO, ErrorDTO } from '../types';

	let { data }: { data: PageData } = $props();

	// Local state for deletion
	interface DeleteState {
		modalOpen: boolean;
		storyId: string | null;
		isDeleting: boolean;
	}

	let deleteState = $state<DeleteState>({
		modalOpen: false,
		storyId: null,
		isDeleting: false
	});

	// State for randomizing
	let isRandomizing = $state(false);

	// Display error toast if present in data
	$effect(() => {
		if (data.error) {
			toastStore.addToast(data.error, 'error');
		}
	});

	// Handle opening delete modal
	function openDeleteModal(event: CustomEvent<string>) {
		deleteState = {
			modalOpen: true,
			storyId: event.detail,
			isDeleting: false
		};
	}

	// Handle canceling deletion
	function cancelDelete() {
		deleteState = {
			modalOpen: false,
			storyId: null,
			isDeleting: false
		};
	}

	// Handle confirming deletion
	async function confirmDelete() {
		if (!deleteState.storyId) return;

		deleteState.isDeleting = true;

		try {
			const response = await fetch(`/api/stories/${deleteState.storyId}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				// Map error codes to messages
				const errorMessages: Record<number, string> = {
					404: 'Historia nie istnieje lub została już usunięta',
					401: 'Sesja wygasła. Zaloguj się ponownie',
					500: 'Błąd serwera. Spróbuj ponownie za chwilę'
				};

				let message = errorMessages[response.status];

				if (!message && response.headers.get('content-type')?.includes('application/json')) {
					try {
						const errorData: ErrorDTO = await response.json();
						message = errorData.error.message;
					} catch {
						message = 'Nie udało się usunąć historii';
					}
				}

				toastStore.addToast(message || 'Nie udało się usunąć historii', 'error');

				// If 404, close modal and refresh list (story already doesn't exist)
				if (response.status === 404) {
					cancelDelete();
					await invalidateAll();
				}

				return;
			}

			// Success
			toastStore.addToast('Historia została usunięta', 'success');
			deleteState = {
				modalOpen: false,
				storyId: null,
				isDeleting: false
			};

			// Refresh list
			await invalidateAll();
		} catch (error) {
			console.error('Delete error:', error);
			toastStore.addToast('Błąd połączenia. Sprawdź internet i spróbuj ponownie.', 'error');
		} finally {
			deleteState.isDeleting = false;
		}
	}

	// Handle random story selection
	async function handleRandomStory() {
		if (isRandomizing || data.stories.length === 0) return;

		isRandomizing = true;

		try {
			const response = await fetch('/api/stories/random');

			if (!response.ok) {
				// 404 - no stories
				if (response.status === 404) {
					toastStore.addToast('Brak historii do wylosowania', 'warning');
					return;
				}

				// 401 - session expired
				if (response.status === 401) {
					toastStore.addToast('Sesja wygasła. Zaloguj się ponownie', 'error');
					await goto(resolve('/login'));
					return;
				}

				// Other errors
				let message = 'Nie udało się wylosować historii';
				if (response.headers.get('content-type')?.includes('application/json')) {
					try {
						const errorData: ErrorDTO = await response.json();
						message = errorData.error.message || message;
					} catch {
						// Keep default message
					}
				}

				toastStore.addToast(message, 'error');
				return;
			}

			const story: StoryDTO = await response.json();
			await goto(resolve(`/stories/${story.id}`));
		} catch (error) {
			console.error('Random story error:', error);
			toastStore.addToast('Błąd połączenia. Sprawdź internet.', 'error');
		} finally {
			isRandomizing = false;
		}
	}
</script>

<div class="container mx-auto px-4 py-8">
	{#if !data.session}
		<LandingPage />
	{:else if data.stories.length === 0}
		<EmptyState />
	{:else}
		<!-- Header with Random button -->
		<div class="flex justify-between items-center mb-8">
			<h1 class="text-3xl font-bold">Moje Mroczne Historie</h1>
			<a
				class="btn btn-primary"
				disabled={isRandomizing || data.stories.length === 0}
				onclick={handleRandomStory}
			>
				{isRandomizing ? 'Losuję...' : 'Losuj Historię'}
			</a>
		</div>

		<StoryList stories={data.stories} on:delete={openDeleteModal} />
	{/if}
</div>

<ModalConfirmDelete
	bind:isOpen={deleteState.modalOpen}
	storyId={deleteState.storyId}
	isDeleting={deleteState.isDeleting}
	on:confirm={confirmDelete}
	on:cancel={cancelDelete}
/>
