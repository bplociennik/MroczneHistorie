<script lang="ts">
	import type { LayoutData } from './$types';
	import favicon from '$lib/assets/favicon.png';
	import Navbar from '$lib/components/Navbar.svelte';
	import GlobalLoader from '$lib/components/GlobalLoader.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import '../app.css';

	interface LayoutProps {
		data: LayoutData;
		children: import('svelte').Snippet;
	}

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-base-300" data-theme="dark">
	<Navbar user={data.user} supabase={data.supabase} />

	<main class="container mx-auto px-4 py-8">
		{@render children?.()}
	</main>

	<GlobalLoader />
	<ToastContainer />
</div>
