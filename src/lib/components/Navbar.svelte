<script lang="ts">
	import type { Session } from '@supabase/supabase-js';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toastStore } from '$lib/stores/toasts';

	interface NavbarProps {
		session: Session | null;
		supabase: SupabaseClient;
	}

	let { session, supabase }: NavbarProps = $props();

	/**
	 * Handle logout
	 * Client-side logout using Supabase
	 */
	async function handleLogout() {
		try {
			const { error } = await supabase.auth.signOut();

			if (error) {
				console.error('Logout error:', error);
				toastStore.addToast('Nie udało się wylogować. Spróbuj ponownie.', 'error');
				return;
			}

			// Invalidate all data and redirect
			await invalidateAll();
			await goto(resolve('/'), { replaceState: true });
			toastStore.addToast('Wylogowano pomyślnie', 'success');
		} catch (error) {
			console.error('Unexpected logout error:', error);
			toastStore.addToast('Wystąpił nieoczekiwany błąd', 'error');
		}
	}
</script>

<nav class="navbar bg-base-100 shadow-lg">
	<!-- Logo -->
	<div class="flex-1">
		<a href={resolve('/')} class="btn btn-ghost text-xl font-bold"> MroczneHistorie </a>
	</div>

	<!-- Desktop Menu -->
	<div class="flex-none hidden lg:flex">
		<ul class="menu menu-horizontal px-1">
			{#if session}
				<li><a href={resolve('/')}>Moje Historie</a></li>
				<li>
					<a href={resolve('/generate')} class="flex items-center gap-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Generuj
					</a>
				</li>
				<li><a onclick={handleLogout}>Wyloguj</a></li>
			{:else}
				<li><a href={resolve('/')}>Strona główna</a></li>
				<li><a href={resolve('/login')}>Zaloguj się</a></li>
				<li><a href={resolve('/register')}>Stwórz konto</a></li>
			{/if}
		</ul>
	</div>

	<!-- Mobile Menu -->
	<div class="navbar-end lg:hidden">
		<div class="dropdown dropdown-end">
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label tabindex="0" class="btn btn-ghost" aria-label="Menu">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</label>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<ul
				tabindex="0"
				class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
			>
				{#if session}
					<li><a href={resolve('/')}>Moje Historie</a></li>
					<li>
						<a href={resolve('/generate')} class="flex items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
							Generuj
						</a>
					</li>
					<li><a onclick={handleLogout}>Wyloguj</a></li>
				{:else}
					<li><a href={resolve('/')}>Strona główna</a></li>
					<li><a href={resolve('/login')}>Zaloguj się</a></li>
					<li><a href={resolve('/register')}>Stwórz konto</a></li>
				{/if}
			</ul>
		</div>
	</div>
</nav>
