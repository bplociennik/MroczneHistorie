<script lang="ts">
	import { loadingStore } from '$lib/stores/loading';
</script>

{#if $loadingStore.isLoading}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-base-300/90 backdrop-blur-sm"
		role="alert"
		aria-live="polite"
		aria-busy="true"
	>
		<div class="flex flex-col items-center gap-4 p-8">
			<span class="loading loading-spinner loading-lg text-primary"></span>
			<p class="text-lg font-medium text-base-content text-center">
				{$loadingStore.message || 'Ładowanie...'}
			</p>
		</div>
	</div>
{/if}
