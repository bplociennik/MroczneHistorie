<script lang="ts">
	import { loadingStore } from '$lib/stores/loading';
	import { toastStore } from '$lib/stores/toasts';

	// Test loader
	function testLoader() {
		loadingStore.start('Tworzymy Twoją mroczną historię...');
		setTimeout(() => {
			loadingStore.stop();
			toastStore.addToast('Loader test zakończony!', 'success');
		}, 3000);
	}

	// Test different toast types
	function testToastError() {
		toastStore.addToast('To jest toast błędu', 'error');
	}

	function testToastSuccess() {
		toastStore.addToast('To jest toast sukcesu', 'success');
	}

	function testToastInfo() {
		toastStore.addToast('To jest toast informacyjny', 'info');
	}

	function testToastWarning() {
		toastStore.addToast('To jest toast ostrzeżenia', 'warning');
	}
</script>

<div class="max-w-4xl mx-auto">
	<h1 class="text-4xl font-bold mb-8">Test Komponentów</h1>

	<div class="space-y-8">
		<!-- Loader Test -->
		<div class="card bg-base-200 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">GlobalLoader Test</h2>
				<p>Kliknij przycisk aby przetestować loader (3 sekundy):</p>
				<div class="card-actions">
					<button class="btn btn-primary" onclick={testLoader}>
						Testuj Loader
					</button>
				</div>
			</div>
		</div>

		<!-- Toast Tests -->
		<div class="card bg-base-200 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">ToastContainer Tests</h2>
				<p>Kliknij przyciski aby przetestować różne typy toastów:</p>
				<div class="card-actions flex-wrap gap-2">
					<button class="btn btn-error" onclick={testToastError}>
						Toast Error
					</button>
					<button class="btn btn-success" onclick={testToastSuccess}>
						Toast Success
					</button>
					<button class="btn btn-info" onclick={testToastInfo}>
						Toast Info
					</button>
					<button class="btn btn-warning" onclick={testToastWarning}>
						Toast Warning
					</button>
				</div>
			</div>
		</div>

		<!-- Back to home -->
		<div class="text-center">
			<a href="/" class="btn btn-ghost">← Powrót do strony głównej</a>
		</div>
	</div>
</div>