<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<div class="hero min-h-[80vh] bg-base-200 rounded-lg">
	<div class="hero-content text-center">
		<div class="max-w-2xl">
			<h1 class="text-5xl font-bold mb-6">Zostań Mistrzem Mrocznych Historii.</h1>

			<p class="text-lg mb-8 opacity-80">
				Twórz fascynujące zagadki w stylu "Czarnych Historii" z pomocą sztucznej inteligencji.
				Generuj, zapisuj i prowadź niezapomniane sesje gry ze znajomymi.
			</p>

			<div class="flex gap-4 justify-center flex-wrap">
				<a href={resolve('/login')} class="btn btn-primary btn-lg"> Zaloguj się </a>
				<a href={resolve('/register')} class="btn btn-outline btn-lg"> Stwórz konto </a>
			</div>
		</div>
	</div>
</div>
