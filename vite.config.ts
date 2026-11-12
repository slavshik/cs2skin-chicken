import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    resolve: {
        alias: {
            // Ported dp-instant packages (src/dp/), imported by file: '@dp-instant/core/Action.ts'.
            '@dp-instant': fileURLToPath(new URL('./src/dp', import.meta.url)),
        },
    },
    server: {
        host: true,
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        target: 'es2020',
    },
});
