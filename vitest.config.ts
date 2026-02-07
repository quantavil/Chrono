import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    plugins: [svelte({ hot: !process.env.VITEST })],
    test: {
        include: ['tests/**/*.test.ts'],
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        alias: {
            '$lib': './src/lib',
        },
    },
});
