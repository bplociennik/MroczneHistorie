<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		isOpen: boolean;
		storyId: string | null;
		isDeleting: boolean;
	}

	let { isOpen = $bindable(false), storyId, isDeleting }: Props = $props();

	const dispatch = createEventDispatcher<{
		confirm: void;
		cancel: void;
	}>();

	function handleConfirm() {
		if (!isDeleting && storyId) {
			dispatch('confirm');
		}
	}

	function handleCancel() {
		if (!isDeleting) {
			dispatch('cancel');
		}
	}

	// Close modal on backdrop click (only when not deleting)
	function handleBackdropClick() {
		if (!isDeleting) {
			handleCancel();
		}
	}
</script>

{#if isOpen}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4">Czy na pewno chcesz usunąć tę historię?</h3>

			<p class="py-4 opacity-80">
				Ta operacja jest <strong>nieodwracalna</strong>. Historia zostanie trwale usunięta z twojej
				kolekcji.
			</p>

			<div class="modal-action">
				<a class="btn btn-ghost" onclick={handleCancel} disabled={isDeleting}> Anuluj </a>

				<a class="btn btn-error" onclick={handleConfirm} disabled={isDeleting}>
					{#if isDeleting}
						<span class="loading loading-spinner loading-sm"></span>
						Usuwanie...
					{:else}
						Usuń historię
					{/if}
				</a>
			</div>
		</div>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={handleBackdropClick}></div>
	</div>
{/if}
