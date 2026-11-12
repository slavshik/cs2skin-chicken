import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    plugins: [react()],
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
        rollupOptions: {
            output: {
                // React and GSAP ship as their own chunks, apart from Pixi and the game.
                manualChunks: (id) => {
                    if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
                    if (/node_modules\/gsap\//.test(id)) return 'gsap';
                    return undefined;
                },
            },
        },
    },
});
