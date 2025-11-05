<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<div data-testid="empty-state" class="hero min-h-[60vh] bg-base-200 rounded-lg">
	<div class="hero-content text-center">
		<div class="max-w-xl">
			<!-- Icon or illustration -->
			<div class="text-6xl mb-4 opacity-50">📖</div>

			<h2 class="text-3xl font-bold mb-4">Twoja księga mrocznych historii jest jeszcze pusta</h2>

			<p class="text-lg mb-6 opacity-80">
				Zacznij swoją przygodę z tworzeniem mrocznych zagadek. Wygeneruj pierwszą historię i zbuduj
				swoją kolekcję!
			</p>

			<a href={resolve('/generate')} class="btn btn-primary btn-lg"> Wygeneruj nową historię </a>
		</div>
	</div>
</div>
