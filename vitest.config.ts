import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/tests/e2e/**',  // Exclude Playwright e2e tests
        ],
        include: ['src/**/*.test.ts'],
    },
});
