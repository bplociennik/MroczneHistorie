import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'happy-dom',
		setupFiles: ['./tests/setup.ts'],
		include: ['tests/unit/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'tests/',
				'**/*.config.ts',
				'**/*.d.ts',
				'**/types.ts',
				'**/$types.ts'
			]
		}
	},
	resolve: {
		alias: {
			$lib: resolve(__dirname, './src/lib'),
			'$env/dynamic/private': resolve(__dirname, './tests/mocks/env.mock.ts'),
			'$env/dynamic/public': resolve(__dirname, './tests/mocks/env.mock.ts')
		}
	}
});
